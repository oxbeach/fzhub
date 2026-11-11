import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAccountInfo, isRecordValid } from '../utils/general'; // Adjust to your actual path

import { NUM_TRIM_YEARS, LAST_FULL_YEAR } from '../utils/constants';

// Admin client for secure server-side queries
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
    try {
        // 1. Get account and active subscription status via central utility
        const { isActiveUser } = await getAccountInfo(req, supabaseAdmin);

        // 2. Parse incoming request body to get requested tickers
        const body = await req.json();
        const { tickers } = body;

        if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
            return NextResponse.json({});
        }

        // tests the progressBar
        //await new Promise((resolve) => setTimeout(resolve, 20000)); // 4-second artificial pause

        // 3. Batch query raw columns from Supabase for requested symbols
        const { data, error } = await supabaseAdmin
            .from(`yearly_returns_${LAST_FULL_YEAR}`)   // note backticks
            .select('*')
            .in('symbol', tickers);

        if (error) {
            console.error('Error retrieving raw returns from DB:', error);
            return NextResponse.json({ error: 'Database retrieval failed' }, { status: 500 });
        }

        // 4. Map DB rows into a dictionary using our central validation utility
        const rawDbMap = {};

        data.forEach(row => {
            // Validate required raw return structure alongside central gate checks
            if (!row.fz_raw_returns || !Array.isArray(row.fz_raw_returns.returns)) {
                console.warn(`⚠️ Warning: Malformed return data structure for symbol: ${row.symbol}`);
                return; 
            }

            // Enforce unified validation gates (Last-Year, Scalar pre-check, Min history length)
            if (!isRecordValid(row, isActiveUser)) {
                return;
            }

            let processedReturns = [...row.fz_raw_returns.returns];

            // Apply fixed static tail-trim for guest/expired accounts
            if (!isActiveUser) {
                processedReturns = processedReturns.slice(0, -NUM_TRIM_YEARS);
            }

            rawDbMap[row.symbol] = {
                ...row,
                fz_raw_returns: {
                    ...row.fz_raw_returns,
                    returns: processedReturns
                }
            };
        });

        //console.log(`Successfully retrieved returns for ${Object.keys(rawDbMap).length} symbols (Active Subscriber: ${isActiveUser})`);

        return NextResponse.json(rawDbMap);

    } catch (err) {
        //console.error('Unexpected error in returns API:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}