import wards from '../../assets/maps/daklak/daklak-wards-render.json';
import type { WardCollection } from '../../types/map';

/**
 * ILLUSTRATIVE planning overlays for the detail map — "PA A" in the design discussion. NOT an
 * official plan and NOT survey data: every category here is assigned by the deterministic
 * `classifyWard()` rules below (ward type + area quantile + a small hand-curated name override
 * per theme), painted onto the REAL administrative-unit polygons (`ward-boundaries` source). So
 * the boundaries are real open data; the land-use / zoning categories are a schematic
 * demonstration only. The UI must always caption these as "sơ đồ minh họa – không có giá trị
 * pháp lý" (see `MapLayerPanel`).
 *
 * One theme is shown at a time (radio, not checkboxes) — overlapping translucent zone washes
 * would be unreadable. `planningLayers.ts` turns the active theme into a single `fill` layer
 * whose `fill-color` is a `match` on the ward `code`.
 */
export type PlanningThemeId =
  'land-use' | 'construction' | 'province-plan' | 'transport' | 'forestry' | 'industry-tourism';

export interface PlanningCategory {
  id: string;
  label: string;
  color: string;
}

export interface PlanningTheme {
  id: PlanningThemeId;
  name: string;
  categories: PlanningCategory[];
  /** id of the category used when no rule/override matches */
  fallbackCategoryId: string;
}

const collection = wards as WardCollection;

/** Ward `type` is the only hard signal in the bundled geometry; area is the other. Everything
 * beyond that is a per-theme name override for the units where a schematic plan would actually
 * differ (province growth poles, the coastal strip, the big forest communes, transport corridors).
 * Names match `daklak-wards-render.json` `properties.name` exactly. */
const GROWTH_POLES = new Set(['Buôn Ma Thuột', 'Buôn Hồ', 'Tuy Hoà']);
const COASTAL = new Set([
  'Sông Cầu',
  'Xuân Đài',
  'Xuân Lộc',
  'Tuy An Bắc',
  'Tuy An Đông',
  'Tuy An Nam',
  'Đông Hoà',
  'Hoà Hiệp',
  'Tuy Hoà',
  'Hoà Xuân',
  'Phú Yên',
]);
/** Rough alignment of the two national corridors through the province (see PR3 project research):
 * the Khánh Hòa–Buôn Ma Thuột expressway east of BMT, and the North–South high-speed rail /
 * Bắc–Nam expressway down the former Phú Yên coast. Schematic — corridor width is "the wards it
 * passes through", nothing surveyed. Names verified against daklak-wards-render.json. */
const EXPRESSWAY_CORRIDOR = new Set([
  'Buôn Ma Thuột',
  'Ea Kao',
  'Ea Knốp',
  'Ea Kar',
  'Krông Pắc',
  "Cư M'gar",
]);
const RAIL_CORRIDOR = new Set([
  'Xuân Lộc',
  'Sông Cầu',
  'Xuân Đài',
  'Tuy An Bắc',
  'Tuy An Đông',
  'Tuy Hoà',
  'Đông Hoà',
  'Hoà Hiệp',
  'Hoà Xuân',
  'Phú Yên',
]);
const LARGE_KM2 = 300;

interface WardFacts {
  code: string;
  name: string;
  isUrban: boolean;
  areaKm2: number;
}

function wardFacts(): WardFacts[] {
  return collection.features.map((feature) => ({
    code: feature.properties.code,
    name: feature.properties.name,
    isUrban: feature.properties.type === 'phuong',
    areaKm2: feature.properties.areaKm2,
  }));
}

function classify(theme: PlanningThemeId, w: WardFacts): string {
  switch (theme) {
    case 'land-use':
      if (w.isUrban) return 'do-thi';
      if (w.areaKm2 >= LARGE_KM2) return 'lam-nghiep';
      if (w.areaKm2 >= 150) return 'nong-lam';
      return 'nong-nghiep-o';
    case 'construction':
      if (GROWTH_POLES.has(w.name)) return 'noi-thi';
      if (w.isUrban) return 'ven-do';
      if (w.areaKm2 >= LARGE_KM2) return 'han-che-xd';
      return 'diem-dc-nt';
    case 'province-plan':
      if (GROWTH_POLES.has(w.name)) return 'do-thi-dong-luc';
      if (COASTAL.has(w.name)) return 'hanh-lang-kinh-te';
      if (w.areaKm2 >= 150) return 'vung-nong-lam';
      return 'vung-nong-nghiep';
    case 'transport':
      if (EXPRESSWAY_CORRIDOR.has(w.name)) return 'hanh-lang-cao-toc';
      if (RAIL_CORRIDOR.has(w.name)) return 'hanh-lang-duong-sat';
      if (GROWTH_POLES.has(w.name)) return 'dau-moi';
      return 'ngoai-hanh-lang';
    case 'forestry':
      if (w.name.includes('Yok') || w.name.includes('Đôn') || w.name.includes('Lắk'))
        return 'dac-dung';
      if (w.areaKm2 >= LARGE_KM2) return 'phong-ho';
      if (w.areaKm2 >= 150) return 'san-xuat';
      return 'ngoai-lam-nghiep';
    case 'industry-tourism':
      if (COASTAL.has(w.name)) return 'du-lich';
      if (GROWTH_POLES.has(w.name)) return 'do-thi-dv';
      if (!w.isUrban && w.areaKm2 >= 150) return 'cong-nghiep';
      return 'khac';
  }
}

