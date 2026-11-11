
 
   /**
 * ChartData: A literal data container for Type/subType results.
 * Uses (period, year, return) to ensure mhp filtering works across all subTypes.
 */
export class ChartData {
  constructor(Type, subType, threshold, mhp, rawPoints = [], key = null) {

    // INPUT  rawPoints   are (period, year, return)
    // OUTPUT this.points are (xaxis, return, orphan)...orphan is not of interest here, metadata for later processing

    this.Type    = (Type || "???").toLowerCase();
    this.subType = (subType || "???").toLowerCase();
    this.key     = key;                             // this will be period or year, depending on Type/subType

    this.threshold = threshold;
    this.mhp = mhp;

    this.points = {
      success: [],
      failure: [],
      neutral: []
    };

    this.bounds = {
      minX:  Infinity,
      maxX: -Infinity,
      minY:  Infinity,
      maxY: -Infinity
    };

    if (rawPoints && rawPoints.length > 0) {
      this.distributePoints(rawPoints);
    }
  }

  /**
   * distributePoints: Processes raw input, categorizes, and updates bounds.
   * Explicitly maps (x, y, orphan) based on subType.
   */
  distributePoints = (rawPoints) => {
    rawPoints.forEach(p => {
      // p is expected to be { period, year, return }
      const category = this.determineCategory(p);

      if (category) {
        let xValue, orphan;

        // --- EXPLICIT SUBTYPE MAPPING ---
        switch (this.subType) {
          case "period":
            xValue = p.period;
            orphan = p.year;
            break;

          case "year":
          case "age":
          case "rolling":
            xValue = p.year;
            orphan = p.period;
            break;

          default:
            xValue = p.period;
            orphan = p.year;
        }

        // Push the Triple (x, y, o)
        // Recharts uses x/y for plotting; o is the "Trailer" for metadata/logic
        this.points[category].push({ 
            x: xValue, 
            y: p.return, 
            o: orphan 
        });

        // Update Bounds using the actual axis values
        if (xValue < this.bounds.minX)   this.bounds.minX = xValue;
        if (xValue > this.bounds.maxX)   this.bounds.maxX = xValue;
        if (p.return < this.bounds.minY) this.bounds.minY = p.return;
        if (p.return > this.bounds.maxY) this.bounds.maxY = p.return;
      }
    });
  };

  /**
   * determineCategory: Logic to bin a point based on mhp and threshold.
   */
  determineCategory = (p) => {
    // p contains { period, year, return }
    // MHP check uses the internal period regardless of the chart's X-axis
    if (p.period < this.mhp) { 
        return "neutral"; 
    }
    
    return (p.return >= this.threshold) ? "success" : "failure";
  };
}