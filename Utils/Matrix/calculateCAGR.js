/**
 * Scientific Calculation of Compound Annual Growth Rate.
 * Takes a pre-sliced array of returns and returns the geometric mean.
 * @param {Array<number>} returns - Array of floats (e.g. 0.05, -0.02)
 * @returns {number} - The raw float CAGR
 */

/*
export const calculateCAGR = (returns) => {
    const P = returns.length;
    if (P === 0) return 0;

    // 1. Calculate the Growth Factor: Product of (1 + r)
    // Using a simple loop for maximum performance on large matrices
    let growthFactor = 1.0;
    for (let i = 0; i < P; i++) {
        growthFactor *= (1 + returns[i]);
    }

    // 2. Apply Geometric Mean: (Growth Factor ^ (1/P)) - 1
    // This annualizes the return over the period P
    return Math.pow(growthFactor, 1 / P) - 1;
};
*/

//  use returns[istart], returns[istart + 1],...,returns[istart + iEnd - 1]

export const calculateCAGR = (returns, iStart, iEnd) => {
    if (!returns) return 0;

    const P = iEnd - iStart;
    if (P <= 0) return 0;

    let growthFactor = 1.0;
    for (let i = iStart; i < iEnd; i++) {

        /*
        if ( P === 10) {
            console.log("   in growthFactor i ", i, "   factor: ",  (1 + returns[i]));
        }
        */

        growthFactor *= (1 + returns[i]);
    }

    const cagr = Math.pow(growthFactor, 1 / P) - 1;

        
    // Output all calculated values together for the 10-year slice
    /*
    if (iStart === 0 && P === 10) {
        console.log("=== CAGR Calculation Debug ===");
        console.log("iStart:", iStart, "iEnd:", iEnd, "P:", P);
        console.log("Raw slice array:", returns.slice(iStart, iEnd));
        console.log("Mapped %:", returns.slice(iStart, iEnd).map(r => (r * 100).toFixed(2) + "%"));
        console.log("Growth Factor:", growthFactor);
        console.log("CAGR (decimal):", cagr);
        console.log("CAGR (%):", (cagr * 100).toFixed(3) + "%");
    }
    */

    return cagr;
};