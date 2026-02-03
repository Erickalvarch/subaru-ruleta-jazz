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

  const remaining = useMemo(() => 100 - total, [total])

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
        const f = (j.items || []).find((x: any) => String(x.prize).toUpperCase() === p)
        if (f) next[p] = Number(f.weight) || 0
      }

      // fallback por si faltan
      for (const p of PRIZES) {
        if (!Number.isFinite(next[p])) next[p] = 20
      }

      setWeights(next)
      setAuthed(true)
      setMsg('Pesos cargados ✅')

      fetchTodayReport()
      fetchDailyReport()
    } finally {
      setLoading(false)
    }
  }

  async function saveWeights() {
    setErr(null)
    setMsg(null)

    if (total !== 100) {
      setErr(`El total debe ser 100%. Ahora está en ${total}%.`)
      return
    }

    setLoading(true)
    try {
      const items = PRIZES.map((p) => ({ prize: p, weight: Number(weights[p]) || 0 }))
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
    const vv = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0
    setWeights((prev) => ({ ...prev, [p]: vv }))
  }

  // Ajusta automáticamente para que total = 100, manteniendo proporciones (y reparte redondeos)
  function normalizeTo100() {
    setErr(null)
    setMsg(null)

    const values = PRIZES.map((p) => ({
      p,
      w: Math.max(0, Number(weights[p]) || 0),
    }))

    const sum = values.reduce((a, x) => a + x.w, 0)

    // Si todo está en 0, set parejo
    if (sum <= 0) {
      const base = Math.floor(100 / PRIZES.length)
      const rem = 100 - base * PRIZES.length
      const next: Record<PrizeKey, number> = { ...weights }
      PRIZES.forEach((p, i) => (next[p] = base + (i < rem ? 1 : 0)))
      setWeights(next)
      setMsg('Ajustado a 100% (parejo).')
      return
    }

    // Proporcional + redondeo
    const raw = values.map((x) => ({ ...x, raw: (x.w / sum) * 100 }))
    const flo = raw.map((x) => ({ ...x, w2: Math.floor(x.raw) }))
    let used = flo.reduce((a, x) => a + x.w2, 0)
    let left = 100 - used

    // Reparte los sobrantes a los que tienen mayor parte decimal
    const byFrac = raw
      .map((x) => ({ p: x.p, frac: x.raw - Math.floor(x.raw) }))
      .sort((a, b) => b.frac - a.frac)

    const next: Record<PrizeKey, number> = { ...weights }
    for (const it of flo) next[it.p] = it.w2

    let idx = 0
    while (left > 0) {
      const target = byFrac[idx % byFrac.length].p
      next[target] += 1
      left -= 1
      idx += 1
    }

    setWeights(next)
    setMsg('Ajustado automáticamente a 100%.')
  }

  return (
    <div className="min-h-screen bg-white p-6 text-neutral-900">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-neutral-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-blue-800">Admin Premios</h1>
              <p className="text-neutral-600">Ajusta porcentajes y revisa actividad del stand</p>
            </div>

            {/* mantenemos el total arriba pero más discreto */}
            <div className="text-right">
              <div className="text-xs text-neutral-500">Total</div>
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
                disabled={!pin.trim() || loading}
                className="rounded-xl bg-blue-700 py-3 font-bold text-white disabled:opacity-40"
              >
                {loading ? 'Cargando...' : 'Ingresar'}
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-6">
              {/* HOY */}
              <div className="rounded-3xl border border-neutral-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-black text-blue-800">HOY</div>
                    <div className="text-xs text-neutral-600">Chile · {today?.day_key || '--'}</div>
                  </div>
                  <button
                    onClick={fetchTodayReport}
                    disabled={todayLoading || loading}
                    className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-extrabold hover:bg-neutral-50 disabled:opacity-40"
                  >
                    {todayLoading ? 'Actualizando...' : 'Actualizar'}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
                    <div className="text-xs text-neutral-600">TOTAL</div>
                    <div className="mt-1 text-4xl font-black text-blue-800">{today?.total ?? 0}</div>
                  </div>

                  {PRIZES.map((p) => (
                    <div key={p} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
                      <div className="text-xs text-neutral-600">{labelPrize(p)}</div>
                      <div className="mt-1 text-2xl font-black text-neutral-900">{today?.counts?.[p] ?? 0}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* EVENTO */}
              <div className="rounded-3xl border border-neutral-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-black text-blue-800">Premios entregados por día</div>
                    <div className="text-xs text-neutral-600">Evento: 11 · 18 · 25 febrero 2026</div>
                  </div>

                  <button
                    onClick={fetchDailyReport}
                    disabled={reportLoading || loading}
                    className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-extrabold hover:bg-neutral-50 disabled:opacity-40"
                  >
                    {reportLoading ? 'Actualizando...' : 'Actualizar'}
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {EVENT_DAYS.map((dk) => {
                    const day = (report?.days || []).find((x: any) => x.day_key === dk)
                    const totalDay = day?.total ?? 0
                    return (
                      <div key={dk} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                        <div className="text-xs text-neutral-600">Día</div>
                        <div className="text-base font-black text-neutral-900">{dk}</div>
                        <div className="mt-2 text-3xl font-black text-blue-800">{totalDay}</div>
                        <div className="text-xs text-neutral-600">jugadas</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* -------- PANEL TOTAL JUNTO A LAS BARRAS -------- */}
              <div className="sticky top-4 z-10 rounded-3xl border border-neutral-200 bg-white/90 backdrop-blur p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-neutral-50 border border-neutral-200 px-4 py-3">
                      <div className="text-xs text-neutral-600">Total actual</div>
                      <div className={`text-3xl font-black ${total === 100 ? 'text-green-700' : 'text-red-700'}`}>
                        {total}%
                      </div>
                    </div>

                    <div className="rounded-2xl bg-neutral-50 border border-neutral-200 px-4 py-3">
                      <div className="text-xs text-neutral-600">Restante</div>
                      <div className={`text-3xl font-black ${remaining === 0 ? 'text-green-700' : 'text-blue-800'}`}>
                        {remaining}%
                      </div>
                    </div>

                    <div className="hidden md:block text-sm text-neutral-600">
                      Ajusta las barras y deja el total en <b>100%</b>.
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-2">
                    <button
                      onClick={normalizeTo100}
                      disabled={loading}
                      className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm font-extrabold hover:bg-neutral-50 disabled:opacity-40"
                    >
                      Ajustar a 100%
                    </button>

                    <button
                      onClick={saveWeights}
                      disabled={loading || total !== 100}
                      className="rounded-2xl bg-blue-700 text-white px-5 py-2 text-sm font-extrabold hover:bg-blue-800 disabled:opacity-40"
                    >
                      {loading ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>

                {total !== 100 && (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    ⚠️ Para guardar, el total debe ser <b>100%</b>. Te faltan/sobran <b>{Math.abs(remaining)}%</b>.
                  </div>
                )}
              </div>

              {/* SLIDERS */}
              {PRIZES.map((p) => (
                <div key={p} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-extrabold text-neutral-900">{labelPrize(p)}</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={weights[p]}
                        onChange={(e) => setW(p, Number(e.target.value))}
                        className="w-24 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-right font-bold text-neutral-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-200"
                      />
                      <span className="text-neutral-700 font-semibold">%</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={weights[p]}
                    onChange={(e) => setW(p, Number(e.target.value))}
                    className="mt-4 w-full"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-neutral-600 mt-4">/admin/premios · Configuración de porcentajes</p>
      </div>
    </div>
  )
}
