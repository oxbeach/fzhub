import { getPercentColor } from "./getPercentColor";
import { getReturnColor } from "./getReturnColor";
import { getRatioColor_VariableSD } from "./getRatioColor";


/**
 * getStatColor: Bridge between formatted UI strings and Float-based color math.
 */
export const getStatColor = (label, displayValue, hi = 0, lo = 0, mean = 0) => {
    
    if (!displayValue || !label) return 'transparent';

    const alabel = label.toLowerCase();
    // 1. Strip formatting to get a clean float
    // Removes %, $, commas, etc.
    const cleanFloat = parseFloat(displayValue.toString().replace(/[^0-9.-]/g, ''));

    if (isNaN(cleanFloat)) return 'transparent';

    //alert("  getStatColor displayValue " + displayValue + " alabel " + alabel + "   cleanFloat " + cleanFloat);

    if (alabel.includes('average') || alabel.includes('avg') || alabel.includes('p/l') || alabel.includes('return') || alabel.includes('hi') || alabel.includes('lo')  ) {
        return getReturnColor(cleanFloat/100);                                          // convert user html format
    }

    // 2. Route to the appropriate Float-based color function
    if (alabel.includes('rate') || alabel.includes('%') || alabel.includes('win') || alabel.includes('thrs')) {
        return getPercentColor(cleanFloat/100);                                         // convert user html format
    }

    if (alabel.includes('sd') || alabel.includes('volatility')) {
        return getRatioColor_VariableSD(cleanFloat, hi, lo, mean);
    }

    // 3. Default for non-performance metrics (Success, Total Mature, etc.)

    return 'transparent'; 
};