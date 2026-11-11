/**
 * Creates a "Smart Cell" object for the Rolling Matrix.
 * @param {number|null} val - The raw numerical value.
 * @param {string} type - 'pct', 'num', or 'dec' (for standard decimals).
 * @returns {object|null} - { v: float, d: string }
 */

export const createSmartCell = (val, type = 'pct') => {
    if (val === null || val === undefined || isNaN(val)) {
        return { v: val, d: "---" };
    }

    let display;
    switch (type) {
        case 'pct':
            display = (100*val).toFixed(1);   // actual float that is formatted...percent
            break;
        case 'num':
            display = val.toString();         // just display as text...Year or Period
            break;
        case 'dec':
            display = (100*val).toFixed(1);   // actual float that is formatted...return
            break;
        default:
            display = val.toString();           // punt
    }

    return {
        v: val,
        d: display,
        type: type,

        year: 0,
        period: 0,

        c: 0 // color

    };
};

/**
 * Helper to initialize stats cells with their mathematical identity values.
 */
export const initSmartCell = (label, type = 'dec') => {
    let startVal = 0;

    if (label === "HI") startVal = -Infinity;
    if (label === "LO") startVal = Infinity;
    
    // For HI/LO, we don't want "Infinity" showing in the UI during the loop, 
    // so we can initialize with a blank display.
    const cell = createSmartCell(startVal, type);
    cell.d = ""; 
    return cell;
};

