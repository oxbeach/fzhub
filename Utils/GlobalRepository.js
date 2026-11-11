export class GlobalRepository {
    constructor(data = {}) {
        
        this.rankAllocations = data.rankAllocations || null;        // Persistent rank metric/allocations
        
        this.checkedPortfolioIds = data.checkedPortfolioIds || [];  // Persistent checked portfolio IDs

        // Dynamic session properties (NOT serialized)
        this.allYears = [];
        this.minYear  = null;
        this.maxYear  = null;

        // Single assignment directly to the class property
        /*
        this.ageSliderState = {
            firstYear:   data.ageSliderState?.firstYear ?? null,
            lastYear:    data.ageSliderState?.lastYear ?? null,
            currentYear: data.ageSliderState?.currentYear ?? null
        };
        */
    }

    /*****************************
     * 
     * ageSlider is now saved per Portfolio, one set of saved data will not work across multiple Portfolio instances
     * 
    ***************************************/

    setRankAllocations(allocations) { this.rankAllocations = allocations; }
    getRankAllocations()            { return this.rankAllocations; }

    setCheckedPortfolioIds(ids)     { this.checkedPortfolioIds = ids; } 
    getCheckedPortfolioIds()        { return this.checkedPortfolioIds; }

    // Dynamic Year Metadata Handlers
    setYearData({ allYears, minYear, maxYear }) {
        this.allYears = allYears;
        this.minYear  = minYear;
        this.maxYear  = maxYear;
    }

    getYearData() {
        return {
            allYears: this.allYears,
            minYear:  this.minYear,
            maxYear:  this.maxYear
        };
    }

    //setAgeSliderState(state)        { this.ageSliderState = { ...this.ageSliderState, ...state }; }
    //getAgeSliderState()             { return this.ageSliderState; }

    serialize() {
        return {
            rankAllocations: this.rankAllocations,
            checkedPortfolioIds: this.checkedPortfolioIds,
            //ageSliderState: this.ageSliderState
            // NOTE: allYears, minYear, and maxYear are intentionally omitted
            // to ensure dynamic session calculation on every load.
        };
    }
}