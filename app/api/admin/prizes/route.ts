import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const CAMPAIGN_ID = process.env.NEXT_PUBLIC_CAMPAIGN_ID!
const ADMIN_PIN = process.env.ADMIN_PIN!

// Premios permitidos (incluye el nuevo)
const PRIZES = ['MANTA', 'AGUA', 'STRAP', 'BUFF', 'SIGUE_PARTICIPANDO'] as const
type PrizeKey = (typeof PRIZES)[number]

// Default 20% cada uno
const DEFAULT_WEIGHT = 20

function isAuthed(req: Request) {
  const pin = req.headers.get('x-admin-pin') || ''
  return pin === ADMIN_PIN
}

function normalizePrize(v: any) {
  return String(v || '').toUpperCase().trim()
}

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1) Traer los existentes
  const { data, error } = await supabaseAdmin
    .from('prize_weights')
    .select('prize, weight, updated_at')
    .eq('campaign_id', CAMPAIGN_ID)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data || []).map((x: any) => ({
    prize: normalizePrize(x.prize),
    weight: Number(x.weight),
    updated_at: x.updated_at ?? null,
  }))

  // 2) Completar faltantes con 20 (para que aparezcan en UI siempre)
  const existingSet = new Set(rows.map((r) => r.prize))
  const nowIso = new Date().toISOString()

  const missing = PRIZES.filter((p) => !existingSet.has(p)).map((p) => ({
    campaign_id: CAMPAIGN_ID,
    prize: p,
    weight: DEFAULT_WEIGHT,
    updated_at: nowIso,
  }))

  if (missing.length > 0) {
    // Insertamos faltantes para dejar BD consistente
    const { error: upErr } = await supabaseAdmin
      .from('prize_weights')
      .upsert(missing, { onConflict: 'campaign_id,prize' })

    if (upErr) {
      // Si por permisos/constraints no se puede, igual devolvemos respuesta “completada” sin romper
      const completed = [
        ...rows,
        ...missing.map((m) => ({ prize: m.prize, weight: m.weight, updated_at: m.updated_at })),
      ].sort((a, b) => a.prize.localeCompare(b.prize))

      return NextResponse.json({ items: completed, warning: upErr.message })
    }
  }

  // 3) Armar respuesta ordenada y asegurada con los 5 premios
  const byPrize = new Map<string, { prize: string; weight: number; updated_at: string | null }>()
  for (const r of rows) {
    if (!PRIZES.includes(r.prize as PrizeKey)) continue
    byPrize.set(r.prize, {
      prize: r.prize,
      weight: Number.isFinite(r.weight) ? r.weight : DEFAULT_WEIGHT,
      updated_at: r.updated_at,
    })
  }
  for (const p of PRIZES) {
    if (!byPrize.has(p)) {
      byPrize.set(p, { prize: p, weight: DEFAULT_WEIGHT, updated_at: nowIso })
    }
  }

  const items = Array.from(byPrize.values()).sort((a, b) => a.prize.localeCompare(b.prize))
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const items = body?.items as Array<{ prize: string; weight: number }>

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items inválido' }, { status: 400 })
  }

  const nowIso = new Date().toISOString()

  // Normaliza y valida (y además limita a PRIZES)
  const cleaned = items.map((x) => ({
    campaign_id: CAMPAIGN_ID,
    prize: normalizePrize(x.prize),
    weight: Number(x.weight),
    updated_at: nowIso,
  }))

  for (const it of cleaned) {
    if (!it.prize) return NextResponse.json({ error: 'prize vacío' }, { status: 400 })
    if (!PRIZES.includes(it.prize as PrizeKey)) {
      return NextResponse.json({ error: `prize no permitido: ${it.prize}` }, { status: 400 })
    }
    if (!Number.isFinite(it.weight) || it.weight < 0) {
      return NextResponse.json({ error: `weight inválido en ${it.prize}` }, { status: 400 })
    }
  }

  // Asegurar que los 5 existan: si no vienen en items, mantenemos/creamos default
  const incoming = new Set(cleaned.map((x) => x.prize))
  const filler = PRIZES.filter((p) => !incoming.has(p)).map((p) => ({
    campaign_id: CAMPAIGN_ID,
    prize: p,
    weight: DEFAULT_WEIGHT,
    updated_at: nowIso,
  }))

  const payload = [...cleaned, ...filler]

  const { error } = await supabaseAdmin
    .from('prize_weights')
    .upsert(payload, { onConflict: 'campaign_id,prize' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
