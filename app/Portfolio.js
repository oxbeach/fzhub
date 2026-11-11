import { initialSettings }    from '../app/GlobalSettings';
import { ScoreTotals }        from '../PortfolioManagement/ScoreTotals';
import { AssetWeight }        from '../Utils/AssetWeight';
import { GlobalEssentials }   from './GlobalEssentials';

import { BlendReturns }       from '../src/data/BlendReturns';
import { FZReturns }          from '../src/data/FZReturns';
import { RollingReturnMatrix }from '../PortfolioManagement/RollingReturnMatrix';
import { ChartData}           from '../Manage_Chart/ChartData';

import { determineCategory }     from '../Utils/Math';
import { calculateRiskMetrics }  from '../Utils/Math';
import { calculateBasicMetrics } from '../Utils/Math';
import { equalValues }           from '../Utils/Math';

import { TimeSpan } from './TimeSpan'

export default class Portfolio {
    constructor(id, name, globalSettings) {

        this.id            = id;
        this.name          = name;
        this.assetsPercent = []; 
        //this.createdAt     = new Date();  // id should replace this
        this.isEqualWeight = false;
        this.isComputed    = false;
        this.defineMode    = false;
        this.DEBUG         = false; 

        //this.baselineSettings  = JSON.parse(JSON.stringify(globalSettings));         // immutable, goes with this portfolio forever
        //this.portfolioSettings = JSON.parse(JSON.stringify(globalSettings));        // mutable, user may interact with 'scratch pad'

        this.GlobalEssentials = new GlobalEssentials(globalSettings);

        this.mhp        = this.GlobalEssentials.mhp;
        this.threshold  = this.GlobalEssentials.threshold;
        this.timeSpan   = this.GlobalEssentials.timeSpan;                
        this.fillerRate = this.GlobalEssentials.fillerRate;
        this.useFiller  = this.GlobalEssentials.useFiller;
        
        //this.firstYear     = 0;
        //this.lastYear      = 0;
        //this.numPeriods    = 0;

        this.firstYear     = this.timeSpan.startYear;
        this.lastYear      = this.timeSpan.endYear;
        this.numPeriods    = 0;

        this.scoreRM_Total = new ScoreTotals("Total");
        this.scoreRM_Row   = new ScoreTotals("Row");
        this.RollingMatrix = new RollingReturnMatrix();

        
        this.points = { success: [], failure: [], neutral: [] };  // raw points our of extract (period, year, return)

        this.Statistics    = {};
        this.chartLibrary  = [];     // contains chart details in a cache pair (Type, subType)

        /***************************************  Area for data we want to be persistent ***********************/

        this.Comparison   = [null, null, null, null];     // array to hold names of portfolios used in Comparison
        this.Distribution = [null, null];                 // array to hold names of portfolios used in Distribution

        this.plotState = {
            currentYear: null,       // Tracks slider year (used ONLY by Age subtype)
            viewMode: "Period"       // Active subtype: "Period", "Year", "Rolling", or "Age"
        };

       // Persistent state block dedicated to the Analyze view
        this.analyzeState = {
            currentYear: null,      // Tracks user-selected slider year for AnalyzeUI
            sharpeThreshold: 4.0,   // Stored as a clean UI percentage number (4.0%)
            sortinoThreshold: 7.0,  // Stored as a clean UI percentage number (7.0%)
            viewMode: "Analyze",    // Unified major view identifier
            subType: "hi/lo"         // Tracks active sub-view diagnostic metric button
        };

        /***************************************  End of persistent data *****************************************/
    }

    /***************************************************************************
     * Persistent Data Helpers (Plot / Age Controls)
     ***************************************************************************/

   

    /**
     * Updates the persistent state variables safely.
     * @param {Object} state - Object containing currentYear and/or viewMode changes
     */

    initPlotState() {
        if (this.isComputed && this.firstYear > 0) {
            // Only set currentYear if it hasn't been explicitly chosen/restored yet
            if (this.plotState.currentYear === null) {
                this.plotState.currentYear = this.firstYear;
            } else {
                // Ensure existing selection stays within newly computed bounds
                this.plotState.currentYear = Math.max(
                    this.firstYear, 
                    Math.min(this.plotState.currentYear, this.lastYear)
                );
            }
        }
    }

    /**
     * Updates the persistent state variables safely.
     * @param {Object} state - Object containing currentYear and/or viewMode changes
     */
    updatePlotState(state = {}) {
        if (state.viewMode !== undefined) {
            this.plotState.viewMode = state.viewMode;
        }
        
        if (state.currentYear !== undefined) {
            // Apply bounds clamping if the portfolio data has already been computed
            if (this.isComputed && this.firstYear > 0) {
                this.plotState.currentYear = Math.max(
                    this.firstYear, 
                    Math.min(state.currentYear, this.lastYear)
                );
            } else {
                this.plotState.currentYear = state.currentYear;
            }
        }
    }

