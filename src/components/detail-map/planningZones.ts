import type { FeatureCollection, Polygon, Position } from 'geojson';

/**
 * "Ranh quy hoạch đã duyệt (tham khảo)" — a handful of REAL, officially-approved planning zones
 * (economic zones / industrial parks / a specific approved urban parcel), each cited to its own
 * decision/source. This is deliberately NOT an attempt to reproduce the province's full parcel-
 * level QHSDĐ map (see reports/detail-map/ + reference_daklak_planning_map_portal memory: that
 * data is ~154 MB per commune, sits on an unlicensed Google-tile base, and has no coverage for
 * the former Phú Yên side — none of that is embeddable in a static, offline-first app).
 *
 * Instead, each zone here is HAND-DIGITIZED from the zone's own published description (bounding
 * description, administrative units it covers, or reported area) — the same integrity model as
 * `keyProjects.ts`'s corridors before their OSM geometry was found: the ZONE (its existence,
 * name, approving decision) is real; the POLYGON is a schematic approximation sized/placed from
 * that description, `geometryConfidence: 'gần đúng'`, NOT a cadastral boundary. The click popup
 * repeats this.
 */

export interface PlanningZoneProps {
  id: string;
  name: string;
  /** e.g. "Khu kinh tế", "Khu công nghiệp", "Đô thị" */
  kind: string;
  summary: string;
  sourceUrl: string;
  sourceLabel: string;
  sourceDate: string;
}

interface RawZone {
  coordinates: Position[];
  props: PlanningZoneProps;
}

const ring = (coordinates: Position[]): Polygon => ({
  type: 'Polygon',
  coordinates: [coordinates],
});

const RAW: RawZone[] = [
  {
    // North: sông Đà Rằng · South: ranh huyện Vạn Ninh (Khánh Hòa) · East: biển Đông ·
    // West: hành lang cao tốc Bắc – Nam — per the zone's own published bounding description.
    coordinates: [
      [109.35, 13.095],
      [109.29, 13.08],
      [109.21, 12.955],
      [109.175, 12.87],
      [109.205, 12.85],
      [109.31, 12.865],
      [109.365, 12.955],
      [109.35, 13.095],
    ],
    props: {
      id: 'kkt-nam-phu-yen',
      name: 'Khu kinh tế Nam Phú Yên',
      kind: 'Khu kinh tế',
      summary:
        '~20.730 ha; thành lập theo QĐ Thủ tướng 5/2008, điều chỉnh quy hoạch chung 2023. Gồm các phường Phú Lâm, Phú Thạnh, Phú Đông (TP Tuy Hòa cũ) và các xã Hòa Hiệp Bắc/Trung/Nam, Hòa Tâm, Hòa Xuân Đông, Hòa Vinh + một phần Hòa Xuân Tây, Hòa Tân Đông, Hòa Xuân Nam, Hòa Thành.',
      sourceUrl: 'https://vi.wikipedia.org/wiki/Khu_kinh_t%E1%BA%BF_Nam_Ph%C3%BA_Y%C3%AAn',
      sourceLabel: 'Wikipedia / Thủ tướng Chính phủ',
      sourceDate: '2023',
    },
  },
  {
    // ~15 km south of BMT along QL14, xã Hòa Phú — schematic square sized to the ~331.73 ha
    // overall planning area (giai đoạn 1 đã hoạt động ~186 ha).
    coordinates: [
      [107.985, 12.528],
      [108.018, 12.528],
      [108.018, 12.552],
      [107.985, 12.552],
      [107.985, 12.528],
    ],
    props: {
      id: 'kcn-hoa-phu',
      name: 'Khu công nghiệp Hòa Phú',
      kind: 'Khu công nghiệp',
      summary:
        'Xã Hòa Phú, TP Buôn Ma Thuột, ~15 km theo QL14 về phía nam. Quy hoạch tổng thể ~331,73 ha (GĐ1 ~186 ha đã hoạt động).',
      sourceUrl: 'https://buonmathuot.daklak.gov.vn/-/khu-cong-nghiep-hoa-phu',
      sourceLabel: 'Cổng TTĐT TP Buôn Ma Thuột',
      sourceDate: '2025',
    },
  },
  {
    // Xã Ea Drơng, Cư M'gar, ~15–20 km từ BMT — schematic square sized to ~313 ha.
    coordinates: [
      [108.162, 12.746],
      [108.179, 12.746],
      [108.179, 12.764],
      [108.162, 12.764],
      [108.162, 12.746],
    ],
    props: {
      id: 'kcn-phu-xuan',
      name: 'Khu công nghiệp Phú Xuân',
      kind: 'Khu công nghiệp',
      summary:
        'Xã Ea Drơng, huyện Cư M’gar; quy mô 313,03 ha (đất công nghiệp 181,9 ha). Động thổ 3/2025.',
      sourceUrl: 'https://bqlkcn.daklak.gov.vn/khu-cong-nghiep-phu-xuan.html',
      sourceLabel: 'Ban QL Khu công nghiệp Đắk Lắk',
      sourceDate: '2025-03',
    },
  },
  {
    // Số 2 Mai Hắc Đế, phường Tân Thành, BMT — schematic square sized to the reported 39.405 m².
    coordinates: [
      [108.0516, 12.6716],
      [108.0534, 12.6716],
      [108.0534, 12.6734],
      [108.0516, 12.6734],
      [108.0516, 12.6716],
    ],
    props: {
      id: 'ecopark-era-city-parcel',
      name: 'Lô đất Ecopark / "ERA City" (số 2 Mai Hắc Đế)',
      kind: 'Đô thị',
      summary:
        '~39.405 m², phường Tân Thành, TP Buôn Ma Thuột. Giao đất theo QĐ 473/QĐ-UBND ngày 6/2/2026.',
      sourceUrl:
        'https://vnexpress.net/ecopark-hai-duong-lam-to-hop-khach-san-tai-khu-dat-vang-o-buon-ma-thuot-4851632.html',
      sourceLabel: 'VnExpress',
      sourceDate: '2026-02',
    },
  },
];

export const PLANNING_ZONES: FeatureCollection<Polygon, PlanningZoneProps> = {
  type: 'FeatureCollection',
  features: RAW.map((z) => ({
    type: 'Feature',
    geometry: ring(z.coordinates),
    properties: z.props,
  })),
};
