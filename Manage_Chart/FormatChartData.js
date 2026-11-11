
import { getReturnColor}         from '../Utils/getReturnColor.js'
import { _scaleValue }           from '../Utils/Math.js';
import { CalculateMean }         from '../Utils/Math.js';
import { CalculateMedian }       from '../Utils/Math.js';
import { calculateBasicMetrics } from '../Utils/Math.js/';
import { generateDynamicTicks }  from '../Utils/Math.js';






/**
 * FormatChartData: Transformer class that converts raw categorized points 
 * into a Recharts-compatible payload including lines, bars, and bounds.
 */
export class FormatChartData {
    constructor(Type, subType, successOrBase = [], failureOrUser = [], neutral = [], threshold = 0, mhp = 0) {

        // INPUT success, failure, neutral are triples (xaxis, return, orphan)
        // xaxis is what Rechart wants and will be either year or period, depending on Type/subType.
        // yAxis is what Rechart wants and will be return.
        // orphan is the other (year or period) that was not used by extracting from RollingMatrix.
        // orphan may be used to bridge for a complete (period, year, return)
        
        this.Type    = (Type    || "???").toLowerCase();
        this.subType = (subType || "???").toLowerCase();

        this.CEILING     = 1.0;     // 100% upper bound for display chart
        this.FLOOR       = -0.6;    // -60% lower bound for display chart
        this.SIDE        = 0.5;     // padding for side of display chart
        this.STEPSIZE    = 0.1;
        this.stepNneg    = 5;
        this.stepNpos    = 5;
        this.barWidth    = this.STEPSIZE * .8;

        this.threshold = threshold;
        this.mhp       = mhp;

        // --- FORK DATA ASSIGNMENT BY SUBTYPE ---
        if (this.subType === 'age') {
            // 1. Unpack the full slice instances using the new streamlined naming
            this.baseSlice = successOrBase; 
            this.userSlice = failureOrUser;

            // 2. Combine all categories from BOTH slices into this.points
            // This provides the global footprint needed for the bounding box and axis ticks
            this.points = {
                success: [
                    ...(this.baseSlice?.points?.success || []),
                    ...(this.userSlice?.points?.success || [])
                ],
                failure: [
                    ...(this.baseSlice?.points?.failure || []),
                    ...(this.userSlice?.points?.failure || [])
                ],
                neutral: [
                    ...(this.baseSlice?.points?.neutral || []),
                    ...(this.userSlice?.points?.neutral || [])
                ]
            };
        } else {
            // --- STANDARD PATHWAY ---
            this.points = {
                success: successOrBase,
                failure: failureOrUser,
                neutral: neutral
            };
        }

        this.chartData = {
            type:            this.Type,
            subType:         this.subType,
            points:          { success: [], failure: [], neutral: [], outlier: [] },
            horizontalLines: [],
            verticalLines:   [],
            vectorLines:     [],
            curves:          [],
            barWidth:        _scaleValue(this.barWidth, 1),  
            distBars:        [],      
            accBars:         [],
            bars:            [],      
            ghostBars:       [],     
            xTicks:          [],
            yTicks:          [],
            bounds:          { minX: 0, maxX: 0, minY: 0, maxY: 0 }
        };

        this._calculateElements();
       
}

    /**
     * INTERNAL UTILITIES
     */

    _clampValue = (val) => Math.min(Math.max(val, this.FLOOR), this.CEILING);

