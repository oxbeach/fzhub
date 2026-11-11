// src/DatabaseManagement/DatabaseBridge.js

import { FZRawReturns } from '../data/FZRawReturns';
import FZTransformer from '../data/FZTransformer';

class DatabaseBridge {
    static _source = null;
    static _type = null;

    /**
     * initialize
     * Sets the dial (FZDUMMY, TIINGO, etc.) and plugs in the data.
     */
    static initialize(tpConnect) {
        if (!tpConnect || !tpConnect.marketSource) return;
        
        this._type = tpConnect.marketSource;

        if (this._type === "FZDUMMY") {
            this._source = FZRawReturns;
        }
        // Future expansion for other sources (TIINGO, etc.) goes here
    }

    /**
     * getTickerReturns
     * THE GATEKEEPER: Fetches raw data from the source and transforms it.
     */
    static getTickerReturns(ticker) {
        // 1. Logic: Ensure we have a symbol and data loaded
        if (!ticker || !this._source || !this._type) return null;
        
        const symbol = ticker.toUpperCase();
        const rawData = this._source[symbol];

        if (!rawData) return null;

        // 2. THE PROVIDER SWITCH
        // Routes to the correct Transformer to ensure standardized FZReturns format.
        if (this._type === "FZDUMMY") {

                //alert('  inside getTickerReturns ');

            return FZTransformer.getReturns(symbol, rawData);
        }

        if (this._type === "TiingoDATA") {
            //return TiingoTransformer.getReturns(symbol, rawData);
        }

        return null;
    }

    /**
     * getTickerUniverse
     * Returns a sorted list of all available ticker symbols in the active source.
     */
    static getTickerUniverse() {
        if (!this._source) return [];
        return Object.keys(this._source).sort();
    }
}

// Export as DBBridge to match the DataManager import
export { DatabaseBridge as DBBridge };