import profiles from '#province-assets/daklak-unit-profile.json';
import provenance from '#province-assets/unit-profile-provenance.json';

/**
 * REAL per-unit profile (population 2025 + village/neighbourhood counts) for the 102 communes and
 * wards. Generated offline by `scripts/build_unit_profiles.py`, which cross-checks every unit's
 * area against the independent geometry source and the page's own totals. Replaces the seeded
 * demo population in `daklak-metrics.json` wherever population is shown; `coverage`/`growth` in
 * that file stay illustrative.
 */
export interface UnitProfile {
  name: string;
  type: 'xa' | 'phuong';
  /** Quy mô dân số năm 2025 (người). */
  population2025: number;
  areaKm2: number;
  /** Thôn. */
  villages: number;
  /** Buôn. */
  buon: number;
  /** Tổ dân phố. */
  residentialGroups: number;
  /** Khu phố. */
  neighbourhoods: number;
}

const records = profiles as Readonly<Record<string, UnitProfile>>;

export function getUnitProfile(code: string | null | undefined): UnitProfile | undefined {
  return code ? records[code] : undefined;
}

/** Number of self-governing sub-units (thôn + buôn + tổ dân phố + khu phố). */
export function subUnitCount(profile: UnitProfile): number {
  return profile.villages + profile.buon + profile.residentialGroups + profile.neighbourhoods;
}

const all = Object.values(records);

export const provinceProfileTotals = {
  /** Official-document total quoted by the source page ("Tổng cộng" row). */
  population2025: provenance.validation.pageTotals.population,
  areaKm2: provenance.validation.pageTotals.areaKm2,
  subUnits: provenance.validation.pageTotals.subUnits,
  communes: all.filter((unit) => unit.type === 'xa').length,
  wards: all.filter((unit) => unit.type === 'phuong').length,
};

export const unitProfileSource = {
  title: provenance.source.title,
  publisher: provenance.source.publisher,
  url: provenance.source.permalink,
  revisionId: provenance.source.revisionId,
  retrievedAt: provenance.source.retrievedAt,
  upstream: provenance.upstream.areaAndPopulation,
} as const;

export const unitProfileCaveats: readonly string[] = provenance.caveats;
