"""Sinh src/features/destination-diorama/realFootprints.ts từ đường viền OpenStreetMap (© OpenStreetMap contributors, ODbL).

Đầu vào: JSON do truy vấn Overpass (way["building"|"bridge"] quanh toạ độ điểm đến) lưu ở đường dẫn tham số.
Đầu ra: đa giác theo mét (x = đông, y = bắc) quanh trọng tâm, làm tròn 0,5 m, đã đơn giản hoá (Douglas-Peucker 0,8 m).
Chạy: python scripts/generate_real_footprints.py <osm_footprints.json>
"""
import json
import math
import sys
from pathlib import Path

PICK = {
    "bao-tang-dak-lak": "Bảo tàng Đắk Lắk",
    "lang-ca-phe-trung-nguyen": "Bảo tàng Thế giới Cà phê",
}
LINES = {"cau-ong-cop": "Cầu gỗ Ông Cọp"}


def simplify(points, tol):
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy) or 1e-9
    best, idx = 0, 0
    for i, (x, y) in enumerate(points[1:-1], 1):
        d = abs(dy * (x - x1) - dx * (y - y1)) / norm
        if d > best:
            best, idx = d, i
    if best > tol:
        return simplify(points[: idx + 1], tol)[:-1] + simplify(points[idx:], tol)
    return [points[0], points[-1]]


data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
out = {}
for site, name in PICK.items():
    entry = data[site]
    way = next(w for w in entry["ways"] if w["tags"].get("name") == name)
    lat0 = math.radians(entry["lat"])
    pts = [((lon - entry["lon"]) * 111320 * math.cos(lat0), (lat - entry["lat"]) * 110574) for lon, lat in way["geom"]]
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    pts = [(x - cx, y - cy) for x, y in pts]
    far = max(range(len(pts)), key=lambda i: math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]))
    first = simplify(pts[: far + 1], 0.8)
    second = simplify(pts[far:] + [pts[0]], 0.8)
    simp = first[:-1] + second[:-1]
    out[site] = [[round(x * 2) / 2, round(y * 2) / 2] for x, y in simp]
    print(site, len(way["geom"]), "->", len(simp), "điểm")
lines_out = {}
for site, name in LINES.items():
    entry = data[site]
    way = next(w for w in entry["ways"] if w["tags"].get("name") == name)
    lat0 = math.radians(entry["lat"])
    pts = [((lon - entry["lon"]) * 111320 * math.cos(lat0), (lat - entry["lat"]) * 110574) for lon, lat in way["geom"]]
    lines_out[site] = [[round(x * 2) / 2, round(y * 2) / 2] for x, y in pts]
lines = [
    "// TỰ SINH bởi scripts/generate_real_footprints.py — đừng sửa tay.",
    "// Nguồn: © OpenStreetMap contributors (ODbL). Đa giác theo mét quanh trọng tâm: x = đông, y = bắc.",
    "export const REAL_FOOTPRINTS: Record<string, Array<[number, number]>> = {",
]
for site, poly in out.items():
    lines.append(f"  '{site}': {json.dumps(poly)},")
lines.append("};")
lines.append("/** Đường tim (không phải đa giác kín), mét quanh điểm đến: x = đông, y = bắc. */")
lines.append("export const REAL_LINES: Record<string, Array<[number, number]>> = {")
for site, line in lines_out.items():
    lines.append(f"  '{site}': {json.dumps(line)},")
lines.append("};")
Path(__file__).resolve().parent.parent.joinpath("src/features/destination-diorama/realFootprints.ts").write_text("\n".join(lines) + "\n", encoding="utf-8")
