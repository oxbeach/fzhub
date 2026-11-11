import { supabase } from '../../Utils/supabase';

/**
 * Fetches raw annual return records from Supabase for a list of asset tickers
 * and returns them as a raw lookup object mapped by symbol.
 * 
 * @param {string[]} tickers - Array of ticker symbols (e.g., ['AAPL', 'SPY'])
 * @returns {Promise<Object.<string, Object>>} Exact copy map of DB rows keyed by symbol
 */

/* output: rawDbMap
{
  "AAPL": {
    symbol: "AAPL",
    short_name: "Apple Inc.",
    total_count: 10,
    first_full_year: 2014,
    fz_raw_returns: {
      returns: [0.3753, -0.0464, 0.1003, 0.4611, -0.0679, 0.8616, 0.8075, 0.3384, -0.2683, 0.4818]
    },
    updated_at: "2026-03-01T12:00:00Z"
  },
  "SPY": {
    symbol: "SPY",
    short_name: "SPDR S&P 500 ETF Trust",
    total_count: 10,
    first_full_year: 2014,
    fz_raw_returns: {
      returns: [0.1369, 0.0138, 0.0954, 0.2182, -0.0438, 0.3149, 0.1840, 0.2871, -0.1811, 0.2629]
    },
    updated_at: "2026-03-01T12:00:00Z"
  }
}
*/

export async function RetrieveReturns(tickers) {
    if (!tickers || tickers.length === 0) {
        return {};
    }

    try {
        // Retrieve the current user's session token if available
        // (Adjust this depending on how your client manages Supabase session tokens)
        const session = await supabase.auth.getSession();
        const token   = session?.data?.session?.access_token;

        const headers = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/retrieve-returns', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ tickers }),
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            //console.error('Error fetching returns from API:', response.statusText);
            return {};
        }

        const rawDbMap = await response.json();
        return rawDbMap;

    } catch (err) {
        //console.error('Network or parsing error in RetrieveReturns:', err);
        return {};
    }
}

