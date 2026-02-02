import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const CAMPAIGN_ID = process.env.NEXT_PUBLIC_CAMPAIGN_ID!
const ADMIN_PIN = process.env.ADMIN_PIN!

function isAuthed(req: Request) {
  const pin = req.headers.get('x-admin-pin') || ''
  return pin === ADMIN_PIN
}

const PRIZES = ['MANTA', 'AGUA', 'STRAP', 'BUFF', 'SIGUE_PARTICIPANDO'] as const
type PrizeKey = (typeof PRIZES)[number]

function normalizePrize(v: any): PrizeKey | null {
  const p = String(v || '').toUpperCase().trim()
  return (PRIZES as readonly string[]).includes(p) ? (p as PrizeKey) : null
}

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const from = (url.searchParams.get('from') || '2026-02-11').trim()
  const to = (url.searchParams.get('to') || '2026-02-25').trim()

  const { data, error } = await supabaseAdmin
    .from('spins')
    .select('day_key, prize')
    .eq('campaign_id', CAMPAIGN_ID)
    .gte('day_key', from)
    .lte('day_key', to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const emptyCounts = () =>
    ({ MANTA: 0, AGUA: 0, STRAP: 0, BUFF: 0, SIGUE_PARTICIPANDO: 0 } as Record<PrizeKey, number>)

  const byDay = new Map<string, Record<PrizeKey, number>>()

  for (const row of data || []) {
    const dk = String((row as any).day_key || '').trim()
    if (!dk) continue
    const p = normalizePrize((row as any).prize)
    if (!p) continue

    if (!byDay.has(dk)) byDay.set(dk, emptyCounts())
    byDay.get(dk)![p] += 1
  }

  const dayKeys = Array.from(byDay.keys()).sort((a, b) => a.localeCompare(b))

  const days = dayKeys.map((dk) => {
    const counts = byDay.get(dk)!
    const total = PRIZES.reduce((acc, p) => acc + (counts[p] || 0), 0)
    return { day_key: dk, total, counts }
  })

  const totalsCounts = emptyCounts()
  for (const d of days) {
    for (const p of PRIZES) totalsCounts[p] += d.counts[p] || 0
  }
  const totalsTotal = PRIZES.reduce((acc, p) => acc + totalsCounts[p], 0)

  return NextResponse.json({
    from,
    to,
    prizes: PRIZES,
    days,
    totals: { total: totalsTotal, counts: totalsCounts },
  })
}
