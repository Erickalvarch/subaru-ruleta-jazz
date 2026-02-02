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

function getChileYMD(d = new Date()) {
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

function normalizePrize(v: any): PrizeKey | null {
  const p = String(v || '').toUpperCase().trim()
  return (PRIZES as readonly string[]).includes(p) ? (p as PrizeKey) : null
}

export async function GET(req: Request) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const day_key = getChileYMD()

  const { data, error } = await supabaseAdmin
    .from('spins')
    .select('prize')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('day_key', day_key)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts: Record<PrizeKey, number> = {
    MANTA: 0,
    AGUA: 0,
    STRAP: 0,
    BUFF: 0,
    SIGUE_PARTICIPANDO: 0,
  }

  for (const row of data || []) {
    const p = normalizePrize((row as any).prize)
    if (p) counts[p] += 1
  }

  const total = PRIZES.reduce((acc, p) => acc + counts[p], 0)

  return NextResponse.json({ day_key, total, counts })
}
