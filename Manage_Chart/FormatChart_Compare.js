


import { _scaleValue }   from '../Utils/Math.js';
import { GenerateTicks } from '../Utils/Math.js';
import { getFirstYear }  from '../app/Portfolio.js'
import { getLastYear }  from '../app/Portfolio.js'
import { extractSinglePoint }  from '../app/Portfolio.js'


export class FormatChart_Compare {
    constructor(portfolioX, portfolioY) {

        this.mhp = Math.max(portfolioX.mhp || 0, portfolioY.mhp || 0);

        // Hard boundaries of the uniform visible workspace
        this.FLOOR       = -0.6;    
        this.CEILING     = 1.0;     

        // Rendering cosmetics
        this.normalDot  = 1;
        this.haloDot    = 4;

        this.COLOR_SUCCESS = "#4ec54e"; 
        this.COLOR_FAILURE = "#e74c3c"; 
        this.COLOR_NEUTRAL = "white"; 
        this.COLOR_HALO    = "yellow";  

        // 2. Expand chartData structures to isolate the neutral pipeline
        this.chartData = {
            points: {
                success: [], // Post-MHP: Y >= X
                failure: [], // Post-MHP: Y < X
                neutral: []  // Pre-MHP: Row index < dynamic MHP bar
            },
            stats: {
                totalPairs:     0,   // Only counts post-MHP pairs
                successCount:   0,   // Only counts post-MHP pairs
                failureCount:   0,   // Only counts post-MHP pairs
                neutralCount:   0,   // Only counts pre-MHP pairs
                extremeCount:   0,
                successPercent: 0,   // Out of post-MHP total
                failurePercent: 0,   // Out of post-MHP total
                extremePercent: 0,   // Out of post-MHP total
                neutralPercent: 0,   // pre-MHP 
                absoluteTotal:  0,    // total of all points
                startYear:      null, // intersection of the year span of X and Y portfolios
                endYear:        null  // 
            },
            vectorLines:  [],
            xTicks:       [],
            yTicks:       [],
            bounds:       { minX: this.FLOOR, maxX: this.CEILING, minY: this.FLOOR, maxY: this.CEILING }
        };
    
        this.BuildCompareData(portfolioX, portfolioY);

    } /********************************************** end of constructor ***************/

    _clampValue = (val) => Math.min(Math.max(val, this.FLOOR), this.CEILING);

   _convertToFixed = (val, nFix = 1) => (val * 100).toFixed(nFix);
    
