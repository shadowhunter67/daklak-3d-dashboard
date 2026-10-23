import type { UnitProfile } from '../../../data/unitProfiles';
import type { MediaSource } from '../../../entities/researched-project/media';
import type { CatalogRow } from '../../investment-catalog/model/catalogModel';

/** Ảnh gắn với một xã/phường. Chỉ `usage: 'production'` (đã kiểm license, có file cục bộ) mới được
 * hiển thị và tính vào độ phủ; `reference-only`/`rejected` chỉ lưu để truy vết. */
export interface UnitMedia extends MediaSource {
  administrativeUnitCode: string;
}

export interface UnitProfileModel {
  code: string;
  name: string;
  type: UnitProfile['type'];
  areaKm2: number;
  population2025: number;
  /** Người/km²; `undefined` khi diện tích không hợp lệ (không bịa). */
  densityPerKm2: number | undefined;
  subUnits: {
    villages: number;
    buon: number;
    residentialGroups: number;
    neighbourhoods: number;
    total: number;
  };
  opportunities: CatalogRow[];
  /** Tổng vốn dự kiến chỉ của các dự án CÓ số liệu vốn. */
  opportunityCapitalVnd: number;
  opportunitiesWithoutCapital: number;
}

export function buildUnitProfileModel(
  code: string,
  input: { profile: UnitProfile; opportunities: readonly CatalogRow[] },
): UnitProfileModel {
  const { profile } = input;
  const opportunities = input.opportunities.filter((o) => o.areaCodes.includes(code));
  const withCapital = opportunities.filter((o) => o.capitalVnd !== undefined);
  return {
    code,
    name: profile.name,
    type: profile.type,
    areaKm2: profile.areaKm2,
    population2025: profile.population2025,
    densityPerKm2:
      profile.areaKm2 > 0 ? Math.round(profile.population2025 / profile.areaKm2) : undefined,
    subUnits: {
      villages: profile.villages,
      buon: profile.buon,
      residentialGroups: profile.residentialGroups,
      neighbourhoods: profile.neighbourhoods,
      total: profile.villages + profile.buon + profile.residentialGroups + profile.neighbourhoods,
    },
    opportunities,
    opportunityCapitalVnd: withCapital.reduce((sum, o) => sum + (o.capitalVnd ?? 0), 0),
    opportunitiesWithoutCapital: opportunities.length - withCapital.length,
  };
}

export interface ImageCoverage {
  total: number;
  /** Có ảnh production đã kiểm license cho đơn vị này. */
  verified: number;
  /** Chưa có ảnh đã xác minh → dùng hình dạng ranh giới từ bản đồ GIS. */
  fallback: number;
  /** Số đơn vị có ứng viên chỉ-tham-chiếu (chưa đủ điều kiện dùng). */
  referenceOnly: number;
}

export function imageCoverage(
  unitCodes: readonly string[],
  media: readonly UnitMedia[],
): ImageCoverage {
  const verifiedCodes = new Set(
    media.filter((m) => m.usage === 'production').map((m) => m.administrativeUnitCode),
  );
  const referenceCodes = new Set(
    media.filter((m) => m.usage === 'reference-only').map((m) => m.administrativeUnitCode),
  );
  const verified = unitCodes.filter((c) => verifiedCodes.has(c)).length;
  return {
    total: unitCodes.length,
    verified,
    fallback: unitCodes.length - verified,
    referenceOnly: unitCodes.filter((c) => referenceCodes.has(c) && !verifiedCodes.has(c)).length,
  };
}
