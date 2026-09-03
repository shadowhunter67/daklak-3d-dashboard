import type { FeatureCollection, Geometry, Position } from 'geojson';

/**
 * "Dự án trọng điểm – tham khảo": REAL prepared / under-construction / recently-tendered projects
 * in Đắk Lắk (province boundaries as of the 2025 Đắk Lắk + Phú Yên merger), compiled from
 * reputable public reporting. Each feature carries its own source citation.
 *
 * GEOMETRY provenance — two tiers:
 *  - The three national corridors (CT.24 expressway, the North–South high-speed rail, and the
 *    North–South expressway through the former Phú Yên) use CENTRELINES DERIVED FROM OPENSTREETMAP
 *    (© OpenStreetMap contributors, ODbL) — the ways tagged `ref=CT.24` / `name="Đường sắt cao
 *    tốc Bắc - Nam"`, downsampled to a schematic polyline. Real alignment, not surveyed precision.
 *  - Every other line and every point is HAND-PLACED (`geometryConfidence: 'gần đúng'`) from
 *    public route maps and news descriptions. The map popup repeats the caveat.
 *
 * Separate concern from `planningThemes.ts` (fully illustrative) and the fictional 9-project demo
 * portfolio (`src/entities/project`). Off by default, `projects` URL param.
 */

export type KeyProjectCategory =
  | 'giao-thong-quoc-gia'
  | 'giao-thong-noi-tinh'
  | 'hang-khong'
  | 'thuy-loi'
  | 'nang-luong'
  | 'cong-nghiep'
  | 'do-thi-du-lich'
  | 'do-thi-dau-thau'
  | 'giao-duc';

/** 🟡 chuẩn bị đầu tư · 🟠 sắp khởi công · 🔵 đang thi công · 🟢 vừa hoàn thành (2025–26) */
export type KeyProjectStatus = 'chuan-bi' | 'sap-khoi-cong' | 'dang-thi-cong' | 'hoan-thanh';

export interface KeyProjectProps {
  id: string;
  name: string;
  category: KeyProjectCategory;
  status: KeyProjectStatus;
  /** Short "what it is" line for the popup. */
  summary: string;
  sourceUrl: string;
  sourceLabel: string;
  /** ISO year or year-month of the cited report. */
  sourceDate: string;
  /** 'osm' when the geometry is an OpenStreetMap-derived centreline; omitted = hand-placed. */
  geom?: 'osm';
}

export const KEY_PROJECT_STATUS_LABEL: Record<KeyProjectStatus, string> = {
  'chuan-bi': 'Chuẩn bị đầu tư',
  'sap-khoi-cong': 'Sắp khởi công',
  'dang-thi-cong': 'Đang thi công',
  'hoan-thanh': 'Vừa hoàn thành (2025–26)',
};

export const KEY_PROJECT_STATUS_COLOR: Record<KeyProjectStatus, string> = {
  'chuan-bi': '#e0b64a',
  'sap-khoi-cong': '#e08a3c',
  'dang-thi-cong': '#4a9ed0',
  'hoan-thanh': '#5cb46b',
};

export const KEY_PROJECT_CATEGORY_LABEL: Record<KeyProjectCategory, string> = {
  'giao-thong-quoc-gia': 'Giao thông quốc gia / liên tỉnh',
  'giao-thong-noi-tinh': 'Giao thông nội tỉnh & đô thị',
  'hang-khong': 'Hàng không',
  'thuy-loi': 'Thủy lợi',
  'nang-luong': 'Năng lượng',
  'cong-nghiep': 'Công nghiệp & khu kinh tế',
  'do-thi-du-lich': 'Đô thị & du lịch',
  'do-thi-dau-thau': 'Đô thị / đang đấu thầu – gọi đầu tư',
  'giao-duc': 'Giáo dục',
};

const CONGTHUONG =
  'https://congthuong.vn/dak-lak-loat-cong-trinh-lon-se-trien-khai-trong-nam-2026-440984.html';
