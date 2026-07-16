from gis_common import read_source
d=read_source(); print(d[["code","fullName","areaKm2"]].to_string(index=False)); print(d.crs,d.total_bounds)
