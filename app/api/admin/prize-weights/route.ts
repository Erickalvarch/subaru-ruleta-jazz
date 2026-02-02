import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const CAMPAIGN_ID = process.env.NEXT_PUBLIC_CAMPAIGN_ID!
const ADMIN_PIN = process.env.ADMIN_PIN!

const PRIZES = ['MANTA', 'AGUA', 'STRAP', 'BUFF', 'SIGUE_PARTICIPANDO'] as const
type PrizeKey = (typeof PRIZES)[number]

function isAuthed(req: Request) {
  const pin = req.headers.get('x-admin-pin') || ''
  return pin === ADMIN_PIN
}

function normalizePrize(v: any): PrizeKey | null {
  const p = String(v || '').toUpperCase().trim()
  return (PRIZES as readonly string[]).includes(p) ? (p as PrizeKey) : null
}

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('prize_weights')
    .select('prize, weight, updated_at')
    .eq('campaign_id', CAMPAIGN_ID)
    .order('prize', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Completar faltantes con 20 para que siempre aparezcan
  const nowIso = new Date().toISOString()
  const existing = new Map<string, any>()
  for (const r of data || []) {
    const p = normalizePrize((r as any).prize)
    if (!p) continue
    existing.set(p, { prize: p, weight: Number((r as any).weight) || 0, updated_at: (r as any).updated_at ?? null })
  }

  const items = PRIZES.map((p) => existing.get(p) ?? { prize: p, weight: 20, updated_at: nowIso })

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

  const cleaned = items.map((x) => {
    const p = normalizePrize(x.prize)
    return {
      campaign_id: CAMPAIGN_ID,
      prize: p,
      weight: Number(x.weight),
      updated_at: nowIso,
    }
  })

  for (const it of cleaned) {
    if (!it.prize) return NextResponse.json({ error: 'prize no permitido' }, { status: 400 })
    if (!Number.isFinite(it.weight) || it.weight < 0) {
      return NextResponse.json({ error: `weight inválido en ${it.prize}` }, { status: 400 })
    }
  }

  // Asegurar que los 5 existan: si no vienen en items, los completamos con 20
  const incoming = new Set(cleaned.map((x) => x.prize))
  const filler = PRIZES.filter((p) => !incoming.has(p)).map((p) => ({
    campaign_id: CAMPAIGN_ID,
    prize: p,
    weight: 20,
    updated_at: nowIso,
  }))

  const payload = [...cleaned, ...filler]

  const { error } = await supabaseAdmin.from('prize_weights').upsert(payload, { onConflict: 'campaign_id,prize' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