const OUTSIDE = '#45685f';

export const PLANNING_THEMES: Record<PlanningThemeId, PlanningTheme> = {
  'land-use': {
    id: 'land-use',
    name: 'Sử dụng đất',
    fallbackCategoryId: 'nong-nghiep-o',
    categories: [
      { id: 'do-thi', label: 'Đất đô thị', color: '#c98b3a' },
      { id: 'nong-nghiep-o', label: 'Đất ở & nông nghiệp', color: '#8a9e5b' },
      { id: 'nong-lam', label: 'Nông – lâm kết hợp', color: '#6f9e5b' },
      { id: 'lam-nghiep', label: 'Đất lâm nghiệp', color: '#2f7d4f' },
    ],
  },
  construction: {
    id: 'construction',
    name: 'Xây dựng – đô thị & nông thôn',
    fallbackCategoryId: 'diem-dc-nt',
    categories: [
      { id: 'noi-thi', label: 'Nội thị đô thị động lực', color: '#c47f3d' },
      { id: 'ven-do', label: 'Ven đô / đô thị nhỏ', color: '#d8b26a' },
      { id: 'diem-dc-nt', label: 'Điểm dân cư nông thôn', color: '#8a9e5b' },
      { id: 'han-che-xd', label: 'Hạn chế xây dựng', color: '#3f6f57' },
    ],
  },
  'province-plan': {
    id: 'province-plan',
    name: 'Quy hoạch tỉnh 2021–2030',
    fallbackCategoryId: 'vung-nong-nghiep',
    categories: [
      { id: 'do-thi-dong-luc', label: 'Đô thị động lực', color: '#c98b3a' },
      { id: 'hanh-lang-kinh-te', label: 'Hành lang kinh tế ven biển', color: '#cf6b52' },
      { id: 'vung-nong-lam', label: 'Vùng nông – lâm', color: '#6f9e5b' },
      { id: 'vung-nong-nghiep', label: 'Vùng nông nghiệp', color: '#8a9e5b' },
    ],
  },
  transport: {
    id: 'transport',
    name: 'Giao thông – hành lang',
    fallbackCategoryId: 'ngoai-hanh-lang',
    categories: [
      { id: 'hanh-lang-cao-toc', label: 'Hành lang cao tốc', color: '#cf6b52' },
      { id: 'hanh-lang-duong-sat', label: 'Hành lang đường sắt / Bắc–Nam', color: '#b58a3c' },
      { id: 'dau-moi', label: 'Đầu mối giao thông', color: '#d8b26a' },
      { id: 'ngoai-hanh-lang', label: 'Ngoài hành lang quy hoạch', color: OUTSIDE },
    ],
  },
  forestry: {
    id: 'forestry',
    name: 'Lâm nghiệp (3 loại rừng)',
    fallbackCategoryId: 'ngoai-lam-nghiep',
    categories: [
      { id: 'dac-dung', label: 'Rừng đặc dụng', color: '#2f7d4f' },
      { id: 'phong-ho', label: 'Rừng phòng hộ', color: '#6f9e5b' },
      { id: 'san-xuat', label: 'Rừng sản xuất', color: '#b1c07a' },
      { id: 'ngoai-lam-nghiep', label: 'Ngoài lâm nghiệp', color: OUTSIDE },
    ],
  },
  'industry-tourism': {
    id: 'industry-tourism',
    name: 'Khu công nghiệp & du lịch',
    fallbackCategoryId: 'khac',
    categories: [
      { id: 'cong-nghiep', label: 'Ưu tiên công nghiệp', color: '#9a6b8a' },
      { id: 'du-lich', label: 'Ưu tiên du lịch', color: '#3b7fa6' },
      { id: 'do-thi-dv', label: 'Đô thị – dịch vụ', color: '#c98b3a' },
      { id: 'khac', label: 'Khu vực khác', color: OUTSIDE },
    ],
  },
};

export const PLANNING_THEME_IDS = Object.keys(PLANNING_THEMES) as PlanningThemeId[];

/** `[code, categoryColor]` pairs for every ward under a theme — consumed by `planningLayers.ts`
 * to build the `fill-color` `match` expression. */
export function wardColorsForTheme(theme: PlanningThemeId): Array<[string, string]> {
  const { categories, fallbackCategoryId } = PLANNING_THEMES[theme];
  const colorById = new Map(categories.map((c) => [c.id, c.color]));
  const fallback = colorById.get(fallbackCategoryId) ?? OUTSIDE;
  return wardFacts().map((w) => {
    const categoryId = classify(theme, w);
    return [w.code, colorById.get(categoryId) ?? fallback];
  });
}
