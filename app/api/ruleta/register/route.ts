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

function isValidEmail(email: string) {
  // validación simple (suficiente para stand)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: Request) {
  try {
    const { name, rut, phone, email, comuna, preferred_model, consent } = await req.json()

    const n = String(name || '').trim()
    const p = String(phone || '').trim()

    // ✅ Normaliza email: trim + lower para evitar choques con constraints/regex
    const e = String(email || '').trim().toLowerCase()

    const c = String(comuna || '').trim()
    const m = String(preferred_model || '').trim()
    const r = cleanRut(rut)

    // ✅ TODOS obligatorios
    if (!n || !p || !r || !e || !c || !m || consent !== true) {
      return NextResponse.json(
        { error: 'Completa todos los campos y acepta el consentimiento.' },
        { status: 400 }
      )
    }

    // ✅ Email con formato básico
    if (!isValidEmail(e)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
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
          email: e,
          comuna: c,
          preferred_model: m,
          consent: true,
          player_code,
        },
      ])
      .select('id, player_code')
      .single()

    if (error) {
  // Duplicado por índice único (email ya usado en esta campaña)
  if (
    error.code === '23505' &&
    (error.constraint === 'players_campaign_email_unique' ||
      error.message?.includes('players_campaign_email_unique'))
  ) {
    return NextResponse.json(
      { error: 'Este correo ya está registrado para esta actividad.' },
      { status: 400 }
    )
  }

  // Email con formato inválido (CHECK constraint)
  if (error.message?.includes('players_email_format')) {
    return NextResponse.json(
      { error: 'El correo ingresado no tiene un formato válido.' },
      { status: 400 }
    )
  }

  // Otros errores
  return NextResponse.json(
    { error: 'No se pudo completar el registro. Intenta nuevamente.' },
    { status: 500 }
  )
}


    return NextResponse.json({ player_id: data.id, player_code: data.player_code })
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
