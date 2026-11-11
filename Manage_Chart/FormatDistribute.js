import { getReturnColor }         from '../Utils/getReturnColor.js'
import { _scaleValue }           from '../Utils/Math.js';
import { CalculateMean }         from '../Utils/Math.js';
import { CalculateMedian }       from '../Utils/Math.js';

/**
 * FormatDistribute: Transformer class that converts raw categorized points 
 * into a Recharts-compatible payload streamlined specifically for distribution bars.
 */
export class FormatDistribute {
    constructor(portfolioID = 'default', successOrBase = [], failureOrUser = [], neutral = []) {

        // Store portfolioID on the instance
        this.portfolioID = portfolioID;

        // INPUT success, failure, neutral are triples (xaxis, return, orphan)
        this.CEILING     = 1.0;     // 100% upper bound for display chart
        this.FLOOR       = -0.6;    // -60% lower bound for display chart
        this.SIDE        = 0.5;     // padding for side of display chart
        this.STEPSIZE    = 0.1;
        this.stepNneg    = 5;
        this.stepNpos    = 5;
        this.barWidth    = this.STEPSIZE * .8;

        this.points = {
            success: successOrBase,
            failure: failureOrUser,
            neutral: neutral
        };

        this.chartData = {
            points:          { success: [], failure: [], neutral: [], outlier: [] },
            verticalLines:   [],
            barWidth:        _scaleValue(this.barWidth, 1),  
            distBars:        [],      
            accBars:         [],
            xTicks:          [-40, -30, -20, -10, 0, 10, 20, 30, 40],
            yTicks:          [],
            bounds:          { minX: 0, maxX: 0, minY: 0, maxY: 0 }
        };

        this._calculateElements();
    }

    
    /**
     * _generateTicks: Dynamic density while anchoring to 0.
     * 
     * ***************************** NO LONGER USED, BUT LEFT HERE IN CASE WE MAKE TICKS DYNAMIC
     */
    _generateTicks = (min, max) => {
        const range = max - min;
        const step = (range < 0.5) ? 0.05 : 0.10; 
        const ticks = [];
        const epsilon = 0.001; 

        for (let curr = 0; curr >= min - epsilon; curr -= step) {
            ticks.unshift(_scaleValue(curr)); 
        }

        for (let curr = step; curr <= max + epsilon; curr += step) {
            ticks.push(_scaleValue(curr));
        }

        return [...new Set(ticks)].sort((a, b) => a - b);
    };
    
