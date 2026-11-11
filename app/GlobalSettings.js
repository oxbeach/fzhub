// app/GlobalSettings.js
import { TimeSpan } from './TimeSpan';
import GetTicker from './GetTicker';
//////////////////////////////////////////import { FZDataManager } from '../src/DataManagement/DataManager';



// --- INTEGRATED SWITCHBOARD ---
// This class manages where the data actually comes from (Dummy, tiingo, etc.)
class ThirdPartyConnection {
    constructor() {
        this.activeMarketSource = "FZDUMMY"; 
        this.activeSystemDB     = "LOCAL";   

        this._mysqlConfig = {
            host: 'localhost',
            user: 'fz_admin',
            password: 'PROD_PASSWORD',
            database: 'financial_zone'
        };

        this._Tiingoconfig = {
            apiKey: 'YZ_API_12345',
            endpoint: 'https://query1.finance.tiingo.com/'
        };
    }

    get marketSource() { return this.activeMarketSource; }
    get systemDB()     { return this.activeSystemDB; }
}

const TPConnect = new ThirdPartyConnection();

export default class GlobalSettings {
    constructor(minYear, maxYear) {
        // --- DATA ENGINE INITIALIZATION ---
        // We reference the existing Manager instance and "Turn the Key"
        /////////////////////////////////this.dataManager = FZDataManager;
        
        // This call wakes up the Bridge and connects it to your RawData file
        //////////////////////////this.dataManager.initialize({ marketSource: TPConnect.marketSource });

        // --- WEBSITE SESSION SETTINGS ---
        this.timeSpan           = new TimeSpan(minYear, maxYear);
        this.threshold          = 0.10;
        this.analysisFrequency  = 'YEARLY';
        this.mhp                = 3;
        
        this.useTrailingReturns = false;
        this.trailingMonth      = 'December';
        this.useFiller          = false;
        this.fillerRate         = 0.05;
        this.isInitialized      = false;
    }

    isValid() {
        return this.getValidationError() === null;
    }

    getValidationError() {
        if (!this.timeSpan.isValid()) {
            return "⚠️ Date Range Error: 1-30 years allowed.";
        }
        
        if (this.mhp >= this.timeSpan.getYearCount()) {
        return `⚠️ MHP (${this.mhp}) must be less than the selected period.`;
    }
        const isThresholdOk = !isNaN(this.threshold) && this.threshold >= 0 && this.threshold <= 1;
        const isFillerOk = !this.useFiller || (!isNaN(this.fillerRate) && this.fillerRate >= 0 && this.fillerRate <= 1);
        
        if (!isThresholdOk || !isFillerOk) {
            return "⚠️ Percentages must be between 0% and 100%.";
        }

        return null; // All clear
    }
}

// Global Singleton used by the UI
export const initialSettings = new GlobalSettings();    

export function resetGlobalSettings() { initialSettings.isInitialized = false; }

// --- SUBSCRIPTION LOGIC ---
const subscribers = [];

export const subscribeToSettingsChange = (callback) => {
    subscribers.push(callback);
};

export const broadcastSettingsChange = () => {
    subscribers.forEach(func => func());
};