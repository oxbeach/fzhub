// src/data/FZTransformer.js

import FZReturns from './FZReturns';

/**
 * FZTransformer.js
 * Specialized Adapter for the FZRawReturns format.
 */
class FZTransformer {
    // Set to true to see alerts during transformation
    static debug = false; 

    /**
     * Transforms raw data into an FZReturns instance.
     * @param {string} symbol - e.g., "AAPL"
     * @param {object} raw - The object containing .startYear and .returns
     * @returns {FZReturns} - The standardized record for the math engine.
     */
    static getReturns(symbol, raw) {
        
        if (this.debug) {
            alert(`Transformer: Starting ${symbol} | Start Year: ${raw?.startYear}`);
        }

        if (!raw || !raw.returns) {
            if (this.debug) alert(`Transformer ERROR: No data for ${symbol}`);
            return null;
        }

        const startMonth = 12;
        const startYear = raw.startYear;
        const count = raw.returns.length;

        // MATH CLEANING: Convert whole number percentages (10.03) to decimals (0.1003)
        const cleanedReturns = raw.returns.map(val => val/100);

        // Inclusive Math: EndYear = StartYear + Count - 1
        const endMonth = 12;
        const endYear = count > 0 ? (startYear + count - 1) : startYear;

        if (this.debug) {
            alert(`Transformer Success: ${symbol} transformed. End Year: ${endYear}`);
        }

        // ENCAPSULATION: Return the Universal Record your math engine expects
        return new FZReturns(
            symbol,
            startMonth,
            startYear,
            endMonth,
            endYear,
            "FZRawReturns", 
            cleanedReturns
        );
    }
}

export default FZTransformer;