  /**
     * Retrieves the comprehensive dataset needed by UI controls like sliders or charts.
     * Ensures returned values are strictly bounded by active computation limits.
     */
    getPlotState() {
        let activeYear = this.plotState.currentYear;

        // Dynamic, on-the-fly safety check
        if (this.isComputed && this.firstYear > 0) {
            if (activeYear === null) {
                activeYear = this.firstYear;
            } else {
                activeYear = Math.max(this.firstYear, Math.min(activeYear, this.lastYear));
            }
        }

        return {
            firstYear: this.firstYear > 0 ? this.firstYear : null,
            lastYear: this.lastYear > 0 ? this.lastYear : null,
            currentYear: activeYear,
            viewMode: this.plotState.viewMode
        };
    }

    /***************************************************************************
     * Persistent Data Helpers (Analyze / Diagnostic Controls)
     ***************************************************************************/

    /**
     * Initializes or synchronizes the comprehensive analyze state data and bounds.
     * Call this right after the portfolio finishes its computation.
     */
    initAnalyzeState() {
        // Handle currentYear bounding & default synchronization
        if (this.isComputed && this.firstYear > 0) {
            if (this.analyzeState.currentYear === null) {
                this.analyzeState.currentYear = this.firstYear;
            } else {
                this.analyzeState.currentYear = Math.max(
                    this.firstYear, 
                    Math.min(this.analyzeState.currentYear, this.lastYear)
                );
            }
        }

        // Handle threshold sanitization & default stabilization
        if (this.analyzeState.sharpeThreshold === null) {
            this.analyzeState.sharpeThreshold = 4.0;
        } else {
            this.analyzeState.sharpeThreshold = Math.max(0.0, Math.min(this.analyzeState.sharpeThreshold, 15.0));
        }

        if (this.analyzeState.sortinoThreshold === null) {
            this.analyzeState.sortinoThreshold = 7.0;
        } else {
            this.analyzeState.sortinoThreshold = Math.max(0.0, Math.min(this.analyzeState.sortinoThreshold, 15.0));
        }

        // Ensure subType fallback is consistently set
        if (!this.analyzeState.subType) {
            this.analyzeState.subType = "hi/lo";
        }
    }

    /**
     * Updates any variable within the persistent analyze state block safely.
     * @param {Object} state - Object containing currentYear, sharpeThreshold, sortinoThreshold, or subType updates
     */
    updateAnalyzeState(state = {}) {
        if (state.currentYear !== undefined) {
            if (this.isComputed && this.firstYear > 0) {
                this.analyzeState.currentYear = Math.max(
                    this.firstYear, 
                    Math.min(state.currentYear, this.lastYear)
                );
            } else {
                this.analyzeState.currentYear = state.currentYear;
            }
        }

        if (state.sharpeThreshold !== undefined) {
            this.analyzeState.sharpeThreshold = Math.max(0.0, Math.min(state.sharpeThreshold, 15.0));
        }

        if (state.sortinoThreshold !== undefined) {
            this.analyzeState.sortinoThreshold = Math.max(0.0, Math.min(state.sortinoThreshold, 15.0));
        }

        if (state.subType !== undefined) {
            this.analyzeState.subType = state.subType.toLowerCase();
        }
    }

    /**
     * Retrieves the comprehensive dataset needed by the entire Analyze UI setup.
     */
    getAnalyzeState() {
        let activeYear = this.analyzeState.currentYear;

        // Dynamic, on-the-fly safety check to prevent data-drifting across views
        if (this.isComputed && this.firstYear > 0) {
            if (activeYear === null) {
                activeYear = this.firstYear;
            } else {
                activeYear = Math.max(this.firstYear, Math.min(activeYear, this.lastYear));
            }
        }

        return {
            firstYear:        this.firstYear > 0 ? this.firstYear : null,
            lastYear:         this.lastYear > 0 ? this.lastYear : null,
            minThreshold:     0.0,
            maxThreshold:     15.0,
            stepSize:         0.5,
            currentYear:      activeYear, // Now safely bounded
            sharpeThreshold:  this.analyzeState.sharpeThreshold,
            sortinoThreshold: this.analyzeState.sortinoThreshold,
            viewMode:         this.analyzeState.viewMode,
            subType:          this.analyzeState.subType
        };
    }





    /*
     * Clean up to keep this portfolio in sync because the Portfolio with name = deleteName
     * is about to be delete
    */
    cleanUpDelete(deleteName) {
        // Don't clean up if I am the one being deleted
        if (this.name === deleteName) return;       

        let wasModified = false;

        // Clean up Comparison slots
        this.Comparison = this.Comparison.map(name => {
            if (name === deleteName) {
                wasModified = true;
                return null;
            }
            return name;
        });

        // Clean up Distribution slots (Row 2 and Row 3)
        this.Distribution = this.Distribution.map(name => {
            if (name === deleteName) {
                wasModified = true;
                return null;
            }
            return name;
        });

        // Only invalidate if an actual slot reference was cleared
        if (wasModified) {
            this.isStale = true;
        }
    }

