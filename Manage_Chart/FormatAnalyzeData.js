import { _scaleValue }          from '../Utils/Math.js';
import { generateDynamicTicks } from '../Utils/Math.js';
import { 
    computeHi, 
    computeLo, 
    computeExtreme,
    computeAvg, 
    computeMedian, 
    computeSD, 
    computeSharpe, 
    computeSortino, 
    computeMaxDrawdown, 
    computeCalmar 
} from '../Utils/Math.js';

export class FormatAnalyzeData {
    constructor(Portfolio, statName, startYear, threshold = 0.04) {
        // Save references for downstream utility functions
        this.Portfolio = Portfolio;
        this.statName  = statName;
        this.startYear = startYear; // Save the user's filtered start year selection

        // Hardcoded domain defaults for this dedicated Analyze engine
        this.Type    = "analyze";
        this.subType = statName;

        this.SIDE = 0.25; // padding for side of display chart
        
        this.chartData = {
            type:            this.Type,
            subType:         this.subType,
            points:          [],
            curves:          [],
            horizontalLines: [],
            xTicks:          [],
            yTicks:          [],
            bounds:          { minX: 0, maxX: 0, minY: 0, maxY: 0 }
        };

        // Initialize our data structure using the starting constructor baseline threshold
        this.generateChartData(threshold);
    }

    generateChartData(threshold) {
        // 1. Reset all cumulative plot structures once upfront
        this.chartData.points = [];
        this.chartData.curves = [];
        this.chartData.xTicks = [];
        
        // Initialize the class member bounds directly to the reset state
        this.chartData.bounds = {
            minX:  1,
            maxX:  0, 
            minY:  Infinity,
            maxY: -Infinity
        };

        const color1 = "rgb(248, 248, 118)";
        const color2 = 'orange';

       
        // 2. Map out the curves (they will naturally union 'this.chartData.bounds' internally)
        if (this.statName === 'Hi/Lo') {
            this._calculateCurve('Hi', 'Hi', color1, 0);
            this._calculateCurve('Lo', 'Lo', color2, 0);
        } 
        else if (this.statName === 'Avg/Median') {
            this._calculateCurve('Average', 'Average', color1,  0);
            this._calculateCurve('Median',  'Median',  color2,  0);
        } 
        else if (this.statName === 'Sharpe') {
            const displayPercent = (threshold * 100).toFixed(1);
            this._calculateCurve('Sharpe (4.0%)', 'Sharpe', color1, .04);
            this._calculateCurve(`User: ${this.statName} (${displayPercent}%)`, 'Sharpe', color2, threshold);
            //this._calculateCurve('Sharpe (4.0%)', 'Sharpe', color2, threshold);
        } 
        else if (this.statName === 'Sortino') {
            const displayPercent = (threshold * 100).toFixed(1);
            this._calculateCurve('Sortino (0.0%)', 'Sortino', color1,  0.0);
            this._calculateCurve(`User: ${this.statName} (${displayPercent}%)`, 'Sortino', color2, threshold);
            //this._calculateCurve('Sortino (4.0%)', 'Sortino', color2, threshold);
        } 
        else if (this.statName === 'SharpeFZ' || this.statName === 'SortinoFZ') {
            // Scale the float to a percentage integer for the visual legend string
            const displayPercent = (threshold * 100).toFixed(1);
            //this._calculateCurve(`Base: ${this.statName} (${displayPercent}%)`, this.statName, color1, threshold, this.Portfolio.firstYear);
            this._calculateCurve(`User: ${this.statName} (${displayPercent}%)`, this.statName, color2, threshold);
        }
        else {
            this._calculateCurve(`${this.statName}`, this.statName, color2, threshold);
        }

        // 3. Finalize the boundaries using the completed, natural union
        if (this.chartData.bounds.minY !== Infinity) {
            this.chartData.bounds.minY = this.chartData.bounds.minY - this.SIDE;
            this.chartData.bounds.maxY = this.chartData.bounds.maxY + this.SIDE;
        } else {
            // Safety fallback if no data points were actually processed
            this.chartData.bounds.minY = 0;
            this.chartData.bounds.maxY = 5; 
        }

        this.chartData.bounds.minX = this.chartData.bounds.minX   - this.SIDE;
        this.chartData.bounds.maxX = this.chartData.xTicks.length + this.SIDE;

        this.chartData.yTicks = generateDynamicTicks(this.chartData.bounds.minY, this.chartData.bounds.maxY);

        // 2. FORCE the domain variables to match the exact outer tick edges!
        this.chartData.bounds.minY = this.chartData.yTicks[0];
        this.chartData.bounds.maxY = this.chartData.yTicks[this.chartData.yTicks.length - 1];
    }

