import { WeightFactors } from "./WeightFactors";

export const computeRankings = (weightFactors, displayedPortfolios) => {

    if (!displayedPortfolios || displayedPortfolios.length === 0) return [];

    const tolerance = .001;

    // 1. Initialize master list (Underlying data structures)
    let rankedData = displayedPortfolios.map(p => {
        const stats = p.instance && typeof p.instance.getRankStats === 'function'
            ? p.instance.getRankStats()
            : {};
            
        return {
            id: p.instance?.id || p.id,
            name: p.instance?.name || p.name,
            stats: stats,  
            fzFactor: 0,
            ranks: {}      
        };
    });

    // --- TEMPORARY DIAGNOSTIC ALERT FOR DATA MATCHING ---
    /*
    let diagnosticMessage = `--- DATA INSPECTION ---\n`;
    diagnosticMessage += `Weight Factors Received: ${JSON.stringify(weightFactors)}\n\n`;
    
    if (rankedData.length > 0) {
        const firstPortfolio = rankedData[0];
        diagnosticMessage += `Portfolio Name: ${firstPortfolio.name}\n`;
        diagnosticMessage += `Available Stats Keys: ${JSON.stringify(Object.keys(firstPortfolio.stats))}\n`;
        diagnosticMessage += `Stats Full Object: ${JSON.stringify(firstPortfolio.stats)}\n`;
    } else {
        diagnosticMessage += `No portfolios found in rankedData.\n`;
    }

    alert(diagnosticMessage);
    // ----------------------------------------------------
    */

    // 2. Compute Individual Ranks via sorting reference pointers
    weightFactors.forEach(({ item: metric, weight }) => {
        if (weight <= 0) return;

        const isInverse = ['Std Dev'].includes(metric);
        
        // Shallow copy: Creates a vector of references to the objects in rankedData
        const sorted = [...rankedData].sort((a, b) => {
            const valA = parseFloat(a.stats[metric]) || 0;
            const valB = parseFloat(b.stats[metric]) || 0;
            return isInverse ? valA - valB : valB - valA;
        });

        // --- COMPETITION RANKING MARCDOWN WITH TOLERANCE ---
        let currentDisplayRank = 1;

        sorted.forEach((item, index) => {
            if (index === 0) {
                item.ranks[metric] = 1;
            } else {
                const currentVal = parseFloat(item.stats[metric]) || 0;
                const prevVal = parseFloat(sorted[index - 1].stats[metric]) || 0;
                
                // Tolerance check to safely catch float variations
                const isTie = Math.abs(currentVal - prevVal) <= tolerance;
                
                if (!isTie) {
                    // Match display rank up to the physical row index counter (1-based)
                    currentDisplayRank = index + 1;
                }
                
                item.ranks[metric] = currentDisplayRank;
            }
        });
    });

    // 3. Compute the Central FZ FACTOR (Weighted Rank Score)
    rankedData = rankedData.map(portfolioItem => {
        let weightedRankSum = 0;

        weightFactors.forEach(({ item: metric, weight }) => {
            if (weight > 0 && portfolioItem.ranks[metric]) {
                weightedRankSum += portfolioItem.ranks[metric] * weight;
            }
        });

        portfolioItem.fzFactor = parseFloat(weightedRankSum.toFixed(2));
        return portfolioItem;
    });

    // 4. Sort final master results by FZ FACTOR ascending
    const finalResult = rankedData.sort((a, b) => a.fzFactor - b.fzFactor);

    /*
    if (finalResult.length > 0) {
        const sampleSize = Math.min(finalResult.length, 3); // Grab up to the top 3 portfolios
        let alertMessage = `--- COMPUTE RANKINGS COMPLETED --- \nTotal Portfolios: ${finalResult.length}\n\n`;

        for (let i = 0; i < sampleSize; i++) {
            const p = finalResult[i];
            alertMessage += `Portfolio [${i + 1}]: ${p.name}\n`;
            alertMessage += `  -> FZ FACTOR: ${p.fzFactor}\n`;
            alertMessage += `  -> RANKS: ${JSON.stringify(p.ranks)}\n`;
            alertMessage += `  -> STATS KEYS: ${JSON.stringify(Object.keys(p.stats))}\n\n`;
        }

        alert(alertMessage);
    }
    */

    return finalResult;
};