   /**
     * _calculateBounds: Scans raw data and ensures a 0% baseline 
     * and the threshold line are always within the Y-axis frame.
     * _calculateBounds: Now handles Clamping, X-Padding, and Y-Tick Generation.
     */
    _calculateBounds = () => {

        const normalDot = 4;
        const haloDot   = 5;

        const colorSuccess = "#4ec54e";
        const colorFailure = "#e74c3c";
        const colorNeutral = "#FFFFFF";
        const colorHalo    = "yellow";
        
        // Initialize the outlier holding array right up front
        this.chartData.points.outlier = [];

        let minX = Infinity, maxX = -Infinity;
        let minY = Math.min(0, this.threshold);
        let maxY = Math.max(0, this.threshold);

        const categories = ['success', 'failure', 'neutral'];
        const uniqueX = new Set(); // NEW: Track unique X values

        let hasData = false;

        let index = 0;
        // Scan and Clamp
        categories.forEach(cat => {
            this.points[cat].forEach(p => {
                hasData = true;

                let thisYear = p.x;
                let thisPeriod = p.o;
                if (this.subType === "period") {
                    thisYear = p.o;
                    thisPeriod = p.x;
                }

                uniqueX.add(p.x);                        // Record the X coordinate
                const clampedY = this._clampValue(p.y);  // clamp the y value for stray anomalies.
                
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (clampedY < minY) minY = clampedY;
                if (clampedY > maxY) maxY = clampedY;

                let currentFill = colorNeutral;
                if (cat === 'success') currentFill = colorSuccess;
                if (cat === 'failure') currentFill = colorFailure;

                // Store the clamped and scaled point for Recharts
                this.chartData.points[cat].push({
                    x:         p.x,
                    y:         _scaleValue(clampedY),
                    rawX:      p.x,     
                    rawY:      _scaleValue(p.y),     
                    o:         p.o,                     // Passing through the Orphan for tooltips
                    year:      thisYear,
                    period:    thisPeriod,
                    label:     "Summary:",
                    dotSize:   normalDot,
                    dotFill :  currentFill,
                    dotStroke :currentFill
                });
            });
        });

        // GENERATE TICKS

        this.chartData.yTicks = this._generateTicks(Math.max(minY, this.FLOOR), Math.min(maxY, this.CEILING));
        //this.chartData.yTicks = generateDynamicTicks(Math.max(minY, this.FLOOR), Math.min(maxY, this.CEILING));
        this.chartData.xTicks = Array.from(uniqueX).sort((a, b) => a - b); // Sorted X values

        // Derive the final Y-Bounds from the actual Ticks
        let actualMinY = Math.min(...this.chartData.yTicks);
        let actualMaxY = Math.max(...this.chartData.yTicks);

        // Format final bounds with X-Padding
        this.chartData.bounds = hasData ? {
            minX: minX - this.SIDE,
            maxX: maxX + this.SIDE,
            minY: actualMinY,
            maxY: actualMaxY
        } : { 
            minX: 0, maxX: 0, 
            minY: Math.min(0, this.threshold), 
            maxY: Math.max(0, this.threshold) 
        };

        // =================================================================
        // NEW STREAMLINED LOOP: Extract outlier halos from processed chart data
        // =================================================================

        //index = 0;
        if (hasData) {
            categories.forEach(cat => {
                this.chartData.points[cat].forEach(p => {
                    // Check the stored unclipped truth against the final tick bounds
                    //const scaleRaw = _scaleValue(p.rawY);
                    //if (scaleRaw < actualMinY || scaleRaw > actualMaxY) {
                    if (p.rawY < actualMinY || p.rawY > actualMaxY) {
                        p.dotStroke = colorHalo; 
                        p.dotSize = haloDot;
                        p.label   = "Outlier Data:";
                    }
                    //if (p.rawY < actualMinY ) p.dotStroke = colorHalo;

                    //alert("index " + index + "  rawY " + p.rawY + "   bound " + minY + "    " + maxY );
                    //index++;


                });
            });
        }


        /*
        if (hasData) {
            alert(
                "--- OUTLIER DATA CHECK ---\n" +
                "Total Outliers Captured: " + this.chartData.points.outlier.length + "\n\n" +
                "First 3 Outlier Points:\n" +
                JSON.stringify(this.chartData.points.outlier.slice(0, 3), null, 2)
            );
        }
        */

        
    };

    /**
     * _generateTicks: Dynamic density while anchoring to 0.
     * Stops strictly within the provided min/max bounds.
     */
    _generateTicks = (min, max) => {
        const range = max - min;
        const step = (range < 0.5) ? 0.05 : 0.10; 
        const ticks = [];
        const epsilon = 0.001; // Prevents floating point errors from cutting off the final tick

        // 1. Generate Negative Ticks (counting down from 0)
        // Strict comparison: Stop if the next tick would be below the floor
        for (let curr = 0; curr >= min - epsilon; curr -= step) {
            ticks.unshift(_scaleValue(curr)); 
        }

        // 2. Generate Positive Ticks (counting up from 0)
        // Strict comparison: Stop if the next tick would exceed the ceiling
        for (let curr = step; curr <= max + epsilon; curr += step) {
            ticks.push(_scaleValue(curr));
        }

        // 3. Final Sort & Filter
        return [...new Set(ticks)].sort((a, b) => a - b);
    };
    


