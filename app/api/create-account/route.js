import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
    try {
        const payload = await request.json();

        if (!payload?.id) {
            return NextResponse.json({ message: 'Missing record "id" in payload.' }, { status: 400 });
        }

        const { error: dbError } = await supabaseAdmin
            .from('accounts')
            .upsert(payload, { onConflict: 'id' });

        if (dbError) {
            return NextResponse.json({ message: dbError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ message: err.message || 'Server error' }, { status: 500 });
    }
}