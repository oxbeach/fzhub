
// this is a container to hold all metrics that are calculated for the RR Table

import { _scaleValue }       from '../Utils/Math';
import { getReturnColor }    from '../Utils/getReturnColor';
import { getPercentColor }   from '../Utils/getPercentColor';
import { getRatioColor, getRatioColor_SD, getRatioColor_VariableSD } from '../Utils/getRatioColor';
import { getScoreHint } from '../Utils/scoreHints';


export class ScoreTotals {
  constructor(selector = "Scorecard") {
    this.allScores = {
      HI: 0.0,
      LO: 0.0,
      AVG: 0.0,
      SD: 0.0,
      THRS: 0.0,
      SR: 0.0,
      Sor: 0.0,
      MDD: 0.0,
      Calmar: 0.0,
      Recovery: 0.0,
      Total: 0.0,
    };

    // New format should replace this.allScores.  In parallel for safety at this time
    this.totalScores = {
      counts:   {},
      averages: {},
      risk:     {},
      riskFZ:   {}
    };

    this.selectWhich = [];
    this.setSelector(selector);
    
    this.displayCache = [];
    this.isPopulated = false;
  }

  setSelector(selector) {
    if (selector === "Scorecard") {
      this.selectWhich = ["HI", "LO", "AVG", "SD", "THRS"];
    } else if (selector === "Rank") {
      this.selectWhich = ["HI", "LO", "AVG", "SD", "THRS"];
    } else if (selector === "Both") {
      this.selectWhich = ["HI", "LO", "AVG", "SD", "THRS"];
    } else if (selector === "Row") {
      this.selectWhich = ["AVG", "HI", "LO", "SD", "THRS"];
    }else if (selector === "Total") {
      //this.selectWhich = ["SUCCESS", "FAILURE", "NEUTRAL", "AVG", "HI", "LO", "SD", "SR"];
      //this.selectWhich = ["SUCCESS", "FAILURE", "NEUTRAL", "TOTAL", "TOTALSF", "AVG", "MEDIAN", "HI", "LO",
      //                     "StdDev","Sharpe","Sortino", "StdDevFZ", "SharpeFZ", "SortinoFZ"];

      //this.selectWhich = ["SUCCESS", "FAILURE", "NEUTRAL", "TOTAL", "TOTALSF", "AVG", "MEDIAN", "HI", "LO",
      this.selectWhich = ["SUCCESS", "FAILURE", "NEUTRAL", "TOTAL", "THRS", "AVG", "MEDIAN", "HI", "LO",
                           "StdDev","Sharpe","Sortino"];
    }
  }