    xxxcleanUpCompute(computedName) {
        // Skip self-check
        if (this.name === computedName) return;

        // Check if this portfolio references the newly computed portfolio
        const isReferencedInComparison = this.Comparison.includes(computedName);
        const isReferencedInDistribution = this.Distribution.includes(computedName);

        if (isReferencedInComparison || isReferencedInDistribution) {
            this.isStale = true;
        }
    }

    cleanUpCompute(computedName) {
        // Skip self-check
        if (this.name === computedName) return;

        //console.log(`[cleanUpCompute Check] Instance: "${this.name}" checking against Computed: "${computedName}"`);
        //console.log(`  -> Current Comparison array:`, this.Comparison);
        //console.log(`  -> Current Distribution array:`, this.Distribution);

        // Check if this portfolio references the newly computed portfolio
        const isReferencedInComparison = this.Comparison.includes(computedName);
        const isReferencedInDistribution = this.Distribution.includes(computedName);

        //console.log(`  -> Matches: Comparison=${isReferencedInComparison}, Distribution=${isReferencedInDistribution}`);

        if (isReferencedInComparison || isReferencedInDistribution) {
            this.isStale = true;
            //console.log(`  -> SUCCESS: Marked "${this.name}" as isStale = true`);
        }
    }

    cleanUpReference(oldName, newName) {
        // Don't rename references on myself if I am the target
        if (this.name === oldName) return; 

        let wasModified = false;

        // Update Comparison slots
        this.Comparison = this.Comparison.map(name => {
            if (name === oldName) {
                wasModified = true;
                return newName;
            }
            return name;
        });

        // Update Distribution slots
        this.Distribution = this.Distribution.map(name => {
            if (name === oldName) {
                wasModified = true;
                return newName;
            }
            return name;
        });

        // Only mark stale if a slot reference actually changed
        if (wasModified) {
            this.isStale = true;
        }
    }

    /**
     * SetAssets: The "Judge"
     * Receives AssetWeight array, validates ~100% sum, and stores.
     */
    SetAssets(assetArray, areWeightsEqual) {
        if (!assetArray || assetArray.length === 0) return null;

        const total = assetArray.reduce((sum, a) => sum + parseFloat(a.weight || 0), 0);
        
        // Tolerance check synced with _Define: 0.01
        if (Math.abs(total - 100.0) > 0.1) {
            if (this.DEBUG) {
                alert(`Portfolio Validation Failed\nSum: ${total.toFixed(4)}%\nRequired: 100% (+/- 0.01)`);
            }
            return null;
        }

        this.isEqualWeight = areWeightsEqual;
        this.assetsPercent = assetArray;
        this.isStale       = true;
        return true;
    }


    setDefineMode(flag) {
        this.defineMode = flag;
        this.isStale    = true;
    }

    setGlobalEssentials(startYear, lastYear, mhp, threshold, useFiller, fillerRate) {
        this.GlobalEssentials.update(startYear, lastYear, mhp, threshold, useFiller, fillerRate);
        this.isStale = true;
    }


    
    /**
     * Calculate: The Math Engine      
     * Executes data fetching and analysis. All console logs replaced with alerts.
     * 
     * 
                        RawDBMap{
                                    "AAPL": {
                                        symbol: "AAPL",
                                        short_name: "Apple Inc.",
                                        total_count: 10,
                                        first_full_year: 2014,
                                        fz_raw_returns: {
                                        returns: [0.3753, -0.0464, 0.1003, 0.4611, -0.0679, 0.8616, 0.8075, 0.3384, -0.2683, 0.4818]
                                        },
                                        updated_at: "2026-03-01T12:00:00Z"
                                    },
                                    "SPY": {
                                        symbol: "SPY",
                                        short_name: "SPDR S&P 500 ETF Trust",
                                        total_count: 10,
                                        first_full_year: 2014,
                                        fz_raw_returns: {
                                        returns: [0.1369, 0.0138, 0.0954, 0.2182, -0.0438, 0.3149, 0.1840, 0.2871, -0.1811, 0.2629]
                                        },
                                        updated_at: "2026-03-01T12:00:00Z"
                                    }
                        }
     */

