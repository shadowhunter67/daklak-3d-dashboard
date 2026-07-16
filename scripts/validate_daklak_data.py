"""Fail-fast validation for product GIS artifacts."""
from __future__ import annotations
import json, time
import geopandas as gpd
from gis_common import OUTPUT, REPORTS, write_json

def main() -> None:
    started=time.perf_counter(); errors=[]; warnings=[]
    path=OUTPUT/"daklak-wards.geojson"
    if not path.exists(): raise SystemExit("Run build:gis first")
    data=gpd.read_file(path)
    if len(data)!=102: errors.append(f"Expected 102 features, got {len(data)}")
    if data.code.duplicated().any(): errors.append("Duplicate unit codes")
    if data.name.isna().any() or (data.name.str.strip()=="").any(): errors.append("Empty names")
    if data.geometry.is_empty.any(): errors.append("Empty geometry")
    invalid=int((~data.geometry.is_valid).sum())
    if invalid: errors.append(f"{invalid} invalid geometries")
    if set(data["type"])!={"xa","phuong"}: errors.append("Unexpected administrative type")
    counts=data["type"].value_counts().to_dict()
    if counts.get("xa")!=88 or counts.get("phuong")!=14: errors.append(f"Expected 88/14, got {counts}")
    if data.crs is None or data.crs.to_epsg()!=4326: errors.append(f"Expected EPSG:4326, got {data.crs}")
    minx,miny,maxx,maxy=data.total_bounds
    if not (107<minx<110 and 11<miny<14 and 107<maxx<110 and 11<maxy<14): errors.append("Bounding box outside plausible Đắk Lắk extent")
    overlaps=0
    spatial=data.sindex
    for i,geom in enumerate(data.geometry):
        for j in spatial.query(geom,predicate="intersects"):
            if j<=i: continue
            if geom.intersection(data.geometry.iloc[j]).area>1e-9: overlaps+=1
    if overlaps: warnings.append(f"{overlaps} polygon pairs have measurable overlap")
    report={"status":"failed" if errors else "passed","featureCount":len(data),"communeCount":counts.get("xa",0),"wardCount":counts.get("phuong",0),"crs":"EPSG:4326","bbox":[round(v,6) for v in data.total_bounds],"invalidGeometries":invalid,"overlapPairs":overlaps,"errors":errors,"warnings":warnings,"validationMs":round((time.perf_counter()-started)*1000,2)}
    write_json(REPORTS/"validation-report.json",report)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if errors: raise SystemExit(1)

if __name__=="__main__": main()
