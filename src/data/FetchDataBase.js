
import { supabase } from './supabaseClient'; // Adjust path as needed

/**
 * Single async batch fetch that retrieves raw database records for a list of tickers.
 * 
 * @param {string[]} tickers - Array of ticker strings (e.g. ['AAPL', 'SPY'])
 * @returns {Promise<Object.<string, Object>>} Map of symbol -> raw DB row object
 */


/*********************************************   NO LONGER USED ****************************/

export async function FetchDataBase(tickers) {
    if (!tickers || tickers.length === 0) return {};

    const { data, error } = await supabase
        .from('returns_table') // <-- Replace with your exact Supabase table name
        .select('symbol, short_name, total_count, first_full_year, fz_raw_returns, updated_at')
        .in('symbol', tickers);

    if (error) {
        //console.error('Error in fetchDataBase:', error);
        return {};
    }

    // Build a lookup map of raw DB rows keyed by symbol
    const rawDbMap = {};
    data.forEach(row => {
        rawDbMap[row.symbol] = row;
    });

    return rawDbMap;
}