    /**
     * _calculateElements: The single source of truth for chart construction.
     */
    _calculateElements = () => {
        // 1. Foundation: Frame and Scaled Points
        this._calculateBounds();

        // 2. Element Manifest: Exactly what goes on the canvas
        switch (this.Type) {
            case "plot":
                if (this.subType === "age") {
                    this._calculateAgeCurves();                 // handles two Age ChartData objects
                    this._addHorizontalLine(this.threshold, "Threshold", "threshold");
                } else {
                    this._calculateLines();                     // standard aggregate plots
                    this._calculateCurves();
                }
                break;

            case "distribution": {
                // Distributions may want a target vertical line ????????????????

                let buckets = ConstructBuckets(this.STEPSIZE, this.stepNneg, this.stepNpos, getReturnColor);
                buckets     = DistributeBuckets(buckets, this.points.success, this.points.failure, this.points.neutral, this.STEPSIZE, this.stepNneg);
                buckets     = CalculateCumulative(buckets);
                this.BucketsToBars(buckets);

                // 1. Extract the raw numeric values into a single flat array
                const rawData = [
                    ...this.points.success.map(p => p.y),
                    ...this.points.failure.map(p => p.y)
                ];

                // 2. Run the pure math exports
                const meanResult   = CalculateMean(rawData);
                const medianResult = CalculateMedian(rawData);

                // 3. Queue the precision vertical lines for the renderer
                this._addVerticalLine(meanResult, "Mean", "mean", "blue", null);     // null is solid line in svg
                this._addVerticalLine(medianResult, "Median", "median", "yellow", "3 3"); 
                break;
            }

            default:
                //alert(`Unknown Type + ${this.Type}`);
                break;
        }
    }; // end calculateElements


    /**
     * UNIVERSAL HELPERS
     */

    
      /**
     * _calculateLines: Directs line generation based on Type.
     */
    _calculateLines = () => {
        switch (this.Type) {
            // All plots are the same, no need to distinquish subType
            case "plot":
                this._addHorizontalLine(this.threshold, "Threshold", "threshold");
                this._addAverageLine();
                break;
                
            //  Future
            case "distribution":
                this._addHorizontalLine(this.threshold, "Threshold", "threshold");
                break;
        }
    };

    _addHorizontalLine = (yValue, label, type) => {
        this.chartData.horizontalLines.push({
            type: type,
            y: _scaleValue(yValue), 
            label: label
        });
    };

    
   _addVerticalLine = (xValue, label, type, color = "#ffffff", dashStyle = "5 5") => {
    this.chartData.verticalLines.push({
        type:      type,
        x:         _scaleValue(xValue), 
        label:     label,
        color:     color,
        dashStyle: dashStyle
    });
};

    _addVectorLine = (x1, y1, x2, y2, label, type) => {
        this.chartData.vectorLines.push({
            type: type,
            segment: [
                { x: _scaleValue(x1), y: _scaleValue(y1) },
                { x: _scaleValue(x2), y: _scaleValue(y2) }
            ],
            label: label
        });
    };

    _addAverageLine = () => {
        const active = [...this.points.success, ...this.points.failure];
        if (active.length === 0) return;

        const avg = active.reduce((acc, p) => acc + p.y, 0) / active.length;
        this._addHorizontalLine(avg, "Average", "average");
    };



    /**
     * _calculateCurves: The new central processor/controller.
     * Dispatches to _calculateCurves_RR for rolling subTypes or
     * executes the unified Filter/Bucket/Average logic for standard plots.
     */
    _calculateCurves = () => {
        // Guard: Curves are currently only a feature of 'Plot' types
        if (this.Type !== "plot") return;

        // Specialized Case: Rolling Returns
        if (this.subType === "rolling") {
            this._calculateCurves_RR();
            return;
        }

        // Standard Case: Filter Inputs based on subType
        // Age: Include all points. Year/Period: Exclude neutrals.
        const inputPoints = (this.subType === "age") 
            ? [...this.points.success, ...this.points.failure, ...this.points.neutral]
            : [...this.points.success, ...this.points.failure];

        if (inputPoints.length < 1) return;

        // Bucket: Group by X-Axis (Year, Period, or Age)
        const buckets = new Map();
        inputPoints.forEach(p => {
            if (!buckets.has(p.x)) buckets.set(p.x, []);
            buckets.get(p.x).push(p.y);
        });

        // Average & Package: Convert buckets into a single trend curve
        const sortedXTicks = Array.from(buckets.keys()).sort((a, b) => a - b);
        
        const curvePoints = sortedXTicks.map(x => {
            const yValues = buckets.get(x);
            const avgY = yValues.reduce((sum, y) => sum + y, 0) / yValues.length;
            return {
                x: x,
                y: _scaleValue(this._clampValue(avgY))
            };
        });

        // Output: Push the single "Defining Trend" curve
        this.chartData.curves.push({
            id: `trend_${this.subType}`,
            label: "Strategy Trend",
            name: this.subType,
            points: curvePoints
        });
    };


