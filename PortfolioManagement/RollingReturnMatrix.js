import { ScoreTotals } from './ScoreTotals';
import { createSmartCell, initSmartCell } from '../Utils/Matrix/createSmartCell.js';
import { calculateCAGR } from '../Utils/Matrix/calculateCAGR.js';
import { calculateDataStats } from '../Utils/Math.js';
import { getRatioColor_VariableSD } from '../Utils/getRatioColor.js';


export class RollingReturnMatrix {
    constructor() {
        this.matrix = [];
        this.ScoreTotal = new ScoreTotals("Scorecard");
        this.ScoreRow   = new ScoreTotals("Row");

        this.threshold = 0.0;

        this.span        = 0;
        this.idxPeriod_1 = 0;
        this.idxYears    = 0;
        this.idxPeriod_2 = 0;
        this.idxStats    = 0;
        this.idxColStats = 0;

        this.colCount = 0;
        this.rowCount = 0;

        this.isValid = false;
    }

    buildMatrix(fzReturns, scoreTotal, scoreRow, threshold = 0) {
        if (!fzReturns || !fzReturns.returns) {
            this.isValid = false;
            return this;
        }

        /////////fzReturns.Dump();

        // Assign the passed selectors for logic and indexing
        this.ScoreTotal = scoreTotal;
        this.ScoreRow   = scoreRow;
        this.threshold  = threshold;

        const N = fzReturns.returns.length; 
        const S = this.ScoreRow.selectWhich.length;

        this.span = N;
        this.idxPeriod_1 = 0;
        this.idxYears    = this.idxPeriod_1 + 1;
        this.idxPeriod_2 = this.idxYears + N;
        this.idxStats    = this.idxPeriod_2 + 1;
        this.idxColStats = this.idxYears + N;

        this.colCount = 1 + N + 1 + S; 
        this.rowCount = this.colCount - 1;

        // Allocate the Unified Grid
        this.matrix = Array.from({ length: this.rowCount }, () => 
            new Array(this.colCount).fill(null)
        );

        // Orchestrate the Build
        this.buildHeaders(fzReturns, this.ScoreRow);
        this._computeCAGRrows(fzReturns, N);

        this._computeColumnStats();
        
        this.isValid = true;
        return this; 
    }

    buildHeaders(fzReturns, scoreRow) {
        const headerRow = 0;

        // 1. Set the Cornerstones
        this.matrix[headerRow][this.idxPeriod_1] = "PRD";
        this.matrix[headerRow][this.idxPeriod_2] = "PRD";

        // 2. Populate the Year Columns (North Header)
        // Just index on i + startYear
        for (let i = 0; i < this.span; i++) {
            const currentYear = fzReturns.startYear + i;
            this.matrix[headerRow][this.idxYears + i] = currentYear.toString();
        }

        // 3. Populate the Stat Labels (East Margin Header)
        //this.ScoreRow.selectWhich.forEach((label, i) => {
        scoreRow.selectWhich.forEach((label, i) => {
            this.matrix[headerRow][this.idxStats + i] = label;
        });

        // 4. Populate the Period Labels (West & Pivot Margins)
        // Rows 1 to N represent the 'Period length'
        for (let i = 1; i <= this.span; i++) {
            this.matrix[i][this.idxPeriod_1] = i.toString();
            this.matrix[i][this.idxPeriod_2] = i.toString();
        }

        // 5. Populate the Vertical Stat Labels (South Margin)
        // Appears in the West margin below the data rows
        //this.ScoreTotal.selectWhich.forEach((label, i) => {
        scoreRow.selectWhich.forEach((label, i) => {
            const targetRow = this.idxColStats + i;
            if (targetRow < this.rowCount) {
                this.matrix[targetRow][this.idxPeriod_1] = label;
            }
        });
    }

    /**
     * Orchestrator: Loops through each Period Length (1 to N)
     */
    _computeCAGRrows(fzReturns, N) {
        for (let period = 1; period <= N; period++) {
            this._computeSingleRow(fzReturns, period);
        }
    }

