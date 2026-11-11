

// app/GlobalEssentials.js
import { TimeSpan } from './TimeSpan';

export class GlobalEssentials {
    /**
     * A simple data mapping block. Zero side effects or gatekeeping inside the constructor.
     * @param {Object} rawSettings - The initial global settings snapshot
     */
    constructor(rawSettings = {}) {
        const start = rawSettings.startYear || (rawSettings.timeSpan ? rawSettings.timeSpan.startYear : 2016);
        const end   = rawSettings.endYear   || (rawSettings.timeSpan ? rawSettings.timeSpan.endYear : 2025);
        
        this.mhp        = rawSettings.mhp !== undefined ? parseInt(rawSettings.mhp) : 3;
        this.timeSpan   = new TimeSpan(start, end);
        this.threshold  = rawSettings.threshold !== undefined ? parseFloat(rawSettings.threshold) : 0.10;
        this.fillerRate = rawSettings.fillerRate !== undefined ? parseFloat(rawSettings.fillerRate) : 0.05;
        this.useFiller  = !!rawSettings.useFiller;
    }

    update(startYear, lastYear, mhp, threshold, useFiller, fillerRate) {
        this.mhp                = parseInt(mhp);
        this.timeSpan.startYear = parseInt(startYear);
        this.timeSpan.endYear   = parseInt(lastYear);
        this.threshold          = parseFloat(threshold);
        this.fillerRate         = parseFloat(fillerRate);
        this.useFiller          = useFiller;
    }

    dump(tag = "GlobalEssentials") {
        const payload = {
            startYear:  this.timeSpan.startYear,
            endYear:    this.timeSpan.endYear,
            threshold:  this.threshold,
            mhp:        this.mhp,
            fillerRate: this.fillerRate,
            useFiller:  this.useFiller
        };

        //alert(`[${tag}]\n` + JSON.stringify(payload, null, 2));
    }
}


/**
 * Clean, decoupled validation function that can be exported and used independently.
 * @param {Object} data - Any flat data object or class instance containing the target keys
 * @returns {string|null} Error message string if invalid, or null if clear
 */
export function validateGlobalEssentials(data) {
    if (!data.timeSpan || (typeof data.timeSpan.isValid === 'function' && !data.timeSpan.isValid())) {
        return "⚠️ Date Range Error: 1-30 years allowed.";
    }
    
    // Cross-field comparison using duck-typing for safety
    const totalYears = typeof data.timeSpan.getYearCount === 'function' 
        ? data.timeSpan.getYearCount() 
        : (data.timeSpan.endYear - data.timeSpan.startYear + 1);

    if (data.mhp >= totalYears) {
        return `⚠️ MHP Error: MHP (${data.mhp}) must be less than the selected period (${totalYears} years).`;
    }

    const isThresholdOk = !isNaN(data.threshold) && data.threshold >= 0 && data.threshold <= 1;
    const isFillerOk = !data.useFiller || (!isNaN(data.fillerRate) && data.fillerRate >= 0 && data.fillerRate <= 1);

    if (!isThresholdOk || !isFillerOk) {
        return "⚠️ Value Error: Percentages must be between 0% and 100%.";
    }

    return null; // State is clean and valid
}