    /**
     * _calculateCurves: Separates mixed points into distinct chronological 
     * lines based on their period (3, 5, 10) and packages them for the UI.
     */
    _calculateCurves_RR = () => {

        // allPoints will be the triple (year, return, period).  Year is dominate, since that will be xAxis in Rechart

        // OUTPUT in curves will be three rolling return curves, formatted
        //
        // { id: "rolling_3", label:  "3-Year Rolling", points:  [...] },
        // { id: "rolling_5", label:  "5-Year Rolling", points:  [...] },
        // { id: "rolling_10", label: "10-Year Rolling", points: [...] }

        const allPoints = [
            ...this.points.success,
            ...this.points.failure,  
            ...this.points.neutral
        ];

        if (allPoints.length < 2) return;

        // Group points by their "Orphan" (the period: 3, 5, or 10)
        const groups = new Map();

        allPoints.forEach(p => {
            if (!groups.has(p.o)) { groups.set(p.o, []); }
            groups.get(p.o).push(p);
        });

        // Iterate through each group (each distinct rolling window)
        groups.forEach((points, period) => {
            if (points.length < 2) return;
            points.sort((a, b) => a.x - b.x); // Sort this specific window chronologically by Year (X)

            const curve = {
                id: `rolling_${period}`,
                name: `${period}-Year Rolling`,
                period: period,
                points: []
            };

            // Populate the points for THIS curve
            points.forEach(p => {
                curve.points.push({
                    x: p.x,
                    y: _scaleValue(this._clampValue(p.y)),
                    o: p.o, // Original period context
                    trueY: p.y
                });
            });

            // Push this specific curve to the output array
            this.chartData.curves.push(curve);
        });
    };

   
    /**
     * _calculateAgeCurves: Specialized processor for dual-slice Age plotting.
     * Extracts points from baseSlice and userSlice, matching the existing 
     * (x: year, y: return, o: period) structure for the working tooltip.
     */
    _calculateAgeCurves = () => {
        const extractCurvePoints = (slice) => {
            if (!slice || !slice.points) return [];

            // Gather all points across status categories for this slice
            const slicePoints = [
                ...(slice.points.success || []),
                ...(slice.points.failure || []),
                ...(slice.points.neutral || [])
            ];

            if (slicePoints.length === 0) return [];

            // Sort chronologically by Year (x) to ensure smooth rendering
            return slicePoints
                .sort((a, b) => a.x - b.x)
                .map(p => ({
                    x: p.x,
                    y: _scaleValue(this._clampValue(p.y)),
                    o: p.o,     // Preserves the period/holding time context for your tooltip
                    trueY: p.y  // Preserves raw math value for reference lines and tools
                }));
        };

        // 1. Map the baseline cohort track
        const baseCurvePoints = extractCurvePoints(this.baseSlice);
        if (baseCurvePoints.length > 0) {
            this.chartData.curves.push({
                id: "trend_age_base",
                label: `Base Year (${this.baseSlice.key})`,
                name: `Base Year (${this.baseSlice.key})`,
                points: baseCurvePoints
            });
        }

        // 2. Map the user-selected cohort track
        const userCurvePoints = extractCurvePoints(this.userSlice);
        if (userCurvePoints.length > 0) {
            this.chartData.curves.push({
                id: "trend_age_user",
                label: `Selected Year (${this.userSlice.key})`,
                name: `Selected Year (${this.userSlice.key})`,
                points: userCurvePoints
            });

            // Add final average and median lines for charting
            
            const rawReturns = userCurvePoints.map(p => p.trueY);       // Extract unscaled raw values into a flat array
            const metrics = calculateBasicMetrics(rawReturns);

            this._addHorizontalLine(metrics.average, "Average", "average");
            this._addHorizontalLine(metrics.median, "Median", "median");
        }

    };








        
    BucketsToBars(buckets) {
        // Note: this.chartData.barWidth is already scaled in the constructor

        //let index = 0;
        buckets.forEach(b => {
            // 1. Scale coordinates for the Ruler and Bar
            const sX = _scaleValue(b.start, 0); // Tick Label at left edge (e.g., 10)
            const eX = _scaleValue(b.end, 0);
            const mX = _scaleValue(b.mid, 1);   // Bar center (e.g., 15.0)

            // 2. Populate the Master Ruler
            this.chartData.xTicks.push({
                coord: sX,
                label: b.label // Uses descriptive labels like "< -20%"
            });


            //alert("  bucketToBars index  " + index + "   countReturns " + b.countReturns);
            //index++;

            // 3. Create the "Spatial" footprint
            // We scale the statistics here so the UI is "dumb" and ready-to-render.
            const spatial = {
                id: b.id,
                x: mX,
                fill:      b.color,
                //label:   b.label,
                avgReturn: _scaleValue(b.avgReturn, 1)       // Scaled for tooltips
            };

            // 4. Distribute to Chart Columns
            this.chartData.distBars.push({
                ...spatial,
                y: _scaleValue(b.distFreq, 1),    // e.g., 0.125 -> 12.5
                count: b.countReturns,
                label: b.label
            });

            let accLabel = ">= " + sX + "%"; 
            if (b.isNegative) { accLabel = "< " + eX + "%"; };

            this.chartData.accBars.push({
                ...spatial,
                y: _scaleValue(b.accFreq, 1), // e.g., 0.85 -> 85.0
                count: b.countReturnsAcc,
                label: accLabel,
                avgReturn: _scaleValue(b.accReturn, 1)
            });
        });

        //alert("  in BucketsToBars bucket mid " + buckets[5].mid + "   bar y " + this.chartData.accBars[5].count );
        //alert("  in BucketsToBars bucket mid " + buckets[6].mid + "   bar y " + this.chartData.accBars[6].count );
        //alert("  in BucketsToBars bucket mid " + buckets[7].mid + "   bar y " + this.chartData.accBars[7].count );
        //alert("  in BucketsToBars bucket mid " + buckets[8].mid + "   bar y " + this.chartData.accBars[8].count );

        // Fixed Y-Axis for Probability
        this.chartData.yTicks = [0, 25, 50, 75, 100];

      // Package everything cleanly as numeric values inside a single 'bounds' object

        const rawMinX = 100*(buckets[0].mid - .5 * this.STEPSIZE - .5 * this.barWidth);
        const rawMaxX = 100*(buckets[buckets.length-1].mid + .5 * this.STEPSIZE + .5 * this.barWidth);

        //alert(" barWidth " + this.barWidth + "   rawMinX " + rawMinX + "       rawMaxX " + rawMaxX);


        this.chartData.bounds = {
            minX: parseFloat(rawMinX.toFixed(1)), // - .5 * this.barWidth,
            maxX: parseFloat(rawMaxX.toFixed(1)), // + .5 * this.barWidth,
            minY: 0,
            maxY: 100
        };

        // Alert the clean packaged values for verification
        /*
        alert(
            "BOUNDS AUDIT:\n" +
            "minX: " + this.chartData.bounds.minX + "\n" +
            "maxX: " + this.chartData.bounds.maxX + "\n" +
            "minY: " + this.chartData.bounds.minY + "\n" +
            "maxY: " + this.chartData.bounds.maxY
        );
        */

    } //  ********************* end of BucketsToBars 

   
}  // ***************************************************************** end class FormatChartData