    /**
     * Member Engine: Computes a single horizontal slice (Period P)
     * and populates the staircase with SmartCells.
     */
    _computeSingleRow(fzReturns, period) {
        const returns = fzReturns.returns;
        const N = returns.length;


        // Initialize the row stats
        const labels = this.ScoreRow.selectWhich;

        labels.forEach((label, i) => {
            const colIndex = this.idxStats + i;

            // Initialize using our new helper
            let ctype = "dec";
            if (label === "THRS") ctype = "pct";
            this.matrix[period][colIndex] = initSmartCell(label, ctype);
        });

        // The number of valid windows for a given period is (N - period + 1)
        // Example: If N=10 and Period=10, we only run once (the whole array).
        for (let i = 0; i <= (N - period); i++) {
            
            // 1. Extract the sliding window for this period
            //const window = returns.slice(i, i + period);
            
            // 2. Calculate the raw CAGR float using our utility
            const rawCagr = calculateCAGR(fzReturns.returns, i, i + period);

            // 3. Package into a SmartCell (Value + Display String)
            // Note: createSmartCell handles the "no % sign" logic in its 'pct' type
            const smartCell = createSmartCell(rawCagr, 'dec');

            smartCell.d = (100 * smartCell.v).toFixed(1);
            smartCell.c = this.ScoreRow._determineColor( "HI", smartCell.v);

            smartCell.year   = fzReturns.startYear + period - 1 + i;
            smartCell.period = period;

            // 4. Place in the Matrix
            // Row = period length
            // Col = the year index where this window started
            const colIndex = this.idxYears + i + period - 1;    
            this.matrix[period][colIndex] = smartCell;


            // 5. collect and compute row stats
            this._gatherRowStats(rawCagr, period);
        }

        this._finalizeRowStats(period, (N - period + 1));
    }

    /**
     * In-place accumulator for row-level statistics.
     * Directly updates the matrix cells based on the Selector's labels.
     */
    _gatherRowStats(cagr, period) {
        const labels = this.ScoreRow.selectWhich;

        for (let i = 0; i < labels.length; i++) {
            const label = labels[i];
            const colIndex = this.idxStats + i;
            let cell = this.matrix[period][colIndex];

            switch (label) {
                case "HI":
                    // If it's the first window, or current cagr is higher
                    if (cell.v === -Infinity || cagr > cell.v) {
                        cell.v = cagr;
                    }
                    break;

                case "LO":
                    // If it's the first window, or current cagr is lower
                    if (cell.v === Infinity || cagr < cell.v) {
                        cell.v = cagr;
                    }
                    break;

                case "AVG":
                    // Accumulate the sum; we'll divide by the count later
                    cell.v += cagr;
                    break;

                case "THRS":
                    // Increment if we are above the "Win" threshold 
                    if (cagr >this.threshold) {
                        cell.v += 1;
                    }
                    break;

                default:
                    break;
            }
        }
    } // gatherRowStats

    _finalizeRowStats(period, windowCount) {
        const labels = this.ScoreRow.selectWhich;

        let hi   = 0;
        let lo   = 0;
        let mean = 0;


        labels.forEach((label, i) => {
            const colIndex = this.idxStats + i;
            const cell = this.matrix[period][colIndex];

            if (!cell) return;

            // 1. Math Finalization
            if (label === "AVG") {
                cell.v = cell.v / windowCount;
            } else if (label === "THRS") {

                //alert("  windowCount " + windowCount + "    cell.v  " + cell.v);

                cell.v = cell.v / windowCount;
            }
            cell.d = (100*cell.v).toFixed(1);
            cell.c = this.ScoreRow._determineColor(label, cell.v);

             switch (label) {
                case "HI":
                    hi = cell.v;
                case "LO": 
                    lo = cell.v;
                case "AVG": 
                    mean = cell.v;
                default:
                    hi = hi;
            }
        });

        // do Standard Deviation separately; we may be able to use an exising AVG

        const sdIdx = labels.indexOf("SD");
        if (sdIdx !== -1) {
            // Catch the bundled results
            const { sd, mean } = this._calculateRowSD(period, windowCount);
            const sdCell = this.matrix[period][this.idxStats + sdIdx];
            
            sdCell.v = sd;
            sdCell.d = (100 * sd).toFixed(1);

            // Dynamic Logic: How much "Signal" is left after the "Noise"?
            //const stabilityScore = mean - sd;         // starting to drift in sharpe territory, just use fixed

           //alert (" hi " + hi + " lo " + lo + "  mean " + mean);
       
            // Pass the calculated score to the color engine
            sdCell.c = getRatioColor_VariableSD(sd, hi, lo, mean);


            //const color = sdCell.c;

            //alert("       sdCell  " + color);
        }

    } // finalizeRowStats

