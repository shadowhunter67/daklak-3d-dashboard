"""Shared deterministic GIS helpers for the Đắk Lắk build pipeline."""
from __future__ import annotations
import json
from pathlib import Path
import geopandas as gpd

ROOT = Path(__file__).resolve().parents[1]
SOURCE_CONFIG = json.loads((ROOT / "scripts" / "gis-source.json").read_text(encoding="utf-8"))
SOURCE = ROOT / ".cache" / "gis-source" / "repository" / SOURCE_CONFIG["sourcePath"]
OUTPUT = ROOT / "src" / "assets" / "maps" / "daklak"
REPORTS = ROOT / "reports"

def read_source() -> gpd.GeoDataFrame:
    files = sorted((SOURCE / "wards").glob("*.geojson"))
    if not files:
        raise FileNotFoundError(f"Không tìm thấy nguồn GeoJSON: {SOURCE}")
    frames = [gpd.read_file(path) for path in files]
    data = gpd.GeoDataFrame(__import__('pandas').concat(frames, ignore_index=True), crs=frames[0].crs)
    if data.crs is None:
        data = data.set_crs("EPSG:4326")
    return data.to_crs("EPSG:4326")

def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

def geo_mapping(geometry) -> dict:
    from shapely.geometry import mapping
    return mapping(geometry)