/**
 * Pure Utility: Creates the skeleton for Distribution Analysis
 * @param {number} stepSize - The % width of each bucket
 * @param {number} stepNneg - Count of standard buckets below 0
 * @param {number} stepNpos - Count of standard buckets above 0
 */

/**
 * ConstructBuckets - Decimal Scale
 * @param {number} stepSize - e.g., 0.05 for 5%
 */
export const ConstructBuckets = (stepSize, stepNneg, stepNpos, getReturnColor) => {
    const buckets = [];
    const totalBuckets = stepNneg + stepNpos;
    let   currentStart = -(stepNneg * stepSize);    // Start at the far left "Standard" boundary

    //alert("  stepSize " + stepSize + " stepNneg " + stepNneg + " stepNpos " + stepNpos);


    
    for (let i = 0; i < totalBuckets; i++) {
        const start = currentStart;
        const end   = start + stepSize;
        const midPt = (start + end) / 2;

        const isNeg = midPt < 0.0;
        
        // Convert to whole percentages for the text representation
        let startPct = (start * 100).toFixed(0);
        let endPct   = (end * 100).toFixed(0);

        if (startPct === '-0') startPct = '0';
        if (endPct   === '-0') endPct   = '0';

        // Conditional range formatting based on direction from zero
        const rangeLabel = isNeg 
            ? `${endPct}% to ${startPct}%` 
            : `${startPct}% to ${endPct}%`;

        buckets.push({
            id:    i,
            start: start,
            end:   end,
            mid:   midPt,
            isNegative: isNeg,

            label: rangeLabel, // <-- Explicit range string (e.g. "-20% to -10%" or "10% to 20%")

            color: getReturnColor ? getReturnColor(midPt) : "#888888",
            
            // Accumulators
            countReturns: 0,
            countReturnsAcc: 0,
            sumReturns:   0,
            avgReturn:    0,
            accReturn:    0,
            distFreq:     0,
            accFreq:      0
        });

        currentStart = end; // Move the chain forward
    }

    // Post-Loop: "Uncap" the floor and ceiling
    // Index 0 becomes [-Infinity, end]
    // Last index becomes [start, Infinity]

    const last          = buckets.length - 1;
    buckets[0].label    = `< ${(buckets[0].end * 100).toFixed(0)}%`;
    buckets[last].label = `> ${(buckets[last].start * 100).toFixed(0)}%`;

    //alert(" buckets[0].mid " + buckets[0].mid);

    return buckets;

}; // end ConstructBuckets



