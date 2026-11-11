/**
 * BlendReturns.js
 */
import FZReturns from './FZReturns';
import { AssetWeight } from '../../Utils/AssetWeight'; 

export class BlendReturns {
    /**
     * Calculates the blended portfolio returns across a global time span.
     * 
     * @param {Object} rawDbMap - Pre-fetched raw DB map keyed by ticker
     * @param {Array} rawAssets - List of assets with tickers and weights
     * @param {boolean} isEqualWeight - Flag to evenly weight assets
     * @param {Object} params - { timeSpan, useFiller, fillerRate }
     * @returns {FZReturns|null} Standardized blended returns container or null on missing ticker
     */
    static calculate(rawDbMap, rawAssets, isEqualWeight, params) {
        const { timeSpan, useFiller, fillerRate } = params;
        const cleanAssets = AssetWeight.adjustAssetsWeight(rawAssets, isEqualWeight);

        if (!cleanAssets || cleanAssets.length === 0) {
            return {
                success: false,
                data:    null,
                error: {
                    code: "ERR_NO_ASSETS",
                    location: "blendreturns",
                    ticker: null,
                    //message: "No valid portfolio assets provided for blending."
                }
            };
        }

        const returnsMap     = rawDbMap;
        const start          = timeSpan.startYear;
        const end            = timeSpan.endYear;
        const count          = timeSpan.getYearCount();

        if (count < 5) {
            return {
                success: false,
                data: null,
                error: {
                    code: "ERR_INSUFFICIENT_TIMESPAN",
                    location: "blendreturns",
                    ticker: null,
                    //message: `Portfolio time span is less than 5 years.`
                }
            };
        }

        const blendedReturns = new Array(count).fill(0.0);

        let newStart = start;
        let newEnd   = end;

        // Examine each asset

        for (const asset of cleanAssets) {
            const rawRow = returnsMap ? returnsMap[asset.ticker] : null;
            const weight = asset.weight;

            if (!rawRow) {
                return {
                    success: false,
                    data: null,
                    error: {
                        code: "ERR_MISSING_DB_TICKER",
                        location: "blendreturns",
                        ticker: asset.ticker,
                        //message: `Asset '${asset.ticker}' was not found in FZ database.`
                    }
                };
            }

            // Map raw DB property names to what the math expects
            const startYear = rawRow.first_full_year;
            const returns   = rawRow.fz_raw_returns?.returns || [];
            const endYear   = startYear + returns.length - 1;

            if (!startYear || returns.length === 0) {
                return {
                    success: false,
                    data: null,
                    error: {
                        code: "ERR_EMPTY_DB_RECORD",
                        location: "blendreturns",
                        ticker: asset.ticker,
                        //message: `Asset '${asset.ticker}' has invalid or empty DB return records.`
                    }
                };
            }

            // Regardless of filler status, a ticker must have 5 years of overlap with the incoming timespan
            const minSpan      = Math.max(start, startYear);
            const maxSpan      = Math.min(end, endYear);
            const overlapYears = maxSpan - minSpan + 1;

            if (overlapYears < 5) {
                return {
                    success: false,
                    data: null,
                    error: {
                        code: "ERR_INSUFFICIENT_HISTORY",
                        location: "blendreturns",
                        ticker: asset.ticker,
                        //message: `Asset '${asset.ticker}' provides only ${overlapYears} year(s) of overlapping data. Minimum required is 5.`
                    }
                };
            }

            // Squeeze the boundaries to find the intersection window
            newStart = Math.max(newStart, startYear);
            newEnd   = Math.min(newEnd, endYear);

            //*********************** ASSERTIONS *********************/
            // overlap years are from minSpan to maxSpan
            // ticker has at least 5 years of returns
            // newStart and newEnd will be the smallest intersection of all tickers and timespan

            for (let i = 0; i < count; i++) {
                const currentYear = start + i;
                let yearlyVal = fillerRate;

                const dataIndex = currentYear - startYear;
                if (dataIndex >= 0 && dataIndex < returns.length) {
                    yearlyVal = returns[dataIndex];
                }
                blendedReturns[i] += (yearlyVal * weight);
            }
        }

        if (newStart > newEnd) {
            return {
                success: false,
                data: null,
                error: {
                    code: "ERR_NO_OVERLAP_WINDOW",
                    location: "blendreturns",
                    ticker: null,
                    //message: "The assets in this portfolio share no valid overlapping time window."
                }
            };
        }

        // Handle boundary pruning when useFiller is false
        let finalReturns = blendedReturns;
        let finalStart   = start;
        let finalEnd     = end;

        if (!useFiller) {
            const sliceStart = newStart - start;
            const sliceEnd   = (newEnd - start) + 1;
            finalReturns     = blendedReturns.slice(sliceStart, sliceEnd);
            finalStart       = newStart;
            finalEnd         = newEnd;

            const slicedSpanCount = finalEnd - finalStart + 1;

            // Post-squeeze safety check: ensure non-filler intersection window is at least 5 years
            if (slicedSpanCount < 5) {
                return {
                    success: false,
                    data: null,
                    location: "blendreturns",
                    error: {
                        code: "ERR_SQUEEZED_INSUFFICIENT_HISTORY",
                        ticker: null,
                        //message: `The common overlapping window across all portfolio assets is ${slicedSpanCount} year(s). Minimum required is 5.`
                    }
                };
            }
        }

                        /*
                        // Debug logging for exact decimal returns
                        console.log(`--- FZ RETURNS DATA (${finalStart} to ${finalEnd}) ---`);
                        finalReturns.forEach((val, idx) => {
                            const currentYear = finalStart + idx;
                            console.log(`Year: ${currentYear} | Return: ${val}`);
                        });
                        console.log("---------------------------------------");
                        */

        return {
            success: true,
            data: new FZReturns(
                "Portfolio_Blend", 
                1, finalStart, 
                12, finalEnd,
                "BlendReturns_Engine", 
                finalReturns
            ),
            error: null
        };
    }
}