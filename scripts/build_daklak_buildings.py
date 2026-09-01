"""Build a pinned, clipped 3D building-footprint snapshot from OpenStreetMap Overpass data.

Pilot scope: a single ward (phường Buôn Ma Thuột, code 24133) rather than the whole province —
see `docs/data-provenance.md` for why this starts narrow (get one area right, with real per
-building height estimates, before spending Overpass query budget on all 102 wards).
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import urllib.parse
import urllib.request
from pathlib import Path
from urllib.error import HTTPError, URLError

import geopandas as gpd
from shapely.geometry import Polygon, mapping

from gis_common import OUTPUT, ROOT, write_json

WARD_CODE = "24133"
WARD_NAME = "Buôn Ma Thuột"
SNAPSHOT = "2026-09-01T00:00:00Z"
SOURCE_ID = "osm-buon-ma-thuot-buildings-20260901"
CACHE = ROOT / ".cache" / "building-source" / "osm-buon-ma-thuot-buildings-20260901.json"
OVERPASS_URLS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
)
# Levels assumed when OSM has no `building:levels` tag, keyed by `building=*` value — a
# deterministic, documented estimate (see `data-provenance.md`), not a measured height.
DEFAULT_LEVELS_BY_TYPE: dict[str, int] = {
    "hospital": 4,
    "apartments": 5,
    "hotel": 4,
    "school": 2,
    "college": 3,
    "stadium": 1,
    "industrial": 1,
    "retail": 1,
    "house": 1,
    "yes": 1,
}
METERS_PER_LEVEL = 3.3
MIN_HEIGHT_METERS = 3.0


def overpass_query(bounds: tuple[float, float, float, float]) -> str:
    minx, miny, maxx, maxy = bounds
    return f'''[out:json][timeout:120];
way["building"]({miny},{minx},{maxy},{maxx});
out tags geom;'''


def fetch(query: str) -> bytes:
    failures = []
    for url in OVERPASS_URLS:
        request = urllib.request.Request(
            url,
            data=urllib.parse.urlencode({"data": query}).encode(),
            headers={"User-Agent": "daklak-3d-dashboard/1.0 (building snapshot build)"},
        )
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                return response.read()
        except (HTTPError, URLError, TimeoutError) as error:
            failures.append(f"{url}: {error}")
    raise RuntimeError("All Overpass endpoints failed: " + "; ".join(failures))


def estimate_height_meters(tags: dict[str, str]) -> tuple[float, str]:
    """Returns (heightMeters, method) — `method` is recorded per-feature so a future viewer can
    tell a measured height apart from an estimated one, matching this repo's provenance rule."""
    raw_height = tags.get("height")
    if raw_height:
        try:
            return max(MIN_HEIGHT_METERS, float(raw_height.split()[0])), "osm-height-tag"
        except ValueError:
            pass
    raw_levels = tags.get("building:levels")
    if raw_levels:
        try:
            levels = max(1, int(float(raw_levels)))
            return max(MIN_HEIGHT_METERS, levels * METERS_PER_LEVEL), "osm-levels-tag"
        except ValueError:
            pass
    building_type = tags.get("building", "yes")
    default_levels = DEFAULT_LEVELS_BY_TYPE.get(building_type, 1)
    return max(MIN_HEIGHT_METERS, default_levels * METERS_PER_LEVEL), "estimated-default-levels"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fetch", action="store_true", help="Refresh the pinned Overpass response")
    args = parser.parse_args()

    wards = gpd.read_file(OUTPUT / "daklak-wards.geojson").to_crs("EPSG:4326")
    ward_rows = wards[wards["code"] == WARD_CODE]
    if ward_rows.empty:
        raise ValueError(f"Ward code {WARD_CODE} ({WARD_NAME}) not found in daklak-wards.geojson")
    ward_geometry = ward_rows.geometry.union_all()
    bounds = tuple(ward_rows.total_bounds)
    query = overpass_query(bounds)

    if args.fetch or not CACHE.exists():
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        CACHE.write_bytes(fetch(query))
    raw = CACHE.read_bytes()
    payload = json.loads(raw)

    features = []
    skipped_open_ways = 0
    skipped_no_geometry = 0
    seen_ids: set[str] = set()
    height_methods: dict[str, int] = {}
    for element in payload.get("elements", []):
        geometry_nodes = element.get("geometry")
        if not geometry_nodes or len(geometry_nodes) < 4:
            skipped_no_geometry += 1
            continue
        coordinates = [(node["lon"], node["lat"]) for node in geometry_nodes]
        if coordinates[0] != coordinates[-1]:
            skipped_open_ways += 1
            continue
        footprint = Polygon(coordinates)
        if not footprint.is_valid or footprint.area == 0:
            skipped_no_geometry += 1
            continue
        clipped = footprint.intersection(ward_geometry)
        if clipped.is_empty or clipped.geom_type not in ("Polygon", "MultiPolygon"):
            continue

        tags = element.get("tags", {})
        height_meters, height_method = estimate_height_meters(tags)
        height_methods[height_method] = height_methods.get(height_method, 0) + 1

        feature_id = f"osm-way-{element['id']}"
        if feature_id in seen_ids:
            raise ValueError(f"Duplicate building ID: {feature_id}")
        seen_ids.add(feature_id)

        polygons = [clipped] if clipped.geom_type == "Polygon" else list(clipped.geoms)
        for part_index, part in enumerate(polygons):
            simplified = part.simplify(0.00001, preserve_topology=True)
            if simplified.is_empty:
                continue
            ring = [(round(lon, 6), round(lat, 6)) for lon, lat in simplified.exterior.coords]
            features.append({
                "type": "Feature",
                "properties": {
                    "id": f"{feature_id}-{part_index}" if part_index else feature_id,
                    "name": tags.get("name"),
                    "buildingType": tags.get("building", "yes"),
                    "heightMeters": round(height_meters, 1),
                    "heightMethod": height_method,
                    "sourceId": SOURCE_ID,
                    "sourceStatus": "open-data",
                },
                "geometry": mapping(Polygon(ring)),
            })

    artifact = {
        "type": "FeatureCollection",
        "properties": {"wardCode": WARD_CODE, "wardName": WARD_NAME},
        "features": features,
    }
    output_path = OUTPUT / "daklak-buildings-buon-ma-thuot.json"
    write_json(output_path, artifact)
    artifact_bytes = output_path.read_bytes()
    runtime_path = ROOT / "public" / "data" / "daklak-buildings-buon-ma-thuot.json.gz"
    runtime_path.parent.mkdir(parents=True, exist_ok=True)
    runtime_path.write_bytes(gzip.compress(artifact_bytes, mtime=0))

    registry = [{
        "sourceId": SOURCE_ID,
        "sourceTitle": f"OpenStreetMap building-footprint snapshot for {WARD_NAME} (pilot ward)",
        "issuingAuthority": "OpenStreetMap contributors",
        "publishedAt": SNAPSHOT[:10],
        "accessedAt": SNAPSHOT[:10],
        "sourceUrl": "https://www.openstreetmap.org/copyright",
        "license": "Open Database License (ODbL) 1.0",
        "status": "open-data",
        "coverageNote": (
            f"Pilot: only ward {WARD_CODE} ({WARD_NAME}), clipped to its administrative boundary. "
            "Not a province-wide building layer."
        ),
        "methodologyNote": (
            "Footprints are real OSM way geometry. Heights are OSM height/building:levels tags "
            "where present, otherwise a documented per-type default level count "
            f"({METERS_PER_LEVEL}m/level) — see heightMethod on each feature. Illustrative "
            "massing, not surveyed building heights."
        ),
    }]
    write_json(OUTPUT / "building-source-registry.json", registry)
    metadata = {
        "generatedAt": SNAPSHOT[:10],
        "snapshotAt": SNAPSHOT,
        "sourceId": SOURCE_ID,
        "wardCode": WARD_CODE,
        "wardName": WARD_NAME,
        "query": query,
        "sourceChecksum": hashlib.sha256(raw).hexdigest(),
        "artifactChecksum": hashlib.sha256(artifact_bytes).hexdigest(),
        "crs": "EPSG:4326",
        "featureCount": len(features),
        "heightMethodCounts": height_methods,
        "skippedOpenWays": skipped_open_ways,
        "skippedInvalidGeometry": skipped_no_geometry,
        "rawBytes": len(artifact_bytes),
        "gzipBytes": len(gzip.compress(artifact_bytes)),
    }
    write_json(OUTPUT / "building-metadata.json", metadata)
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
