// Centralized Architectural Constants for UniverseFZ

export const NUM_TRIM_YEARS       = 5;
export const MIN_FINAL_YEARS      = 5;
export const LAST_FULL_YEAR       = new Date().getFullYear() - 1;
export const LAST_RESTRICTED_YEAR = LAST_FULL_YEAR - NUM_TRIM_YEARS; // 2020

/////////////// note this is hypotetical and the maximum time span allowable.
/////////////// Obviously, first year is really MAX of symbol's first year and FIRST_FULL_YEAR
/////////////// - 29 gives a 30 year max span

export const FIRST_FULL_YEAR = LAST_FULL_YEAR - 29; 

////////////////////////////////////////////////////////////////////////


export const msPerDay = 1000 * 60 * 60 * 24;
export const DEFAULT_FALLBACK_DATE = new Date('1900-01-01');