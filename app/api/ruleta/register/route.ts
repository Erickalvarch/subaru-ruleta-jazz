import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const CAMPAIGN_ID = process.env.NEXT_PUBLIC_CAMPAIGN_ID!

function makeCode(len = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

async function generateUniqueCode() {
  for (let i = 0; i < 30; i++) {
    const code = makeCode(4)
    const { data } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('campaign_id', CAMPAIGN_ID)
      .eq('player_code', code)
      .maybeSingle()

    if (!data) return code
  }
  return makeCode(6)
}

function cleanRut(raw: string) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^0-9K]/g, '')
}

export async function POST(req: Request) {
  try {
    const { name, rut, phone, email, comuna, preferred_model, consent } = await req.json()


    const n = String(name || '').trim()
    const p = String(phone || '').trim()
    const e = String(email || '').trim()
    const c = String(comuna || '').trim()
    const r = cleanRut(rut)

    if (!n || !p || !r || !c || consent !== true) {
      return NextResponse.json(
        { error: 'Completa Nombre, RUT, Teléfono, Comuna y acepta el consentimiento.' },
        { status: 400 }
      )
    }

    const player_code = await generateUniqueCode()

    const { data, error } = await supabaseAdmin
  .from('players')
  .insert([
    {
      campaign_id: CAMPAIGN_ID,
      name: n,
      rut: r,
      phone: p,
      email: e || null,
      comuna: c,
      preferred_model: preferred_model || null,
      consent: true,
      player_code,
    },
  ])
  .select('id, player_code')
  .single()


    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ player_id: data.id, player_code: data.player_code })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
