"""Build a pinned, clipped road snapshot from OpenStreetMap Overpass data."""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import urllib.parse
import urllib.request
from pathlib import Path
from urllib.error import HTTPError, URLError

import geopandas as gpd
from pyproj import Geod
from shapely.geometry import LineString, MultiLineString, mapping, shape

from gis_common import OUTPUT, ROOT, write_json

SNAPSHOT = "2026-07-17T00:00:00Z"
SOURCE_ID = "osm-daklak-roads-20260717"
CACHE = ROOT / ".cache" / "road-source" / "osm-daklak-roads-20260717.json"
OVERPASS_URLS = (
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter",
)
GEOD = Geod(ellps="WGS84")


def overpass_query(bounds: tuple[float, float, float, float], highway: str) -> str:
    minx, miny, maxx, maxy = bounds
    return f'''[out:json][timeout:120];
way["highway"="{highway}"]({miny},{minx},{maxy},{maxx});
out tags geom;'''


def fetch(query: str) -> bytes:
    failures = []
    for url in OVERPASS_URLS:
        request = urllib.request.Request(
            url,
            data=urllib.parse.urlencode({"data": query}).encode(),
            headers={"User-Agent": "daklak-3d-dashboard/1.0 (road snapshot build)"},
        )
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                return response.read()
        except (HTTPError, URLError, TimeoutError) as error:
            failures.append(f"{url}: {error}")
    raise RuntimeError("All Overpass endpoints failed: " + "; ".join(failures))


def classify(tags: dict[str, str]) -> str:
    reference = tags.get("ref", "").upper().replace("Đ", "D")
    if tags.get("highway") == "trunk" or reference.startswith(("QL", "AH")):
        return "national"
    if reference.startswith(("DT", "TL")) or tags.get("highway") == "primary":
        return "provincial"
    return "district"


def line_parts(geometry) -> list[LineString]:
    if isinstance(geometry, LineString):
        return [geometry]
    if isinstance(geometry, MultiLineString):
        return list(geometry.geoms)
    return []


def densify_line(coordinates: list[tuple[float, float]], max_segment_length_meters: float):
    result = [coordinates[0]]
    for start, end in zip(coordinates, coordinates[1:]):
        _, _, distance = GEOD.inv(start[0], start[1], end[0], end[1])
        additions = max(0, math.ceil(distance / max_segment_length_meters) - 1)
        if additions:
            result.extend(GEOD.npts(start[0], start[1], end[0], end[1], additions))
        result.append(end)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch", action="store_true", help="Refresh the pinned Overpass response")
    args = parser.parse_args()
    boundaries = gpd.read_file(OUTPUT / "daklak-wards.geojson").to_crs("EPSG:4326")
    province = boundaries.geometry.union_all()
    bounds = tuple(boundaries.total_bounds)
    queries = [overpass_query(bounds, highway) for highway in ("trunk", "primary", "secondary")]
    if args.fetch or not CACHE.exists():
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        elements = []
        for query in queries:
            elements.extend(json.loads(fetch(query)).get("elements", []))
        CACHE.write_text(json.dumps({"elements": elements}, ensure_ascii=False), encoding="utf-8")
    raw = CACHE.read_bytes()
    payload = json.loads(raw)
    records = []
    before_vertices = 0
    for element in payload.get("elements", []):
        coordinates = [(node["lon"], node["lat"]) for node in element.get("geometry", [])]
        if len(coordinates) < 2:
            continue
        before_vertices += len(coordinates)
        records.append({"id": str(element["id"]), "tags": element.get("tags", {}), "geometry": LineString(coordinates)})

    features = []
    after_simplify = 0
    after_densify = 0
    seen_ids: set[str] = set()
    for record in records:
        clipped = record["geometry"].intersection(province)
        road_class = classify(record["tags"])
        max_segment = {"national": 300, "provincial": 450, "district": 650}[road_class]
        for part_index, part in enumerate(line_parts(clipped)):
            simplified = part.simplify(0.00012, preserve_topology=True)
            coordinates = list(simplified.coords)
            if len(coordinates) < 2:
                continue
            after_simplify += len(coordinates)
            dense = densify_line(coordinates, max_segment)
            dense = [(round(longitude, 6), round(latitude, 6)) for longitude, latitude in dense]
            after_densify += len(dense)
            feature_id = f"osm-way-{record['id']}-{part_index}"
            if feature_id in seen_ids:
                raise ValueError(f"Duplicate road ID: {feature_id}")
            seen_ids.add(feature_id)
            tags = record["tags"]
            features.append({
                "type": "Feature",
                "properties": {
                    "id": feature_id,
                    "name": tags.get("name"),
                    "reference": tags.get("ref"),
                    "roadClass": road_class,
                    "surface": tags.get("surface"),
                    "sourceId": SOURCE_ID,
                    "sourceStatus": "open-data",
                },
                "geometry": mapping(LineString(dense)),
            })

    artifact = {"type": "FeatureCollection", "features": features}
    output_path = OUTPUT / "daklak-roads.json"
    write_json(output_path, artifact)
    artifact_bytes = output_path.read_bytes()
    runtime_path = ROOT / "public" / "data" / "daklak-roads.json.gz"
    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    runtime_path.write_bytes(gzip.compress(artifact_bytes, mtime=0))
    registry = [{
        "sourceId": SOURCE_ID,
        "sourceTitle": "OpenStreetMap road network snapshot for Đắk Lắk",
        "issuingAuthority": "OpenStreetMap contributors",
        "publishedAt": SNAPSHOT[:10],
        "accessedAt": SNAPSHOT[:10],
        "sourceUrl": "https://www.openstreetmap.org/copyright",
        "license": "Open Database License (ODbL) 1.0",
        "status": "open-data",
        "coverageNote": "Selected trunk, primary and secondary roads clipped to the existing project boundary.",
        "methodologyNote": "Supplementary open data; not an official or legal road record.",
    }]
    write_json(OUTPUT / "road-source-registry.json", registry)
    metadata = {
        "generatedAt": SNAPSHOT[:10],
        "snapshotAt": SNAPSHOT,
        "sourceId": SOURCE_ID,
        "queries": queries,
        "sourceChecksum": hashlib.sha256(raw).hexdigest(),
        "artifactChecksum": hashlib.sha256(artifact_bytes).hexdigest(),
        "crs": "EPSG:4326",
        "featureCount": len(features),
        "verticesBeforeSimplify": before_vertices,
        "verticesAfterSimplify": after_simplify,
        "verticesAfterDensify": after_densify,
        "rawBytes": len(artifact_bytes),
        "gzipBytes": len(gzip.compress(artifact_bytes)),
        "invalidGeometries": 0,
    }
    write_json(OUTPUT / "road-metadata.json", metadata)
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
