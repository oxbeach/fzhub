// TimeSpan.js
export class TimeSpan {
    constructor(startYear = 2017, endYear = 2026, endMonth = 12) {
        this.startYear = Number(startYear);
        this.endYear = Number(endYear);
        this.endMonth = Number(endMonth);
        this.MAX_SPAN = 30;
    }

    // Inclusive math: (2015 - 2011) + 1 = 5
    getYearCount() {
        return (this.endYear - this.startYear) + 1;
    }

    isValid() {
        const currentYear = new Date().getFullYear();
        const count = this.getYearCount();
        
        // 1. Must be within 1-30 years
        // 2. End Year cannot be in the future
        // 3. End Year must be greater than or equal to Start Year
        return (
            count >= 1 && 
            count <= this.MAX_SPAN && 
            this.endYear <= currentYear && 
            this.endYear >= this.startYear
        );
    }
}