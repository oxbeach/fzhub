import { createClient } from '@supabase/supabase-js';


import { LAST_FULL_YEAR, 
         NUM_TRIM_YEARS,
         LAST_RESTRICTED_YEAR,
         MIN_FINAL_YEARS,
         DEFAULT_FALLBACK_DATE,
         msPerDay
         } from '../utils/constants';



/**
 * Trivial helper to parse a date string and normalize it to UTC midnight.
 * @param {string|null} dateString - Raw date string from the database.
 * @returns {Date|null} Normalized Date object or null if input is missing.
 */
function parseUTCDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    date.setUTCHours(0, 0, 0, 0);
    return date;
}

/**
 * Determines if a given end date has passed (i.e., today >= endDate).
 * Works seamlessly for guests with the 1900 fallback date since it will always be expired.
 * @param {Date} endDate - The normalized expiration date.
 * @returns {boolean} True if expired, false otherwise.
 */
export function isExpired(endDate) {
    return !endDate || parseUTCDate(new Date()) >= endDate;
}

export function daysRemaining(endDate) {
    if (!endDate) return 0;
    
    const end   = parseUTCDate(endDate);
    const today = parseUTCDate(new Date());
    
    const diffTime = end - today;
    const diffDays = Math.round(diffTime / msPerDay);
    
    return Math.max(0, diffDays);
}


/**
 * Calculates the new start and end dates for a subscription extension.
 * Handles fresh/expired accounts with the partial-day offset (+1) and stacks active extensions.
 * 
 * @param   {Date}   oldStart  - The current start date.
 * @param   {Date}   oldEnd    - The current end date.
 * @param   {number} extension - Number of days to extend.
 * @returns {Object} An object containing { newStart, newEnd } normalized to FZ time, or {} if invalid.
 */
export function addSubscription(oldEnd, extension) {
    if (typeof extension !== 'number' || extension < 0) {
        return {};
    }

    const today = parseUTCDate(new Date());
    let newEnd = parseUTCDate(oldEnd); // Safely returns null if oldEnd is missing or 1900
    
    // If expired, guest (1900), or missing end date, start fresh from today
    if (!newEnd || isExpired(newEnd)) {
        newEnd = new Date(today.getTime() + (extension + 1) * msPerDay);
    } else {
        // Active subscription: stack the extension directly onto the current end date
        newEnd = new Date(newEnd.getTime() + extension * msPerDay);
    }

    // Compute days remaining inline using the already-normalized dates
    const daysRemaining = Math.max(0, Math.round((newEnd - today) / msPerDay));

    return {
        newStart: today,
        newEnd:   parseUTCDate(newEnd),
        daysRemaining
    };
}


/**
 * Retrieves account information, subscription dates, and active status for the current request.
 * If unauthenticated or guest, returns default fallback dates (1900-01-01).
 * @param {Request} req - The incoming HTTP request.
 * @param {Object} supabaseAdmin - The Supabase admin client.
 * @returns {Promise<{isActiveUser: boolean, startDate: Date, endDate: Date, user: Object|null, account: Object|null}>}
 */
export async function getAccountInfo(req, supabaseAdmin) {
    const accountInfo = {
        isActiveUser: false,
        startDate:    DEFAULT_FALLBACK_DATE,
        endDate:      DEFAULT_FALLBACK_DATE,
        user:         null,
        account:      null
    };

    try {
        const authHeader = req.headers.get('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

        if (!token) {
            return accountInfo;
        }

        const authClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const { data: { user }, error: authError } = await authClient.auth.getUser(token);
        if (authError || !user) {
            return accountInfo;
        }

        const { data: account, error: dbError } = await supabaseAdmin
            .from('accounts')
            .select('*')
            .eq('id', user.id)
            .single();

        if (dbError || !account) {
            return {
                ...accountInfo,
                user // Retain authenticated user reference even if account row is missing
            };
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const subEndDate   = parseUTCDate(account.subscription_end);
        const subStartDate = parseUTCDate(account.subscription_start);

        const isActiveUser = !isExpired(subEndDate);

        return {
            isActiveUser,
            startDate: subStartDate || DEFAULT_FALLBACK_DATE,
            endDate: subEndDate || DEFAULT_FALLBACK_DATE,
            user,
            account
        };

    } catch (err) {
        console.error('Error in getAccountInfo:', err);
        return accountInfo;
    }
}

/**
 * Evaluates whether a database row meets the criteria for a given subscriber status.
 * 
 * @param {Object} row - The database record from yearly_returns.
 * @param {boolean} isActiveSubscriber - Whether the user has an active subscription.
 * @returns {boolean} True if the record is valid and allowed for the user tier.
 */
export function isRecordValid(row, isActiveSubscriber) {
    // Guard against null/undefined rows and validate required data types
    if (!row || typeof row.first_full_year !== 'number' || typeof row.total_count !== 'number') {
        return false;
    }

    const subscriberStatus = Boolean(isActiveSubscriber);

    // Gate 1: Strict Last-Year Test
    // Ensures the data series reaches past the baseline historical cutoff (last total year of returns)
    if ((row.first_full_year + row.total_count) <= LAST_FULL_YEAR) {
        return false;
    }

    // Gate 2: Fast scalar pre-check for restricted/guest users
    // Restricts non-subscribers from seeing symbols starting after the restricted year threshold
    if (!subscriberStatus && row.first_full_year > LAST_RESTRICTED_YEAR) {
        return false;
    }

    // Determine effective length post-trim based on subscription tier
    // Subscribers get full history; guests/expired users get trimmed history
    const effectiveYears = subscriberStatus ? row.total_count : (row.total_count - NUM_TRIM_YEARS);

    // Gate 3: Minimum history length check
    // Ensures the resulting dataset is large enough to be meaningful
    if (effectiveYears < MIN_FINAL_YEARS) {
        return false;
    }

    return true;
}

