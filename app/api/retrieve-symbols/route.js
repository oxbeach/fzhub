import { NextResponse }   from 'next/server';
import { createClient }   from '@supabase/supabase-js';
import { LAST_FULL_YEAR } from '../utils/constants';
import { getAccountInfo, isRecordValid }  from '../utils/general'


// Admin client for secure server-side queries
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
    try {
        // 1. Get account and active subscription status
        const { isActiveUser } = await getAccountInfo(req, supabaseAdmin);

         //console.log('isActiveUser', isActiveUser);

        // 2. Paginated batch fetching from Supabase
        let filteredSymbols = [];
        let from            = 0;
        const step          = 1000;
        let keepFetching    = true;

        while (keepFetching) {
            const { data, error } = await supabaseAdmin
                .from(`yearly_returns_${LAST_FULL_YEAR}`)   // note backticks
                .select('symbol, short_name, first_full_year, total_count')
                .order('symbol', { ascending: true })
                .range(from, from + step - 1);

            if (error) {
                //console.error('Error fetching symbol batch from DB:', error);
                return NextResponse.json({ error: 'Database retrieval failed' }, { status: 500 });
            }

            if (data && data.length > 0) {
                data.forEach(row => {
                    // Filter using our reusable validation utility
                    if (isRecordValid(row, isActiveUser)) {
                        filteredSymbols.push({
                            symbol: row.symbol,
                            short_name: row.short_name
                        });
                    }
                });

                if (data.length < step) {
                    keepFetching = false;
                } else {
                    from += step;
                }
            } else {
                keepFetching = false;
            }
        }

        //console.log(`Successfully filtered symbols. Total valid symbols returned: ${filteredSymbols.length} (Active Subscriber: ${isActiveUser})`);

        // Return the clean, sorted array of allowed symbols
        return NextResponse.json(filteredSymbols);

    } catch (err) {
        //console.error('Unexpected error in symbols API:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}