    buildRM_AllData(rawDbMap) {

        //console.log(`[buildRM_AllData] 🔄 RECOMPUTING matrix for "${this.name}" (isComputed: ${this.isComputed}, isStale: ${this.isStale})...`);

        if (this.isComputed && !this.isStale)
        {
            return { success: true, data: null, error: null };
        }

        this.points.success.length = 0;
        this.points.failure.length = 0;
        this.points.neutral.length = 0;
        this.Statistics    = {};
        this.chartLibrary  = [];
        this.isComputed    = false;
        this.isStale       = false;

        if (!this.assetsPercent || this.assetsPercent.length === 0) {
            if (this.DEBUG) alert("Calculation Error: No assets defined in the portfolio.");
            return false;
        }

        // "Setter" logic: Update internal state from the incoming globals
        this.timeSpan   = this.GlobalEssentials.timeSpan;     // The TimeSpan class instance
        this.threshold  = this.GlobalEssentials.threshold;   // For your "Scientific" tolerances
        this.mhp        = this.GlobalEssentials.mhp;
        this.fillerRate = this.GlobalEssentials.fillerRate; // e.g., 0.04
        this.useFiller  = this.GlobalEssentials.useFiller;   // Boolean

       if (this.DEBUG) {
            const tickerList = this.assetsPercent.map(a => a.ticker).join(", ");
            //alert(`About to call BlendReturns for: ${tickerList}`);
       }
        
        const result = BlendReturns.calculate(rawDbMap, this.assetsPercent, this.isEqualWeight, this.GlobalEssentials);

        if (!result || !result.success) {
            // Pass the full error payload up to PortfolioUI
            return result;
        }

        const firstRow = result.data;

        /* 
        // === VERIFICATION LOG ===
        console.log("=== FIRST ROW (ANNUAL RETURNS) ===");
        console.log("Start Year:", firstRow.startYear, "End Year:", firstRow.endYear);
        console.log("Raw Returns Array:", firstRow.returns);
        console.log("Formatted Returns:", 
        firstRow.returns.map((val, idx) => `${firstRow.startYear + idx}: ${(val * 100).toFixed(2)}%`).join(", ")
        );
        // ========================
        */

       // build the complete Rolling Return Matrix

       this.RollingMatrix.buildMatrix(firstRow, this.scoreRM_Total, this.scoreRM_Row, this.threshold);

       this.distributeMatrixPoints();      // distribute the matrix into success, failure, and neutral arrays
       this.Statistics = computeStats(this.points.success, this.points.failure, this.points.neutral, "return");

       this.scoreRM_Total.formatTotalScore(this.Statistics);

       this.firstYear    = this.RollingMatrix.firstYear();
       this.lastYear     = this.RollingMatrix.lastYear();
       this.numPeriods   = this.RollingMatrix.span;
       this.isComputed   = true;
       
       this.setGlobalEssentials(this.firstYear, this.lastYear, this.mhp, this.threshold, this.useFiller, this.fillerRate); 

       /***********************  must reset this after setGlobalEssentials */
       this.isStale      = false;


       // reset persistent data
       this.initPlotState();
       this.initAnalyzeState();

       this.defineMode = false;

       return result;
    }

    // Clear the current array by filling with null, then fill with input names
    setComparison(newNames) {   
        this.Comparison = new Array(4).fill(null);  
        for (let i = 0; i < Math.min(newNames.length, 4); i++) { this.Comparison[i] = newNames[i]; }
        this.isStale = true;
    }

    getComparison() { return this.Comparison; }

    // Clear the current array by filling with null, then fill with input names (max 2 slots)
    setDistribution(newNames) {   
        this.Distribution = new Array(2).fill(null);  
        for (let i = 0; i < Math.min(newNames.length, 2); i++) { this.Distribution[i] = newNames[i]; }
        this.isStale = true;
    }

    getDistribution() { return this.Distribution; }






    
    /**
     * getChartCollection: Retrieves a set of ChartData slices from the library.
     * If the Type is missing, it triggers the build process.
     */
    getChartCollection = function(Type, subType) {
        //alert(`top of getChartCollection: ${Type} / ${subType}`);

        if (!this.isComputed) return [];

        // Force normalization immediately to match ChartData's internal state
        const searchType = (Type    || "???").toLowerCase();
        const searchSub  = (subType || "???").toLowerCase();

        // Check if ANY instances of this Type exist in the library
        // We look for a literal match against the Type property
        const typeExists = this.chartLibrary.some(slice => slice.Type === searchType);

        // If the Type is missing, build the whole group (e.g., all Plot charts)
        if (!typeExists) {
            if (this.DEBUG) alert(`Building new chart type group: ${searchType}`);
            this.buildChartCollection(searchType);
        }

                             // --- LIBRARY STATE AUDIT ---
                             /*
                            if (this.chartLibrary.length === 0) {
                                alert("CRITICAL: chartLibrary is completely empty even after build attempt.");
                            }
                                */

        // Filter the library for the specific Type AND subType
        // Returns the array of ChartData instances (e.g., all Period slices)
        const matches = this.chartLibrary.filter(slice => 
            slice.Type    === searchType && 
            slice.subType === searchSub
        );


                    // --- MATCHES VERIFICATION ALERT ---
                /*
                alert(
                    `Filter Results for: ${searchType} / ${searchSub}\n` +
                    `----------------------------------------\n` +
                    `Library Total Size: ${this.chartLibrary.length}\n` +
                    `Matches Found: ${matches.length}`
                );


                if (matches.length === 0 && this.chartLibrary.length > 0) {
                               Sample the first item in the library to see why the match failed
                    const sample = this.chartLibrary[0];
                    alert(
                        `Match Failed. Sample of Library Entry [0]:\n` +
                        `Type: "${sample.Type}" (Looking for "${searchType}")\n` +
                        `subType: "${sample.subType}" (Looking for "${searchSub}")`
                    );
                }
                    */

        return matches;
    };


    
    getChartCollectionBYyear = function(Type, subType, year) {  // added to accomodate Plot/Age and specific diagonal year to plot.
        if (!this.isComputed) return [];

        // Force normalization immediately to match ChartData's internal state
        const searchType = (Type    || "???").toLowerCase();
        const searchSub  = (subType || "???").toLowerCase();

        // Check if ANY instances of this Type exist in the library
        // We look for a literal match against the Type property
        const typeExists = this.chartLibrary.some(slice => slice.Type === searchType);

        // If the Type is missing, build the whole group (e.g., all Plot charts)
        if (!typeExists) {
            if (this.DEBUG) alert(`Building new chart type group: ${searchType}`);
            this.buildChartCollection(searchType);
        }
        // Filter the library for the specific Type AND subType
        // Returns the array of ChartData instances (e.g., all Period slices)
        const matches = this.chartLibrary.filter(slice => 
            slice.Type    === searchType && 
            slice.subType === searchSub  &&
            slice.key     === year
        );

        return matches;
    };

 