    _calculateRowSD(period, windowCount) {
        const labels = this.ScoreRow.selectWhich;
        
        // 1. Determine Mean (Internal or External)
        let mean = 0;
        const avgIdx = labels.indexOf("AVG");
        
        if (avgIdx !== -1) {
            // Reuse the already baked average
            mean = this.matrix[period][this.idxStats + avgIdx].v;
        } else {
            // Calculate a private mean because AVG wasn't selected
            let sum = 0;
            for (let i = 0; i < windowCount; i++) {
                sum += this.matrix[period][this.idxYears + i + period - 1].v;
            }
            mean = sum / windowCount;
        }

        // 2. Compute Variance
        let sumSqDiff = 0;
        for (let i = 0; i < windowCount; i++) {
            const val = this.matrix[period][this.idxYears + i + period - 1].v;
            sumSqDiff += Math.pow(val - mean, 2);
        }

        const sd = Math.sqrt(sumSqDiff / windowCount);

        // Return the bundle
        return { sd, mean };

    } // calculateRowSD

    

    _computeColumnStats()
    {

        const labelPropertyMap = {
            "AVG":  "average",
            "HI":   "hi",
            "LO":   "lo",
            "SD":   "stdDev",
            "THRS": "threshold"
        };

                // STEP 1: Map the exact structural row labels to their matrix row indices
        const statRowMap = {}; 

        for (let rIdx = this.idxColStats; rIdx < this.rowCount; rIdx++) {
            const rowLabelCell = this.matrix[rIdx][this.idxPeriod_1];
            
            // Safety Guard: Skip truly blank/null/undefined cells cleanly
            if (!rowLabelCell) continue;

            // Safely unbox the string value only if the cell object exists
            const rowLabel = typeof rowLabelCell === 'object' ? rowLabelCell.d : rowLabelCell;

            if (rowLabel && typeof rowLabel === 'string' && rowLabel.trim() !== '') {
                statRowMap[rowLabel] = rIdx;
            }
        }

        // STEP 2: Loop chronologically through each calendar year column
        // 🎯 FIXED: Loop boundaries mapped from this.idxYears directly up to < this.idxPeriod_2
        for (let cIdx = this.idxYears; cIdx < this.idxPeriod_2; cIdx++) {
            const headerCell = this.matrix[0][cIdx];
            const targetYearStr = headerCell && typeof headerCell === 'object' ? headerCell.d : headerCell;
            
            if (!targetYearStr || isNaN(targetYearStr)) continue;
            const targetYearNum = Number(targetYearStr);

            // Pull vertical data points using the existing class method
            const rawPoints  = this.extractPointsByYear(targetYearNum);
            const rawReturns = rawPoints.map(p => p.return);

            // Guard Clause: If there are no data points to calculate, move to the next year
            if (rawReturns.length === 0) continue;

            // STEP 3: Run the calculation engine to get the raw unrounded float properties
            const rawStats = calculateDataStats(rawReturns, this.threshold, 'AVG', this.fillerRate || 0.04);

            // STEP 4: Build SmartCells and populate the matrix via lookup dictionary mapping
            Object.keys(statRowMap).forEach((label) => {
                const targetRowIdx = statRowMap[label];
                
                // Resolve the internal engine variable name dynamically via bracket notation
                const propKey = labelPropertyMap[label];
                const stat    = (propKey && rawStats) ? rawStats[propKey] : null;
                
                let ctype = "dec";
                if (label === "THRS") ctype = "pct";
                const smartCell = createSmartCell(stat, ctype);

                // Apply background colors safely via the scorecard calculation engine
                smartCell.c = (stat !== null) 
                    ? this.ScoreRow._determineColor(label, stat) 
                    : undefined;

                // Populate required tracking metadata
                smartCell.year = targetYearNum;
                smartCell.period = targetRowIdx;

                // Commit the fully loaded SmartCell straight to the matrix coordinate
                this.matrix[targetRowIdx][cIdx] = smartCell;
            });
        }

    } // END   _computeColumnStats()


