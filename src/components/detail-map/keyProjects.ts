import type { FeatureCollection, Geometry } from 'geojson';

/**
 * "Dự án trọng điểm – tham khảo": REAL prepared / under-construction infrastructure projects in
 * Đắk Lắk (province boundaries as of the 2025 Đắk Lắk + Phú Yên merger), compiled from reputable
 * public reporting. Each feature carries its own source citation.
 *
 * IMPORTANT — what is and isn't real here:
 *  - The projects, their names and their reported status ARE real, each with a `sourceUrl`.
 *  - The GEOMETRY is approximate: point locations and corridor lines were placed by hand from
 *    public route maps and news descriptions, NOT surveyed. Every feature is
 *    `geometryConfidence: 'gần đúng'` and the map popup says so. Do not treat these shapes as
 *    cadastral or planning data.
 *
 * This is a separate concern from `planningThemes.ts` (fully illustrative) and from the fictional
 * 9-project demo portfolio (`src/entities/project`) — it is neither. It's an
 * externally-sourced reference layer, off by default, `projects` URL param.
 */

export type KeyProjectCategory =
  | 'giao-thong-quoc-gia'
  | 'giao-thong-noi-tinh'
  | 'hang-khong'
  | 'thuy-loi'
  | 'nang-luong'
  | 'cong-nghiep'
  | 'do-thi-du-lich'
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
  'giao-duc': 'Giáo dục',
};

const CONGTHUONG =
  'https://congthuong.vn/dak-lak-loat-cong-trinh-lon-se-trien-khai-trong-nam-2026-440984.html';
const BAODAKLAK_21 =
  'https://baodaklak.vn/tin-noi-bat/202606/dak-lak-khoi-cong-khanh-thanh-va-khoi-dong-21-du-an-tieu-bieu-2887253/';
const CAFELAND =
  'https://cafeland.vn/su-kien/dak-lak-chuan-bi-cu-hich-dau-tu-2026-hang-loat-du-an-lon-san-sang-goi-nha-dau-tu-152080.html';

/** All geometry is APPROXIMATE — see the file header. */
export const KEY_PROJECTS: FeatureCollection<Geometry, KeyProjectProps> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [108.05, 12.67],
          [108.28, 12.74],
          [108.5, 12.82],
          [108.72, 12.88],
          [108.86, 12.9],
        ],
      },
      properties: {
        id: 'ct-kh-bmt',
        name: 'Cao tốc Khánh Hòa – Buôn Ma Thuột (CT.24)',
        category: 'giao-thong-quoc-gia',
        status: 'dang-thi-cong',
        summary: '~117,5 km, 3 dự án thành phần; mục tiêu thông toàn tuyến cuối 2026.',
        sourceUrl:
          'https://baochinhphu.vn/tang-toc-thuc-hien-cao-toc-khanh-hoa-buon-ma-thuot-hoan-thanh-toan-tuyen-vao-dip-2-9-2026-102260319161457348.htm',
        sourceLabel: 'Báo Chính phủ',
        sourceDate: '2026-03',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [109.28, 13.66],
          [109.29, 13.52],
          [109.31, 13.42],
          [109.36, 13.18],
          [109.41, 12.93],
        ],
      },
      properties: {
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
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [109.31, 13.6],
          [109.34, 13.4],
          [109.38, 13.15],
          [109.42, 12.92],
        ],
      },
      properties: {
        id: 'dsct-bac-nam',
        name: 'Đường sắt tốc độ cao Bắc – Nam (đoạn qua tỉnh)',
        category: 'giao-thong-quoc-gia',
        status: 'chuan-bi',
        summary: '~98,7 km qua 13 xã/phường; ga Tuy Hòa; đang GPMB, khu tái định cư đã động thổ.',
        sourceUrl:
          'https://baodaklak.vn/kinh-te/202511/chuan-bi-san-sang-cho-du-an-duong-sat-toc-do-cao-5431505/',
        sourceLabel: 'Báo Đắk Lắk',
        sourceDate: '2025-11',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [108.1, 12.77],
          [108.14, 12.68],
          [108.18, 12.58],
        ],
      },
      properties: {
        id: 'hcm-tranh-dong-bmt',
        name: 'Đường Hồ Chí Minh tuyến tránh phía Đông TP Buôn Ma Thuột',
        category: 'giao-thong-noi-tinh',
        status: 'hoan-thanh',
        summary: '~39 km; khánh thành 19/12/2025.',
        sourceUrl:
          'https://vpubnd.daklak.gov.vn/le-khanh-thanh-duong-tranh-phia-dong-buon-ma-thuot-va-thong-xe-ky-thuat-du-an-thanh-phan-3-du-an-cao-toc-khanh-hoa-buon-ma-thuot-17769.html',
        sourceLabel: 'Cổng TTĐT Đắk Lắk',
        sourceDate: '2025-12',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [109.29, 13.32],
          [109.3, 13.2],
          [109.31, 13.09],
        ],
      },
      properties: {
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
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [109.285, 13.36] },
      properties: {
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
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [109.235, 13.5] },
      properties: {
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
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [108.117, 12.668] },
      properties: {
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
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [109.336, 13.05] },
      properties: {
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
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [108.52, 12.87] },
      properties: {
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
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [108.1, 13.22] },
      properties: {
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
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [107.78, 12.55] },
      properties: {
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
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [108.2, 13.25] },
      properties: {
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
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [108.05, 12.9] },
      properties: {
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
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [108.4, 12.82] },
      properties: {
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
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [109.42, 12.88] },
      properties: {
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
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [108.16, 12.76] },
      properties: {
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
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [108.03, 12.72] },
      properties: {
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
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [109.3, 13.08] },
      properties: {
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
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [109.4, 12.9] },
      properties: {
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
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [108.048, 12.67] },
      properties: {
        id: 'tttm-mai-hac-de',
        name: 'Tổ hợp TTTM – Khách sạn – Nhà ở (số 2 Mai Hắc Đế, Buôn Ma Thuột)',
        category: 'do-thi-du-lich',
        status: 'chuan-bi',
        summary: 'Tổng vốn ~1.000 tỷ đồng; 2026.',
        sourceUrl: CONGTHUONG,
        sourceLabel: 'Báo Công Thương',
        sourceDate: '2026-01',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [108.02, 12.66] },
      properties: {
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
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [107.78, 13.15] },
      properties: {
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
  ],
};