    /**
     * buildChartCollection: Orchestrates the generation of specific chart slices.
     * Purges old Type instances and replaces them with new ChartData collections.
     */
    buildChartCollection = function(Type, overrides = null) {


        //alert("   in buildChartCollection Type " + Type);

        // 1. Establish identification
        const searchType = (Type    || "???").toLowerCase();
        let newInstances = [];

        // Determine which parameters to use (MHP and Threshold)
        const params = {
            threshold: overrides?.threshold ?? this.threshold,
            mhp:       overrides?.mhp       ?? this.mhp,
        };

        // 2. Route to specialized generation engines
        switch (searchType) {
            case 'plot':
                // Generates the collection of ChartData slices (Period/Year)
                newInstances = this.generatePlotCollection(params);
                break;
                
            case 'distribution': // ADDED: Routing for distribution
                newInstances = this.generateDistributionCollection(params);
                break;

            default:
                if (this.DEBUG) alert(`Unknown chart Type: ${searchType}`);
                return;
        }

        // 3. Purge existing instances of this specific Type from the library
        // Ensures a clean slate for the updated parameters
        this.chartLibrary = this.chartLibrary.filter(slice => slice.Type !== searchType);

        // 4. Commit the new ChartData slices to the library
        this.chartLibrary.push(...newInstances);
    };

    /**
     * generatePlotCollection: Iterates through the Rolling Matrix to create
     * discrete ChartData slices for Period, Year, and Age.
     */
    generatePlotCollection(params) {
        const allInstances = [];
        const firstYear    = this.RollingMatrix.firstYear();
        const lastYear     = this.RollingMatrix.lastYear();
        const numPeriods   = this.RollingMatrix.span;

        // Period Slices (Rows)
        for (let p = 1; p <= numPeriods; p++) {
            const points = this.RollingMatrix.extractPointsByPeriod(p);
            allInstances.push(new ChartData("plot", "period", params.threshold, params.mhp, points, p));
        }

        // Year Slices (Columns)
        for (let y = firstYear; y <= lastYear; y++) {
            const points = this.RollingMatrix.extractPointsByYear(y);
            allInstances.push(new ChartData("plot", "year", params.threshold, params.mhp, points, y));
        }

        // Rolling Slices (Rows 3, 5, 10)
        [3, 5, 10].forEach(p => {
            const points = this.RollingMatrix.extractPointsByPeriod(p);
            if (points.length > 0) {
                allInstances.push(new ChartData("plot", "rolling", params.threshold, params.mhp, points, p));
            }
        });

        // Age Slices (Diagonals) One for each starting year that can form a diagonal
        /*
        const points = this.RollingMatrix.extractPointsByDiagonal(firstYear);
        if (points.length > 0)                                                // params.mhp //
                allInstances.push(new ChartData("plot", "age", params.threshold, params.mhp, points, firstYear));
        */

        
        for (let y = firstYear; y <= lastYear; y++) {
            const points = this.RollingMatrix.extractPointsByDiagonal(y);
            if (points.length > 0) {                                          // params.mhp //
                allInstances.push(new ChartData("plot", "age", params.threshold, 0.0,           points,  y));
            }
        }
        

                // --- DIAGNOSTIC LOOP ---
                // Iterate through each created slice to verify data distribution
                /*
                allInstances.forEach((instance, index) => {
                    const sLen = instance.points.success.length;
                    const fLen = instance.points.failure.length;
                    const nLen = instance.points.neutral.length;
                    
                    alert(
                        `Instance [${index}] | Type: ${instance.Type} | subType: ${instance.subType}\n` +
                        `Success: ${sLen}\n` +
                        `Failure: ${fLen}\n` +
                        `Neutral: ${nLen}\n` +
                        `Total: ${sLen + fLen + nLen}`
                    );
                });
                */




        return allInstances;
    }

