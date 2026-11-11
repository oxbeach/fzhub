// src/DataManagement/DataManager.js
import { DBBridge } from '../DatabaseManagement/DatabaseBridge';

class DataManager {
    constructor() {
        this.DEBUG = false; 
        this._cache = new Map();
        this._isInitialized = false;
    }

    /**
     * initialize: The "Handshake"
     * This is what was causing the crash because it fires on app startup.
     */
    initialize(settings) {
        if (!settings || !settings.marketSource) return;
        
        // Safety check: Only alert if a browser window exists.
        // This stops the Next.js server from dying during the 'import' phase.
        if (this.DEBUG && typeof window !== 'undefined') {
            alert(`DataManager: Handshake received for ${settings.marketSource}`);
        }
        
        DBBridge.initialize(settings);
        this._isInitialized = true;
    }

    /**
     * FetchReturns: The Math Entry Point
     * Standard project casing (Uppercase F).
     */
    FetchReturns(ticker) {
        if (!this._isInitialized) {
            //if (typeof window !== 'undefined') alert("DataManager Error: Not initialized!");
            return null;
        }

        const symbol = ticker.toUpperCase();
        if (this._cache.has(symbol)) return this._cache.get(symbol);

        // This only fires when you click your button, so it's safer,
        // but we keep the window check to be professional and consistent.
        if (this.DEBUG && typeof window !== 'undefined') {
            alert(`DataManager: Requesting ${symbol} from Bridge...`);
        }

        const data = DBBridge.getTickerReturns(symbol);

        if (data) {
            if (this.DEBUG && typeof window !== 'undefined') {
                alert(`DataManager: SUCCESS! Received ${data.symbol}`);
            }
            this._cache.set(symbol, data);
        } else {
            if (this.DEBUG && typeof window !== 'undefined') {
                alert(`DataManager: FAILURE! Bridge returned nothing for ${symbol}.`);
            }
        }
        
        return data;
    }

    getTickerUniverse() {
        if (!this._isInitialized) return [];
        return DBBridge.getTickerUniverse();
    }
}

// THE SINGLETON
export const FZDataManager = new DataManager();