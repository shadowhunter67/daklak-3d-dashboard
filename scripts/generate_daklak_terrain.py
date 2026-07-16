"""Generate Đắk Lắk terrain textures from Mapzen Terrarium tiles on AWS Open Data."""
from __future__ import annotations
import io, json, math, urllib.request
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
from shapely.ops import unary_union
from gis_common import OUTPUT, read_source, write_json

ZOOM = 9
IMAGERY_ZOOM = 10
SIZE = 1024
CACHE = Path(__file__).resolve().parents[1] / "downloads" / "terrain"

def lonlat_to_pixel(lon: float, lat: float, zoom: int = ZOOM) -> tuple[float, float]:
    scale = 256 * 2**zoom
    x = (lon + 180) / 360 * scale
    sin_lat = math.sin(math.radians(lat))
    y = (0.5 - math.log((1 + sin_lat) / (1 - sin_lat)) / (4 * math.pi)) * scale
    return x, y

def tile(x: int, y: int) -> Image.Image:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{ZOOM}-{x}-{y}.png"
    if not path.exists():
        url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{ZOOM}/{x}/{y}.png"
        request = urllib.request.Request(url, headers={"User-Agent": "daklak-3d-dashboard/1.0"})
        with urllib.request.urlopen(request, timeout=45) as response:
            path.write_bytes(response.read())
    return Image.open(path).convert("RGB")

def imagery_tile(x: int, y: int) -> Image.Image:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"sentinel-2016-{IMAGERY_ZOOM}-{x}-{y}.jpg"
    if not path.exists():
        url = (
            "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/"
            f"default/g/{IMAGERY_ZOOM}/{y}/{x}.jpg"
        )
        request = urllib.request.Request(url, headers={"User-Agent": "daklak-3d-dashboard/1.0"})
        with urllib.request.urlopen(request, timeout=45) as response:
            path.write_bytes(response.read())
    return Image.open(path).convert("RGB")

def satellite_crop(bounds: tuple[float, float, float, float]) -> Image.Image:
    min_lon, min_lat, max_lon, max_lat = bounds
    left, bottom = lonlat_to_pixel(min_lon, min_lat, IMAGERY_ZOOM)
    right, top = lonlat_to_pixel(max_lon, max_lat, IMAGERY_ZOOM)
    x0, x1 = math.floor(left / 256), math.floor(right / 256)
    y0, y1 = math.floor(top / 256), math.floor(bottom / 256)
    mosaic = Image.new("RGB", ((x1-x0+1)*256, (y1-y0+1)*256))
    for x in range(x0, x1+1):
        for y in range(y0, y1+1):
            mosaic.paste(imagery_tile(x,y), ((x-x0)*256,(y-y0)*256))
    return mosaic.crop(
        (left-x0*256, top-y0*256, right-x0*256, bottom-y0*256)
    ).resize((SIZE,SIZE), Image.Resampling.LANCZOS)

def polygon_rings(geometry):
    if geometry.geom_type == "Polygon": return [geometry]
    if geometry.geom_type == "MultiPolygon": return list(geometry.geoms)
    if geometry.geom_type == "GeometryCollection":
        return [part for part in geometry.geoms if part.geom_type == "Polygon"]
    return []