const BAODAKLAK_21 =
  'https://baodaklak.vn/tin-noi-bat/202606/dak-lak-khoi-cong-khanh-thanh-va-khoi-dong-21-du-an-tieu-bieu-2887253/';
const CAFELAND =
  'https://cafeland.vn/su-kien/dak-lak-chuan-bi-cu-hich-dau-tu-2026-hang-loat-du-an-lon-san-sang-goi-nha-dau-tu-152080.html';

// ── Corridor centrelines derived from OpenStreetMap (© OpenStreetMap contributors, ODbL) ──
// Downsampled schematic polylines; see file header.

/** `ref=CT.24` ways, west (Ea Knuếc / đường HCM tránh Đông BMT) → east (Đèo Phượng Hoàng, ranh
 * Khánh Hòa) and on toward Ninh Hòa. */
const CT24_LINE: Position[] = [
  [108.17206, 12.66073],
  [108.19364, 12.65954],
  [108.21522, 12.65884],
  [108.2368, 12.6585],
  [108.25838, 12.66074],
  [108.27996, 12.67099],
  [108.30154, 12.67356],
  [108.32312, 12.67236],
  [108.34469, 12.65701],
  [108.36627, 12.64991],
  [108.38785, 12.64411],
  [108.40943, 12.64088],
  [108.43101, 12.63756],
  [108.45259, 12.63402],
  [108.47417, 12.62456],
  [108.49575, 12.61651],
  [108.51733, 12.61372],
  [108.53891, 12.60659],
  [108.56049, 12.5964],
  [108.58207, 12.58254],
  [108.60365, 12.56432],
  [108.62523, 12.5568],
  [108.64681, 12.55211],
  [108.66839, 12.54481],
  [108.68997, 12.53741],
  [108.71154, 12.54417],
  [108.73312, 12.54239],
  [108.7547, 12.53067],
  [108.77628, 12.52962],
  [108.79786, 12.52569],
  [108.81944, 12.52394],
  [108.84102, 12.51883],
  [108.8626, 12.50911],
  [108.88418, 12.51149],
  [108.90576, 12.51022],
  [108.92734, 12.51414],
  [108.94892, 12.52321],
  [108.9705, 12.53804],
  [108.99208, 12.54747],
  [109.01366, 12.54742],
  [109.03524, 12.54761],
  [109.05682, 12.55166],
  [109.07839, 12.55031],
  [109.09997, 12.54104],
  [109.12155, 12.53632],
  [109.14313, 12.51425],
];

/** `name="Đường sắt cao tốc Bắc - Nam"`, clipped to the province (south of Đông Hòa → north
 * toward Sông Cầu / ranh Gia Lai). */
const RAIL_LINE: Position[] = [
  [109.14288, 12.58182],
  [109.1591, 12.64545],
  [109.20169, 12.70909],
  [109.24509, 12.83636],
  [109.26796, 12.9],
  [109.2862, 12.96364],
  [109.28277, 13.02727],
  [109.26615, 13.09091],
  [109.18722, 13.28182],
  [109.12326, 13.53636],
  [109.1, 13.66],
];

/** North–South expressway through the former Phú Yên (Quy Nhơn–Chí Thạnh, Chí Thạnh–Vân Phong).
 * Hand-drawn parallel to and inland (west) of the rail line — OSM tagging for the under-
 * construction sections here was not retrievable; `geometryConfidence: 'gần đúng'`. */
const BACNAM_PY_LINE: Position[] = [
  [109.22, 12.9],
  [109.235, 13.02],
  [109.235, 13.12],
  [109.19, 13.28],
  [109.13, 13.45],
  [109.09, 13.62],
];

/** OSM ways "Đường tránh Buôn Ma Thuột" / "Vành đai 2 Buôn Ma Thuột" — the đường Hồ Chí Minh
 * bypass that forms the east/south arc of the BMT ring-road system. West → south → east → north. */
