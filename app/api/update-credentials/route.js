import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client for secure server-side provisioning & database writes
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
    try {
        const { userId, newEmail, newPassword } = await request.json();

        // Build the update payload dynamically based on what was passed
        const updatePayload = {};
        if (newEmail)    updatePayload.email    = newEmail;
        if (newPassword) updatePayload.password = newPassword;

        // Admin API call: Executes instantly with zero email confirmations
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            updatePayload
        );

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, user: data.user });
    } catch (err) {
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}