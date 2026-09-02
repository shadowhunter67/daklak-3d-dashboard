"""Derive the osmium-extract clip polygon + config for the detail-map PMTiles pipeline from this
project's own pinned province outline — reusing gis_common.py's ground truth rather than
hand-typing a bbox/polygon. See docs/detail-map-integration.md for the full pipeline this feeds.

`daklak-outline.geojson` (src/assets/maps/daklak/) is already the unary_union of every ward's
geometry, built deterministically by build_daklak_geojson.py from the pinned gis-source.json
snapshot — the same ground truth build_daklak_roads.py/build_daklak_buildings.py derive their own
clip geometry from. This script buffers it outward (so a road/building running along the province
border isn't chopped mid-way by osmium's complete_ways strategy) and simplifies it (osmium's
point-in-polygon test over the raw multi-hundred-vertex union is otherwise the slowest step of the
extract) before writing the two files osmium's `extract --config` expects.
"""
from __future__ import annotations
import hashlib, json
from pathlib import Path

from shapely.geometry import mapping, shape

from gis_common import OUTPUT, ROOT, write_json

CACHE = ROOT / ".cache" / "osm-pbf"
BUFFER_DEG = 0.005  # ~550m outward — keeps border-crossing ways whole; tippecanoe clips tiles later
SIMPLIFY_DEG = 0.0005  # ~55m — far finer than the buffer, so this cannot lose real coverage
# Container-side paths baked into the osmium extract config — this pipeline's own fixed contract
# with the Docker stage (see docs/detail-map-integration.md's Stage B), not a real host path.
CONTAINER_INPUT_DIR = "/data"
CONTAINER_OUTPUT_DIR = "/data/out"


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def main() -> None:
    outline = json.loads((OUTPUT / "daklak-outline.geojson").read_text(encoding="utf-8"))
    geometry = shape(outline["features"][0]["geometry"])
    original_vertex_count = sum(len(ring.coords) for poly in _polygons(geometry) for ring in _rings(poly))

    clip = geometry.buffer(BUFFER_DEG).simplify(SIMPLIFY_DEG, preserve_topology=True).buffer(0)
    simplified_vertex_count = sum(len(ring.coords) for poly in _polygons(clip) for ring in _rings(poly))

    CACHE.mkdir(parents=True, exist_ok=True)
    polygon_path = CACHE / "daklak-extract-polygon.geojson"
    write_json(
        polygon_path,
        {"type": "Feature", "properties": {"provinceCode": "66"}, "geometry": mapping(clip)},
    )

    config_path = CACHE / "extract-config.json"
    write_json(
        config_path,
        {
            "directory": CONTAINER_OUTPUT_DIR,
            "extracts": [
                {
                    "output": "daklak.osm.pbf",
                    "output_format": "pbf",
                    "description": "Đắk Lắk province, clipped from the pinned Geofabrik Vietnam extract",
                    "polygon": {
                        "file_name": f"{CONTAINER_INPUT_DIR}/daklak-extract-polygon.geojson",
                        "file_type": "geojson",
                    },
                }
            ],
        },
    )

    bounds = clip.bounds  # (minx, miny, maxx, maxy)
    summary = {
        "originalVertexCount": original_vertex_count,
        "simplifiedVertexCount": simplified_vertex_count,
        "bufferDegrees": BUFFER_DEG,
        "simplifyDegrees": SIMPLIFY_DEG,
        "areaSqDegrees": round(clip.area, 6),
        "bounds": {"west": bounds[0], "south": bounds[1], "east": bounds[2], "north": bounds[3]},
        "polygonFileSha256": sha256_of(polygon_path),
        "configFileSha256": sha256_of(config_path),
    }
    print(json.dumps(summary, indent=2, ensure_ascii=False))


def _polygons(geometry):
    return geometry.geoms if geometry.geom_type == "MultiPolygon" else [geometry]


def _rings(polygon):
    return [polygon.exterior, *polygon.interiors]


if __name__ == "__main__":
    main()