/**
 * DistributeBuckets
 * @param {Array} buckets - The skeleton from ConstructBuckets
 * @param {Array} success - [{x, y, o}, ...]
 * @param {Array} failure - [{x, y, o}, ...]
 * @param {Array} neutral - [{x, y, o}, ...] (Included but ignored for stats)
 */



export const DistributeBuckets = (buckets, success, failure, neutral, stepSize, stepNneg) => {
    const activePoints = [...success, ...failure];
    const totalCount = activePoints.length;
    const lastIndex = buckets.length - 1;

    
    if (totalCount === 0) return buckets;


    //alert("  entering DistributeBuckets ");

    /*
                alert(
                    `DISTRIBUTION PROBE:\n` +
                    `-------------------\n` +
                    `Success Points: ${success?.length}\n` +
                    `StepSize: ${stepSize}\n` +
                    `StepNneg: ${stepNneg}\n` +
                    `First Bucket ID: ${buckets[0]?.id}\n` +
                    `First Bucket Mid: ${buckets[0]?.mid}`
                );
    */
    

    activePoints.forEach(point => {
        const val = point.y;
        
        /**
         * Direct Index Calculation:
         * 1. Divide return by stepSize to get the raw "step count"
         * 2. Floor it to align with the bucket starts
         * 3. Add stepNneg to shift the 0-point to the correct array position
         */
        let index = Math.floor(val / stepSize) + stepNneg;

        //alert("  index " + index + " val " + val + "  stepsize " + stepSize + "  stepNneg " + stepNneg);

        // 4. Clamp to ensure outliers land in the Infinity buckets
        if (index < 0) index = 0;
        if (index > lastIndex) index = lastIndex;

        

        const target = buckets[index];

        target.countReturns++;
        target.sumReturns += val;

            /*
            alert("   distribute bucket " +
                    "      index " + index +
                    "      count " + target.countReturns +
                    "      sum   " + (100*target.sumReturns).toFixed(1)
            );
              */           



    });

    //let index = 0;
    buckets.forEach(b => {
        if (b.countReturns > 0) {
                b.avgReturn = b.sumReturns / b.countReturns;  // still in decimal format
                b.distFreq = b.countReturns / totalCount;     // distFreq remains a decimal (e.g., 0.125)
            } else {
                b.avgReturn = 0;
                b.distFreq = 0;
            }
        
            /*
            alert(" bucket index " + index +
                    "      distFreq  " + b.distFreq +
                    "      avgReturn " + b.avgReturn
            );   
            index++;
            */
            
            
    });

    return buckets;

}; // end of DistributeBuckets


