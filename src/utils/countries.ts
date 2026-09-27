// Unknown codes fall back to the raw code: the API only constrains `country` to 2 letters, not this table.
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

const getCountryName = (code: string): string => COUNTRY_NAMES_BY_CODE[code.toUpperCase()] ?? code

const COUNTRY_OPTIONS: { value: string; label: string }[] = Object.entries(COUNTRY_NAMES_BY_CODE)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label))

export const countries = {
  getCountryName,
  options: COUNTRY_OPTIONS
}
