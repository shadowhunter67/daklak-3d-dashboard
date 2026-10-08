"""Cắt DEM thật (SRTM qua Mapzen, 1024², ~200 m/điểm ảnh) quanh vài địa danh thành lưới nhỏ cho diorama.

Đầu ra: src/features/destination-diorama/demCrops.ts (mét so với mực biển, làm tròn 6,3 m/mức do DEM 8-bit).
Chạy lại: python scripts/generate_diorama_dem.py
"""
import base64
import json
from pathlib import Path

import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent
meta = json.loads((root / "src/assets/maps/daklak/daklak-metadata.json").read_text(encoding="utf-8"))
SIZE = 40  # 40 điểm ảnh ≈ 8 km
SITES = {
    "nui-da-bia": (109.40138888889, 12.898611111111),
    "cao-nguyen-van-hoa": (109.128866, 13.163999),
}
info = next(
    json.loads(p.read_text(encoding="utf-8"))
    for p in (root / "src/assets/maps/daklak").glob("*.json")
    if "elevationMaxMeters" in p.read_text(encoding="utf-8")
)
bbox, emin, emax = info["bbox"], info["elevationMinMeters"], info["elevationMaxMeters"]
img = np.array(Image.open(root / "src/assets/maps/daklak/daklak-terrain-height.png")).astype(float)
h, w = img.shape
out = {}
for site, (lon, lat) in SITES.items():
    cx = (lon - bbox[0]) / (bbox[2] - bbox[0]) * (w - 1)
    cy = (bbox[3] - lat) / (bbox[3] - bbox[1]) * (h - 1)
    x0, y0 = int(round(cx)) - SIZE // 2, int(round(cy)) - SIZE // 2
    crop = img[y0 : y0 + SIZE, x0 : x0 + SIZE]
    meters = emin + crop / 255.0 * (emax - emin)
    out[site] = (meters, float(meters.max()), float(meters.min()))
    print(site, "min", round(meters.min()), "max", round(meters.max()), "centre", round(meters[SIZE // 2, SIZE // 2]))

lines = [
    "// TỰ SINH bởi scripts/generate_diorama_dem.py — đừng sửa tay.",
    "// DEM: NASA SRTM (~2000) qua Mapzen Terrain Tiles / AWS Open Data; ~200 m/điểm ảnh, 8-bit (~6,3 m/mức).",
    "export const DEM_CROP_SIZE = %d;" % SIZE,
    "export const DEM_METERS_PER_CELL = %.1f;"
    % (((bbox[2] - bbox[0]) * 111320 * np.cos(np.radians(12.9))) / (w - 1)),
    "/** Độ cao (mét) theo hàng, mã hoá base64 của Uint16 little-endian. */",
    "export const DEM_CROPS: Record<string, string> = {",
]
for site, (m, _, _) in out.items():
    raw = np.round(m).astype("<u2").tobytes()
    lines.append(f"  '{site}': '{base64.b64encode(raw).decode()}',")
lines.append("};")
(root / "src/features/destination-diorama/demCrops.ts").write_text("\n".join(lines) + "\n", encoding="utf-8")