    firstYear(){
        return Number(this.matrix[0][this.idxYears]);
    }

    lastYear(){
        return Number(this.matrix[0][this.idxYears + this.span - 1]);
    }

    extractSinglePoint(iPeriod, iYear) {
        if (iPeriod < 1 || iPeriod > this.span) return null;

        const iCol = this.getYearColumnIndex(iYear)
        if (iCol < 0) return null;

        const cell = this.matrix[iPeriod][iCol];

        if (cell && cell.v !== null) {
            return { 
                period: iPeriod, 
                year:   iYear, 
                return: cell.v 
            };
        }
        return null;
    }

   // returns for a given Period (row)
    extractPointsByPeriod(iPeriod) {

        if (iPeriod < 1 || iPeriod > this.span) return [];
        
        const points = [];
        const startCol = this.idxYears + (iPeriod - 1);
        const endCol = this.idxYears + this.span;

        for (let iCol = startCol; iCol < endCol; iCol++) {
            const year = Number(this.matrix[0][iCol]);
            const val = this.matrix[iPeriod][iCol].v;
            if (val !== null) {
                points.push({ period: iPeriod, year: year, return: val });
            }
        }

        //const len = points.length;
        //alert( " extract points by period len " + len);

        return points;
    }

    // returns for a given year (column)
    extractPointsByYear(targetYear) {
        const iCol = this.getYearColumnIndex(targetYear); 
        if (iCol < 0) return [];

        //alert("   column index " + iCol);

        const points = [];
        const iRowLimit = (iCol - this.idxYears) + 1;

        for (let iRow = 1; iRow <= iRowLimit; iRow++) {
            const val = this.matrix[iRow][iCol].v;
            if (val !== null) {
                points.push({ period: iRow, year: Number(targetYear), return: val });
            }
        }
        return points;
    }

    // returns for a diagonal starting at a given year
    extractPointsByDiagonal(startYear) {
        const iColStart = this.getYearColumnIndex(startYear);
        if (iColStart < 0) return [];

        const points = [];
        const colLimit = this.idxYears + this.span;

        for (let iRow = 1, iCol = iColStart; iCol < colLimit; iRow++, iCol++) {
            const year = Number(this.matrix[0][iCol]);
            const val = this.matrix[iRow][iCol].v;
            if (val !== null) {
                points.push({ period: iRow, year: year, return: val });
            }
        }
        return points;
    }

    getYearColumnIndex(year){
        const first = this.firstYear();
        const last  = this.lastYear();

        if ( first > year ) return -1;
        if ( year  > last ) return -1;

        return (this.idxYears + year - first);
    }

    getRow(iPeriod, firstYear, lastYear) {
        const rowData = [];
        for (let currentYear = firstYear; currentYear <= lastYear; currentYear++) {
            const point = this.extractSinglePoint(iPeriod, currentYear);
            
            if (point !== null) {           // Only push valid data points into our array
                rowData.push(point);
            }
        }
        return rowData;
    }

    

} // RollingReturnMatrix

