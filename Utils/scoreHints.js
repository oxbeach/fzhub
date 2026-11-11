

/**
 * Global dictionary for score metric tooltip hints across Financial Zone
 */
export const SCORE_HINTS = {
  failure:   "Total rolling periods failing to meet target CAGR",
  success:   "Total rolling periods meeting or exceeding target CAGR",
  neutral:   "Total rolling periods below Minimum Holding Period (MHP)",

  total:     "Total number of evaluated rolling periods",
  totalsf:   "Total Success + Failure periods evaluated",
  totalcount: "Total number of evaluated rolling periods",
  
  average:   "Average CAGR across all rolling periods",
  avg:       "Average CAGR across all rolling periods",
  median:    "Median CAGR across all rolling periods",
  hi:        "Highest CAGR achieved across all rolling periods",
  lo:        "Lowest CAGR achieved across all rolling periods",
  hilo:      "Highest and lowest CAGR performance by holding period.",
  avgmedian: "Average and median CAGR performance by holding period.",


  period:    "Duration, in years, of holding an asset.",
  year:      "The target year that an asset is sold in December.",
  rolling:   "Performance of 3-, 5-, and 10-year holding periods.",
  age:       "Asset performance as the holding period increases.",

  thrs:      "Percentage of evaluated periods meeting or exceeding threshold",
  threshold: "Target CAGR rate used to measure success and failure",
  
  stddev:    "Standard deviation of CAGR across all rolling periods",
  sharpe:    "Sharpe Ratio using average CAGR and 4.0% benchmark",
  sortino:   "Sortino Ratio using average CAGR and 0.0% downside benchmark",
  sharpefz:  "Sharpe Ratio using median CAGR and 4.0% benchmark",
  sortinofz: "Sortino Ratio using median CAGR and 0.0% downside benchmark",
};

/**
 * Safely resolves a hint string for a given metric key.
 * @param {string} key - The metric key (e.g., "Sharpe", "NEUTRAL")
 * @param {string} [fallback] - Optional fallback text if key is not found
 * @returns {string}
 */
export const getScoreHint = (key, fallback = "") => {
  if (!key) return fallback;
  const normalizedKey = String(key).replace(/[\s/]+/g, "").toLowerCase();
  return SCORE_HINTS[normalizedKey] || fallback;
};