'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const PRIZES = ['MANTA', 'AGUA', 'STRAP', 'BUFF', 'SIGUE_PARTICIPANDO'] as const
type PrizeKey = (typeof PRIZES)[number]

// Paleta evento (Subaru + Jazz) + 5to neutro elegante
const SEGMENT_COLORS = ['#0B4AA2', '#F59E0B', '#06B6D4', '#F43F5E', '#111827'] as const

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}
function normAngle(rad: number) {
  const twoPi = Math.PI * 2
  rad = rad % twoPi
  if (rad < 0) rad += twoPi
  return rad
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function nicePrizeLabel(p: PrizeKey) {
  return p === 'SIGUE_PARTICIPANDO' ? 'SIGUE PARTICIPANDO' : p
}

export default function StandPage() {
  const [playerCode, setPlayerCode] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [prize, setPrize] = useState<PrizeKey | null>(null)
  const [already, setAlready] = useState(false)
  const [spinning, setSpinning] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animRef = useRef<number | null>(null)
  const angleRef = useRef<number>(0)
  const logoRef = useRef<HTMLImageElement | null>(null)

  const segAngle = useMemo(() => (Math.PI * 2) / PRIZES.length, [])
  const pointerAngle = -Math.PI / 2 // puntero arriba

  // bloquear menú contextual (click derecho)
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault()
    window.addEventListener('contextmenu', handler, { passive: false })
    return () => window.removeEventListener('contextmenu', handler as any)
  }, [])

  // cargar logo subaru (centro ruleta)
  useEffect(() => {
    const img = new Image()
    img.src = '/images/subaru.png'
    img.onload = () => {
      logoRef.current = img
      drawWheel(canvasRef.current, angleRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // redibujar al montar/resize
  useEffect(() => {
    const draw = () => drawWheel(canvasRef.current, angleRef.current)
    draw()
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopAnim() {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = null
  }

  function drawLabel(ctx: CanvasRenderingContext2D, label: PrizeKey, size: number) {
    if (label !== 'SIGUE_PARTICIPANDO') {
      const fontSize = Math.max(16, Math.floor(size * 0.055))
      ctx.font = `900 ${fontSize}px system-ui`
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fillText(label, 2, 2)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, 0, 0)
      return
    }

    const line1 = 'SIGUE'
    const line2 = 'PARTICIPANDO'
    const fontSize = Math.max(13, Math.floor(size * 0.042))
    ctx.font = `900 ${fontSize}px system-ui`

    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillText(line1, 2, -Math.floor(fontSize * 0.55) + 2)
    ctx.fillText(line2, 2, Math.floor(fontSize * 0.65) + 2)

    ctx.fillStyle = '#ffffff'
    ctx.fillText(line1, 0, -Math.floor(fontSize * 0.55))
    ctx.fillText(line2, 0, Math.floor(fontSize * 0.65))
  }

  function drawWheel(canvas: HTMLCanvasElement | null, angle: number) {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement
    const size = parent ? Math.min(parent.clientWidth, parent.clientHeight) : 520
    const dpr = window.devicePixelRatio || 1

    canvas.width = Math.floor(size * dpr)
    canvas.height = Math.floor(size * dpr)
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cx = size / 2
    const cy = size / 2
    const r = size * 0.46

    ctx.clearRect(0, 0, size, size)

    // sombra externa pro
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r + 10, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(2,6,23,0.08)'
    ctx.fill()
    ctx.restore()

    // base
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    // segmentos
    for (let i = 0; i < PRIZES.length; i++) {
      const start = angle + i * segAngle
      const end = start + segAngle

      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, start, end)
      ctx.closePath()
      ctx.fillStyle = SEGMENT_COLORS[i]
      ctx.fill()

      // separador
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'
      ctx.lineWidth = Math.max(2, size * 0.008)
      ctx.stroke()

      // texto
      const label = PRIZES[i]
      const mid = (start + end) / 2
      const tx = cx + Math.cos(mid) * (r * 0.62)
      const ty = cy + Math.sin(mid) * (r * 0.62)

      ctx.save()
      ctx.translate(tx, ty)
      ctx.rotate(mid + Math.PI / 2)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      drawLabel(ctx, label, size)
      ctx.restore()
    }

    // borde
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(15,23,42,0.25)'
    ctx.lineWidth = Math.max(2, size * 0.012)
    ctx.stroke()

    // centro + logo
    const capR = r * 0.20
    ctx.beginPath()
    ctx.arc(cx, cy, capR, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = 'rgba(15,23,42,0.20)'
    ctx.lineWidth = Math.max(2, size * 0.01)
    ctx.stroke()

    if (logoRef.current) {
      const pad = capR * 0.15
      const logoSize = capR * 2 - pad * 2

      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, capR * 0.92, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.fill()
      ctx.restore()

      ctx.drawImage(logoRef.current, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize)
    }
  }

  function prizeToIndex(p: PrizeKey) {
    return PRIZES.indexOf(p)
  }

  function computeFinalAngleForPrize(p: PrizeKey) {
    const i = prizeToIndex(p)
    const base = pointerAngle - (i * segAngle + segAngle / 2)
    return normAngle(base)
  }

  async function requestPrizeAndSpin() {
    if (spinning) return
    const code = playerCode.trim().toUpperCase()
    if (!code) return setMsg('Ingresa el código del jugador.')

    setMsg(null)
    setPrize(null)
    setAlready(false)
    setSpinning(true)

    try {
      const r = await fetch('/api/ruleta/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_code: code }),
      })
      const j = await r.json()

      if (!r.ok) {
        setSpinning(false)
        setMsg(j.error || 'Código inválido')
        return
      }

      const p = String(j.prize || '').toUpperCase() as PrizeKey
      if (!PRIZES.includes(p)) {
        setSpinning(false)
        setMsg('Respuesta inválida del servidor (premio).')
        return
      }

      const wasAlready = !!j.already
      setAlready(wasAlready)
      if (wasAlready) setMsg('Este código ya jugó (mostrando premio asignado).')

      runSpinAnimation(p)
    } catch {
      setSpinning(false)
      setMsg('Error inesperado')
    }
  }

  function runSpinAnimation(p: PrizeKey) {
    stopAnim()

    const startAngle = angleRef.current
    const finalBase = computeFinalAngleForPrize(p)

    const twoPi = Math.PI * 2
    const turns = Math.floor(5 + Math.random() * 3) // 5 a 7 vueltas

    const startNorm = normAngle(startAngle)
    let deltaToBase = finalBase - startNorm
    if (deltaToBase < 0) deltaToBase += twoPi

    const finalAngle = startAngle + turns * twoPi + deltaToBase

    const duration = 4200
    const t0 = performance.now()

    const tick = (now: number) => {
      const t = clamp((now - t0) / duration, 0, 1)
      const eased = easeOutCubic(t)

      const current = startAngle + (finalAngle - startAngle) * eased
      angleRef.current = current
      drawWheel(canvasRef.current, current)

      if (t < 1) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        angleRef.current = finalAngle
        drawWheel(canvasRef.current, finalAngle)
        setPrize(p)
        setSpinning(false)
      }
    }

    animRef.current = requestAnimationFrame(tick)
  }

  // click derecho inicia
  function handleMouseDown(e: React.MouseEvent) {
    if (e.button === 2) {
      e.preventDefault()
      requestPrizeAndSpin()
    }
  }

  function resetForNext() {
    setPlayerCode('')
    setPrize(null)
    setAlready(false)
    setMsg(null)
  }

  return (
    <div
      className="min-h-screen bg-white"
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* fondo suave */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="absolute top-24 -right-24 h-80 w-80 rounded-full bg-amber-200/35 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-rose-200/25 blur-3xl" />
      </div>

      {/* HEADER SUPERIOR (sin encerrar en 16:9) */}
      <div className="w-full flex justify-center px-6 pt-8">
        <img
          src="/images/subaru.png"
          alt="Subaru Jazz"
          className="w-full max-w-[1200px] h-[120px] md:h-[180px] object-contain"
        />
      </div>

      {/* CONTENIDO (sin aspect-video) */}
      <div className="mx-auto w-full max-w-[1400px] px-6 pb-10 pt-6">
        <div className="rounded-3xl bg-white shadow-2xl ring-1 ring-neutral-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-6 px-8 py-8 items-center">
            {/* izquierda */}
            <div className="col-span-12 md:col-span-5">
              <div className="rounded-3xl bg-white ring-1 ring-neutral-200 p-6">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-blue-800">
                  Ruleta Stand
                </h1>
                <p className="text-neutral-700 mt-1">
                  Ingresa el código del jugador y gira. <span className="font-semibold">Tip:</span>{' '}
                  también puedes iniciar con <span className="font-semibold">click derecho</span>.
                </p>

                {msg && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                    {msg}
                  </div>
                )}

                <div className="mt-5 grid gap-3">
                  <label className="text-sm font-semibold text-neutral-900">Código del jugador</label>

                  <input
                    value={playerCode}
                    onChange={(e) => setPlayerCode(e.target.value)}
                    placeholder="Ej: A7K2"
                    className="w-full rounded-2xl bg-white border border-neutral-400 px-4 py-3 text-lg uppercase tracking-widest text-neutral-900 placeholder:text-neutral-500 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-200"
                  />

                  <button
                    onClick={requestPrizeAndSpin}
                    disabled={!playerCode.trim() || spinning}
                    className="rounded-2xl bg-blue-700 text-white font-extrabold py-3.5 text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-800 transition"
                  >
                    {spinning ? 'GIRANDO...' : 'INICIAR / GIRAR'}
                  </button>

                  {prize && (
                    <div className="mt-3 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                      <div className="text-sm text-blue-900/80 font-semibold">
                        Resultado {already ? '(ya asignado)' : ''}
                      </div>
                      <div className="text-3xl md:text-4xl font-black text-blue-900 mt-1">
                        {nicePrizeLabel(prize)}
                      </div>

                      <button
                        onClick={resetForNext}
                        className="mt-4 w-full rounded-2xl bg-blue-700 text-white px-4 py-3 font-extrabold hover:bg-blue-800 transition"
                      >
                        Siguiente jugador
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-neutral-700 mt-2">
                    Premios: MANTA · AGUA · STRAP · BUFF · SIGUE PARTICIPANDO
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-neutral-700">
                Menú contextual desactivado · Click derecho inicia el giro
              </p>
            </div>

            {/* derecha */}
            <div className="col-span-12 md:col-span-7 flex items-center justify-center">
              <div className="relative w-full flex items-center justify-center">
                {/* puntero */}
                <div className="absolute top-[2%] left-1/2 -translate-x-1/2 z-20">
                  <div className="relative">
                    <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[28px] border-b-neutral-900 drop-shadow" />
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white ring-2 ring-neutral-900" />
                  </div>
                </div>

                <div className="w-full aspect-square max-w-[680px] flex items-center justify-center">
                  <canvas ref={canvasRef} className="block" />
                </div>
              </div>
            </div>
          </div>
          {/* fin body */}
        </div>
      </div>
    </div>
  )
}
