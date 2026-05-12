import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await getSupabase().from('presets').select('count').limit(1);
  if (error && error.code !== '42P01') {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