    generateDistributionCollection(params) {
     const allInstances = [];
        const numPeriods   = this.RollingMatrix.span;

        // Period Slices (Rows)
        for (let p = 1; p <= numPeriods; p++) {
            const points = this.RollingMatrix.extractPointsByPeriod(p);
            allInstances.push(new ChartData("distribution", "???", params.threshold, params.mhp, points));
        }
        
        return allInstances;
    }

    getFirstYear() { return this.RollingMatrix.firstYear()};
    getLastYear()  { return this.RollingMatrix.lastYear();}

    
    extractSinglePoint(iPeriod, iYear) {
        return this.RollingMatrix.extractSinglePoint(iPeriod, iYear);
    }

    extractPoints(type, value) {
        const searchType = type.toLowerCase();

        if (searchType === "period" || searchType === "row" || searchType === "rolling") {
            return this.getPointsByPeriod(value);
        }
        if (searchType === "year" || searchType === "col")   return this.getPointsByYear(value);
        if (searchType === "age" || searchType === "diag")   return this.getPointsByDiagonal(value);
        return [];
    }

    // Extract row, column, or diagonal returns as a single array of data
    getPointsByPeriod(iPeriod) {
        return this.RollingMatrix.extractPointsByPeriod(iPeriod);
    }

    getPointsByYear(targetYear) {
        return this.RollingMatrix.extractPointsByYear(targetYear);
    }

    getPointsByDiagonal(startYear) {
        return this.RollingMatrix.extractPointsByDiagonal(startYear);
    }

    getRow(iPeriod, firstYear, lastYear){
        return this.RollingMatrix.getRow(iPeriod, firstYear, lastYear);
    }


    computeDummyStats() {
        return {
                counts: { 
                    success: 1, 
                    failure: 2, 
                    neutral: 3, 
                    total:   4,
                    totalSF: 5
                },
                averages: { 
                    average: .35, 
                    median:  .10 
                }, 
                risk: {
                    stdDev:  -.08, 
                    sharpe:  -.55,
                    sortino: .8
                },
                riskFZ: {
                    stdDevFZ:  .11,
                    sharpeFZ:  .12,
                    sortinoFZ: .13
                }
            };
    }

    distributeMatrixPoints(){

        for (let p = 1; p <= this.RollingMatrix.span; p++) {
            const rowPoints = this.RollingMatrix.extractPointsByPeriod(p);
            for (const pnt of rowPoints) {
                const category = determineCategory(pnt, this.mhp, this.threshold);
                this.points[category].push(pnt);
            }
        }

        /*
        alert("Points Distributed: S:" 
                + this.points.success.length + 
          " F:" + this.points.failure.length + 
          " N:" + this.points.neutral.length);
        */
    }

        
    getRankStats() {
        const stats   = this.Statistics   || {};
        const counts  = stats.counts      || {};
        const averages= stats.averages    || {};
        const risk    = stats.risk        || {};

        // Helper function to convert decimal ratios to percentage strings; note there is no appended "%"
        const formatPct = (val) => `${((val || 0) * 100).toFixed(2)}`;

        // Safely calculate Success percentage
        const successRatio = counts.totalSF > 0 
            ? ((counts.success / counts.totalSF) * 100).toFixed(2) 
            : "0.00";

        return {
            //'Success': `${successRatio}`,
            'Thrs':    formatPct(averages.thrs),
            'Average': formatPct(averages.average),
            'Median':  formatPct(averages.median),
            'Hi':      formatPct(averages.hi),
            'Lo':      formatPct(averages.lo),
            'Std Dev': formatPct(risk.stdDev),
            'Sharpe':  risk.sharpe  > 998 ? '999' : (risk.sharpe || 0).toFixed(2),
            'Sortino': risk.sortino > 998 ? '999' : (risk.sortino || 0).toFixed(2)
        };
    }



   
   /**
     * Parameter-only equality check for React memoization guard.
     * Evaluates inputs and UI state; skips heavy calculated matrices/stats.
     */
    isEqual(other) {
        if (!other) return false;

        // 1. Identity, Flags & Core Settings
        if (this.id            !== other.id)            return false;
        if (this.name          !== other.name)          return false;
        if (this.isComputed    !== other.isComputed)    return false;
        if (this.isEqualWeight !== other.isEqualWeight) return false;
        if (this.defineMode    !== other.defineMode)    return false;

        // 2. Integer / Discrete Timeline Essentials
        if (this.mhp       !== other.mhp)       return false;
        if (this.firstYear !== other.firstYear) return false;
        if (this.lastYear  !== other.lastYear)  return false;
        if (this.useFiller !== other.useFiller) return false;

        // 3. Asset Allocations (Tickers & Array Structure)
        const arrA = this.assetsPercent || [];
        const arrB = other.assetsPercent || [];
        if (arrA.length !== arrB.length) return false;

        for (let i = 0; i < arrA.length; i++) {
            if (arrA[i]?.ticker !== arrB[i]?.ticker) return false;
        }

        // 4. Relational Dependency Arrays
        if (!this._arraysMatch(this.Comparison, other.Comparison))     return false;
        if (!this._arraysMatch(this.Distribution, other.Distribution)) return false;

        // 5. Active View & Discrete Control States
        if (this.plotState?.viewMode       !== other.plotState?.viewMode)    return false;
        if (this.plotState?.currentYear    !== other.plotState?.currentYear) return false;

        if (this.analyzeState?.viewMode    !== other.analyzeState?.viewMode)    return false;
        if (this.analyzeState?.subType     !== other.analyzeState?.subType)     return false;
        if (this.analyzeState?.currentYear !== other.analyzeState?.currentYear) return false;

        // -------------------------------------------------------------
        // 6. Floating-Point Tolerance Checks (Grouped at the bottom)
        // -------------------------------------------------------------
        if (!equalValues(this.threshold, other.threshold))   return false;
        if (!equalValues(this.fillerRate, other.fillerRate)) return false;

        if (!equalValues(this.analyzeState?.sharpeThreshold, other.analyzeState?.sharpeThreshold))   return false;
        if (!equalValues(this.analyzeState?.sortinoThreshold, other.analyzeState?.sortinoThreshold)) return false;

        for (let i = 0; i < arrA.length; i++) {
            if (!equalValues(arrA[i]?.weight, arrB[i]?.weight)) return false;
        }

        return true;
    }
    /**
     * Helper to perform quick primitive value checks on arrays.
     */
    _arraysMatch(arr1, arr2) {
        if (arr1 === arr2) return true;
        if (!arr1 || !arr2 || arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }
        return true;
    }




