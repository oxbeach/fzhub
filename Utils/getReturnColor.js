

export const NEW_getReturnColor = (val) => {
    if (val === null || val === undefined || val === '') return 'transparent';
    const n = parseFloat(val);
    if (n === 0) return '#FFFFFF';

    // --- POSITIVE (RESCALED FOR LEGIBILITY) ---
    if (n > 0) {
        if (n >= .40) return '#2E7D32'; // Maximum Green (Readable with black text)
        if (n >= .35) return '#388E3C';
        if (n >= .30) return '#43A047';
        if (n >= .25) return '#4CAF50';
        if (n >= .20) return '#66BB6A';
        if (n >= .15) return '#81C784';
        if (n >= .10) return '#A5D6A7';
        if (n >= .05)  return '#C8E6C9';
        return '#E8F5E9'; // Micro-green (Pale Mint)
    }

    // --- NEGATIVE (KEPT AS IS - GREAT DISTINCTION) ---
    if (n < 0) {
        if (n <= -.40) return '#B71C1C'; // Strong Crimson
        if (n <= -.35) return '#C62828';
        if (n <= -.30) return '#D32F2F';
        if (n <= -.25) return '#E53935';
        if (n <= -.20) return '#EF5350';
        if (n <= -.15) return '#E57373';
        if (n <= -.10) return '#EF9A9A';
        if (n <= -.05)  return '#FFCDD2';
        return '#FFEBEE'; // Micro-red (Pale Blush)
    }

    return '#FFFFFF';
};

export const getReturnColor = (val) => {
    if (val === null || val === undefined || val === '') return 'transparent';
    const n = parseFloat(val);
    if (n === 0) return '#FFFFFF';

    // --- POSITIVE (RESCALED FOR LEGIBILITY) ---
    if (n > 0) {
        if (n >= .50) return 'rgb(0, 153, 0)'; // Maximum Green (Readable with black text)
        if (n >= .40) return 'rgb(0, 255, 0)';
        if (n >= .30) return 'rgb(102, 255, 102)';
        if (n >= .20) return 'rgb(153, 255, 153)';
        if (n >= .10) return 'rgb(204, 255, 204)';
        return '#E8F5E9'; // Micro-green (Pale Mint)
    }

    // --- NEGATIVE (KEPT AS IS - GREAT DISTINCTION) ---
    if (n < 0) {
        if (n <= -.50) return 'rgb(204, 0, 0)'; // Strong Crimson
        if (n <= -.40) return 'rgb(255, 51, 51)';
        if (n <= -.30) return 'rgb(255, 102, 102)';
        if (n <= -.20) return 'rgb(255, 153, 153)';
        if (n <= -.10) return 'rgb(255, 204, 204)';
        if (n <= -.05) return '#FFCDD2';
        return '#FFEBEE'; // Micro-red (Pale Blush)
    }

    return '#FFFFFF';
};



//  This is the old FZ green color scheme............ TOO DARK

export const xxxxxxxxxxxgetReturnColor = (val) => {
    if (val === null || val === undefined || val === '') return 'transparent';
    const n = parseFloat(val);
    if (n === 0) return '#FFFFFF';

    // --- POSITIVE (REWRITTEN TO MATCH LEGACY FZ IMAGE) ---
    if (n > 0) {
        if (n >= 0.40) return '#006400'; // Legacy Max Green (Dark Forest)
        if (n >= 0.35) return '#228B22'; // Forest Green
        if (n >= 0.30) return '#32CD32'; // Lime Green
        if (n >= 0.25) return '#3CB371'; // Medium Sea Green
        if (n >= 0.20) return '#90EE90'; // Light Green
        if (n >= 0.15) return '#98FB98'; // Pale Green
        if (n >= 0.10) return '#B9F6CA'; // Mint Green
        if (n >= 0.05) return '#DCEDC8'; // Lime Tint
        return '#F1F8E9'; // Micro-green (Ice Mint)
    }

    // --- NEGATIVE (KEPT AS IS) ---
    if (n < 0) {
        if (n <= -0.40) return '#B71C1C';
        if (n <= -0.35) return '#C62828';
        if (n <= -0.30) return '#D32F2F';
        if (n <= -0.25) return '#E53935';
        if (n <= -0.20) return '#EF5350';
        if (n <= -15) return '#E57373';
        if (n <= -0.10) return '#EF9A9A';
        if (n <= -0.05) return '#FFCDD2';
        return '#FFEBEE';
    }

    return '#FFFFFF';
};
