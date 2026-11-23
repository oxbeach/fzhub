

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client for secure server-side provisioning & database writes
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =========================================================================
// PROCESSOR ADAPTER (Replace internals with Stripe SDK when keys are added)
// =========================================================================
const createProcessorSession = async ({ transactionId, userId, email, passType, amount }) => {
    // ---------------------------------------------------------------------
    // PRODUCTION STRIPE IMPLEMENTATION (Uncomment once Stripe SDK is wired):
    // ---------------------------------------------------------------------
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const session = await stripe.checkout.sessions.create({
    //     mode: 'payment',
    //     customer_email: email,
    //     billing_address_collection: 'required',
    //     line_items: [{
    //         price_data: {
    //             currency: 'usd',
    //             product_data: { name: `Financial Zone Pass (${passType})` },
    //             unit_amount: Math.round(Number(amount) * 100),
    //         },
    //         quantity: 1,
    //     }],
    //     metadata: {
    //         transaction_id: transactionId,
    //         user_id: userId,
    //         pass_type: passType,
    //     },
    //     success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/?checkout=success`,
    //     cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/?checkout=cancel`,
    // });
    // return {
    //     processorService: 'stripe',
    //     processorId: session.id,
    //     checkoutUrl: session.url,
    // };

    // ---------------------------------------------------------------------
    // PRE-STRIPE TEST ADAPTER (Matches exact Stripe return signature):
    // ---------------------------------------------------------------------
    const simulatedSessionId = `cs_test_${Math.random().toString(36).substring(2, 14)}`;
    return {
        processorService: 'stripe',
        processorId: simulatedSessionId,
        checkoutUrl: null, // Will hold session.url once Stripe is live
    };
};

// =========================================================================
// MAIN API ENDPOINT HANDLER (STEP 1: INITIALIZE TRANSACTION & SESSION)
// =========================================================================
export async function POST(req) {
    let transactionRowId = null;


                                    /*
                                    const isGood = true; // toggle to false to test bad result

                                    if (!isGood) {
                                        return NextResponse.json(
                                            { code: 'ERR_ACCOUNT_PAYMENT' },
                                            { status: 400 }
                                        );
                                    }

                                    return NextResponse.json(
                                        {
                                            code: 'SUCCESS_PASS_RENEWED',
                                            checkoutUrl: 'https://www.google.com'
                                        },
                                        { status: 200 }
                                    );
                                    */


    try {
        // 1. Extract Authorization Bearer token securely
        const authHeader = req.headers.get('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

        let sessionUser = null;
        if (token) {
            const authClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
            const { data: { user } } = await authClient.auth.getUser(token);
            sessionUser = user;
        }

        const sessionEmail = sessionUser?.email?.trim().toLowerCase();
        const hasActiveSession = Boolean(sessionEmail);

        const body = await req.json();
        const {
            subUseExistingAccount,
            subNewEmail,
            subNewPassword,
            subNewPassType,
            subNewAmount,
        } = body;

        const isSelfRenewal = hasActiveSession && Boolean(subUseExistingAccount);
        const cleanEmail = isSelfRenewal ? sessionEmail : subNewEmail?.trim().toLowerCase();

        // 2. Email & Input Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!cleanEmail || !emailRegex.test(cleanEmail)) {
            return NextResponse.json({ code: 'ERR_INVALID_EMAIL' }, { status: 400 });
        }

        if (!subNewPassType || subNewAmount === undefined || subNewAmount === null || Number(subNewAmount) <= 0) {
            return NextResponse.json({ code: 'ERR_ACCOUNT_PROCESSING' }, { status: 400 });
        }

        // 3. Resolve or Create User ID
        let targetUserId = null;

        if (isSelfRenewal) {
            targetUserId = sessionUser.id;
        } else {
            const password = subNewPassword || '';
            if (password.length < 6) {
                return NextResponse.json({ code: 'ERR_PASSWORD_TOO_SHORT' }, { status: 400 });
            }

            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: cleanEmail,
                password: password,
                email_confirm: true,
            });

            if (authError || !authData?.user?.id) {
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
                    return NextResponse.json({ code: 'ERR_EMAIL_EXISTS' }, { status: 400 });
                }

                return NextResponse.json({ code: 'ERR_ACCOUNT_SERVER' }, { status: 500 });
            }

            targetUserId = authData.user.id;

            // Ensure baseline accounts row exists in pending/unconfirmed state (1900 dates)
            // so the account record is ready for the webhook to unlock upon payment completion
            const nowIso = new Date().toISOString();
            const { error: accountInitError } = await supabaseAdmin
                .from('accounts')
                .upsert({
                    id: targetUserId,
                    role: 'user',
                    subscription_type: subNewPassType,
                    subscription_start: '1900-01-01',
                    subscription_end: '1900-01-01',
                    created_at: nowIso,
                    amount_paid: subNewAmount,
                    payment_service: 'stripe',
                    status: 'pending',
                    updated_at: nowIso,
                });

            if (accountInitError) {
                return NextResponse.json({ code: 'ERR_ACCOUNT_SERVER' }, { status: 500 });
            }
        }

        // 4. Insert Starter Row into `transactions`
        // (`id`, `status`='pending', `processor_service`='stripe', `time_start`=now() auto-populate)
        const { data: txRow, error: txInsertError } = await supabaseAdmin
            .from('transactions')
            .insert({
                user_id: targetUserId,
                email: cleanEmail,
                pass_type: subNewPassType,
                amount: Number(subNewAmount),
            })
            .select('id')
            .single();

        if (txInsertError || !txRow?.id) {
            return NextResponse.json({ code: 'ERR_ACCOUNT_SERVER' }, { status: 500 });
        }

        transactionRowId = txRow.id;

        // 5. Create Payment Processor Session & Save `processor_id`
        const processorSession = await createProcessorSession({
            transactionId: transactionRowId,
            userId: targetUserId,
            email: cleanEmail,
            passType: subNewPassType,
            amount: Number(subNewAmount),
        });

        const { error: txUpdateError } = await supabaseAdmin
            .from('transactions')
            .update({
                processor_service: processorSession.processorService,
                processor_id: processorSession.processorId,
            })
            .eq('id', transactionRowId);

        if (txUpdateError) {
            return NextResponse.json({ code: 'ERR_ACCOUNT_SERVER' }, { status: 500 });
        }

        // 6. Return Clean Hand-Off Response to Client
        const responseCode = isSelfRenewal ? 'SUCCESS_PASS_RENEWED' : 'SUCCESS_ACCOUNT_CREATED';

        return NextResponse.json({
            code: responseCode,
            checkoutUrl: processorSession.checkoutUrl,
        }, { status: 200 });

    } catch (err) {
        // If a starter transaction row was already created before an unexpected exception,
        // mark it failed with an error_code so no orphaned pending row is left behind
        if (transactionRowId) {
            await supabaseAdmin
                .from('transactions')
                .update({
                    status: 'failed',
                    time_end: new Date().toISOString(),
                    error_code: err?.message || 'ERR_ACCOUNT_PROCESSING',
                })
                .eq('id', transactionRowId);
        }

        return NextResponse.json({ code: 'ERR_ACCOUNT_PROCESSING' }, { status: 500 });
    }
}