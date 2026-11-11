


export const getPercentColor = (val) => {
    if (val === null || val === undefined || val === '') return 'transparent';
    const n = parseFloat(val);
    if (n === 0) return '#FFFFFF';

    // --- POSITIVE BLUE SCALE (DECIMAL) ---
    // Tightened thresholds to provide distinction in the 90%+ range
    if (n >= 0.98) return '#FFFFFF';      // 1               
    if (n >= 0.95) return '#F1F8FE';      // 2
    if (n >= 0.90) return '#E3F2FD';      // 3  
    if (n >= 0.85) return '#F1F8FE';      // 4
    if (n >= 0.70) return '#90CAF9';      // 5
    if (n >= 0.50) return '#64B5F6';      // 6  
    if (n >= 0.25) return '#2196F3';      // 7
    if (n > 0)     return '#1976D2';      // 8

    return '#007FFF';                     // 9
};

/********************  same, but colors are reversed 
export const getPercentColor = (val) => {
    if (val === null || val === undefined || val === '') return 'transparent';
    const n = parseFloat(val);
    if (n === 0) return '#FFFFFF';

    // --- POSITIVE BLUE SCALE (DECIMAL) ---
    // Tightened thresholds to provide distinction in the 90%+ range
    if (n >= 0.98) return '#007FFF'; // Power Blue (Super Max)      9
    if (n >= 0.95) return '#1976D2'; // Deep Azure                  8
    if (n >= 0.90) return '#2196F3'; // Strong Blue                 7
    if (n >= 0.85) return '#64B5F6'; // Medium Blue                 6
    if (n >= 0.70) return '#90CAF9'; // Sky Blue                    5
    if (n >= 0.50) return '#F1F8FE';  // Powder Blue                4
    if (n >= 0.25) return '#E3F2FD'; // Ice Blue                    3
    if (n > 0)     return '#F1F8FE'; // Micro-blue                  2

    return '#FFFFFF';                                               1
};

*/



export const xxxxxxgetPercentColor = (val) => {
    if (val === null || val === undefined || val === '') return 'transparent';
    const n = parseFloat(val);

    // THE 5-TIER BLUE SCALE
    if (n >= .90) return '#007FFF'; // Azure/Power Blue
    if (n >= .75) return '#4682B4'; // Steel Blue
    if (n >= .60) return '#87CEEB'; // Sky Blue
    if (n >= .45) return '#B0E0E6'; // Powder Blue
    if (n > 0)     return '#E0F7FA'; // Very Light Cyan/Ice
    
    return '#FFFFFF'; // Zero or Neutral
};