    /**
     * Serializes core portfolio definition and top-row return values for persistence.
     * Captures minimal state necessary to reconstruct the rolling matrix without DB queries.
     * 
     * @returns {Object} Structured response object containing operation status, data payload, or error context.
     */
    Serialize() {
        // Guard 1: Prevent saving uncomputed portfolios
        if (!this.isComputed) {
            return {
                success: false,
                data: null,
                error: {
                    code: "ERR_PORTFOLIO_NOT_COMPUTED",
                    location: "serialize",
                    ticker: null
                }
            };
        }

        // Guard 2: Prevent saving stale portfolios (modified parameters awaiting recomputation)
        if (this.isComputed && this.isStale) {
            return {
                success: false,
                data: null,
                error: {
                    code: "ERR_PORTFOLIO_STALE",
                    location: "serialize",
                    ticker: null
                }
            };
        }

        // Extract Period 1 row data
        const rawRow1 = this.getRow(1, this.firstYear, this.lastYear) || [];

        // Extract flat array of return values [0.12, 0.05, -0.02, ...]
        const returnsArray = rawRow1.map(item => item.return);

        return {
            success: true,
            data: {
                id: this.id,
                name: this.name,
                assetsPercent: JSON.parse(JSON.stringify(this.assetsPercent)),
                isEqualWeight: this.isEqualWeight,
                defineMode: this.defineMode,
                DEBUG: this.DEBUG,
                GlobalEssentials: JSON.parse(JSON.stringify(this.GlobalEssentials)),
                topRowReturns: returnsArray
            },
            error: null
        };
    }

    /**
     * Reconstructs portfolio instance state and recomputes the rolling matrix
     * directly from an archived payload without DB queries.
     * 
     * @param {Object} archiveData - Object generated by Portfolio.Archive()
     * @returns {boolean} Success status of the rebuild operation
     */
    RebuildArchive(archiveData) {
        if (!archiveData || !archiveData.topRowReturns || archiveData.topRowReturns.length === 0) {
            //if (this.DEBUG) console.error(`[RebuildArchive] Invalid archive payload for portfolio:`, archiveData?.name);
            return false;
        }

        // 1. Restore core primitive members
        this.id            = archiveData.id;
        this.name          = archiveData.name;
        this.assetsPercent = JSON.parse(JSON.stringify(archiveData.assetsPercent || []));
        this.isEqualWeight = archiveData.isEqualWeight ?? false;
        this.defineMode    = archiveData.defineMode ?? false;
        this.DEBUG         = archiveData.DEBUG ?? false;

        // 2. Re-hydrate GlobalEssentials into a real class instance
        this.GlobalEssentials = new GlobalEssentials(archiveData.GlobalEssentials);

        // 3. Sync internal portfolio shortcut state from GlobalEssentials
        this.timeSpan   = this.GlobalEssentials.timeSpan;     
        this.threshold  = this.GlobalEssentials.threshold;   
        this.mhp        = this.GlobalEssentials.mhp;
        this.fillerRate = this.GlobalEssentials.fillerRate; 
        this.useFiller  = this.GlobalEssentials.useFiller;   

        this.firstYear  = this.timeSpan.startYear;
        this.lastYear   = this.timeSpan.endYear;

        // 4. Reset stats and score containers
        this.points.success.length = 0;
        this.points.failure.length = 0;
        this.points.neutral.length = 0;
        this.Statistics   = {};
        this.chartLibrary = [];
        this.isComputed   = false;
        this.isStale      = false;

        // 5. Reconstruct FZReturns instance expected by buildMatrix
        const firstRow = new FZReturns(
            "Portfolio_Blend", 
            1, this.firstYear, 
            12, this.lastYear,
            "BlendReturns_Archive", 
            archiveData.topRowReturns
        );

        // 6. Rebuild full matrix, points, and statistics
        this.RollingMatrix.buildMatrix(firstRow, this.scoreRM_Total, this.scoreRM_Row, this.threshold);

        this.distributeMatrixPoints();
        this.Statistics = computeStats(this.points.success, this.points.failure, this.points.neutral, "return");

        this.scoreRM_Total.formatTotalScore(this.Statistics);

        this.numPeriods = this.RollingMatrix.span;
        this.isComputed = true;
        this.isStale    = false;
        return true;
    }





} // *********************** end of Portfolio class