    BuildCompareData(portfolioX, portfolioY) {
        if (!portfolioX || !portfolioY) return;

        // 1. Find the strict year intersection and matrix boundaries
        const startYear = Math.max(portfolioX.getFirstYear(), portfolioY.getFirstYear());
        const endYear   = Math.min(portfolioX.getLastYear(),  portfolioY.getLastYear());

        if (startYear > endYear) return;

        // Geometrically bounded horizontal and vertical limit for holding period tracking
        const totalSpan = endYear - startYear + 1;

        let minVal  =  Infinity;
        let maxVal  = -Infinity;
        let hasData =  false;

        //alert("    startYear " + startYear + "   endYear " + endYear + "   totalSpan " + totalSpan );

        //alert("   floor " + this.FLOOR + "   ceiling " + this.CEILING);

        // =================================================================
        // FIRST PASS: Extract, Symmetrically Clamp, and Route Collections
        // =================================================================

        for (let period = 0; period < totalSpan; period++) {        

            const currentPeriod = period + 1;

            for (let currentYear = startYear + period; currentYear <= endYear; currentYear++) {

                //alert("  currentPeriod " + currentPeriod + "   currentYear " + currentYear);
                
                const ptX = portfolioX.extractSinglePoint(currentPeriod, currentYear);
                const ptY = portfolioY.extractSinglePoint(currentPeriod, currentYear);

                // Safely drop out if we hit the unpopulated grey territory of the sparse triangle matrix
                if (!ptX || !ptY) continue;
                hasData = true;

                const rawX = ptX.return;
                const rawY = ptY.return;

                //alert("  rawX " + rawX + "   rawY " +  rawY);

                
                // Symmetrical Clamping limits for stray anomalies on both sides
                const clampedX = this._clampValue(rawX);
                const clampedY = this._clampValue(rawY);


                //alert("  rawX " + rawX + "   clampedX " + clampedX + "  rawY " + rawY + "  clampedY " + clampedY);

                // Track global mathematical coordinate extremes
                if (clampedX < minVal) minVal = clampedX;
                if (clampedY < minVal) minVal = clampedY;
                if (clampedX > maxVal) maxVal = clampedX;
                if (clampedY > maxVal) maxVal = clampedY;

                // Segregate by the mhp gatekeeper row index
                let cat = "neutral";
                let currentFill = this.COLOR_NEUTRAL;

                if (currentPeriod >= this.mhp) {
                    cat = (rawY >= rawX) ? "success" : "failure";
                    currentFill = (cat === "success") ? this.COLOR_SUCCESS : this.COLOR_FAILURE;
                }

                // Push initial payload into the targeted tracking group
                this.chartData.points[cat].push({
                    x:          _scaleValue(clampedX), 
                    y:          _scaleValue(clampedY), 
                    rawX:       _scaleValue(rawX),     
                    rawY:       _scaleValue(rawY),     
                    period:     currentPeriod,
                    year:       currentYear,
                    dotSize:    this.normalDot,
                    dotFill:    currentFill,
                    dotStroke:  currentFill,
                    isExtreme:  false
                });
            }
        }

        // =================================================================
        // GUARD CLAUSE: Empty Grid State Emergency Exit
        // =================================================================
        if (!hasData) {
            const fallbackTicks = GenerateTicks(this.FLOOR, this.CEILING);
            this.chartData.xTicks = fallbackTicks;
            this.chartData.yTicks = fallbackTicks;
            this.chartData.bounds = {
                minX: _scaleValue(this.FLOOR), maxX: _scaleValue(this.CEILING),
                minY: _scaleValue(this.FLOOR), maxY: _scaleValue(this.CEILING)
            };
            return;
        }

        //alert("   minVal " +  minVal + "   maxVal " + maxVal);

    
        // =================================================================
        // SECOND PASS: Set Shared Grid Box and Assign Halos (The Happy Path)
        // =================================================================
        const uniformTicks = GenerateTicks(Math.max(minVal, this.FLOOR), Math.min(maxVal, this.CEILING));

        this.chartData.xTicks = uniformTicks;
        this.chartData.yTicks = uniformTicks;

        const actualMin = Math.min(...uniformTicks);
        const actualMax = Math.max(...uniformTicks);

        //alert("   actualMin " +  actualMin + "   actualMax " + actualMax);

        // Establish symmetrical square boundaries for Recharts
        this.chartData.bounds = {
            minX: actualMin, maxX: actualMax,
            minY: actualMin, maxY: actualMax
        };

        // =================================================================
        // VECTOR LINE: Symmetrical 45-Degree Diagonal Line (Y = X)
        // =================================================================

        /***************************  This creates a square 

        this.chartData.vectorLines = [
            { x: actualMin, y: actualMin },
            { x: actualMax, y: actualMax }
        ];

        ******************************** end square */



        /*************************************************
         * 
         * we need to compute actual min/max for both axis to get the real bisector line
         * 
         * this amin/amax are temp 
         * 
         *************************************************/



        const aminX = this.chartData.bounds.minX;
        const amaxX = this.chartData.bounds.maxX;
        const aminY = this.chartData.bounds.minY;
        const amaxY = this.chartData.bounds.maxY;

        // 2. Compute the exact boundary intersections for Y = X
        // In negative space, the line hits the restrictive wall closest to 0 (Math.max)
        const startCoord = Math.max(aminX, aminY);

        // In positive space, the line hits the restrictive wall closest to 0 (Math.min)
        const endCoord = Math.min(amaxX, amaxY);


        //alert("   start " + startCoord + "    end " + endCoord);

        // 3. Push the clean, un-exploded array directly to the vectorLines pipeline
        this.chartData.vectorLines = [
            { x: startCoord, y: startCoord },
            { x: endCoord,   y: endCoord   }
        ];
       




        // Pure Visual Pass: Check for out-of-bounds halos across all categories

        let xCount = 0;

        const categories = ["success", "failure", "neutral"];   // only contains >= MHP
        categories.forEach(cat => {
            this.chartData.points[cat].forEach(p => {
                if (p.rawX < actualMin || p.rawX > actualMax || p.rawY < actualMin || p.rawY > actualMax) {
                    p.dotStroke = this.COLOR_HALO;
                    p.dotSize   = this.haloDot;
                    p.isExtreme = true;
                    xCount++;
                }
            });
        });

        

        // =================================================================
        // STATS CALCULATION: Direct Extraction From Array Lengths
        // =================================================================
        const sCount = this.chartData.points.success.length;
        const fCount = this.chartData.points.failure.length;
        const nCount = this.chartData.points.neutral.length;
        
        const postMhpTotal  = sCount + fCount;
        const absoluteTotal = postMhpTotal + nCount;
   

        if (absoluteTotal > 0) {
            this.chartData.stats.totalPairs     = postMhpTotal;
            this.chartData.stats.successCount   = sCount;
            this.chartData.stats.failureCount   = fCount;
            this.chartData.stats.neutralCount   = nCount;
            this.chartData.stats.extremeCount   = xCount;
            this.chartData.stats.absoluteTotal  = absoluteTotal;

            this.chartData.stats.successPercent = postMhpTotal > 0 ? this._convertToFixed(sCount / postMhpTotal) : "0.0";
            this.chartData.stats.failurePercent = postMhpTotal > 0 ? this._convertToFixed(fCount / postMhpTotal) : "0.0";
            this.chartData.stats.extremePercent = postMhpTotal > 0 ? this._convertToFixed(xCount / postMhpTotal) :  "0.0";

            this.chartData.stats.neutralPercent = this._convertToFixed(nCount / absoluteTotal);

            this.chartData.stats.startYear      = startYear;
            this.chartData.stats.endYear        = endYear;
        }
    }
}