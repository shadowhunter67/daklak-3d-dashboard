# -*- coding: utf-8 -*-
"""
Trich xuat du lieu bang tu 6 phu luc Quyet dinh 1985/QD-UBND (24/06/2026)
- Danh muc du an thu hut dau tu giai doan 2026-2030 tinh Dak Lak (Dot 1)
Nguon: https://vpubnd.daklak.gov.vn/Documents/Detail/11262

Ghi chu quan trong (ADR 0004 muc 5): PDF goc KHONG duoc commit vao repo.
Script nay tu tai lai PDF tu URL chinh thuc vao thu muc cwd truoc khi trich
xuat, roi xoa PDF sau khi xong (chi giu lai JSON/CSV da trich xuat).
Yeu cau: `pip install pymupdf`, co ket noi mang toi vpubnd.daklak.gov.vn.
Xem README.md cung thu muc de biet trang thai review (bang chung tho,
CHUA duyet dua vao pipeline data-refresh).
"""
import json
import csv
import re
import os
import urllib.request
import fitz  # PyMuPDF

ROMAN_RE = re.compile(r"^(?:M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3}))$")

COLUMNS = [
    "stt", "ten_du_an", "dia_diem", "dien_tich_ha", "tong_von_ty",
    "nguon_goc_dat", "hien_trang_sdd", "quy_mo_dau_tu",
    "quyet_dinh_quy_hoach", "dieu_kien_ha_tang", "hinh_thuc_dau_tu_gpmb",
    "ghi_chu",
]

BASE_URL = "https://vpubnd.daklak.gov.vn/CMS/Content/VanBan/2026/6.2026/1985-Q%C4%90-UBND%20PL{n}.pdf"

FILES = [
    ("PL1", "1985-PL1.pdf"),
    ("PL2", "1985-PL2.pdf"),
    ("PL3", "1985-PL3.pdf"),  # CANH BAO: trung byte-for-byte voi PL2 tren chinh server nguon, xem README.md
    ("PL4", "1985-PL4.pdf"),
    ("PL5", "1985-PL5.pdf"),
    ("PL6", "1985-PL6.pdf"),
]


def download_if_missing(fname, n):
    if os.path.exists(fname):
        return
    url = BASE_URL.format(n=n)
    print(f"Đang tải {fname} từ {url} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp, open(fname, "wb") as f:
        f.write(resp.read())


def clean(cell):
    if cell is None:
        return ""
    return re.sub(r"\s+", " ", cell.replace("\n", " ")).strip()


def is_roman(s):
    return bool(s) and bool(ROMAN_RE.match(s.strip()))


def is_index_label_row(row):
    """Dong nhan cot '1 2 3 4 5 6 7 8 9 10 11 12' lap lai duoi header."""
    vals = [clean(c) for c in row]
    non_empty = [v for v in vals if v]
    if len(non_empty) < 6:
        return False
    try:
        nums = [int(v) for v in non_empty]
    except ValueError:
        return False
    return nums == list(range(1, len(nums) + 1))


def extract_pdf(path, linh_vuc_label):
    doc = fitz.open(path)
    heading = doc[0].get_text()
    # tieu de linh vuc lay tu dong dau co chua "LĨNH VỰC"
    m = re.search(r"LĨNH VỰC[^\n]*", heading)
    linh_vuc = m.group(0).strip() if m else linh_vuc_label

    records = []
    current_group = ""
    seen_stt = set()

    for page in doc:
        tabs = page.find_tables()
        for t in tabs.tables:
            for row in t.extract():
                c0 = clean(row[0]) if len(row) > 0 else ""
                c1 = clean(row[1]) if len(row) > 1 else ""

                if c0 == "STT" or not (c0 or c1):
                    continue
                if is_index_label_row(row):
                    continue
                if is_roman(c0) and c1:
                    current_group = c1
                    continue
                if not c0.isdigit():
                    continue

                stt = int(c0)
                if stt in seen_stt:
                    continue  # phong khi 1 trang bi doc trung boi 2 table overlap
                seen_stt.add(stt)

                rec = {"linh_vuc": linh_vuc, "nhom": current_group}
                for i, key in enumerate(COLUMNS):
                    val = clean(row[i]) if i < len(row) else ""
                    rec[key] = val
                rec["stt"] = stt
                records.append(rec)
    return records, linh_vuc


def main():
    all_records = []
    seen_hash = {}
    summary = []

    for n, (label, fname) in enumerate(FILES, start=1):
        download_if_missing(fname, n)

        import hashlib
        h = hashlib.md5(open(fname, "rb").read()).hexdigest()
        if h in seen_hash:
            print(f"[CANH BAO] {fname} trung noi dung byte-for-byte voi {seen_hash[h]} "
                  f"- bo qua de tranh nhan doi du lieu (loi tu phia nguon, khong phai loi script).")
            summary.append((label, fname, 0, "DUPLICATE của " + seen_hash[h]))
            continue
        seen_hash[h] = fname

        recs, linh_vuc = extract_pdf(fname, label)
        for r in recs:
            r["phu_luc"] = label
        all_records.extend(recs)
        summary.append((label, fname, len(recs), linh_vuc))

    all_records.sort(key=lambda r: (r["phu_luc"], r["stt"]))

    with open("1985-danh-muc-du-an.json", "w", encoding="utf-8") as f:
        json.dump(all_records, f, ensure_ascii=False, indent=2)

    fieldnames = ["phu_luc", "linh_vuc", "nhom", "stt"] + COLUMNS[1:]
    with open("1985-danh-muc-du-an.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in all_records:
            w.writerow({k: r.get(k, "") for k in fieldnames})

    print(f"\nTONG SO DU AN TRICH XUAT: {len(all_records)}\n")
    print(f"{'Phu luc':<8}{'File':<16}{'So dong':<10}Linh vuc / ghi chu")
    for label, fname, n, lv in summary:
        print(f"{label:<8}{fname:<16}{n:<10}{lv}")

    # PDF goc khong duoc commit (ADR 0004 muc 5) - don sau khi trich xuat xong.
    for _, fname in FILES:
        if os.path.exists(fname):
            os.remove(fname)


if __name__ == "__main__":
    main()