    /**
     * _calculateElements: Process buckets, cumulative calculations, and mean/median lines.
     */
    _calculateElements = () => {
        // 1. Establish initial bounds
        //////////////////this._calculateBounds();

        // 2. Build and Distribute Buckets (Passing this.portfolioID down!)
        let buckets = ConstructBuckets(this.STEPSIZE, this.stepNneg, this.stepNpos, getReturnColor, this.portfolioID);
        buckets     = DistributeBuckets(buckets, this.points.success, this.points.failure, this.points.neutral, this.STEPSIZE, this.stepNneg);
        buckets     = CalculateCumulative(buckets);
        
        this.BucketsToBars(buckets);

        // 3. Mathematical Calculations
        const rawData = [
            ...this.points.success.map(p => p.y),
            ...this.points.failure.map(p => p.y)
        ];

        if (rawData.length > 0) {
            const meanResult   = CalculateMean(rawData);
            const medianResult = CalculateMedian(rawData);

            // 4. Generate Precision Indicators
            this._addVerticalLine(meanResult, "Mean", "mean", "blue", null);     
            this._addVerticalLine(medianResult, "Median", "median", "yellow", "3 3"); 
        }
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

    BucketsToBars(buckets) {
        buckets.forEach(b => {
            const sX = _scaleValue(b.start, 0); 
            const eX = _scaleValue(b.end, 0);
            const mX = _scaleValue(b.mid, 1);   

            /************************* maybe need to do this is xTicks is general in the future  */

            //this.chartData.xTicks.push(sX);

            const spatial = {
                id: b.id, 
                x: mX,
                fill:      b.color,
                avgReturn: _scaleValue(b.avgReturn, 1)       
            };

            this.chartData.distBars.push({
                ...spatial,
                y: _scaleValue(b.distFreq, 1),    
                count: b.countReturns,
                label: b.label
            });

            let accLabel = ">= " + sX + "%"; 
            if (b.isNegative) { accLabel = "< " + eX + "%"; };

            this.chartData.accBars.push({
                ...spatial,
                y: _scaleValue(b.accFreq, 1), 
                count: b.countReturnsAcc,
                label: accLabel,
                avgReturn: _scaleValue(b.accReturn, 1)
            });
        });

        this.chartData.yTicks = [0, 25, 50, 75, 100];

        let rawMinX = 0;
        let rawMaxX = 0;

        if (buckets.length > 0) {
            rawMinX = 100 * (buckets[0].mid - .5 * this.STEPSIZE - .5 * this.barWidth);
            rawMaxX = 100 * (buckets[buckets.length - 1].mid + .5 * this.STEPSIZE + .5 * this.barWidth);
        }

        this.chartData.bounds = {
            minX: parseFloat(rawMinX.toFixed(1)), 
            maxX: parseFloat(rawMaxX.toFixed(1)), 
            minY: 0,
            maxY: 100
        };
    } 
}  

/**
 * Pure Utility: Creates the skeleton for Distribution Analysis
 */
export const ConstructBuckets = (stepSize, stepNneg, stepNpos, getReturnColor, portfolioID = 'default') => {
    const buckets = [];
    const totalBuckets = stepNneg + stepNpos;
    let   currentStart = -(stepNneg * stepSize);    

    for (let i = 0; i < totalBuckets; i++) {
        const start = currentStart;
        const end   = start + stepSize;
        const midPt = (start + end) / 2;

        const isNeg = midPt < 0.0;
        
        let startPct = (start * 100).toFixed(0);
        let endPct   = (end * 100).toFixed(0);

        if (startPct === '-0') startPct = '0';
        if (endPct   === '-0') endPct   = '0';

        const rangeLabel = isNeg 
            ? `${endPct}% to ${startPct}%` 
            : `${startPct}% to ${endPct}%`;

        buckets.push({
            id: `bucket-${portfolioID}-${i}`, // Fixed iid -> id, safely using parameter portfolioID
            start: start,
            end:   end,
            mid:   midPt,
            isNegative: isNeg,
            label: rangeLabel, 
            color: getReturnColor ? getReturnColor(midPt) : "#888888",
            
            countReturns: 0,
            countReturnsAcc: 0,
            sumReturns:   0,
            avgReturn:    0,
            accReturn:    0,
            distFreq:     0,
            accFreq:      0
        });

        currentStart = end; 
    }

    if (buckets.length > 0) {
        const last          = buckets.length - 1;
        buckets[0].label    = `< ${(buckets[0].end * 100).toFixed(0)}%`;
        buckets[last].label = `> ${(buckets[last].start * 100).toFixed(0)}%`;
    }

    return buckets;
}; 

/**
 * DistributeBuckets
 */
export const DistributeBuckets = (buckets, success, failure, neutral, stepSize, stepNneg) => {
    const activePoints = [...success, ...failure];
    const totalCount = activePoints.length;
    const lastIndex = buckets.length - 1;

    if (totalCount === 0) return buckets;

    activePoints.forEach(point => {
        const val = point.y;
        // Round the division slightly to clear float anomalies
        let index = Math.floor(Number((val / stepSize).toFixed(10))) + stepNneg;

        if (index < 0) index = 0;
        if (index > lastIndex) index = lastIndex;

        const target = buckets[index];
        target.countReturns++;
        target.sumReturns += val;
    });

    buckets.forEach(b => {
        if (b.countReturns > 0) {
            b.avgReturn = b.sumReturns / b.countReturns;  
            b.distFreq = b.countReturns / totalCount;     
        } else {
            b.avgReturn = 0;
            b.distFreq = 0;
        }
    });

    return buckets;
}; 

/**
 * Pure Utility: Calculates bifurcated cumulative frequency.
 */
export const CalculateCumulative = (buckets) => {
    let runningSumNeg   = 0;
    let runningSumPos   = 0;
    let runningCountNeg = 0;
    let runningCountPos = 0;
    
    let runningWeightedSumNeg = 0;
    let runningWeightedSumPos = 0;

    // 1. Negative Side: Sum from -Infinity toward 0
    for (let i = 0; i < buckets.length; i++) {
        if (buckets[i].isNegative) {
            runningSumNeg += buckets[i].distFreq;
            buckets[i].accFreq = runningSumNeg;

            runningCountNeg += buckets[i].countReturns;
            buckets[i].countReturnsAcc = runningCountNeg;

            runningWeightedSumNeg += (buckets[i].countReturns * buckets[i].avgReturn);

            buckets[i].accReturn = runningCountNeg > 0 
                ? (runningWeightedSumNeg / runningCountNeg) 
                : 0;
        } else {
            break; 
        }
    }

    // 2. Positive Side: Sum from +Infinity toward 0
    for (let i = buckets.length - 1; i >= 0; i--) {
        if (!buckets[i].isNegative) {
            runningSumPos += buckets[i].distFreq;
            buckets[i].accFreq = runningSumPos;

            runningCountPos += buckets[i].countReturns;
            buckets[i].countReturnsAcc = runningCountPos;

            runningWeightedSumPos += (buckets[i].countReturns * buckets[i].avgReturn);

            buckets[i].accReturn = runningCountPos > 0 
                ? (runningWeightedSumPos / runningCountPos) 
                : 0;
        } else {
            break; 
        }
    }

    return buckets;
}; 

/**
 * GlobalYticks - Multi-Chart Frequency Sync
 */
export const GlobalYticks = (allBarSets) => {
    let maxFreq = 0;

    allBarSets.forEach(bars => {
        if (!bars) return;
        bars.forEach(bar => {
            if (bar.y > maxFreq) maxFreq = bar.y;
        });
    });

    const step = (maxFreq <= 20) ? 5 : 10;
    const ceiling = Math.ceil(maxFreq / step) * step;
    
    const ticks = [];
    const epsilon = 0.1;

    for (let curr = 0; curr <= ceiling + epsilon; curr += step) {
       ticks.push(Number(curr.toFixed(0))); 
    }

    return [...new Set(ticks)].sort((a, b) => a - b);
};