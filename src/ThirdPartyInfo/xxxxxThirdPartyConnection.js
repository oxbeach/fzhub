// src/ThirdPartyInfo/ThirdPartyConnection.js

/**
 * ThirdPartyConnection
 * THE ADMINISTRATOR SWITCHBOARD
 * Hardcoded toggles for Market Data and System Database.
 */
class ThirdPartyConnection {
    constructor() {
        // --- THE MASTER TOGGLES ---
        // Change these to swap the entire site's data flow.
        this.activeMarketSource = "FZDUMMY"; // Options: "FZDUMMY", "TIINGO", "POLYGON"
        this.activeSystemDB     = "LOCAL";   // Options: "LOCAL", "MYSQL"

        // --- SYSTEM DB (MySQL) CONFIG ---
        this._mysqlConfig = {
            host: 'localhost',
            user: 'fz_admin',
            password: 'PROD_PASSWORD',
            database: 'financial_zone'
        };

        // --- MARKET DATA CONFIG ---
        this._TiingoConfig = {
            apiKey: 'YZ_API_12345',
            endpoint: 'https://query1.finance.tiingo.com/'
        };
    }

    // Getters to prevent accidental overwrites at runtime
    get marketSource() { return this.activeMarketSource; }
    get systemDB()     { return this.activeSystemDB; }
}

export const TPConnect = new ThirdPartyConnection();