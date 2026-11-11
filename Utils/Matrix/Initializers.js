import { createSmartCell } from './MatrixCells';

/**
 * Returns an object containing "Neutral" Smart Cells for row stats.
 */
export const InitialStats = () => {
    return {
        hi: createSmartCell(-Infinity, 'pct'),
        lo: createSmartCell(Infinity, 'pct'),
        sum: createSmartCell(0, 'pct'),
        count: createSmartCell(0, 'num'),
        batting: createSmartCell(0, 'num')
    };
};