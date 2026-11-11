

export const getRatioColor = (val) => {
    if (val === null || val === undefined || val === '' || val === 'N/A') return 'transparent';
    const n = parseFloat(val);

    // For Sharpe and Sortino, as val increases it is better, ligher color.  
    // As val decreases, darker color for warniing

    if (n < 0.5) return '#FDC745';  // Deep Amber/Gold..........WARNING
    if (n < 1.0) return '#FFDF20';  // Rich Goldenrod
    if (n < 2.0) return '#FFF085';  // Vibrant Gold
    if (n < 3.0) return '#FEF9C2';  // Bright Yellow-Gold
    
    return '#FEFCE8';               // Light Soft Yellow...........SAFE          
    
    /*
    if (n < 0.5) return 'rgb(218, 165, 32)';  // Goldenrod
    if (n < 1.0) return 'rgb(238, 201, 0)';   // Vivid Gold
    if (n < 2.0) return 'rgb(255, 215, 0)';   // Standard Gold
    if (n < 3.0) return 'rgb(255, 230, 100)'; // Light Gold
    
    return 'rgb(255, 245, 170)';               // Pale Champagne
    */
};


export const getRatioColor_VariableSD = (inSD, hi = 0, lo = 0, mean = 0) => {
    if (inSD === null || inSD === undefined || inSD === '' || inSD === 'N/A') {
        return 'transparent';
    }

    const sd   = parseFloat(inSD);
    const step = Math.max(0.0001, hi - mean) / 5;
    const zone = Math.min(4, Math.floor(sd / step));

    /*
    const fixSD = (100*sd).toFixed(1);
    const fixStep = (100*step).toFixed(1);
    alert("  zone " + zone + "  sd " + fixSD + "step " + fixStep);
    */

    switch (zone) {
        case 4:
            return '#FDC745'; // Deep Amber/Gold..........WARNING
        case 3:
            return '#FFDF20'; // Rich Goldenrod
        case 2:
            return '#FFF085'; // Vibrant Gold
        case 1:
            return '#FEF9C2'; // Bright Yellow-Gold
        case 0:
        default:
            return '#FEFCE8'; // Light Soft Yellow...........SAFE
    }
    
};



export const getRatioColor_SD_NOTUSED = (val) => {
    if (val === null || val === undefined || val === '' || val === 'N/A') return 'transparent';
    const n = parseFloat(val);

    // For Sharpe and Sortino, as val increases it is better, ligher color.  
    // As val decreases, darker color for warniing

   // Darker/More intense = Higher Risk
    if (n >= .20) return 'rgb(160, 120, 20)';  // Deep Bronze/Gold (High Contrast)
    if (n >= .15) return 'rgb(184, 134, 11)';  // Dark Goldenrod
    if (n >= .10) return 'rgb(218, 165, 32)';  // Goldenrod
    if (n >= .05) return 'rgb(238, 201, 0)';   // Vivid Gold
    
    return 'rgb(255, 230, 100)';

};