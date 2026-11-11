import { getPercentColor } from '../../Utils/getPercentColor';
import { getReturnColor } from '../../Utils/getReturnColor';

/**
 * Generates the specific style object for interior matrix cells.
 * @param {Object} cell - The SmartCell {v, d, ...}
 * @returns {Object} - React style object
 */


export const getInteriorCellColor = (cell, className) => {
    if (!cell || typeof cell !== 'object') return {};
    
    // RULE: Only data cells get heat colors
    if (className !== "matrix-data-cell" || !cell) {
        return null; 
    }

    // 1. Determine the background color based on the type flag
    const bgColor = cell.type === 'pct' 
        ? getPercentColor(cell.v) 
        : getReturnColor(cell.v);

    return bgColor;
};