  /* NO LONGER USING THIS FORMAT */
  updateAndSync(newValues) {
    Object.assign(this.allScores, newValues);
    this.isPopulated = true;

    // Build the static array for the UI once
    this.displayCache = this.selectWhich.map((label) => {
      const val = this.allScores[label];
      return {
        label: label + ":",
        hint:  label,
        value: val.toFixed(1),
        color: this._determineColor(label, val)
      };
    });
  }
  /****************************************************** */

formatTotalScore(newNestedStats) {

  this.totalScores = { ...this.totalScores, ...newNestedStats };
  this.isPopulated = true;



  this.displayCache = this.selectWhich.map((key) => {
    const rawVal = this._resolveNestedValue(key);
    const isCount = ['SUCCESS', 'FAILURE', 'NEUTRAL', 'TOTAL', 'TOTALSF'].includes(key);
    const isRatio = ['Sharpe', 'Sortino', 'SharpeFZ', 'SortinoFZ'].includes(key);

    let displayVal;

    if (isCount) {
        displayVal = rawVal.toString();
    } else if (isRatio) {
        // Ratios are scalars: do NOT multiply by 100 / 999 is considered INFINITY, just remove any decimal places 
        let n = 2;
        if (rawVal > 998) n = 0;
        displayVal = rawVal === 0 ? "N/A" : rawVal.toFixed(n);
    } else {
        // Everything else (Average, StdDev) is a percentage: multiply by 100
        displayVal = (100 * rawVal).toFixed(1) + "%";
    }

    const displayName = (key === "NEUTRAL") ? "< MHP" : key;

    return {
        label: displayName,
        hint: getScoreHint(key, displayName),
        text: displayVal,
        color: this._determineColor(key, rawVal)
    };
  });

  
  const stdDevObj   = this.displayCache.find(item => item.label === 'StdDev');
  const stdDevFZObj = this.displayCache.find(item => item.label === 'StdDevFZ');

  if (stdDevObj || stdDevFZObj) {
      const hi     = this._resolveNestedValue('HI');
      const lo     = this._resolveNestedValue('LO');
      const avg    = this._resolveNestedValue('AVG');
      const median = this._resolveNestedValue('MEDIAN');

      if (stdDevObj) {
          const rawStdDev = this._resolveNestedValue('StdDev');
          stdDevObj.color = getRatioColor_VariableSD(rawStdDev, hi, lo, avg);
      }
      
      if (stdDevFZObj) {
          const rawStdDevFZ = this._resolveNestedValue('StdDevFZ');
          stdDevFZObj.color = getRatioColor_VariableSD(rawStdDevFZ, hi, lo, median);
      }
  }

}





// The translation layer that handles retrieval, scaling, and safety
  _resolveNestedValue(label) {
    // 1. Define the mapping of labels to raw values
    const rawData = {
      'SUCCESS': this.totalScores.counts?.success,
      'FAILURE': this.totalScores.counts?.failure,
      'NEUTRAL': this.totalScores.counts?.neutral,
      'TOTAL':   this.totalScores.counts?.total,
      'TOTALSF': this.totalScores.counts?.totalSF,

      'AVG':     this.totalScores.averages?.average,
      'MEDIAN':  this.totalScores.averages?.median,
      'HI':      this.totalScores.averages?.hi,
      'LO':      this.totalScores.averages?.lo,
      'THRS':    this.totalScores.averages?.thrs,

      'StdDev':  this.totalScores.risk?.stdDev,
      'Sharpe':  this.totalScores.risk?.sharpe,
      'Sortino': this.totalScores.risk?.sortino,
      'StdDevFZ':  this.totalScores.riskFZ?.stdDevFZ,
      'SharpeFZ':  this.totalScores.riskFZ?.sharpeFZ,
      'SortinoFZ': this.totalScores.riskFZ?.sortinoFZ,
      'MDD':     this.totalScores.riskFZ?.mdd
    };

    return (rawData[label] ?? 0.0);
  }


  /*
    ******************** NO LONGER USED
   */

  formatScore_NOTused(newValues) {
    // 1. Update the raw data
    Object.assign(this.allScores, newValues);
    this.isPopulated = true;

    // 2. Build the "Column-First" array for the UI
    this.displayCache = this.selectWhich.map((label) => {
      const val = this.allScores[label];

       //alert("  2)  formatScore:  about to call determineColor ");
      
      return {
        label: label,                      // For the Header Cell (CSS handles color)
        text: (100*val).toFixed(1),              // Pre-formatted for the Value Cell
        color: this._determineColor(label, val) // Dynamic heat color for Value Cell
      };
    });
  }


  _determineColor(label, val) {
    switch (label) {
      // Metrics that represent a Return (Green/Red Scale)
      case "HI":
      case "LO":
      case "AVG":
      case "MEDIAN":
        return getReturnColor(val); 
      case "THRS":
        return getPercentColor(val);


      // Unique metrics (like Sharpe Ratio) might need a neutral color 
      // or their own specific logic
      case "SUCCESS":
      case "FAILURE":
      case "NEUTRAL":
      case "TOTAL":
      case "TOTALSF":
      case "SR":
      case "MDD":
      case "Calmar":
      case "Recovery":
        return "#f0f8ff"; // AliceBlue (neutral)

        
      case "SD":
      case "StdDev":
      case "StdDevFZ":
        {
          const mean = this.totalScores.averages?.average;
          const hi   = this.totalScores.averages?.high;
          const lo   = this.totalScores.averages?.low;

          //alert(" call getRatioColor_SD with label " + label + " hi " + hi + "  lo " + lo + "  mean " + mean + " val " + val);

          return getRatioColor_VariableSD(val, hi, lo, mean);
        }

      case "Sharpe":
      case "Sortino":
      case "SharpeFZ":
      case "SortinoFZ":
      case "MDD":
        return getRatioColor(val);

      default:
        return "transparent";
    }
  }
}