/**
 * Pure Utility: Calculates bifurcated cumulative frequency.
 * Sums probabilities from the "outer tails" toward the center (Zero).
 * @param {Array} buckets - The populated buckets from DistributeBuckets.
 */
export const CalculateCumulative = (buckets) => {

    /*
    alert("  enter  CalculateCumulative ");
    for (let i = 0; i < buckets.length; i++)
        alert(" bucket i " + i + " count " + buckets[i].countReturns + "  ret " + buckets[i].avgReturn);
    */

    let runningSumNeg   = 0;
    let runningSumPos   = 0;
    let runningCountNeg = 0;
    let runningCountPos = 0;
    
    // New accumulators to track the sum of (count * avgReturn) for the weighted average
    let runningWeightedSumNeg = 0;
    let runningWeightedSumPos = 0;

    // 1. Negative Side: Sum from -Infinity toward 0
    // We iterate forward from index 0
    for (let i = 0; i < buckets.length; i++) {
        if (buckets[i].isNegative) {
            runningSumNeg += buckets[i].distFreq;
            buckets[i].accFreq = runningSumNeg;

            runningCountNeg += buckets[i].countReturns;
            buckets[i].countReturnsAcc = runningCountNeg;

            // Accumulate the raw total returns for this slice
            runningWeightedSumNeg += (buckets[i].countReturns * buckets[i].avgReturn);

            // Calculate the weighted average (guard against division by zero)
            buckets[i].accReturn = runningCountNeg > 0 
                ? (runningWeightedSumNeg / runningCountNeg) 
                : 0;

        } else {
            break; // Stop at the first positive bucket
        }
    }


    // 2. Positive Side: Sum from +Infinity toward 0
    // We iterate backward from the last index
    for (let i = buckets.length - 1; i >= 0; i--) {
        if (!buckets[i].isNegative) {
            runningSumPos += buckets[i].distFreq;
            buckets[i].accFreq = runningSumPos;

            runningCountPos += buckets[i].countReturns;
            buckets[i].countReturnsAcc = runningCountPos;

            // Accumulate the raw total returns for this slice
            runningWeightedSumPos += (buckets[i].countReturns * buckets[i].avgReturn);

            // Calculate the weighted average (guard against division by zero)
            buckets[i].accReturn = runningCountPos > 0 
                ? (runningWeightedSumPos / runningCountPos) 
                : 0;

        } else {
            break; // Stop at the first negative bucket
        }
    }

    /*
    alert("  return  CalculateCumulative ");
    for (let i = 0; i < buckets.length; i++)
        alert(" bucket i " + i + " count " + buckets[i].countReturns);
    */            

    return buckets;

}; // end of CalculateCumulative


/**
 * GlobalYticks - Multi-Chart Frequency Sync
 * Synchronizes the Y-axis for the Distribution column (Left).
 * 
 * @param {Array} allBarSets - Array of distBars arrays: [portfolio1.distBars, ...]
 * @returns {Array} A unified tick array for Recharts (e.g., [0, 10, 20])
 */
export const GlobalYticks = (allBarSets) => {
    let maxFreq = 0;

    // 1. Find the absolute peak percentage across all portfolios
    // Values in distBars are already in User Format (e.g., 15.2)
    allBarSets.forEach(bars => {
        if (!bars) return;
        bars.forEach(bar => {
            if (bar.y > maxFreq) maxFreq = bar.y;
        });
    });

    // 2. Variable Step Computation (The "Sniff Test" for cramping)
    // Use 5% steps for low-density data, 10% for standard
    const step = (maxFreq <= 20) ? 5 : 10;
    
    // 3. Round up to the next clean step for the Ceiling
    const ceiling = Math.ceil(maxFreq / step) * step;
    
    const ticks = [];
    const epsilon = 0.1;

    // 4. Generate Ticks anchored to 0
    for (let curr = 0; curr <= ceiling + epsilon; curr += step) {
       ticks.push(Number(curr.toFixed(0))); 
    }

    // 5. Final Deduplication and Sort
    return [...new Set(ticks)].sort((a, b) => a - b);

}; // ************** end of GlobalYticks



