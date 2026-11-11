

/**
 * Return color for Rank...1 is best (darkest) and 5 is worst (lightest)
 */
export const getRankColor = (val) => {
    if (val === null || val === undefined || val === '') return 'transparent';
    const n = parseFloat(val);

    /*
    if (n === 1) return 'rgb(102, 255, 102)';
    if (n === 2) return 'rgb(153, 255, 153)';
    if (n === 3) return 'rgb(204, 255, 204)';
    if (n === 4) return 'rgb(255, 102, 102)';
    if (n === 5) return 'rgb(255, 51, 51)';
    */

    
    if (n === 1) return 'rgb(102, 255, 102)';
    if (n === 2) return 'rgb(204, 255, 204)';
    if (n === 3) return '#E8F5E9';

    if (n === 4) return '#FFCDD2';
    if (n === 5) return 'rgb(255, 153, 153)';

    return 'white';
    
};
