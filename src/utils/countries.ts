/**
 * ISO 3166-1 alpha-2 country code -> display name lookup (GitHub issue #26,
 * PRD-004 "Events list" — "Country rendered as a name, not a code"). Covers
 * at minimum every code the mock database's fixtures actually seed
 * (`src/mocks/db/fixtures.ts`'s `COUNTRIES`), plus a handful of other common
 * codes an administrator might type into a real event record later. An
 * unknown code falls back to the raw code itself rather than throwing or
 * rendering blank, since the API contract only constrains `country` to a
 * 2-letter code, not to this table's coverage.
 */
const COUNTRY_NAMES_BY_CODE: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  PT: 'Portugal',
  IE: 'Ireland',
  PL: 'Poland',
  SE: 'Sweden',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  BR: 'Brazil',
  MX: 'Mexico'
}

/** Resolves an ISO 3166-1 alpha-2 code to its display name, falling back to the code itself when unknown. */
const getCountryName = (code: string): string => COUNTRY_NAMES_BY_CODE[code.toUpperCase()] ?? code

/** Options for a country `el-select`, sorted alphabetically by display name. */
const COUNTRY_OPTIONS: { value: string; label: string }[] = Object.entries(COUNTRY_NAMES_BY_CODE)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label))

export const countries = {
  getCountryName,
  options: COUNTRY_OPTIONS
}
