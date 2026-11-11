// utils/RRTableEngine.js
export class RRTable {
  constructor(name, data, threshold = 15) {
    this.name = name;
    this.data = data; 
    this.threshold = threshold;
    this.matrix = [];
    this.build();
  }

  build() {
    const totalPeriods = this.data.length;
    this.matrix = [];

    for (let period = 1; period <= totalPeriods; period++) {
      const results = [];
      for (let i = 0; i < totalPeriods; i++) {
        if (i < period - 1) {
          results.push(null);
        } else {
          let cumulativeReturn = 1;
          for (let j = (i - period + 1); j <= i; j++) {
            cumulativeReturn *= (1 + this.data[j].return / 100);
          }

          let finalValue = (period === 1) 
            ? (cumulativeReturn - 1) * 100 
            : (Math.pow(cumulativeReturn, 1 / period) - 1) * 100;

          results.push(parseFloat(finalValue.toFixed(1))); // Matching your 1-decimal ref
        }
      }

      const validValues = results.filter(v => v !== null);
      
      // Standard Deviation Math
      const n = validValues.length;
      const avg = validValues.reduce((a, b) => a + b, 0) / n;
      const stdDev = Math.sqrt(validValues.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / n);

      // Success Rate (Percentage of years >= 15%)
      const successCount = validValues.filter(v => v >= this.threshold).length;
      const successRate = (successCount / n) * 100;

      this.matrix.push({ 
        period, 
        results, 
        stats: {
          low: Math.min(...validValues),
          high: Math.max(...validValues),
          avg: parseFloat(avg.toFixed(1)),
          sd: parseFloat(stdDev.toFixed(1)),
          pct: parseFloat(successRate.toFixed(1))
        } 
      });
    }
  }
}