def main() -> None:
    data = read_source()
    min_lon, min_lat, max_lon, max_lat = data.total_bounds
    left, bottom = lonlat_to_pixel(min_lon, min_lat)
    right, top = lonlat_to_pixel(max_lon, max_lat)
    x0, x1 = math.floor(left / 256), math.floor(right / 256)
    y0, y1 = math.floor(top / 256), math.floor(bottom / 256)
    mosaic = Image.new("RGB", ((x1-x0+1)*256, (y1-y0+1)*256))
    for x in range(x0, x1+1):
        for y in range(y0, y1+1): mosaic.paste(tile(x,y), ((x-x0)*256,(y-y0)*256))
    crop = mosaic.crop((left-x0*256, top-y0*256, right-x0*256, bottom-y0*256)).resize((SIZE,SIZE),Image.Resampling.BILINEAR)
    rgb = np.asarray(crop,dtype=np.float32)
    elevation = rgb[:,:,0]*256 + rgb[:,:,1] + rgb[:,:,2]/256 - 32768
    elevation = np.clip(elevation, 0, None)
    low, high = float(np.percentile(elevation,1)), float(np.percentile(elevation,99.5))
    normalized = np.clip((elevation-low)/max(high-low,1),0,1)
    height_image = Image.fromarray((normalized*255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(radius=1.8)
    )
    normalized = np.asarray(height_image, dtype=np.float32) / 255
    height_image.save(OUTPUT/"daklak-terrain-height.png",optimize=True)
    gy,gx=np.gradient(normalized); strength=5
    normals=np.dstack((-gx*strength,-gy*strength,np.ones_like(normalized)))
    normals/=np.linalg.norm(normals,axis=2,keepdims=True)
    Image.fromarray(((normals*.5+.5)*255).astype(np.uint8)).save(OUTPUT/"daklak-terrain-normal.png",optimize=True)
    # Multi-scale shaded relief: broad landforms plus fine ridges. This keeps the
    # surface readable from both the default camera and low grazing angles.
    broad = np.asarray(
        height_image.filter(ImageFilter.GaussianBlur(radius=12)), dtype=np.float32
    ) / 255
    fine = np.clip(normalized - broad, -0.18, 0.18)
    broad_gy, broad_gx = np.gradient(broad)
    north_west = np.clip(.76-broad_gx*5.6-broad_gy*6.4, .22, 1.18)
    south_east = np.clip(.78+broad_gx*2.4+broad_gy*2.0, .42, 1.08)
    relief = np.clip(north_west*.72+south_east*.28+fine*2.8, .24, 1.16)
    satellite = satellite_crop((min_lon, min_lat, max_lon, max_lat))
    satellite = ImageEnhance.Color(satellite).enhance(.92)
    satellite = ImageEnhance.Contrast(satellite).enhance(1.08)
    color = np.asarray(satellite, dtype=np.float32)
    # Preserve real land-cover detail; relief only modulates light by about 20%.
    relief_mix = np.clip(.82 + relief*.24, .72, 1.08)
    color=np.clip(color*relief_mix[:,:,None],0,255).astype(np.uint8)
    terrain_base = Image.fromarray(color)
    mask=Image.new("L",(SIZE,SIZE),0); draw=ImageDraw.Draw(mask)
    def point(coord):
        px,py=lonlat_to_pixel(coord[0],coord[1]); return ((px-left)/(right-left)*SIZE,(py-top)/(bottom-top)*SIZE)
    for geometry in data.geometry:
        for polygon in polygon_rings(geometry):
            draw.polygon([point(c) for c in polygon.exterior.coords],fill=255)
            for interior in polygon.interiors: draw.polygon([point(c) for c in interior.coords],fill=0)
    terrain_image = terrain_base
    border_draw = ImageDraw.Draw(terrain_image)
    for geometry in data.geometry:
        for polygon in polygon_rings(geometry):
            border_draw.line([point(c) for c in polygon.exterior.coords], fill=(86, 190, 151), width=1, joint="curve")
    for polygon in polygon_rings(unary_union(list(data.geometry))):
        border_draw.line([point(c) for c in polygon.exterior.coords], fill=(226, 187, 85), width=4, joint="curve")
    terrain_image.save(OUTPUT/"daklak-terrain-color.png",quality=90,optimize=True)
    mask.save(OUTPUT/"daklak-terrain-mask.png",optimize=True)
    write_json(OUTPUT/"daklak-terrain-metadata.json",{"source":"Mapzen Terrain Tiles / AWS Open Data","sourceUrl":"https://registry.opendata.aws/terrain-tiles/","primaryElevationSource":"NASA SRTM","surfaceImagery":"Sentinel-2 cloudless 2016 by EOX IT Services GmbH","surfaceImageryUrl":"https://s2maps.eu/","surfaceImageryLicense":"CC BY-SA 4.0","rendering":"satellite albedo with multi-scale multidirectional shaded relief","zoom":ZOOM,"imageryZoom":IMAGERY_ZOOM,"width":SIZE,"height":SIZE,"bbox":[min_lon,min_lat,max_lon,max_lat],"elevationMinMeters":round(low,1),"elevationMaxMeters":round(high,1)})
    print(f"Terrain generated: {low:.0f}–{high:.0f} m")

if __name__ == "__main__": main()
