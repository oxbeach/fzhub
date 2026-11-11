

/**
 * BlendReturns.js
 */
import FZReturns from './FZReturns';
import { FZDataManager } from '../DataManagement/DataManager';
import { AssetWeight } from '../../Utils/AssetWeight'; 

/**
 * BlendReturns.js
 */

/*  this contains globals and was set in PortfolioUI
*
 const mathParams = {
        timeSpan: initialSettings.timeSpan, 
        useFiller: initialSettings.useFillerReturn,
        fillerRate: initialSettings.fillerRate,
        threshold: initialSettings.threshold,
    };
*/

export class BlendReturns {
    static calculate(rawAssets, isEqualWeight, params) {
        const { timeSpan, useFiller, fillerRate } = params;
        const cleanAssets = AssetWeight.adjustAssetsWeight(rawAssets, isEqualWeight);
        
        const start = timeSpan.startYear;
        const end = timeSpan.endYear;
        const count = timeSpan.getYearCount();
        const blendedReturns = new Array(count).fill(0.0);

        let newStart = start;
        let newEnd = end;

        cleanAssets.forEach(asset => {
            const tickerData = FZDataManager.FetchReturns(asset.ticker);
            const weight = asset.weight;

            for (let i = 0; i < count; i++) {           // count is the entire global span
                const currentYear = start + i;          // interate to next global span
                let yearlyVal = fillerRate;             // Use the fillerRate for the calculation pass

                if (tickerData) {
                    const dataIndex = currentYear - tickerData.startYear;
                    
                    if (dataIndex >= 0 && dataIndex < tickerData.returns.length) {
                        yearlyVal = tickerData.returns[dataIndex];
                    }
                    // Squeeze the boundaries to find the intersection
                    newStart = Math.max(newStart, tickerData.startYear);
                    newEnd = Math.min(newEnd, tickerData.endYear);
                }

                blendedReturns[i] += (yearlyVal * weight);
            }
        });

        if (newStart > newEnd) return null;

        // If pruning (no filler), we must slice the array to match the newStart/newEnd window
        let finalReturns = blendedReturns;
        let finalStart = start;
        let finalEnd = end;

        if (!useFiller) {
            const sliceStart = newStart - start;
            const sliceEnd = (newEnd - start) + 1;
            finalReturns = blendedReturns.slice(sliceStart, sliceEnd);
            finalStart = newStart;
            finalEnd = newEnd;
        }

        return new FZReturns(
            "Portfolio_Blend", 
            1, finalStart, 
            12, finalEnd,
            "BlendReturns_Engine", 
            finalReturns
        );
    }
}

export class yyyyyyyyyyBlendReturns {
    // We now accept three distinct arguments to keep Globals and Locals separate
    static calculate(rawAssets, isEqualWeight, params) {
        // 1. Extract Globals
        const { timeSpan, useFiller, fillerRate } = params;
        
        // 2. Clean and Weight using the LOCAL toggle
        const cleanAssets = AssetWeight.adjustAssetsWeight(rawAssets, isEqualWeight);
        
        const start = timeSpan.startYear;
        const end = timeSpan.endYear - timeSpan.startYear - 1;
        const count = timeSpan.getYearCount();
        const blendedReturns = new Array(count).fill(0.0);

        let newStart = start;
        let newEnd = end;

        cleanAssets.forEach(asset => {
            const tickerData = FZDataManager.FetchReturns(asset.ticker);
            const weight = asset.weight;

            // Pre-calculate filler to avoid ternary inside the loop
            //const defaultVal = useFiller ? fillerRate : 0.0;

            for (let i = 0; i < count; i++) {
                const currentYear = start + i;
                let yearlyVal = useFiller;

                if (tickerData) {
                    // Mapping the Global Timeline to the Ticker's Timeline
                    const dataIndex = currentYear - tickerData.startYear;
                    
                    if (dataIndex >= 0 && dataIndex < tickerData.returns.length) {
                        yearlyVal = tickerData.returns[dataIndex];
                    }
                    newStart = Math.max(newStart, tickerData.startYear);
                    newEnd = Math.min(newEnd, tickerData.endYear);
                }

                // Apply weight and add to the running total for that year
                blendedReturns[i] += (yearlyVal * weight);
            }
        });


        if (newStart > newEnd) return null;


        // Return the standardized payload
        return new FZReturns(
            "Portfolio_Blend", 
            1, newStart, 
            12, newEnd,
            "BlendReturns_Engine", 
            blendedReturns
        );
    }
}


export class xxxxxxBlendReturns {
    // We now accept three distinct arguments to keep Globals and Locals separate
    static calculate(rawAssets, isEqualWeight, params) {
        // 1. Extract Globals
        const { timeSpan, useFiller, fillerRate } = params;
        
        // 2. Clean and Weight using the LOCAL toggle
        const cleanAssets = AssetWeight.adjustAssetsWeight(rawAssets, isEqualWeight);
        
        const start = timeSpan.startYear;
        const count = timeSpan.getYearCount();
        const blendedReturns = new Array(count).fill(0.0);

        cleanAssets.forEach(asset => {
            const tickerData = FZDataManager.FetchReturns(asset.ticker);
            const weight = asset.weight;

            // Pre-calculate filler to avoid ternary inside the loop
            const defaultVal = useFiller ? fillerRate : 0.0;

            for (let i = 0; i < count; i++) {
                const currentYear = start + i;
                let yearlyVal = defaultVal;

                if (tickerData) {
                    // Mapping the Global Timeline to the Ticker's Timeline
                    const dataIndex = currentYear - tickerData.startYear;
                    
                    if (dataIndex >= 0 && dataIndex < tickerData.returns.length) {
                        yearlyVal = tickerData.returns[dataIndex];
                    }
                }

                // Apply weight and add to the running total for that year
                blendedReturns[i] += (yearlyVal * weight);
            }
        });





        // Return the standardized payload
        return new FZReturns(
            "Portfolio_Blend", 
            1, start, 
            12, (start + count - 1), 
            "BlendReturns_Engine", 
            blendedReturns
        );
    }
}