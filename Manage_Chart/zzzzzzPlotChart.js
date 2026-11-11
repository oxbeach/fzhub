
export class PlotChart {
    constructor(subType, value, portfolio, threshold, mhp) {
        this.portfolio = portfolio;
        this.threshold = threshold; // Note: this will be scaled to % in generate()
        this.mhp       = mhp;
        this.Type      = "plot";
        this.subType   = subType.toLowerCase(); // period, year, age
        this.value     = value;

        // Renamed from .output to .chartData
        this.chartData = {
            type: "none",
            stats: [],
            points: { success: [], fail: [], neutral: [] },
            lines: [],
            bars: [],
            bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }
        };
    }

    /**
     * The Engine: Extracts data from the matrix and processes it into geometry.
     * Returns 'this' (the PlotChart instance) for the Library.
     */
    generate() {
        // 1. Extraction: Use the canonical subType and value
        const rawPoints = this.portfolio.extractPoints(this.subType, this.value);
        
        if (!rawPoints || rawPoints.length === 0) {
            return this; 
        }

        let successCount = 0;
        let sumMatureReturns = 0;
        let failCount = 0;
      
        this.chartData.type = this.Type;
        this.chartData.bounds.minX = rawPoints[0].x;
        this.chartData.bounds.maxX = rawPoints[0].x;
        this.chartData.bounds.minY = Math.min(0, this.threshold);
        this.chartData.bounds.maxY = Math.max(0, this.threshold);

        // 2. The Processing Loop
        rawPoints.forEach((point) => {
            const { x, y } = point;

            // Update Bounds
            if (x < this.chartData.bounds.minX) this.chartData.bounds.minX = x;
            if (x > this.chartData.bounds.maxX) this.chartData.bounds.maxX = x;
            if (y < this.chartData.bounds.minY) this.chartData.bounds.minY = y;
            if (y > this.chartData.bounds.maxY) this.chartData.bounds.maxY = y;

            // Classification Logic (Mature vs Immature)
            if (x < this.mhp) {
                this.chartData.points.neutral.push(point);
            } else {
                sumMatureReturns += y;
                if (y >= this.threshold) {
                    this.chartData.points.success.push(point);
                    successCount++;
                } else {
                    this.chartData.points.fail.push(point);
                    failCount++;
                }
            }
        });

        // 3. Stats Calculation
        const totalMature   = successCount + failCount;
        const totalImmature = this.chartData.points.neutral.length;
        const successRate   = totalMature > 0 ? (successCount / totalMature) * 100 : 0;
        const avgReturn     = totalMature > 0 ? sumMatureReturns / totalMature : 0;
        const avgReturnPCT  = Number((avgReturn * 100).toFixed(1));

        this.chartData.stats = [
            { label: "Success",        value: successCount },
            { label: "Avg",            value: avgReturnPCT },
            { label: "Fail",           value: failCount },
            { label: "Total Mature",   value: totalMature },
            { label: "Total Immature", value: totalImmature },
            { label: "Win",            value: successRate.toFixed(1) + "%" }
        ];

        // 4. Scaling & Geometry Generation
        this._scaleToPercentage();
        this._buildGeometry(this.value, avgReturnPCT);

        return this; // Return the full instance to the Portfolio Library
    }

    _scaleToPercentage() {
        const toPct = (val) => Number((val * 100).toFixed(1));

        // Scale Points
        ['success', 'fail', 'neutral'].forEach(cat => {
            this.chartData.points[cat].forEach(p => p.y = toPct(p.y));
        });

        // Scale Bounds & Threshold
        this.chartData.bounds.minY = toPct(this.chartData.bounds.minY);
        this.chartData.bounds.maxY = toPct(this.chartData.bounds.maxY);
        this.threshold             = toPct(this.threshold);
    }


    _buildGeometry(x, avgReturnPCT) {

        //alert("  Period: " + x + "   average return: " + avgReturnPCT);
        const { minX, maxX } = this.chartData.bounds;
    
        // Threshold Line
        this.chartData.lines.push({ 
            x1: minX, y1: this.threshold, 
            x2: maxX, y2: this.threshold, 
            type: "threshold" 
        });

        //this.chartData.lines.push({ x1: minX, y1: 0, x2: maxX, y2: 0, type: "zero" });
        //this.chartData.lines.push({ x1: this.mhp, y1: minY, x2: this.mhp, y2: maxY, type: "mhp" });

        // Single Ghost Bar: No loops, no maps. Just drawing the bar for THIS period.
        if (avgReturnPCT !== 0) {
            this.chartData.bars.push({
                x1: x - 0.3, 
                x2: x + 0.3,
                y: avgReturnPCT,
                type: "average",
                intensity: Math.abs(avgReturnPCT) 
            });
        }
    }

}