const HCM_TRANH_DONG_LINE: Position[] = [
  [107.95903, 12.62223],
  [107.96797, 12.6023],
  [107.97362, 12.59506],
  [107.99077, 12.58039],
  [108.00049, 12.57766],
  [108.02551, 12.58448],
  [108.05266, 12.5922],
  [108.06393, 12.59559],
  [108.08139, 12.60673],
  [108.0998, 12.61905],
  [108.12477, 12.6278],
  [108.12942, 12.62989],
  [108.1478, 12.643],
  [108.15109, 12.64715],
  [108.1532, 12.65316],
  [108.15489, 12.66327],
  [108.15726, 12.67466],
  [108.16053, 12.68739],
  [108.16556, 12.70017],
  [108.16739, 12.70394],
  [108.1787, 12.72964],
  [108.18661, 12.74749],
  [108.18117, 12.77853],
  [108.19368, 12.80859],
  [108.20532, 12.83364],
  [108.22279, 12.86781],
];
/** Đường vành đai phía Tây TP Buôn Ma Thuột — hoàn thành 2017. Not distinctly mapped in OSM;
 * hand-drawn west arc closing the ring on the other side. `geometryConfidence: 'gần đúng'`. */
const VANH_DAI_TAY_BMT_LINE: Position[] = [
  [108.0255, 12.585],
  [108.0, 12.61],
  [107.99, 12.66],
  [108.0, 12.7],
  [108.03, 12.74],
  [108.08, 12.76],
];
const VEN_BIEN_TUYAN_LINE: Position[] = [
  [109.29, 13.32],
  [109.3, 13.2],
  [109.31, 13.09],
];

interface RawFeature {
  geometry: Geometry;
  props: KeyProjectProps;
}

const line = (coordinates: Position[]): Geometry => ({ type: 'LineString', coordinates });
const point = (coordinates: Position): Geometry => ({ type: 'Point', coordinates });

