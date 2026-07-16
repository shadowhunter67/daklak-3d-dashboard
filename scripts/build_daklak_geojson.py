"""Build static frontend artifacts from the licensed upstream ward files."""
from __future__ import annotations
from datetime import date
import time
from shapely import get_parts, make_valid
from shapely.geometry import MultiPolygon, Polygon
from shapely.ops import unary_union
from gis_common import OUTPUT, REPORTS, read_source, write_json, geo_mapping

def main() -> None:
    started = time.perf_counter()
    data = read_source()
    data["geometry"] = data.geometry.map(make_valid)
    data["code"] = data["code"].astype(str).str.zfill(5)
    data["provinceCode"] = "66"
    data["type"] = data["fullName"].map(lambda value: "phuong" if str(value).startswith("Phường") else "xa")
    columns = ["code", "name", "type", "provinceCode", "areaKm2", "geometry"]
    output_data = data[columns].copy()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    output_data.to_file(OUTPUT / "daklak-wards.geojson", driver="GeoJSON", coordinate_precision=6)
    # Vite imports JSON natively; retain the canonical .geojson and a byte-identical module copy.
    (OUTPUT / "daklak-wards.json").write_bytes((OUTPUT / "daklak-wards.geojson").read_bytes())
    # Visual-only LOD: canonical GIS above remains unchanged and is what validation checks.
    render_data = output_data.copy()
    def render_geometry(geometry):
        polygon_parts = [part for part in get_parts(geometry) if isinstance(part, (Polygon, MultiPolygon))]
        if not polygon_parts:
            return Polygon()
        return unary_union(polygon_parts).simplify(0.0005, preserve_topology=True)
    render_data["geometry"] = render_data.geometry.map(render_geometry)
    render_data.to_file(OUTPUT / "daklak-wards-render.json", driver="GeoJSON", coordinate_precision=5)
    outline = unary_union(list(output_data.geometry))
    write_json(OUTPUT / "daklak-outline.geojson", {"type":"FeatureCollection","features":[{"type":"Feature","properties":{"provinceCode":"66"},"geometry":geo_mapping(outline)}]})
    boundaries = unary_union([geom.boundary for geom in output_data.geometry])
    write_json(OUTPUT / "daklak-borders.geojson", {"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":geo_mapping(boundaries)}]})
    labels = {}
    for row in output_data.itertuples():
        point = row.geometry.representative_point()
        labels[row.code] = {"name": row.name, "longitude": round(point.x,6), "latitude": round(point.y,6), "priority": 1 if row.type == "phuong" else 2}
    write_json(OUTPUT / "daklak-labels.json", labels)
    override_path = OUTPUT / "daklak-label-overrides.json"
    if not override_path.exists(): write_json(override_path, {})
    minx, miny, maxx, maxy = output_data.total_bounds
    commune_count = int((output_data["type"] == "xa").sum())
    ward_count = int((output_data["type"] == "phuong").sum())
    metadata = {"provinceCode":"66","provinceName":"Đắk Lắk","totalUnits":len(output_data),"communeCount":commune_count,"wardCount":ward_count,"bbox":[round(x,6) for x in [minx,miny,maxx,maxy]],"center":[round((minx+maxx)/2,6),round((miny+maxy)/2,6)],"coordinateSystem":"EPSG:4326","generatedAt":date.today().isoformat(),"disclaimer":"Dữ liệu trực quan tham khảo; không dùng để xác lập địa giới pháp lý."}
    write_json(OUTPUT / "daklak-metadata.json", metadata)
    write_json(OUTPUT / "daklak-source-summary.json", {"geometrySource":"thanglequoc/vietnamese-provinces-database","geometryLicense":"MIT","legalNames":"Nghị quyết 1660/NQ-UBTVQH15","unitCodes":"Quyết định 19/2025/QĐ-TTg","sourceSnapshot":"1253e2ad7933bcc59a5b68a03a81b532cd939e3e"})
    metrics = {row.code:{"population":int(6500+(int(row.code)*791)%61500),"coverage":round(45+(int(row.code)*17)%510/10,1),"growth":round(-1.5+(int(row.code)*13)%80/10,1)} for row in output_data.itertuples()}
    write_json(OUTPUT / "daklak-metrics.json", metrics)
    REPORTS.mkdir(exist_ok=True)
    write_json(REPORTS / "build-metrics.json", {"parseAndBuildMs":round((time.perf_counter()-started)*1000,2),"features":len(output_data)})
    print(f"Built {len(output_data)} units in {time.perf_counter()-started:.2f}s")

if __name__ == "__main__": main()
