"""Fail-fast validation for product GIS artifacts."""
from __future__ import annotations
import hashlib, json, time
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
    codes=set(data.code.astype(str))
    metadata_path=OUTPUT/"daklak-metadata.json"
    metrics_path=OUTPUT/"daklak-metrics.json"
    source_path=OUTPUT/"daklak-source-summary.json"
    for artifact in (metadata_path,metrics_path,source_path):
        if not artifact.exists(): errors.append(f"Missing artifact: {artifact.name}")
    metadata=json.loads(metadata_path.read_text(encoding="utf-8")) if metadata_path.exists() else {}
    metrics=json.loads(metrics_path.read_text(encoding="utf-8")) if metrics_path.exists() else {}
    source=json.loads(source_path.read_text(encoding="utf-8")) if source_path.exists() else {}
    labels_path=OUTPUT/"daklak-labels.json"
    labels=json.loads(labels_path.read_text(encoding="utf-8")) if labels_path.exists() else {}
    provenance_path=OUTPUT.parent.parent/"data"/"metric-provenance.json"
    provenance=json.loads(provenance_path.read_text(encoding="utf-8")) if provenance_path.exists() else {}
    if metadata.get("totalUnits")!=len(data): errors.append("Metadata totalUnits does not match geometry")
    if set(metrics)!=codes: errors.append("Metric codes do not exactly match geometry codes")
    if set(labels)!=codes: errors.append("Label codes do not exactly match geometry codes")
    required_metric_fields={"population","coverage","growth"}
    incomplete=[code for code,value in metrics.items() if not required_metric_fields.issubset(value)]
    if incomplete: errors.append(f"Metrics missing required fields for {len(incomplete)} units")
    outside_labels=[]
    by_code=data.set_index(data.code.astype(str))
    for code, label in labels.items():
        if code in by_code.index:
            from shapely.geometry import Point
            if not by_code.loc[code].geometry.covers(Point(label["longitude"], label["latitude"])):
                outside_labels.append(code)
    if outside_labels: errors.append(f"{len(outside_labels)} labels fall outside their geometry")
    required_provenance={"status","period","sourceName","sourceUrl","retrievedAt"}
    if not provenance: errors.append("Metric provenance is missing")
    for metric, record in provenance.items():
        missing=required_provenance-set(record)
        if missing: errors.append(f"Provenance {metric} missing: {sorted(missing)}")
        if record.get("status") not in {"official","illustrative","mixed"}:
            errors.append(f"Provenance {metric} has invalid status")
    snapshot=source.get("sourceSnapshot","")
    if len(snapshot)!=40 or any(char not in "0123456789abcdef" for char in snapshot.lower()):
        errors.append("Source snapshot must be a 40-character git commit")
    minx,miny,maxx,maxy=data.total_bounds
    if not (107<minx<110 and 11<miny<14 and 107<maxx<110 and 11<maxy<14): errors.append("Bounding box outside plausible Đắk Lắk extent")
    overlaps=0
    spatial=data.sindex
    for i,geom in enumerate(data.geometry):
        for j in spatial.query(geom,predicate="intersects"):
            if j<=i: continue
            if geom.intersection(data.geometry.iloc[j]).area>1e-9: overlaps+=1
    if overlaps: warnings.append(f"{overlaps} polygon pairs have measurable overlap")
    hash_paths=[path, metadata_path, metrics_path, source_path, labels_path, provenance_path]
    artifact_hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in hash_paths if p.exists()}
    report={"status":"failed" if errors else "passed","featureCount":len(data),"communeCount":counts.get("xa",0),"wardCount":counts.get("phuong",0),"crs":"EPSG:4326","bbox":[round(v,6) for v in data.total_bounds],"invalidGeometries":invalid,"outsideLabels":len(outside_labels),"overlapPairs":overlaps,"provenanceRecords":len(provenance),"artifactHashes":artifact_hashes,"errors":errors,"warnings":warnings,"validationMs":round((time.perf_counter()-started)*1000,2)}
    write_json(REPORTS/"validation-report.json",report)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if errors: raise SystemExit(1)

if __name__=="__main__": main()
