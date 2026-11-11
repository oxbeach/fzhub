import { daysRemaining } from "../app/api/utils/general";


// Utils.js
export function equalValues(a, b, tol = 0.0001) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    return Math.abs(a - b) <= tol;
}


/**
 * Global Scaler: Decimal to Percent
 * @param {number} val - The decimal value (e.g., 0.1)
 * @param {number} num - Decimal places for toFixed (default: 1)
 */
export const _scaleValue = (val, num = 1) => {
    if (val === null || val === undefined || isNaN(val)) return 0;
    // We handle Infinity by returning the raw value or a clamped high number 
    // to prevent toFixed from crashing, but with our finite logic, val should be real.
    if (!isFinite(val)) return val; 
    
    return Number((val * 100).toFixed(num));
};

export const CalculateMean = (points) => {
    if (!points || points.length === 0) return 0;

    const sum = points.reduce((acc, val) => acc + val, 0);
    return sum / points.length;
};

export const CalculateMedian = (points) => {
    if (!points || points.length === 0) return 0;

    // Sort ascending (using a copy to prevent mutating the original array)
    const sorted = [...points].sort((a, b) => a - b);
    const count = sorted.length;
    const mid = Math.floor(count / 2);

    if (count % 2 !== 0) {
        return sorted[mid];
    } else {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
};


 export const GenerateTicks = (min, max) => {
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
 * Determines the category of a period based on holding period and return threshold.
 * @param {Object} p - The period object { period, year, return }
 * @param {number} mhp - Minimum Holding Period
 * @param {number} threshold - Return threshold for success
 * @returns {string} - "neutral", "success", or "failure"
 */
export const determineCategory = (p, mhp, threshold) => {
    if (p.period < mhp) {
        return "neutral";
    }
    return (p.return >= threshold) ? "success" : "failure";
};

/**
 * Generic Sortino/Sharpe engine with 999 sentinel for undefined/infinite efficiency
 * @param {Array<number>} returns - Array of return values
 * @param {number} anchor - The center point (avg or median)
 * @param {number} [rRate=0.04] - The risk-free rate for Sharpe (default: 0.04)
 * @param {number} [marTarget=0.0] - The hurdle rate / MAR for Sortino (default: 0.0)
 * @returns {Object} { stdDev, sharpe, sortino }
 */
export const calculateRiskMetrics = (returns, anchor, rRate = 0.04, marTarget = 0.0) => {
    const n = returns ? returns.length : 0;
    if (n <= 1) return { stdDev: 0, sharpe: 0, sortino: 0 };

    const infinity = 999;

    // Standard Deviation (relative to anchor)
    const sqDiffs = returns.reduce((sum, val) => sum + Math.pow(val - anchor, 2), 0);
    const stdDev = Math.sqrt(sqDiffs / n);

    // Downside Deviation (relative to marTarget)
    const negDiffs = returns.reduce((sum, val) => 
        val < marTarget ? sum + Math.pow(val - marTarget, 2) : sum, 0);
    const downsideDev = Math.sqrt(negDiffs / n);

    // Decoupled Excess Returns
    const sharpeExcess = anchor - rRate;
    const sortinoExcess = anchor - marTarget;

    // Calculate Sharpe
    let sharpe = 0;
    if (stdDev > 0) {
        sharpe = sharpeExcess / stdDev;
    } else if (sharpeExcess > 0) {
        sharpe = infinity;
    }

    // Calculate Sortino
    let sortino = 0;
    if (downsideDev > 0) {
        sortino = sortinoExcess / downsideDev;
    } else if (sortinoExcess > 0) {
        sortino = infinity;
    }

    return {
        stdDev,
        sharpe,
        sortino
    };
};


/**
 * compute simple basic metrics over an input
 */
export const calculateBasicMetrics = (returns) => {
    if (!returns || returns.length === 0) {
        return { lo: 0, hi: 0, average: 0, median: 0  };
    }

    const sorted = [...returns].sort((a, b) => a - b);
    const sum    = sorted.reduce((acc, val) => acc + val, 0);
    const len    = sorted.length;
    const mid    = Math.floor(len / 2);

    return {
        lo:         sorted[0],
        hi:         sorted[len - 1],
        average:    sum / len,
        median:     len % 2 !== 0  ?  sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    };
};


/**
 * Orchestration wrapper for any linear slice of return data (Row, Col, Diag).
 * Directly leverages proven legacy basic and risk utility calculations.
 *
 * @param {Array<number>} returns - Clean array of raw return values
 * @param {number} [threshold=0.0] - The hurdle for the success threshold calculation
 * @param {string} [anchorType='AVG'] - Center point pivot indicator ('AVG' or 'MEDIAN')
 * @param {number} [target=0.04] - The baseline benchmark rate (defaults to .04 exit target)
 * @returns {Object} Clean, raw numeric metrics for downstream analysis or UI layout
 */
export function calculateDataStats(returns, threshold = 0.0, anchorType = 'AVG', target = 0.04) {
  // 1. Structural Guard
  if (!returns || returns.length === 0) {
    return { AVG: 0, HI: 0, LO: 0, SD: 0, THRS: 0, BASE_DIFF: 0 };
  }

  //alert("  returns 0 " + returns[0]);

  const basic  = calculateBasicMetrics(returns);
  const anchor = anchorType === 'MEDIAN' ? basic.median : basic.average;
  const risk   = calculateRiskMetrics(returns, anchor);

  const successCount = returns.filter(val => val >= threshold).length;
  const thrs         = successCount / returns.length;

  //alert(" successCount " + successCount + "  returns.length " + returns.length);

  // 4. Premium over Target Baseline
  const baseDiff = anchor - target;

  // 5. Output Raw Numeric Payload
  return {
    average:   basic.average,
    median:    basic.median,
    hi:        basic.hi,
    lo:        basic.lo,
    stdDev:    risk.stdDev,
    threshold: thrs,
    base_diff: baseDiff
  };
}
/**
 * Computes the High (Maximum) return from an array of row points.
 * @param {Array<Object>} points - Array of { period, year, return }
 * @returns {number} Maximum return value
 */
export const computeHi = (points) => {
    if (!points || points.length === 0) return 0;
    const returns = points.map(p => p.return);
    return Math.max(...returns);
};

/**
 * Computes the Low (Minimum) return from an array of row points.
 * @param {Array<Object>} points - Array of { period, year, return }
 * @returns {number} Minimum return value
 */
export const computeLo = (points) => {
    if (!points || points.length === 0) return 0;
    const returns = points.map(p => p.return);
    return Math.min(...returns);
};

/**
 * computeExtreme: Evaluates a data row array using an externally passed 
 * function pointer for the comparison logic to find the extreme object and index.
 * 
 * @param {Array} pointsArray - The array of objects { period, year, return } to process.
 * @param {Function} compareFunc - Function pointer evaluating (current, extreme).
 * @returns {Object} { value: number, index: number }
 */
export function computeExtreme(pointsArray, compareFunc) {
    if (!pointsArray || pointsArray.length === 0 || !compareFunc) {
        return { value: 0, index: -1 };
    }

    let extremeIndex = 0;
    let extremeValue = pointsArray[0]; // Holds the full object

    for (let i = 1; i < pointsArray.length; i++) {
        // Compares objects using the property-aware function pointer
        if (compareFunc(pointsArray[i], extremeValue)) {
            extremeValue = pointsArray[i];
            extremeIndex = i;
        }
    }

    return { 
        value: extremeValue.return, // Pull the raw number out of the winning object
        index: extremeIndex 
    };
}


/**
 * Computes the Arithmetic Mean from an array of row points.
 * @param {Array<Object>} points - Array of { period, year, return }
 * @returns {number} Mean return value
 */
export const computeAvg = (points) => {
    if (!points || points.length === 0) return 0;
    const returns = points.map(p => p.return);
    const sum = returns.reduce((acc, val) => acc + val, 0);
    return sum / returns.length;
};

/**
 * Computes the Median return from an array of row points.
 * @param {Array<Object>} points - Array of { period, year, return }
 * @returns {number} Median return value
 */
export const computeMedian = (points) => {
    if (!points || points.length === 0) return 0;
    
    const returns = points.map(p => p.return);
    const sorted = returns.sort((a, b) => a - b);
    const count = sorted.length;
    const mid = Math.floor(count / 2);

    if (count % 2 !== 0) {
        return sorted[mid];
    } else {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
};

/**
 * Computes the Standard Deviation from an array of row points.
 * @param {Array<Object>} points - Array of { period, year, return }
 * @returns {number} Standard Deviation value
 */
export const computeSD = (points) => {
    if (!points || points.length <= 1) return 0;

    const returns = points.map(p => p.return);
    const n = returns.length;

    // 1. Establish the anchor using our synchronized computeAvg tool
    const anchor = computeAvg(points);

    // 2. Sum the squared differences relative to that anchor
    const sqDiffs = returns.reduce((sum, val) => sum + Math.pow(val - anchor, 2), 0);
    
    // 3. Return the standard population deviation
    return Math.sqrt(sqDiffs / n);
};

/**
 * Computes the Sharpe Ratio from an array of row points.
 * @param {Array<Object>} points - Array of { period, year, return }
 * @param {number} [target=0.04] - The baseline hurdle rate (default: 0.04)
 * @returns {number} Sharpe Ratio value (or 999 sentinel)
 */
export const computeSharpe = (points, target = 0.04) => {
    if (!points || points.length === 0) return 0;

    const returns = points.map(p => p.return);
    const n = returns.length;
    if (n <= 1) return 0;

    const infinitySentinel = 999;
    const anchor = computeAvg(points);
    const excessReturn = anchor - target;

    const sqDiffs = returns.reduce((sum, val) => sum + Math.pow(val - anchor, 2), 0);
    const stdDev = Math.sqrt(sqDiffs / n);

    if (stdDev > 0) {
        return excessReturn / stdDev;
    } else if (excessReturn > 0) {
        return infinitySentinel;
    }

    return 0;
};

/**
 * Computes the Sortino Ratio from an array of row points.
 * @param {Array<Object>} points - Array of { period, year, return }
 * @param {number} [target=0.04] - The baseline hurdle rate (default: 0.04)
 * @returns {number} Sortino Ratio value (or 999 sentinel)
 */
export const computeSortino = (points, target = 0.0) => {
    if (!points || points.length === 0) return 0;

    const returns = points.map(p => p.return);
    const n = returns.length;
    if (n <= 1) return 0;
   
    const infinitySentinel = 999;
    const anchor = computeAvg(points);
    const excessReturn = anchor - target;

    // Accumulate squared differences ONLY for returns below the target hurdle
    const negDiffs = returns.reduce((sum, val) => 
        val < target ? sum + Math.pow(val - target, 2) : sum, 0);
    const downsideDev = Math.sqrt(negDiffs / n);

    if (downsideDev > 0) {
        return excessReturn / downsideDev;
    } else if (excessReturn > 0) {
        return infinitySentinel;
    }

    return 0;
};
/**
 * Computes the Maximum Drawdown across a series of CAGRs for a specific hold period.
 * Treats the points as pre-calculated annualized growth rates.
 * @param {Array<Object>} points - Array of { period, year, return } where return is CAGR decimal
 * @returns {number} Maximum Drawdown as a positive decimal float
 */
export const computeMaxDrawdown = (points) => {
    if (!points || points.length === 0) return 0;

    let maxDrawdown = 0;
    let peakCAGR = -Infinity;

    for (const p of points) {
        const currentCAGR = p.return;

        // Track the highest annualized growth rate achieved in this series
        if (currentCAGR > peakCAGR) {
            peakCAGR = currentCAGR;
        }

        // Avoid division by zero or calculating drawdown if we haven't established a positive peak baseline
        if (peakCAGR > 0) {
            // Relative decline from the peak annualized growth state to the current growth state
            const drawdown = (peakCAGR - currentCAGR) / (1.0 + peakCAGR);
            
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
    }

    return maxDrawdown;
};

/**
 * Computes the Calmar Ratio from an array of row points.
 * @param {Array<Object>} points - Array of { period, year, return }
 * @returns {number} Calmar Ratio value (or 999 sentinel if Max Drawdown is 0)
 */
export const computeCalmar = (points) => {
    if (!points || points.length === 0) return 0;

    const infinitySentinel = 999;
    const anchor = computeAvg(points); // Using mean return as the annualized performance anchor
    const maxDD  = computeMaxDrawdown(points);

    // Risk-Adjusted Return vs. Maximum Drawdown
    if (maxDD > 0) {
        return anchor / maxDD;
    } else if (anchor > 0) {
        return infinitySentinel;
    }

    return 0;
};


/**
     * _generateDynamicTicks: Calculates ideal step increments dynamically
     * based on the scale of the dataset, anchoring perfectly to a 0% baseline.
     */
  
export const generateDynamicTicks = (min, max) =>{
    const range = max - min;
    let step = 10; 
 
    if (range <= 10)       step = 1;  
    else if (range <= 20)  step = 2.5;  
    else if (range <= 50)  step = 5;  
    else if (range <= 150) step = 10; 
    else if (range <= 300) step = 20; 
    else                   step = 50; 

    const ticks = [];
    const epsilon = 0.0001; 

    // 1. Branch downwards from 0 using integer multipliers
    let i = 0;
    while (true) {
        const val = 0 - (i * step);
        if (val < min - step - epsilon) break; // Allow 1 step of padding below min
        ticks.unshift(val);
        i++;
    }

    // 2. Branch upwards from 0 using integer multipliers
    let j = 1;
    while (true) {
        const val = 0 + (j * step);
        if (val > max + step + epsilon) break; // Allow 1 step of padding above max
        ticks.push(val);
        j++;
    }

    // 3. Trim the array to isolate your data's neighborhood
    // This drops the excessive negative tail when data is fully positive (like 23.95)
    const trimmedTicks = ticks.filter(tick => 
        tick >= (min - step - epsilon) && 
        tick <= (max + step + epsilon)
    );

    //             alert(`DEBUG Y-TICKS:\nMin: ${min}\nMax: ${max}\nStep: ${step}\nTicks: [${trimmedTicks.join(', ')}]`);

    return trimmedTicks; 
}



export const numDays_original = (start, end) => {
    if (!start || !end) return -1;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return -1;

    // Extract pure UTC year, month, and day to completely ignore hours, minutes, and timezones
    const startUtcDays = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
    const endUtcDays = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

    const diffMs = endUtcDays - startUtcDays;
    const days = Math.floor(diffMs / 86400000) + 1;

    return Math.max(0, days);
};


/**
 * Calculates updated subscription start, end, and days remaining.
 * 
 * @param {string|Date|number} oldStart - Current subscription_start from dbInfo
 * @param {string|Date|number} oldEnd - Current subscription_end from dbInfo
 * @param {number} extensionDays - Days to add (e.g. 30 or 365)
 * @returns {{ newStart: string, newEnd: string, daysRemaining: number }}
 */

export const updateSubscription = (oldStart, oldEnd, extensionDays) => {
    const now         = new Date();
    const nowMs       = now.getTime();
    const oldEndMs    = oldEnd ? new Date(oldEnd).getTime() : 0;
    const extensionMs = extensionDays * 86400000;

    const newStart      = (oldEndMs > nowMs && oldStart) ? new Date(oldStart) : now;
    const newEnd        = new Date(Math.max(nowMs, oldEndMs) + extensionMs);
    const daysRemaining = daysRemaining(newEnd);

    return {
        newStart: newStart.toISOString(),
        newEnd:   newEnd.toISOString(),
        daysRemaining
    };
};