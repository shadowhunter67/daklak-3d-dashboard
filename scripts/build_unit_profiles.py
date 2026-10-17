"""Build `daklak-unit-profile.json`: real per-unit population (2025) and village/neighbourhood counts.

Offline step (like the other GIS scripts) — the browser only reads the generated artifact.

Source: Vietnamese Wikipedia, "Danh sách đơn vị hành chính thuộc tỉnh Đắk Lắk" (CC BY-SA 4.0). Its
area/population columns cite the Ministry of Home Affairs document 2896/BNV-CQĐP (27 May 2025);
the self-governing-unit column is updated to 15 March 2026 and cites provincial/ministry sources.

Two-source rule (same as the tourism dataset): a unit is accepted only when its area agrees with
the independent `areaKm2` already in `daklak-wards-render.json` (tolerance 0.02 km²), and the sums
must reproduce the page's own totals (102 units, 18,096.4 km², 3,346,853 people, 2,795 sub-units).
Any mismatch aborts the build instead of shipping an approximated number.

Usage:  python scripts/build_unit_profiles.py [--wikitext PATH] [--revision-id ID --revision-ts TS]
        (without --wikitext it downloads the page; the raw page is NOT committed)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'src' / 'assets' / 'maps' / 'daklak'
PAGE_TITLE = 'Danh sách đơn vị hành chính thuộc tỉnh Đắk Lắk'
SECTION = '== Danh sách các đơn vị hành chính của tỉnh Đắk Lắk hiện nay =='
UA = 'daklak-3d-dashboard-data-build/1.0 (repo: shadowhunter67/daklak-3d-dashboard)'
AREA_TOLERANCE_KM2 = 0.02
# Known internal inconsistencies of the source page, kept explicit instead of silently patched:
# the itemised list is used (what can actually be counted); the declared figure is recorded.
SOURCE_INCONSISTENCIES = {
    'Cư Bao': 'Trang nguồn ghi 45 đơn vị tự quản nhưng chỉ liệt kê 34 tổ dân phố + 10 buôn (= 44); dùng số liệt kê.',
}
KINDS = {
    'thon': 'thôn',
    'buon': 'buôn',
    'toDanPho': 'tổ dân phố',
    'khuPho': 'khu phố',
}


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode('utf8')


def page_url(**params: str) -> str:
    return 'https://vi.wikipedia.org/w/index.php?' + urllib.parse.urlencode({'title': PAGE_TITLE, **params})


def revision_info() -> tuple[str, str]:
    api = 'https://vi.wikipedia.org/w/api.php?' + urllib.parse.urlencode(
        {
            'action': 'query',
            'prop': 'revisions',
            'rvprop': 'ids|timestamp',
            'titles': PAGE_TITLE,
            'format': 'json',
        }
    )
    pages = json.loads(fetch(api))['query']['pages']
    revision = next(iter(pages.values()))['revisions'][0]
    return str(revision['revid']), revision['timestamp']


def number(text: str) -> float:
    return float(text.strip().replace('.', '').replace(',', '.'))


def normalize(text: str) -> str:
    text = unicodedata.normalize('NFD', text.lower().replace('đ', 'd'))
    text = ''.join(ch for ch in text if unicodedata.category(ch) != 'Mn')
    return re.sub(r"[^a-z0-9]+", ' ', text).strip()


def strip_refs(text: str) -> str:
    text = re.sub(r'<ref[^>]*/>', '', text)
    return re.sub(r'<ref.*?</ref>', '', text, flags=re.S)


def link_text(cell: str) -> str:
    """'Phường [[Buôn Hồ (phường)|Buôn Hồ]]' -> ('phuong', 'Buôn Hồ')."""
    cell = strip_refs(cell).strip()
    kind = 'phuong' if cell.lower().startswith('phường') else 'xa'
    match = re.search(r'\[\[(?:[^\]|]*\|)?([^\]]+)\]\]', cell)
    name = match.group(1) if match else re.sub(r'^(Phường|Xã)\s+', '', cell)
    return kind, name.strip()


def parse_units(wikitext: str) -> tuple[list[dict], dict]:
    start = wikitext.index(SECTION)
    end = wikitext.index('\n|}', start)
    rows = wikitext[start:end].split('\n|-\n')[1:]
    units: list[dict] = []
    totals: dict = {}
    for row in rows:
        cells = [strip_refs(c).strip() for c in row.split('\n|')]
        if cells[0].lstrip('|').strip() == 'Tổng cộng':
            totals = {
                'areaKm2': number(cells[2]),
                'population': int(number(cells[3])),
                'subUnits': int(re.search(r'([\d\.]+)', cells[4]).group(1).replace('.', '')),
            }
            continue
        kind, name = link_text(cells[1])
        detail = cells[4] if len(cells) > 4 else ''
        counts = {key: 0 for key in KINDS}
        # "gồm 40 tổ dân phố: ... và 6 buôn: ..." or "Được chia thành 23 khu phố: ..." (no breakdown).
        head = re.match(r'Được chia thành\s+([\d\.]+)\s+([^:,]*?)(?::|,|$)', detail)
        breakdown = re.findall(r'(?:gồm|và|,)\s+([\d\.]+)\s+(tổ dân phố|khu phố|thôn|buôn)\b(?!\s*-)', detail)
        # "gồm thôn Thống Nhất và buôn M'Um": a single unit named without a number.
        singles = re.findall(r'(?:gồm|và)\s+(tổ dân phố|khu phố|thôn|buôn)\s+(?!\d)[A-ZĐÀ-Ỹ]', detail)
        if breakdown or singles:
            for amount, label in breakdown:
                counts[next(k for k, v in KINDS.items() if v == label)] += int(amount.replace('.', ''))
            for label in singles:
                counts[next(k for k, v in KINDS.items() if v == label)] += 1
        elif head:
            labels = [label for label in KINDS.values() if label in head.group(2)]
            if len(labels) == 1:
                counts[next(k for k, v in KINDS.items() if v == labels[0])] = int(head.group(1).replace('.', ''))
        units.append(
            {
                'order': int(cells[0].lstrip('|')),
                'type': kind,
                'name': name,
                'areaKm2': number(cells[2]),
                'population': int(number(cells[3])),
                'declaredSubUnits': int(head.group(1).replace('.', '')) if head else None,
                'counts': counts,
            }
        )
    return units, totals


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--wikitext', type=Path)
    parser.add_argument('--revision-id')
    parser.add_argument('--revision-ts')
    args = parser.parse_args()

    if args.wikitext:
        wikitext = args.wikitext.read_text(encoding='utf8')
        revision_id, revision_ts = args.revision_id or 'unknown', args.revision_ts or 'unknown'
    else:
        revision_id, revision_ts = revision_info()
        wikitext = fetch(page_url(action='raw', oldid=revision_id))
    digest = hashlib.sha256(wikitext.encode('utf8')).hexdigest()

    units, totals = parse_units(wikitext)
    wards = json.loads((ASSETS / 'daklak-wards-render.json').read_text(encoding='utf8'))['features']
    by_key = {(w['properties']['type'], normalize(w['properties']['name'])): w['properties'] for w in wards}

    errors: list[str] = []
    profiles: dict[str, dict] = {}
    for unit in units:
        props = by_key.get((unit['type'], normalize(unit['name'])))
        if props is None:
            errors.append(f"no ward match for {unit['type']} {unit['name']}")
            continue
        if abs(props['areaKm2'] - unit['areaKm2']) > AREA_TOLERANCE_KM2:
            errors.append(f"{unit['name']}: area {unit['areaKm2']} vs geometry-source {props['areaKm2']}")
        sub_total = sum(unit['counts'].values())
        if (
            unit['declaredSubUnits'] is not None
            and sub_total != unit['declaredSubUnits']
            and unit['name'] not in SOURCE_INCONSISTENCIES
        ):
            errors.append(f"{unit['name']}: declared {unit['declaredSubUnits']} sub-units, parsed {sub_total}")
        profiles[props['code']] = {
            'name': props['name'],
            'type': unit['type'],
            'population2025': unit['population'],
            'areaKm2': unit['areaKm2'],
            'villages': unit['counts']['thon'],
            'buon': unit['counts']['buon'],
            'residentialGroups': unit['counts']['toDanPho'],
            'neighbourhoods': unit['counts']['khuPho'],
        }

    if len(profiles) != len(wards):
        errors.append(f'{len(profiles)} profiles for {len(wards)} geometry units')
    if len(units) != 102:
        errors.append(f'expected 102 units, parsed {len(units)}')
    sums = {
        'areaKm2': round(sum(u['areaKm2'] for u in units), 1),
        'population': sum(u['population'] for u in units),
        'subUnits': sum(sum(u['counts'].values()) for u in units),
    }
    # The page's own "Tổng cộng" row is not always the exact sum of its rows (population differs by
    # <0.1%): that is a property of the source, so it is recorded in the provenance, not hidden.
    tolerance = {'areaKm2': 0.15, 'population': totals['population'] * 0.001, 'subUnits': len(SOURCE_INCONSISTENCIES)}
    for key in ('areaKm2', 'population', 'subUnits'):
        if abs(sums[key] - totals[key]) > tolerance[key]:
            errors.append(f'sum {key}={sums[key]} but page total is {totals[key]}')
    if errors:
        print('\n'.join(['ABORT — not writing artifacts:'] + errors[:40]), file=sys.stderr)
        return 1

    ordered = dict(sorted(profiles.items()))
    (ASSETS / 'daklak-unit-profile.json').write_text(
        json.dumps(ordered, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf8'
    )
    provenance = {
        'dataset': 'daklak-unit-profile',
        'description': 'Quy mô dân số năm 2025 và số thôn/buôn/tổ dân phố/khu phố của 102 xã, phường Đắk Lắk.',
        'status': 'real',
        'source': {
            'title': PAGE_TITLE,
            'publisher': 'Wikipedia tiếng Việt (CC BY-SA 4.0)',
            'url': 'https://vi.wikipedia.org/wiki/' + urllib.parse.quote(PAGE_TITLE.replace(' ', '_')),
            'permalink': f'https://vi.wikipedia.org/w/index.php?title={urllib.parse.quote(PAGE_TITLE.replace(" ", "_"))}&oldid={revision_id}',
            'revisionId': revision_id,
            'revisionTimestamp': revision_ts,
            'sha256OfWikitext': digest,
            'retrievedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        },
        'upstream': {
            'areaAndPopulation': 'Bộ Nội vụ, văn bản 2896/BNV-CQĐP ngày 27/5/2025 (như trang nguồn trích dẫn)',
            'subUnits': 'Cập nhật đến 15/3/2026 (như trang nguồn trích dẫn: UBND xã/phường, Bộ Dân tộc và Tôn giáo)',
        },
        'validation': {
            'unitsMatchedToGeometry': len(profiles),
            'areaCrossCheckToleranceKm2': AREA_TOLERANCE_KM2,
            'sums': sums,
            'pageTotals': totals,
        },
        'caveats': [
            'Số liệu do cộng đồng Wikipedia tổng hợp từ văn bản hành chính; chưa đối chiếu bản gốc của Bộ Nội vụ.',
            'Dân số là quy mô dự kiến năm 2025 khi sắp xếp, không phải số liệu điều tra mới nhất.',
            f"Tổng dân số cộng từ 102 dòng ({sums['population']:,}) lệch dòng 'Tổng cộng' của trang nguồn "
            f"({totals['population']:,}) {totals['population'] - sums['population']:,} người (<0,1%); "
            'số liệu từng đơn vị được giữ nguyên như nguồn.',
            *SOURCE_INCONSISTENCIES.values(),
        ],
    }
    (ASSETS / 'unit-profile-provenance.json').write_text(
        json.dumps(provenance, ensure_ascii=False, indent=2) + '\n', encoding='utf8'
    )
    print(f'OK: {len(profiles)} units, sums {sums}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