   _calculateCurve(curveLabel, metricKey, curveColor, threshold, firstYear = this.startYear) {
        const lastYear = this.Portfolio?.lastYear ? this.Portfolio.getLastYear() : 0;
        if (lastYear === 0) return;

        // 1. Define comparison functions ONCE at the top of the method
        const isGreater = (current, extreme) => current.return > extreme.return;
        const isLess    = (current, extreme) => current.return < extreme.return;

        const targetKey = metricKey.toLowerCase();
        const isExtremeMetric = (targetKey === 'hi' || targetKey === 'lo');
        
        // 2. Assign the function pointer once before entering the loop
        const comparePointer = isExtremeMetric 
            ? (targetKey === 'hi' ? isGreater : isLess) 
            : null;

        let currentStartYear = firstYear;
        const numPeriods     = lastYear - currentStartYear + 1;
        const isRatio        = ['Sharpe', 'Sortino', 'Calmar', 'SharpeFZ', 'SortinoFZ'].includes(metricKey);

        const curveID = `${this.Portfolio.id}_trend_${this.subType}_${curveLabel.replace(/\s+/g, '_')}`;

        const trendCurve = {
            id:     curveID,
            label:  curveLabel,
            name:   curveLabel,
            color:  curveColor,
            points: []
        };

        const numLimit = isRatio ? numPeriods - 1 : numPeriods;
        let displayY;

        for (let iPeriod = 1; iPeriod <= numLimit; iPeriod++) {
            const aRow = this.Portfolio.getRow(iPeriod, currentStartYear, lastYear);
            if (!aRow || aRow.length === 0) break; 

            let statValue;
            let finalStartYear, finalEndYear;

            // 3. Branch and handle data extraction + timeline calculation together
            if (isExtremeMetric) {
                const result   = computeExtreme(aRow, comparePointer);
                statValue      = result.value;
                
                finalEndYear   = currentStartYear + result.index;
                finalStartYear = finalEndYear - iPeriod + 1;
            } else {
                statValue      = this._computeStat(aRow, metricKey, threshold);
                
                finalStartYear = currentStartYear;
                finalEndYear   = lastYear;
            }

            let scaledY = isRatio ? Number(statValue.toFixed(2)) : _scaleValue(statValue);
            displayY = scaledY;
            let dotColor = curveColor;
            let dotSize  = 4;

            if (scaledY > 100) {
                if (scaledY > 998) displayY = 'Infinity';
                dotColor = 'red';
                dotSize  = 6;
                scaledY  = 100;
            }

            if (!isRatio && displayY !== 'Infinity') displayY = displayY + '%';
        
            this.chartData.points.push({
                x:          iPeriod,
                y:          scaledY,
                displayY:   displayY,
                statName:   metricKey,
                curveLabel: curveLabel,
                period:     iPeriod,
                startYear:  finalStartYear, 
                endYear:    finalEndYear,                   
                sampleSize: aRow.length,
                dotColor:   dotColor,
                dotSize:    dotSize
            });

            trendCurve.points.push({ x: iPeriod, y: scaledY });

            if (scaledY < this.chartData.bounds.minY) this.chartData.bounds.minY = scaledY;
            if (scaledY > this.chartData.bounds.maxY) this.chartData.bounds.maxY = scaledY;

            const totalTicks = this.chartData.xTicks.length;
            if (totalTicks === 0 || this.chartData.xTicks[totalTicks - 1] < iPeriod) {
                this.chartData.xTicks.push(iPeriod);
            }
            
            currentStartYear++;
        }

        this.chartData.curves.push(trendCurve);
    }
    

    /**
     * _computeStat: Routes the standard row point array directly
     * to the requested external statistical utility.
     */
    _computeStat(pointsArray, metricKey, threshold) {
        const targetKey = metricKey.toLowerCase();

        switch (targetKey) {
            case 'hi':          return computeHi(pointsArray);
            case 'lo':          return computeLo(pointsArray);
            case 'mean':
            case 'avg':
            case 'average':     return computeAvg(pointsArray);
            case 'median':      return computeMedian(pointsArray);
            case 'sd':
            case 'std dev':
            case 'stddev':      return computeSD(pointsArray);
            case 'sharpefz':
            case 'sharpe':      return computeSharpe(pointsArray, threshold);
            case 'sortinofz': 
            case 'sortino':     return computeSortino(pointsArray, threshold);
            case 'maxdrawdown':
            case 'drawdown':    return computeMaxDrawdown(pointsArray);
            case 'calmar':      return computeCalmar(pointsArray);
            
            default:
                return 0;
        }
    }
}