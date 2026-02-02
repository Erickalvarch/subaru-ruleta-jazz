import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const CAMPAIGN_ID = process.env.NEXT_PUBLIC_CAMPAIGN_ID!

export async function POST(req: Request) {
  const { code } = await req.json()

  const { data, error } = await supabaseAdmin
    .from('campaign_settings')
    .select('is_enabled, daily_code')
    .eq('campaign_id', CAMPAIGN_ID)
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!data.is_enabled) return NextResponse.json({ ok: false, error: 'Juego deshabilitado' })

  const ok = (code || '').trim() === (data.daily_code || '').trim()
  return NextResponse.json({ ok })
}
