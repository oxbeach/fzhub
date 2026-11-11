import { _scaleValue }          from '../Utils/Math.js';
import { calculateBasicMetrics } from '../Utils/Math.js';

/**
 * FormatPlot: Transformer class that converts raw categorized points 
 * into a Recharts-compatible payload including lines, bounds, and curves.
 */
export class FormatPlot {
    constructor(PortfolioID = "", Type, subType, successOrBase = [], failureOrUser = [], neutral = [], threshold = 0, mhp = 0) {
        
        this.PortfolioID = PortfolioID;
        this.Type        = (Type        || "???").toLowerCase();
        this.subType     = (subType     || "???").toLowerCase();

        this.CEILING     = 1.0;     // 100% upper bound for display chart
        this.FLOOR       = -0.6;    // -60% lower bound for display chart
        this.SIDE        = 0.5;     // padding for side of display chart
        this.STEPSIZE    = 0.1;

        this.threshold = threshold;
        this.mhp       = mhp;

        // --- FORK DATA ASSIGNMENT BY SUBTYPE ---
        if (this.subType === 'age') {
            this.baseSlice = successOrBase; 
            this.userSlice = failureOrUser;

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
            curves:          [],
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
     */
    _calculateBounds = () => {
        const normalDot = 4;
        const haloDot   = 5;

        const colorSuccess = "#4ec54e";
        const colorFailure = "#e74c3c";
        const colorNeutral = "#FFFFFF";
        const colorHalo    = "yellow";
        
        this.chartData.points.outlier = [];

        let minX = Infinity, maxX = -Infinity;
        let minY = Math.min(0, this.threshold);
        let maxY = Math.max(0, this.threshold);

        const categories = ['success', 'failure', 'neutral'];
        const uniqueX = new Set();

        let hasData = false;

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

                uniqueX.add(p.x);
                const clampedY = this._clampValue(p.y);
                
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (clampedY < minY) minY = clampedY;
                if (clampedY > maxY) maxY = clampedY;

                let currentFill = colorNeutral;
                if (cat === 'success') currentFill = colorSuccess;
                if (cat === 'failure') currentFill = colorFailure;

                this.chartData.points[cat].push({
                    x:         p.x,
                    y:         _scaleValue(clampedY),
                    rawX:      p.x,     
                    rawY:      _scaleValue(p.y),     
                    o:         p.o,
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
        this.chartData.xTicks = Array.from(uniqueX).sort((a, b) => a - b);

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

        // Extract outlier halos from processed chart data
        if (hasData) {
            categories.forEach(cat => {
                this.chartData.points[cat].forEach(p => {
                    if (p.rawY < actualMinY || p.rawY > actualMaxY) {
                        p.dotStroke = colorHalo; 
                        p.dotSize = haloDot;
                        p.label   = "Outlier Data:";
                    }
                });
            });
        }
    };

    /**
     * _generateTicks: Dynamic density while anchoring to 0.
     */
    _generateTicks = (min, max) => {
        const range = max - min;
        const step = (range < 0.5) ? 0.05 : 0.10; 
        const ticks = [];
        const epsilon = 0.001;

        // 1. Generate Negative Ticks
        for (let curr = 0; curr >= min - epsilon; curr -= step) {
            ticks.unshift(_scaleValue(curr)); 
        }

        // 2. Generate Positive Ticks
        for (let curr = step; curr <= max + epsilon; curr += step) {
            ticks.push(_scaleValue(curr));
        }

        return [...new Set(ticks)].sort((a, b) => a - b);
    };
    
    /**
     * _calculateElements: The single source of truth for chart construction.
     */
    _calculateElements = () => {
        this._calculateBounds();
        if (this.subType === "age") {
            this._calculateAgeCurves();
            this._addHorizontalLine(this.threshold, "Threshold", "threshold");
        } else {
            this._calculateLines();
            this._calculateCurves();
        }
    };

    /**
     * _calculateLines: Directs line generation based on Type.
     */
    _calculateLines = () => {
        // 1. Always add the static threshold line
        this._addHorizontalLine(this.threshold, "Threshold", "threshold");

        // 2. Gather active dataset points for metric calculations
        const active = [...this.points.success, ...this.points.failure];
        if (active.length === 0) return;

        // 3. Extract raw Y values and run calculations using your existing utility
        const rawReturns = active.map(p => p.y);
        const metrics = calculateBasicMetrics(rawReturns);

        // 4. Register the dynamic metrics lines
        this._addHorizontalLine(metrics.average, "Average", "average");
        this._addHorizontalLine(metrics.median, "Median", "median");
    };

    _addHorizontalLine = (yValue, label, type = "") => {
        // Normalize the type to lowercase to protect against casing mismatches
        const cleanType = type.toLowerCase();

        const colors = { threshold: 'orange', average: 'orange', median: 'yellow' };
        const dashes = { threshold: '0', average: '5 5', median: '3 3' };

        this.chartData.horizontalLines.push({
            type: cleanType,
            y: _scaleValue(yValue), 
            label: label,
            color: colors[cleanType] || 'red',      
            dashArray: dashes[cleanType] || '0'     
        });
    };



    /**
     * _calculateCurves: Handles standard trend curves or dispatches to Rolling Returns.
     */
    _calculateCurves = () => {

        if (this.subType === "rolling") {
            this._calculateCurves_RR();
            return;
        }

        const inputPoints = (this.subType === "age") 
            ? [...this.points.success, ...this.points.failure, ...this.points.neutral]
            : [...this.points.success, ...this.points.failure];

        if (inputPoints.length < 1) return;

        const buckets = new Map();
        inputPoints.forEach(p => {
            if (!buckets.has(p.x)) buckets.set(p.x, []);
            buckets.get(p.x).push(p.y);
        });

        const sortedXTicks = Array.from(buckets.keys()).sort((a, b) => a - b);
        
        const curvePoints = sortedXTicks.map(x => {
            const yValues = buckets.get(x);
            const avgY = yValues.reduce((sum, y) => sum + y, 0) / yValues.length;
            return {
                x: x,
                y: _scaleValue(this._clampValue(avgY))
            };
        });

        this.chartData.curves.push({
            id: `trend_${this.subType}_${this.PortfolioID}`,
            label: `Average per ${this.subType}`,
            name: this.subType,
            color: "rgb(248, 248, 118)",    // Updated from "yellow" to match your primary style
            strokeWidth: 2,      // Added explicitly
            points: curvePoints
        });
    };

    /**
     * _calculateCurves_RR: Distinct lines for rolling subTypes (3, 5, 10-year structures).
     */
    _calculateCurves_RR = () => {
        const allPoints = [
            ...this.points.success,
            ...this.points.failure,  
            ...this.points.neutral
        ];

        if (allPoints.length < 2) return;

        const groups = new Map();
        allPoints.forEach(p => {
            if (!groups.has(p.o)) { groups.set(p.o, []); }
            groups.get(p.o).push(p);
        });

        groups.forEach((points, period) => {
            if (points.length < 2) return;
            points.sort((a, b) => a.x - b.x);

                    // Determine color and width configurations directly during computation
            const isTenYear = String(period) === '10';
            const curveColor = isTenYear ? "#ff7300" : (String(period) === '5' ? "#82ca9d" : "yellow");
            const curveWidth = isTenYear ? 3 : 2;

            const curve = {
                id: `rolling_${period}_${this.PortfolioID}`,
                name: `Rolling_${period}`,
                color: curveColor,
                strokeWidth: curveWidth,
                period: period,
                points: []
            };

            points.forEach(p => {
                curve.points.push({
                    x: p.x,
                    y: _scaleValue(this._clampValue(p.y)),
                    o: p.o,
                    trueY: p.y
                });
            });

            this.chartData.curves.push(curve);
        });
    };

    /**
     * _calculateAgeCurves: Processor for dual-slice Age plotting curves.
     */
    _calculateAgeCurves = () => {
        const extractCurvePoints = (slice) => {
            if (!slice || !slice.points) return [];

            const slicePoints = [
                ...(slice.points.success || []),
                ...(slice.points.failure || []),
                ...(slice.points.neutral || [])
            ];

            if (slicePoints.length === 0) return [];

            return slicePoints
                .sort((a, b) => a.x - b.x)
                .map(p => ({
                    x: p.x,
                    y: _scaleValue(this._clampValue(p.y)),
                    o: p.o,     
                    trueY: p.y  
                }));
        };

        const baseCurvePoints = extractCurvePoints(this.baseSlice);
        if (baseCurvePoints.length > 0) {
            this.chartData.curves.push({
                id: `trend_age_base_${this.PortfolioID}`,
                label: `Base Year (${this.baseSlice.key})`,
                name: `trend_age_base`, // Cleaned up name for clean labeling reference if needed
                color: "yellow",
                strokeWidth: 2,
                points: baseCurvePoints
            });
        }

        const userCurvePoints = extractCurvePoints(this.userSlice);
            if (userCurvePoints.length > 0) {
                this.chartData.curves.push({
                    id: `trend_age_user_${this.PortfolioID}`,
                    label: `Selected Year (${this.userSlice.key})`,
                    name: `trend_age_user`,
                    color: "#ff7300",       // Updated from "red" to match your desired color
                    strokeWidth: 3,
                    points: userCurvePoints
                });

            const rawReturns = userCurvePoints.map(p => p.trueY);       
            const metrics = calculateBasicMetrics(rawReturns);

            this._addHorizontalLine(metrics.average, "Average", "average");
            this._addHorizontalLine(metrics.median, "Median", "median");
        }
    };
}