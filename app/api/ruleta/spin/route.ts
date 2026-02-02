import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const CAMPAIGN_ID = process.env.NEXT_PUBLIC_CAMPAIGN_ID!

// Premios permitidos
const PRIZES = ['MANTA', 'AGUA', 'STRAP', 'BUFF', 'SIGUE_PARTICIPANDO'] as const
type PrizeKey = (typeof PRIZES)[number]

// Fallback parejo: 20% cada uno (5 premios)
const DEFAULT_WEIGHTS: Record<PrizeKey, number> = {
  MANTA: 20,
  AGUA: 20,
  STRAP: 20,
  BUFF: 20,
  SIGUE_PARTICIPANDO: 20,
}

function getChileYMD(d = new Date()) {
  // YYYY-MM-DD en Chile
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)

  const map: any = {}
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value
  return `${map.year}-${map.month}-${map.day}`
}

function fallbackEvenPrize(): PrizeKey {
  // 20% cada uno (parejo)
  const total = PRIZES.reduce((acc, p) => acc + DEFAULT_WEIGHTS[p], 0)
  let r = Math.random() * total
  for (const p of PRIZES) {
    r -= DEFAULT_WEIGHTS[p]
    if (r <= 0) return p
  }
  return PRIZES[PRIZES.length - 1]
}

async function pickPrizeWeighted(): Promise<PrizeKey> {
  // Trae ponderaciones desde BD
  const { data, error } = await supabaseAdmin
    .from('prize_weights')
    .select('prize, weight')
    .eq('campaign_id', CAMPAIGN_ID)

  // Si falla o no hay datos => fallback parejo (20% cada uno)
  if (error || !data || data.length === 0) return fallbackEvenPrize()

  // Limpieza + filtro
  const items = data
    .map((x) => ({
      prize: String((x as any).prize || '').toUpperCase().trim(),
      weight: Number((x as any).weight),
    }))
    .filter(
      (x) =>
        PRIZES.includes(x.prize as PrizeKey) &&
        Number.isFinite(x.weight) &&
        x.weight > 0
    ) as Array<{ prize: PrizeKey; weight: number }>

  if (items.length === 0) return fallbackEvenPrize()

  const total = items.reduce((acc, x) => acc + x.weight, 0)
  if (!Number.isFinite(total) || total <= 0) return fallbackEvenPrize()

  // Ruleta ponderada
  let r = Math.random() * total
  for (const it of items) {
    r -= it.weight
    if (r <= 0) return it.prize
  }

  return items[items.length - 1].prize
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const code = String(body?.player_code || '').trim().toUpperCase()

    if (!code) {
      return NextResponse.json({ error: 'Falta player_code' }, { status: 400 })
    }

    // 1) Buscar jugador por código + campaña
    const { data: player, error: pErr } = await supabaseAdmin
      .from('players')
      .select('id, player_code')
      .eq('campaign_id', CAMPAIGN_ID)
      .eq('player_code', code)
      .single()

    if (pErr || !player) {
      return NextResponse.json({ error: 'Código no existe' }, { status: 404 })
    }

    // 2) Verificar si ya giró (por campaña)
    const { data: existing, error: eErr } = await supabaseAdmin
      .from('spins')
      .select('id, prize')
      .eq('campaign_id', CAMPAIGN_ID)
      .eq('player_id', player.id)
      .maybeSingle()

    if (eErr) {
      return NextResponse.json({ error: eErr.message }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({
        prize: String(existing.prize || '').toUpperCase(),
        already: true,
      })
    }

    // 3) Elegir premio según ponderaciones (o 20% parejo si no hay config)
    const prize = await pickPrizeWeighted()
    const day_key = getChileYMD()

    // 4) Guardar giro (SIEMPRE, también para SIGUE_PARTICIPANDO -> cuenta como jugada)
    const { error: insErr } = await supabaseAdmin.from('spins').insert([
      {
        campaign_id: CAMPAIGN_ID,
        player_id: player.id,
        prize,
        day_key,
      },
    ])

    if (insErr) {
      // Por si chocó el unique index (doble click, refresh, etc.)
      if ((insErr as any).code === '23505') {
        const { data: ex2 } = await supabaseAdmin
          .from('spins')
          .select('prize')
          .eq('campaign_id', CAMPAIGN_ID)
          .eq('player_id', player.id)
          .maybeSingle()

        if (ex2?.prize) {
          return NextResponse.json({
            prize: String(ex2.prize).toUpperCase(),
            already: true,
          })
        }
      }

      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ prize: String(prize).toUpperCase(), already: false })
  } catch (err: any) {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
