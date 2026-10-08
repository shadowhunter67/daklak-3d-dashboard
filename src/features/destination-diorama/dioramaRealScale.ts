/**
 * Kích thước THẬT theo nguồn công khai cho vài điểm đến — hiện trong panel diorama để người xem biết cảnh lệch
 * thực tế bao nhiêu. Chỉ liệt kê điểm có số đo từ nguồn; không có số đo thì không có mục (không bịa).
 */
export interface RealScale {
  vi: string;
  en: string;
  source: string;
  sourceUrl: string;
}

const OSM = 'OpenStreetMap contributors (ODbL)';
const OSM_URL = 'https://www.openstreetmap.org/copyright';

export const REAL_SCALE: Record<string, RealScale> = {
  'cau-ong-cop': {
    vi: 'Cầu gỗ dài ~422 m, rộng ~7 m (cầu dầm gỗ, cho xe máy đi). Cảnh dựng 1 đơn vị = 10 m.',
    en: 'Wooden bridge about 422 m long and 7 m wide (timber beam bridge, motorcycles allowed). Scene: 1 unit = 10 m.',
    source: OSM,
    sourceUrl: OSM_URL,
  },
  'bao-tang-dak-lak': {
    vi: 'Mặt bằng bảo tàng ~119 × 60 m, 2 tầng (đa giác thật, hình chữ H). Cảnh dựng 1 đơn vị = 5 m; chiều cao chỉ là ước lượng (OSM ghi 2 tầng × 3,5 m ước lượng).',
    en: 'Museum footprint about 119 × 60 m, 2 floors (real polygon, H-shaped). Scene: 1 unit = 5 m; height is an estimate (2 floors × 3.5 m).',
    source: OSM,
    sourceUrl: OSM_URL,
  },
  'lang-ca-phe-trung-nguyen': {
    vi: 'Mặt bằng Bảo tàng Thế giới Cà phê ~79 × 73 m (đa giác thật). Cảnh dựng 1 đơn vị = 5 m; chiều cao là ước lượng vì nguồn không ghi.',
    en: 'World Coffee Museum footprint about 79 × 73 m (real polygon). Scene: 1 unit = 5 m; height is an estimate as the source gives none.',
    source: OSM,
    sourceUrl: OSM_URL,
  },
};
