

import { supabase } from '../../Utils/supabase'; // Adjust path relative to your directory structure



export async function fetchSymbolList(isLoggedIn) {
    try {
        const headers = {
            'Content-Type': 'application/json',
        };

        // ENFORCE YOUR RULE: If React says we aren't logged in, 
        // DO NOT look for a token, DO NOT query Supabase, DO NOT read local storage.
        if (isLoggedIn) {
            const session = await supabase.auth.getSession();
            const token = session?.data?.session?.access_token;
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                //console.log("🔍 [fetchSymbolList] Sending request WITH authorization token.");
            }
        } else {
            //console.log("🔍 [fetchSymbolList] Forcing clean guest state (Ignoring storage).");
        }

        const response = await fetch('/api/retrieve-symbols', {
            method: 'POST',
            headers: headers,
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            // the dropdown will now display a single member for a warning to use
            return ['-- LIST UNAVAILABLE --'];
        }

        const symbols = await response.json();
        return symbols;

    } catch (err) {
        //console.error('Network or parsing error in fetchSymbolList:', err);
        return ['-- LIST UNAVAILABLE --'];
    }
}
