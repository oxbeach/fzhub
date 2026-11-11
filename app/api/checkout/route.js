import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { addSubscription } from '../utils/general';

// Admin client for secure server-side provisioning & database writes
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =========================================================================
// PAYMENT SIMULATOR (Replace with Stripe/Payment SDK in production)
// =========================================================================
export const processDummyPayment = async (orderPayload, shouldSucceed = true) => {

    // 1500 is "normal" delay of 1.5 sec
    // for testing the timeout scenario in POST, increase to 15000, 15 sec.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!shouldSucceed) {
        return { success: false, errorCode: 'ERR_ACCOUNT_PAYMENT' };
    }

    const { passType, amount, email } = orderPayload || {};
    return {
        success: true,
        transactionId: `ch_dummy_${Math.random().toString(36).substring(2, 11)}`,
        amount,
        email,
        passType,
        provider: 'stripeDummy'
    };
};


// =========================================================================
// MAIN API ENDPOINT HANDLER
// =========================================================================


export async function POST(req) {
    let createdUserId = null;

    // Initialize local audit ledger
    const audit = {
        timestamp:       new Date().toISOString(),
        stage:           'INIT',
        email:           null,
        isSelfRenewal:   false,
        targetUserId:    null,
        transactionId:   null,
        paymentService:  null,
        amount:          null,
        passType:        null,
        newStart:        null,
        newEnd:          null,
        daysRemaining:   null,
        success:         false,
        errorCode:       null
    };

    try {
        // 1. Extract Authorization Bearer token securely
        const authHeader = req.headers.get('authorization') || '';
        const token      = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

        let sessionUser = null;
        if (token) {
            const authClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
            const { data: { user } } = await authClient.auth.getUser(token);
            sessionUser = user;
        }

        const sessionEmail     = sessionUser?.email?.trim().toLowerCase();
        const hasActiveSession = Boolean(sessionEmail);

        const body = await req.json();
        const {
            subUseExistingAccount,
            subNewEmail,
            subNewPassword,
            subNewPassType,
            subNewAmount,
            simulateSuccess
        } = body;

        audit.passType = subNewPassType;
        audit.amount   = subNewAmount;

        const isSelfRenewal = hasActiveSession && Boolean(subUseExistingAccount);
        audit.isSelfRenewal = isSelfRenewal;

        const cleanEmail    = isSelfRenewal ? sessionEmail : subNewEmail?.trim().toLowerCase();
        audit.email         = cleanEmail;

        // 2. Email Validation
        audit.stage = 'EMAIL_VALIDATION';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!cleanEmail || !emailRegex.test(cleanEmail)) {
            audit.stage    = 'FAILED_VALIDATION';
            audit.errorCode = 'ERR_INVALID_EMAIL';
            return NextResponse.json({ code: 'ERR_INVALID_EMAIL' }, { status: 400 });
        }

        // 3. Resolve or Create User ID & Fetch Existing Dates if Renewal
        audit.stage = 'USER_RESOLUTION';
        let targetUserId      = null;
        let existingStart     = null;
        let existingEnd       = null;
        let existingCreatedAt = null;
        const nowIso          = new Date().toISOString();

        if (isSelfRenewal) {
            targetUserId = sessionUser.id;

            const { data: currentAcc } = await supabaseAdmin
                .from('accounts')
                .select('subscription_start, subscription_end, created_at')
                .eq('id', targetUserId)
                .single();

            if (currentAcc) {
                existingStart    = currentAcc.subscription_start;
                existingEnd      = currentAcc.subscription_end;
                existingCreatedAt = currentAcc.created_at;
            }
        } else {
            const password = subNewPassword || '';
            if (password.length < 6) {
                audit.stage    = 'FAILED_VALIDATION';
                audit.errorCode = 'ERR_PASSWORD_TOO_SHORT';
                return NextResponse.json({ code: 'ERR_PASSWORD_TOO_SHORT' }, { status: 400 });
            }

            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email:        cleanEmail,
                password:     password,
                email_confirm: true
            });

            // Keep diagnostic logs so you can always see the exact error shape if something new pops up
            /*
            if (authError) {
                console.error("--- SUPABASE ADMIN CREATE USER ERROR ---");
                console.error("Full authError object:", JSON.stringify(authError, null, 2));
                console.error("Error message string:", authError.message);
                console.error("Error code field:", authError.code);
                console.error("Error status field:", authError.status);
            }
            */

            if (authError || !authData?.user?.id) {
                audit.stage = 'FAILED_USER_CREATION';
                
                // Robust check against common Supabase duplicate email messages, codes, and statuses
                const errMessage = (authError?.message || '').toLowerCase();
                const errCode = authError?.code;
                const errStatus = authError?.status;

                if (
                    errCode === 'email_exists' || 
                    errCode === 'user_already_exists' ||
                    errStatus === 422 || 
                    errMessage.includes('already been registered') ||
                    errMessage.includes('already exists')
                ) {
                    audit.errorCode = 'ERR_EMAIL_EXISTS';
                    return NextResponse.json({ code: 'ERR_EMAIL_EXISTS' }, { status: 400 });
                }

                audit.errorCode = 'ERR_ACCOUNT_SERVER';
                return NextResponse.json({ code: 'ERR_ACCOUNT_SERVER' }, { status: 500 });
            }


            targetUserId      = authData.user.id;
            createdUserId     = targetUserId; 
            existingStart     = '1900-01-01';
            existingEnd       = '1900-01-01';
            existingCreatedAt = nowIso;
        }

        audit.targetUserId = targetUserId;

        // 4. Initialize Unified Account Payload Upfront with Safe Defaults
        const accountPayload = {
            id:                  targetUserId,
            //email:               cleanEmail,
            role:                 'user',
            subscription_type:   subNewPassType,
            subscription_start: existingStart,
            subscription_end:    existingEnd,
            created_at:          existingCreatedAt,
            transaction_id:      null,
            amount_paid:         subNewAmount,
            payment_service:     null,
            status:              'denied', // Default fallback state
            updated_at:          nowIso
        };

        

       // 5. Execute Payment with 10-Second Timer Wrapper
        audit.stage = 'PAYMENT_PENDING';
        const TIMEOUT_MS = 10000; 

        let paymentResult;
        let timedOut = false;

        try {
            const paymentPromise = processDummyPayment(
                { passType: subNewPassType, amount: subNewAmount, email: cleanEmail },
                simulateSuccess
            );

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('PAYMENT_TIMEOUT')), TIMEOUT_MS)
            );

            paymentResult = await Promise.race([paymentPromise, timeoutPromise]);
        } catch (err) {
            if (err.message === 'PAYMENT_TIMEOUT') {
                timedOut = true;
            } else {
                throw err;
            }
        }

        //paymentService both payload and audit

        const extensionDays = (subNewPassType === '1_year') ? 365 : 30;

        // --- UPFRONT GUARD: Handle Failures / Declines Immediately ---
        if (!paymentResult?.success && !timedOut) {
            audit.stage          = 'FAILED_PAYMENT_DECLINED';
            audit.errorCode      = paymentResult?.errorCode || 'ERR_ACCOUNT_PAYMENT';
            audit.paymentService = paymentResult?.provider || 'unknown';

            // For new accounts, upsert the default denied payload (dates remain 1900)
            if (!isSelfRenewal) {
                await supabaseAdmin.from('accounts').upsert(accountPayload);
            }
            // Self-renewals return early without touching existing subscription dates

            return NextResponse.json({ code: audit.errorCode }, { status: 400 });
        }

        // --- CONSOLIDATED SUCCESS / TIMEOUT PATH ---
        const calculated = addSubscription(existingEnd, extensionDays);

        if (timedOut) {
            audit.paymentService  = 'stripe_timeout';
            audit.transactionId   = 'pending_timeout_' + Date.now();
            audit.stage           = 'PAYMENT_SUCCESS_TIMEOUT';
            accountPayload.status = 'pending';
        } else {
            audit.transactionId   = paymentResult.transactionId;
            audit.paymentService  = paymentResult.provider;
            audit.stage           = 'PAYMENT_SUCCESS';
            accountPayload.status = 'confirmed';
        }

        accountPayload.subscription_start = calculated.newStart;
        accountPayload.subscription_end   = calculated.newEnd;
        accountPayload.transaction_id     = audit.transactionId;
        accountPayload.payment_service    = audit.paymentService;

        audit.newStart        = calculated.newStart;
        audit.newEnd          = calculated.newEnd;
        audit.daysRemaining   = calculated.daysRemaining;

        // 6. Unified Database Upsert for Success / Pending States
        audit.stage = 'DB_UPSERT_PENDING';
        const { error: dbError } = await supabaseAdmin
            .from('accounts')
            .upsert(accountPayload);
       
        if (dbError) {
            audit.stage     = 'FAILED_DB_UPSERT';
            audit.errorCode = 'ERR_ACCOUNT_SERVER';

            return NextResponse.json({ code: 'ERR_ACCOUNT_SERVER' }, { status: 500 });
        }

        audit.stage   = 'SUCCESS';
        audit.success = true;

        // Determine response code based on renewal type and timeout status
        let responseCode = isSelfRenewal ? 'SUCCESS_PASS_RENEWED' : 'SUCCESS_ACCOUNT_CREATED';
        if (timedOut) {
            responseCode += '_timeout';
        }

        return NextResponse.json({
            code:                responseCode,
            isSelfRenewal,
            newStart:            audit.newStart,
            newEnd:              audit.newEnd,
            subNewPassType,        
            updatedDaysRemaining: audit.daysRemaining
        }, { status: 200 });

    } catch (err) {
        audit.stage     = 'CRITICAL_EXCEPTION';
        audit.errorCode = err.message || 'ERR_ACCOUNT_PROCESSING';

        return NextResponse.json({ code: 'ERR_ACCOUNT_PROCESSING' }, { status: 500 });

    } finally {
        // Permanent database audit record insertion
        try {
            await supabaseAdmin
                .from('transaction_log')
                .insert({
                    timestamp:       audit.timestamp,
                    stage:           audit.stage,
                    email:           audit.email,
                    is_self_renewal: audit.isSelfRenewal,
                    target_user_id:  audit.targetUserId,
                    transaction_id:  audit.transactionId,
                    payment_service: audit.paymentService,
                    amount:          audit.amount,
                    pass_type:       audit.passType,
                    new_start:       audit.newStart,
                    new_end:         audit.newEnd,
                    days_remaining:  audit.daysRemaining,
                    success:         audit.success,
                    error_code:      audit.errorCode
                });
        } catch (err) {
            console.error("ERR_AUDIT_LOG_FAILURE:", err);
        }
    }
}