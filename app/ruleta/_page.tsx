'use client'

import { useState } from 'react'

export default function RuletaPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)

  const [playerId, setPlayerId] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [codeOk, setCodeOk] = useState(false)

  const [spinning, setSpinning] = useState(false)
  const [prize, setPrize] = useState<string | null>(null)

  const [msg, setMsg] = useState<string | null>(null)

  async function register() {
    setMsg(null)
    const r = await fetch('/api/ruleta/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, consent }),
    })
    const j = await r.json()
    if (!r.ok) return setMsg(j.error || 'Error registrando')
    setPlayerId(j.player_id)
  }

  async function checkCode() {
    setMsg(null)
    const r = await fetch('/api/ruleta/check-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const j = await r.json()
    if (!r.ok) return setMsg(j.error || 'Error validando código')
    if (!j.ok) return setMsg('Código incorrecto')
    setCodeOk(true)
  }

  async function spin() {
    setMsg(null)
    setSpinning(true)

    try {
      const r = await fetch('/api/ruleta/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId }),
      })
      const j = await r.json()
      if (!r.ok) return setMsg(j.error || 'Error girando')

      // Simula “giro” 1.5s antes de mostrar premio
      setTimeout(() => {
        setPrize(j.prize)
        setSpinning(false)
      }, 1500)
    } catch (e: any) {
      setSpinning(false)
      setMsg('Error inesperado')
    }
  }

  function reset() {
    setName('')
    setEmail('')
    setPhone('')
    setConsent(false)
    setPlayerId(null)
    setCode('')
    setCodeOk(false)
    setSpinning(false)
    setPrize(null)
    setMsg(null)
  }

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Ruleta Stand</h1>

      {msg && <p style={{ color: 'crimson' }}>{msg}</p>}

      {!playerId && (
        <div style={{ display: 'grid', gap: 10 }}>
          <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />

          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            Acepto términos / bases
          </label>

          <button onClick={register} style={{ padding: 12, fontSize: 16 }}>
            Registrar
          </button>
        </div>
      )}

      {playerId && !codeOk && (
        <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
          <p style={{ margin: 0 }}>
            <b>Registrado.</b> Ingresa el código del staff:
          </p>
          <input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} />
          <button onClick={checkCode} style={{ padding: 12, fontSize: 16 }}>
            Validar código
          </button>
        </div>
      )}

      {playerId && codeOk && !prize && (
        <div style={{ marginTop: 22 }}>
          <button
            onClick={spin}
            disabled={spinning}
            style={{ padding: 16, fontSize: 18, width: '100%' }}
          >
            {spinning ? 'GIRANDO...' : 'GIRAR RULETA'}
          </button>

          <p style={{ opacity: 0.7, marginTop: 10 }}>
            Premios: Manta • Agua • Strap • Buff
          </p>
        </div>
      )}

      {prize && (
        <div style={{ marginTop: 22 }}>
          <h2 style={{ fontSize: 24, marginBottom: 10 }}>Premio: {prize}</h2>
          <button onClick={reset} style={{ padding: 12, fontSize: 16 }}>
            Nuevo jugador
          </button>
        </div>
      )}
    </div>
  )
}
