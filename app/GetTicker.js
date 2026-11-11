// GetTicker.js
export default class GetTicker {
    // Static master list - the "Source of Truth" for the application
    static VALID_TICKERS = ['DIA', 'SPY', 'QQQ', 'GLD', 'IWM', 'VTI', 'TLT'];

    constructor(symbol = 'SPY') {
        this.symbol = symbol.toUpperCase();
    }

    // Returns true if the current symbol exists in the master list
    isValid() {
        return GetTicker.VALID_TICKERS.includes(this.symbol);
    }

    // Static method to provide options to UI dropdowns
    static getOptions() {
        return GetTicker.VALID_TICKERS;
    }
}