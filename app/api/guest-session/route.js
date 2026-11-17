import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const sessionName = '_admin_guest_session_';

    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('portfolio')
      .eq('session_name', sessionName)
      .single();

    if (error) throw error;

    const portfolioArray = Array.isArray(data?.portfolio) ? data.portfolio : [];

    return NextResponse.json({ 
      success: true, 
      data: portfolioArray, 
      error: null 
    });
  } catch (err) {
    return NextResponse.json({ 
      success: false, 
      data: [], 
      error: err.message || 'Failed to load guest session' 
    }, { status: 500 });
  }
}