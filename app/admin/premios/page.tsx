'use client'

import { useMemo, useState } from 'react'

type PrizeKey = 'MANTA' | 'AGUA' | 'STRAP' | 'BUFF' | 'SIGUE_PARTICIPANDO'

const PRIZES: PrizeKey[] = ['MANTA', 'AGUA', 'STRAP', 'BUFF', 'SIGUE_PARTICIPANDO']
const EVENT_DAYS = ['2026-02-11', '2026-02-18', '2026-02-25'] as const

function labelPrize(p: PrizeKey) {
  return p === 'SIGUE_PARTICIPANDO' ? 'SIGUE PARTICIPANDO' : p
}

export default function AdminPremiosPage() {
  const [pin, setPin] = useState('')
  const [authed, setAuthed] = useState(false)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [weights, setWeights] = useState<Record<PrizeKey, number>>({
    MANTA: 20,
    AGUA: 20,
    STRAP: 20,
    BUFF: 20,
    SIGUE_PARTICIPANDO: 20,
  })

  const [report, setReport] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const [today, setToday] = useState<any>(null)
  const [todayLoading, setTodayLoading] = useState(false)

  const total = useMemo(() => {
    return PRIZES.reduce((acc, p) => acc + (Number(weights[p]) || 0), 0)
  }, [weights])

  /* ---------------- REPORTES ---------------- */

  async function fetchDailyReport() {
    setReportLoading(true)
    try {
      const r = await fetch('/api/admin/daily-report?from=2026-02-11&to=2026-02-25', {
        headers: { 'x-admin-pin': pin },
      })
      const j = await r.json()
      if (!r.ok) return setErr(j.error || 'Error cargando reporte evento')
      setReport(j)
    } finally {
      setReportLoading(false)
    }
  }

  async function fetchTodayReport() {
    setTodayLoading(true)
    try {
      const r = await fetch('/api/admin/today-report', {
        headers: { 'x-admin-pin': pin },
      })
      const j = await r.json()
      if (!r.ok) return setErr(j.error || 'Error cargando hoy')
      setToday(j)
    } finally {
      setTodayLoading(false)
    }
  }

  /* ---------------- PESOS ---------------- */

  async function fetchWeights() {
    setErr(null)
    setMsg(null)
    setLoading(true)

    try {
      const r = await fetch('/api/admin/prize-weights', {
        headers: { 'x-admin-pin': pin },
      })
      const j = await r.json()
      if (!r.ok) return setErr(j.error || 'Error cargando pesos')

      const next = { ...weights }
      for (const p of PRIZES) {
        const f = (j.items || []).find((x: any) => x.prize === p)
        if (f) next[p] = Number(f.weight) || 0
      }

      setWeights(next)
      setAuthed(true)
      setMsg('Pesos cargados.')

      fetchTodayReport()
      fetchDailyReport()
    } finally {
      setLoading(false)
    }
  }

  async function saveWeights() {
    setErr(null)
    setMsg(null)
    setLoading(true)

    try {
      const items = PRIZES.map((p) => ({ prize: p, weight: weights[p] }))
      const r = await fetch('/api/admin/prize-weights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': pin,
        },
        body: JSON.stringify({ items }),
      })
      const j = await r.json()
      if (!r.ok) return setErr(j.error || 'Error guardando')
      setMsg('Pesos guardados ✅')
    } finally {
      setLoading(false)
    }
  }

  function setW(p: PrizeKey, v: number) {
    setWeights((prev) => ({ ...prev, [p]: v }))
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-white p-6 text-neutral-900">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-neutral-200">
          <div className="flex justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-blue-800">Admin Premios</h1>
              <p className="text-neutral-600">
                Ajusta porcentajes y revisa actividad del stand
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs">Total</div>
              <div className={`text-2xl font-black ${total === 100 ? 'text-green-700' : 'text-red-700'}`}>
                {total}%
              </div>
            </div>
          </div>

          {err && <div className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{err}</div>}
          {msg && <div className="mt-4 rounded-xl bg-green-50 p-3 text-green-800">{msg}</div>}

          {!authed ? (
            <div className="mt-6 grid gap-3">
              <input
                placeholder="PIN Staff"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="rounded-xl border px-4 py-3 text-lg"
              />
              <button
                onClick={fetchWeights}
                className="rounded-xl bg-blue-700 py-3 font-bold text-white"
              >
                Ingresar
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-6">

              {/* ---------- HOY ---------- */}
              <div className="rounded-3xl border bg-neutral-50 p-5">
                <div className="flex justify-between">
                  <div>
                    <div className="text-lg font-black text-blue-800">HOY</div>
                    <div className="text-xs text-neutral-600">
                      Chile · {today?.day_key || '--'}
                    </div>
                  </div>
                  <button
                    onClick={fetchTodayReport}
                    className="rounded-xl border px-3 py-2 text-sm font-bold"
                  >
                    {todayLoading ? '...' : 'Actualizar'}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="rounded-xl bg-white p-4 text-center">
                    <div className="text-xs">TOTAL</div>
                    <div className="text-4xl font-black text-blue-800">
                      {today?.total ?? 0}
                    </div>
                  </div>

                  {PRIZES.map((p) => (
                    <div key={p} className="rounded-xl bg-white p-4 text-center">
                      <div className="text-xs">{labelPrize(p)}</div>
                      <div className="text-2xl font-black">
                        {today?.counts?.[p] ?? 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---------- EVENTO ---------- */}
              <div className="rounded-3xl border bg-white p-5">
                <div className="flex justify-between">
                  <div>
                    <div className="text-lg font-black text-blue-800">
                      Premios entregados por día
                    </div>
                    <div className="text-xs text-neutral-600">
                      Evento: 11 · 18 · 25 febrero 2026
                    </div>
                  </div>
                  <button
                    onClick={fetchDailyReport}
                    className="rounded-xl border px-3 py-2 text-sm font-bold"
                  >
                    {reportLoading ? '...' : 'Actualizar'}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {EVENT_DAYS.map((d) => {
                    const day = report?.days?.find((x: any) => x.day_key === d)
                    return (
                      <div key={d} className="rounded-xl bg-neutral-50 p-4 text-center">
                        <div className="text-xs">{d}</div>
                        <div className="text-3xl font-black text-blue-800">
                          {day?.total ?? 0}
                        </div>
                        <div className="text-xs">jugadas</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ---------- SLIDERS ---------- */}
              {PRIZES.map((p) => (
                <div key={p} className="rounded-2xl border bg-neutral-50 p-4">
                  <div className="flex justify-between">
                    <b>{labelPrize(p)}</b>
                    <input
                      type="number"
                      value={weights[p]}
                      onChange={(e) => setW(p, Number(e.target.value))}
                      className="w-20 rounded border px-2 text-right"
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={weights[p]}
                    onChange={(e) => setW(p, Number(e.target.value))}
                    className="mt-3 w-full"
                  />
                </div>
              ))}

              <button
                onClick={saveWeights}
                className="rounded-xl bg-blue-700 py-3 font-black text-white"
              >
                Guardar cambios
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
