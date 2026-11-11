/**
 * FZReturns.js
 * The Standardized Data Model for the Financial Zone project.
 * This defines the "Passport" and the "Payload" for all market assets.
 */
/**
 * FZReturns.js
 * Standardized Data Model with Diagnostic Reporting
 */
export class FZReturns {
    constructor(ticker, startMonth, startYear, endMonth, endYear, source, returns = []) {
        this.ticker = ticker;
        this.startMonth = startMonth;
        this.startYear = startYear;
        this.endMonth = endMonth;
        this.endYear = endYear;
        this.uploadDate = new Date().toISOString().split('T')[0];
        this.source = source;
        this.returns = returns;
    }

    /**
     * Diagnostic Dump: Outputs metadata and the first 10 data points
     * with their associated calendar years.
     */
    Dump() {
        let report = `--- FZReturns Diagnostic ---\n`;
        report += `Ticker: ${this.ticker}\n`;
        report += `Span: ${this.startYear} - ${this.endYear}\n`;
        report += `Source: ${this.source}\n`;
        report += `Points: ${this.returns.length}\n`;
        report += `---------------------------\n`;

        // Display up to the first 10 points
        const limit = Math.min(this.returns.length, 10);
        for (let i = 0; i < limit; i++) {
            const year = this.startYear + i;
            const val = this.returns[i];
            // Format to 4 decimal places for scientific clarity
            report += `${year}: ${val.toFixed(4)}\n`;
        }

        if (this.returns.length > 10) {
            report += `... (+${this.returns.length - 10} more years)\n`;
        }

        alert(report);
    }
}

export default FZReturns;