/**
 * Portfolio Statistics Interface
 * Performs a deterministic double-key lookup: type -> subType
 * @param {Array}  chartLibrary - The Portfolio.chartLibrary array.
 * @param {String} type         - The major category (e.g., 'plot', 'risk').
 * @param {String} subType      - The specific chart (e.g., 'period', 'year').
 * @returns {Array}             - The pre-formatted [{ label, value }] array.
 */
export const xxxxxxgetStatistics = (chartLibrary, type, subType) => {
    if (!chartLibrary || !type || !subType) return [];

    // 1. Normalize coordinates to lowercase
    const targetType    = type.toLowerCase();
    const targetSubType = subType.toLowerCase();

    // 2. Find the type Group (e.g., 'plot')
    const group = chartLibrary.find(
        item => item.Type.toLowerCase() === targetType
    );
    if (!group) return [];

    // 3. Find the specific Chart within that group (e.g., 'period')
    const targetChart = group.charts.find(
        chart => chart.subType.toLowerCase() === targetSubType
    );

    // 4. Return the pre-formatted stats array from the specialist
    return targetChart?.stats || [];
};


/**
 * @param {Array} success - Array of point objects
 * @param {Array} failure - Array of point objects
 * @param {Array} neutral - Array of point objects
 * @param {number} baseRate - The risk-free or benchmark rate
 * @param {string} valueKey - The property name to use for return values ('y' or 'return')
 */


export const computeStats = (success = [], failure = [], neutral = [], valueKey = 'y') => {
    const sCount = success.length;
    const fCount = failure.length;
    const nCount = neutral.length;
    const judgeableTotal = sCount + fCount;
    const combinedSF = [...success, ...failure];
    
    const val = (p) => p[valueKey];     // Helper to extract value based on the chosen key

    const returns    = combinedSF.map(val);     // grab returns from object
    const basic      = calculateBasicMetrics(returns);
    const stdMetrics = calculateRiskMetrics(returns, basic.average);
    const fzMetrics  = calculateRiskMetrics(returns, basic.median);

    return {
        counts: { 
            success: sCount, 
            failure: fCount, 
            neutral: nCount, 
            total:   sCount + fCount + nCount, 
            totalSF: judgeableTotal
        },
        averages: { 
            average: basic.average, 
            median:  basic.median, 
            hi:      basic.hi,
            lo:      basic.lo,
            thrs:    judgeableTotal > 0? sCount / judgeableTotal : 0
        }, 
        risk: {
            stdDev:  stdMetrics.stdDev,
            sharpe:  stdMetrics.sharpe,
            sortino: stdMetrics.sortino
        },
        riskFZ: {
            stdDevFZ:  fzMetrics.stdDev,
            sharpeFZ:  fzMetrics.sharpe,
            sortinoFZ: fzMetrics.sortino
        }
    };
};




/**
 * aggregateChartData: Compresses a collection of ChartData slices into a single set of arrays.
 * Input: Array of ChartData objects (e.g., from Portfolio.chartLibrary).
 * Output: Literal object containing consolidated success, failure, and neutral points.
 */
export const aggregateChartData = (chartDataSlices = []) => {

  const consolidated = {
    success: [],
    failure: [],
    neutral: []
  };

  // 2. Loop through each slice and spread the points into the master lists
  chartDataSlices.forEach(slice => {
    if (slice.points) {
      consolidated.success.push(...slice.points.success);
      consolidated.failure.push(...slice.points.failure);
      consolidated.neutral.push(...slice.points.neutral);
    }
  });



                // --- VERIFICATION ALERT ---
                /*
                alert(
                    "CONSOLIDATED TOTALS\n" +
                    "-------------------\n" +
                    "Slices Processed: " + chartDataSlices.length + "\n" +
                    "Total Success: " + consolidated.success.length + "\n" +
                    "Total Failure: " + consolidated.failure.length + "\n" +
                    "Total Neutral: " + consolidated.neutral.length + "\n" +
                    "Grand Total: " + (consolidated.success.length + consolidated.failure.length + consolidated.neutral.length)
                );
                */


  return consolidated;
};

