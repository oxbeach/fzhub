import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password required.' }, { status: 400 });
        }

        // Provision user via admin API (no browser session created)
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (error || !data?.user?.id) {
            return NextResponse.json({ message: error?.message || 'Failed to create user' }, { status: 400 });
        }

        return NextResponse.json({ user: data.user }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ message: err.message || 'Server error' }, { status: 500 });
    }
}