const RAW: RawFeature[] = [
  // ── Giao thông quốc gia / liên tỉnh ──
  {
    geometry: line(CT24_LINE),
    props: {
      id: 'ct-kh-bmt',
      name: 'Cao tốc Khánh Hòa – Buôn Ma Thuột (CT.24)',
      category: 'giao-thong-quoc-gia',
      status: 'dang-thi-cong',
      summary:
        '~117,5 km (84 km qua Đắk Lắk), 3 dự án thành phần; điểm cuối tại đường HCM tránh Đông BMT (xã Ea Knuếc). Mục tiêu thông toàn tuyến cuối 2026.',
      sourceUrl:
        'https://baochinhphu.vn/tang-toc-thuc-hien-cao-toc-khanh-hoa-buon-ma-thuot-hoan-thanh-toan-tuyen-vao-dip-2-9-2026-102260319161457348.htm',
      sourceLabel: 'Báo Chính phủ',
      sourceDate: '2026-03',
      geom: 'osm',
    },
  },
  {
    geometry: line(BACNAM_PY_LINE),
    props: {
      id: 'ct-bac-nam-py',
      name: 'Cao tốc Bắc – Nam đoạn qua Phú Yên (Quy Nhơn–Chí Thạnh, Chí Thạnh–Vân Phong)',
      category: 'giao-thong-quoc-gia',
      status: 'dang-thi-cong',
      summary: 'Khai thác toàn tuyến 5/2026 (Chí Thạnh – Vân Phong ~48 km).',
      sourceUrl:
        'https://tuoitre.vn/cao-toc-chi-thanh-van-phong-se-khai-thac-toan-tuyen-vao-ngay-18-5-20260516095925968.htm',
      sourceLabel: 'Tuổi Trẻ',
      sourceDate: '2026-05',
    },
  },
  {
    geometry: line(RAIL_LINE),
    props: {
      id: 'dsct-bac-nam',
      name: 'Đường sắt tốc độ cao Bắc – Nam (đoạn qua tỉnh)',
      category: 'giao-thong-quoc-gia',
      status: 'chuan-bi',
      summary: '~98,7 km qua 13 xã/phường; ga Tuy Hòa; đang GPMB, khu tái định cư đã động thổ.',
      sourceUrl:
        'https://baodaklak.vn/kinh-te/202511/chuan-bi-san-sang-cho-du-an-duong-sat-toc-do-cao-5431505/',
      sourceLabel: 'Báo Đắk Lắk',
      sourceDate: '2025-11',
      geom: 'osm',
    },
  },

  // ── Giao thông nội tỉnh & đô thị ──
  {
    geometry: line(HCM_TRANH_DONG_LINE),
    props: {
      id: 'hcm-tranh-dong-bmt',
      name: 'Đường Hồ Chí Minh tuyến tránh Đông TP Buôn Ma Thuột (vành đai phía Đông)',
      category: 'giao-thong-noi-tinh',
      status: 'hoan-thanh',
      summary: '~39 km; khánh thành 19/12/2025. Là cung Đông–Nam của hệ thống vành đai đô thị BMT.',
      sourceUrl:
        'https://vpubnd.daklak.gov.vn/le-khanh-thanh-duong-tranh-phia-dong-buon-ma-thuot-va-thong-xe-ky-thuat-du-an-thanh-phan-3-du-an-cao-toc-khanh-hoa-buon-ma-thuot-17769.html',
      sourceLabel: 'Cổng TTĐT Đắk Lắk',
      sourceDate: '2025-12',
      geom: 'osm',
    },
  },
  {
    geometry: line(VANH_DAI_TAY_BMT_LINE),
    props: {
      id: 'vanh-dai-tay-bmt',
      name: 'Đường vành đai phía Tây TP Buôn Ma Thuột',
      category: 'giao-thong-noi-tinh',
      status: 'hoan-thanh',
      summary:
        '~14 km, vốn ~687 tỷ đồng (trái phiếu Chính phủ); hoàn thành 11/2017, cải tạo 2022–2024. Cung phía Tây khép kín hệ thống vành đai BMT.',
      sourceUrl:
        'https://dantocphattrien.vietnamnet.vn/thanh-pho-buon-ma-thuot-phe-duyet-9-5-ty-dong-cai-tao-duong-vanh-dai-phia-tay-37099.html',
      sourceLabel: 'Dân tộc & Phát triển (VietNamNet)',
      sourceDate: '2022',
    },
  },
  {
    geometry: line(VEN_BIEN_TUYAN_LINE),
    props: {
      id: 'ven-bien-tuyan-tuyhoa',
      name: 'Tuyến đường bộ ven biển, đoạn Tuy An – TP Tuy Hòa',
      category: 'giao-thong-noi-tinh',
      status: 'dang-thi-cong',
      summary: '~14,6 km, rộng 42 m; khởi công 5/2025.',
      sourceUrl:
        'https://phuyen.baodaklak.vn/kinh-te/202505/khoi-cong-tuyen-duong-bo-ven-bien-doan-ket-noi-huyen-tuy-an-tp-tuy-hoa-1371bcf/',
      sourceLabel: 'Phú Yên / Báo Đắk Lắk',
      sourceDate: '2025-05',
    },
  },
  {
    geometry: point([109.285, 13.36]),
    props: {
      id: 'ven-bien-an-hai',
      name: 'Đường ven biển đoạn Bắc cầu An Hải',
      category: 'giao-thong-noi-tinh',
      status: 'dang-thi-cong',
      summary: '~7,4 km; đang thi công.',
      sourceUrl:
        'https://vneconomy.vn/phu-yen-dau-tu-2-200-ty-dong-lam-duong-ven-bien-noi-duyen-hai-voi-do-thi-trung-tam.htm',
      sourceLabel: 'VnEconomy',
      sourceDate: '2025',
    },
  },
  {
    geometry: point([109.235, 13.5]),
    props: {
      id: 'ven-bien-song-cau',
      name: 'Đường ven biển đoạn Sông Cầu – Tuy An',
      category: 'giao-thong-noi-tinh',
      status: 'sap-khoi-cong',
      summary: '~3,6 km; dự kiến khởi công cuối 2025.',
      sourceUrl:
        'https://vneconomy.vn/phu-yen-dau-tu-2-200-ty-dong-lam-duong-ven-bien-noi-duyen-hai-voi-do-thi-trung-tam.htm',
      sourceLabel: 'VnEconomy',
      sourceDate: '2025',
    },
  },

  // ── Hàng không ──
  {
    geometry: point([108.1205, 12.6675]),
    props: {
      id: 'chk-bmt',
      name: 'Mở rộng Cảng hàng không Buôn Ma Thuột',
      category: 'hang-khong',
      status: 'chuan-bi',
      summary: 'Tổng mức đầu tư dự kiến ~2.500 tỷ đồng; chuẩn bị đầu tư 2026.',
      sourceUrl: CONGTHUONG,
      sourceLabel: 'Báo Công Thương',
      sourceDate: '2026-01',
    },
  },
  {
    geometry: point([109.3345, 13.0455]),
    props: {
      id: 'chk-tuy-hoa',
      name: 'Mở rộng Cảng hàng không Tuy Hòa',
      category: 'hang-khong',
      status: 'chuan-bi',
      summary: 'Tổng mức đầu tư dự kiến ~2.000 tỷ đồng; chuẩn bị đầu tư 2026.',
      sourceUrl: CONGTHUONG,
      sourceLabel: 'Báo Công Thương',
      sourceDate: '2026-01',
    },
  },

  // ── Thủy lợi ──
  {
    geometry: point([108.475, 12.885]),
    props: {
      id: 'ho-krong-pach-thuong',
      name: 'Hồ chứa nước Krông Pách Thượng',
      category: 'thuy-loi',
      status: 'dang-thi-cong',
      summary: 'GĐ1 khánh thành 4/2026 (tưới 14.900 ha); GĐ2 đang thi công.',
      sourceUrl:
        'https://tuoitre.vn/du-an-ho-chua-nuoc-hon-4-400-ti-o-dak-lak-thi-cong-10-nam-nay-tiep-tuc-xin-lui-tien-do-20260513143514138.htm',
      sourceLabel: 'Tuổi Trẻ',
      sourceDate: '2026-05',
    },
  },
  {
    geometry: point([108.12, 13.24]),
    props: {
      id: 'ho-ea-hleo-1',
      name: 'Hồ chứa nước Ea H’leo 1',
      category: 'thuy-loi',
      status: 'chuan-bi',
      summary: 'Công trình thủy lợi vùng Ea H’leo.',
      sourceUrl:
        'https://baodaklak.vn/kinh-te/202301/du-an-ho-chua-nuoc-ea-hleo-1-the-manh-va-tiem-nang-e3a15a4/',
      sourceLabel: 'Báo Đắk Lắk',
      sourceDate: '2023-01',
    },
  },

  // ── Năng lượng ──
  {
    geometry: point([107.795, 12.575]),
    props: {
      id: 'dmt-srepok-3',
      name: 'Nhà máy điện mặt trời nổi KN Srêpốk 3',
      category: 'nang-luong',
      status: 'sap-khoi-cong',
      summary: 'Tổng vốn ~7.661 tỷ đồng; khởi công tại hội nghị đầu tư 6/2026.',
      sourceUrl: BAODAKLAK_21,
      sourceLabel: 'Báo Đắk Lắk',
      sourceDate: '2026-06',
    },
  },
  {
    geometry: point([108.2, 13.25]),
    props: {
      id: 'dien-gio-ea-hleo',
      name: 'Cụm dự án điện gió Ea H’leo 3 & 4',
      category: 'nang-luong',
      status: 'chuan-bi',
      summary: 'Điện gió ngoài ngân sách, chuẩn bị 2026.',
      sourceUrl: CONGTHUONG,
      sourceLabel: 'Báo Công Thương',
      sourceDate: '2026-01',
    },
  },
  {
    geometry: point([108.02, 12.9]),
    props: {
      id: 'dien-gio-cu-mgar',
      name: 'Nhà máy điện gió Cư M’gar 2',
      category: 'nang-luong',
      status: 'chuan-bi',
      summary: 'Điện gió ngoài ngân sách, chuẩn bị 2026.',
      sourceUrl: CONGTHUONG,
      sourceLabel: 'Báo Công Thương',
      sourceDate: '2026-01',
    },
  },
  {
    geometry: point([108.42, 12.79]),
    props: {
      id: 'thuy-dien-ea-tih',
      name: 'Nhà máy thủy điện Ea Tih',
      category: 'nang-luong',
      status: 'chuan-bi',
      summary: 'Thủy điện ngoài ngân sách, chuẩn bị 2026.',
      sourceUrl: CONGTHUONG,
      sourceLabel: 'Báo Công Thương',
      sourceDate: '2026-01',
    },
  },

  // ── Công nghiệp & khu kinh tế ──
  {
    geometry: point([109.415, 12.875]),
    props: {
      id: 'khu-kt-nam-phu-yen',
      name: 'Khu kinh tế Nam Phú Yên (Cảng Bãi Gốc, hạ tầng KCN Hòa Tâm GĐ1)',
      category: 'cong-nghiep',
      status: 'sap-khoi-cong',
      summary: 'Tổng vốn nhóm dự án ~7.300 tỷ đồng; triển khai 2026.',
      sourceUrl: 'https://thoibaotaichinhvietnam.vn/dak-lak-vuon-minh-cung-dat-nuoc-199572.html',
      sourceLabel: 'Thời báo Tài chính VN',
      sourceDate: '2026',
    },
  },
  {
    geometry: point([108.17, 12.755]),
    props: {
      id: 'kcn-phu-xuan',
      name: 'Hạ tầng Khu công nghiệp Phú Xuân',
      category: 'cong-nghiep',
      status: 'sap-khoi-cong',
      summary: 'Tổng vốn ~2.477 tỷ đồng; khởi công 6/2026.',
      sourceUrl: BAODAKLAK_21,
      sourceLabel: 'Báo Đắk Lắk',
      sourceDate: '2026-06',
    },
  },
  {
    geometry: point([108.03, 12.72]),
    props: {
      id: 'trung-nguyen-legend',
      name: 'Nhà máy cà phê Trung Nguyên Legend',
      category: 'cong-nghiep',
      status: 'chuan-bi',
      summary: 'Tổng vốn ~400 tỷ đồng; 2026.',
      sourceUrl: CONGTHUONG,
      sourceLabel: 'Báo Công Thương',
      sourceDate: '2026-01',
    },
  },

  // ── Đô thị & du lịch ──
  {
    geometry: point([109.3, 13.08]),
    props: {
      id: 'kdt-dich-vu-ven-bien',
      name: 'Khu đô thị dịch vụ ven biển',
      category: 'do-thi-du-lich',
      status: 'chuan-bi',
      summary: 'Tổng vốn dự kiến ~37.000 tỷ đồng; gọi đầu tư 2026.',
      sourceUrl: CAFELAND,
      sourceLabel: 'CafeLand',
      sourceDate: '2026',
    },
  },
  {
    geometry: point([109.4, 12.9]),
    props: {
      id: 'kdt-moi-phuong-phu-yen',
      name: 'Khu đô thị mới phường Phú Yên',
      category: 'do-thi-du-lich',
      status: 'chuan-bi',
      summary: 'Tổng vốn dự kiến ~35.000 tỷ đồng; gọi đầu tư 2026.',
      sourceUrl: CAFELAND,
      sourceLabel: 'CafeLand',
      sourceDate: '2026',
    },
  },
  {
    geometry: point([108.02, 12.66]),
    props: {
      id: 'viet-my-av',
      name: 'Tổ hợp khách sạn – nghỉ dưỡng Việt Mỹ A&V (giai đoạn 2)',
      category: 'do-thi-du-lich',
      status: 'sap-khoi-cong',
      summary: 'Tổng vốn ~2.444 tỷ đồng; khởi công 6/2026.',
      sourceUrl: BAODAKLAK_21,
      sourceLabel: 'Báo Đắk Lắk',
      sourceDate: '2026-06',
    },
  },

  // ── Đô thị / đang đấu thầu – gọi đầu tư ──
  {
    geometry: point([108.0525, 12.6725]),
    props: {
      id: 'ecopark-mai-hac-de',
      name: 'Tổ hợp TTTM – Khách sạn – Nhà ở Ecopark (số 2 Mai Hắc Đế) — thương hiệu "ERA City"',
      category: 'do-thi-dau-thau',
      status: 'dang-thi-cong',
      summary:
        'Ecopark Hải Dương; ~39.405 m² tại phường Tân Thành, BMT; QĐ 473/QĐ-UBND ngày 6/2/2026 giao đất. Hợp phần Eco Palace khởi công Q1/2025.',
      sourceUrl:
        'https://vnexpress.net/ecopark-hai-duong-lam-to-hop-khach-san-tai-khu-dat-vang-o-buon-ma-thuot-4851632.html',
      sourceLabel: 'VnExpress',
      sourceDate: '2026-02',
    },
  },
  {
    geometry: point([108.033, 12.712]),
    props: {
      id: 'eco-city-premia',
      name: 'Khu đô thị Eco City Premia',
      category: 'do-thi-dau-thau',
      status: 'dang-thi-cong',
      summary:
        'Km7 phường Tân An, BMT; ~50 ha, tổng vốn ~1.989 tỷ đồng; 956 căn (nhà phố, biệt thự, nhà ở xã hội). Chủ đầu tư Capital House.',
      sourceUrl: 'https://cafeland.vn/du-an/khu-do-thi-eco-city-premia-buon-ma-thuot-2520.html',
      sourceLabel: 'CafeLand',
      sourceDate: '2025',
    },
  },
  {
    geometry: point([108.024, 12.658]),
    props: {
      id: 'kdt-ho-ea-tam',
      name: 'Khu đô thị Hồ thủy lợi Ea Tam',
      category: 'do-thi-dau-thau',
      status: 'chuan-bi',
      summary:
        'KĐT ven hồ Ea Tam, TP Buôn Ma Thuột — dự án lớn đang trong quá trình chuẩn bị/gọi đầu tư.',
      sourceUrl: 'https://amaking.com.vn/khu-do-thi-ho-thuy-loi-ea-tam/',
      sourceLabel: 'Amaking',
      sourceDate: '2025',
    },
  },
  {
    geometry: point([109.275, 13.135]),
    props: {
      id: 'chung-cu-binh-kien',
      name: 'Khu nhà ở chung cư cao cấp phường Bình Kiến (lô số 4 phía Đông đường Hùng Vương)',
      category: 'do-thi-dau-thau',
      status: 'chuan-bi',
      summary: 'Đấu giá quyền sử dụng đất; phát hành hồ sơ đến 8/9/2026, công bố giá 24/9/2026.',
      sourceUrl:
        'https://baodauthau.vn/dak-lak-dau-gia-chon-nha-dau-tu-du-an-chung-cu-cao-cap-tai-phuong-binh-kien-post205164.html',
      sourceLabel: 'Báo Đấu thầu',
      sourceDate: '2026',
    },
  },

  // ── Giáo dục ──
  {
    geometry: point([107.78, 13.15]),
    props: {
      id: 'truong-noi-tru-bien-gioi',
      name: '5 trường nội trú khu vực biên giới (vị trí tượng trưng)',
      category: 'giao-duc',
      status: 'chuan-bi',
      summary: 'Tổng vốn ~885 tỷ đồng; 5 trường phân bố dọc biên giới, 2026.',
      sourceUrl: CONGTHUONG,
      sourceLabel: 'Báo Công Thương',
      sourceDate: '2026-01',
    },
  },
];

export const KEY_PROJECTS: FeatureCollection<Geometry, KeyProjectProps> = {
  type: 'FeatureCollection',
  features: RAW.map((f) => ({ type: 'Feature', geometry: f.geometry, properties: f.props })),
};
