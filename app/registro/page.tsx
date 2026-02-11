'use client'

import { useMemo, useState } from 'react'

const COMUNAS_SUGERIDAS = [
  'Santiago',
  'Providencia',
  'Las Condes',
  'Ñuñoa',
  'La Florida',
  'Maipú',
  'Puente Alto',
  'San Bernardo',
  'Paine',
  'Buin',
  'Quilicura',
  'Pudahuel',
  'Estación Central',
] as const

const MODELOS_SUBARU = [
  'Forester',
  'Outback',
  'Crosstrek',
  'XV',
  'WRX',
  'BRZ',
  'Impreza',
  'Evoltis',
  'Ascent',
  'Otro',
] as const

function formatRutInput(value: string) {
  const v = value.toUpperCase().replace(/[^0-9K]/g, '')
  if (v.length <= 1) return v
  const body = v.slice(0, -1)
  const dv = v.slice(-1)
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots}-${dv}`
}

function cleanRut(value: string) {
  return value.toUpperCase().replace(/[^0-9K]/g, '')
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function RegistroPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [rut, setRut] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [comuna, setComuna] = useState('')
  const [preferredModel, setPreferredModel] = useState('')
  const [consent, setConsent] = useState(false)

  const [playerCode, setPlayerCode] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const rutClean = useMemo(() => cleanRut(rut), [rut])

  const emailTrim = useMemo(() => email.trim(), [email])
  const emailOk = useMemo(() => isValidEmail(emailTrim), [emailTrim])

  const canSubmit = useMemo(() => {
    return (
      firstName.trim().length >= 2 &&
      lastName.trim().length >= 2 &&
      rutClean.length >= 8 &&
      phone.trim().length >= 8 &&
      emailTrim.length >= 5 &&
      emailOk &&
      comuna.trim().length >= 2 &&
      preferredModel.trim().length >= 2 &&
      consent === true &&
      !loading
    )
  }, [firstName, lastName, rutClean, phone, emailTrim, emailOk, comuna, preferredModel, consent, loading])

  async function register() {
    setMsg(null)

    if (!emailTrim || !emailOk) {
      setMsg('Ingresa un email válido.')
      return
    }

    setLoading(true)
    try {
      const r = await fetch('/api/ruleta/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          rut: rutClean,
          phone,
          email: emailTrim,
          comuna,
          preferred_model: preferredModel,
          consent,
        }),
      })

      const j = await r.json()
      if (!r.ok) return setMsg(j.error || 'Error registrando')

      setPlayerCode(j.player_code)
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setFirstName('')
    setLastName('')
    setRut('')
    setPhone('')
    setEmail('')
    setComuna('')
    setPreferredModel('')
    setConsent(false)
    setPlayerCode(null)
    setMsg(null)
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Fondo Jazz */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute top-24 -right-24 h-80 w-80 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-rose-200/35 blur-3xl" />
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          {/* HEADER */}
          <div className="mb-10 flex justify-center">
            <img
              src="/images/header-evento.png"
              alt="Evento Subaru Jazz"
              className="w-full max-w-3xl object-contain"
            />
          </div>

          {/* CARD */}
          <div className="rounded-3xl bg-white shadow-2xl ring-1 ring-neutral-200 p-6 md:p-8">
            <h1 className="text-2xl md:text-3xl font-bold">Registro</h1>
            <p className="text-neutral-600 mt-1">
              Completa tus datos para recibir tu código y jugar la ruleta.
            </p>

            {msg && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {msg}
              </div>
            )}

            {!playerCode ? (
              <div className="mt-6 grid gap-4">
                <Input
                  label="Nombre"
                  value={firstName}
                  setValue={setFirstName}
                  placeholder="Ej: Erick"
                  required
                  autoComplete="given-name"
                />

                <Input
                  label="Apellido"
                  value={lastName}
                  setValue={setLastName}
                  placeholder="Ej: Alvarez"
                  required
                  autoComplete="family-name"
                />

                <Input
                  label="RUT"
                  value={rut}
                  setValue={(v) => setRut(formatRutInput(v))}
                  placeholder="12.345.678-K"
                  required
                  inputMode="text"
                  autoComplete="off"
                />

                <Input
                  label="Teléfono"
                  value={phone}
                  setValue={setPhone}
                  placeholder="+56 9 1234 5678"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                />

                <Input
                  label="Email"
                  value={email}
                  setValue={setEmail}
                  placeholder="correo@ejemplo.com"
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                />

                <Input
                  label="Comuna"
                  value={comuna}
                  setValue={setComuna}
                  placeholder="Ej: Las Condes"
                  list="comunas"
                  required
                  autoComplete="address-level2"
                />
                <datalist id="comunas">
                  {COMUNAS_SUGERIDAS.map((c) => (
                    <option value={c} key={c} />
                  ))}
                </datalist>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-neutral-800">
                    Modelo Subaru preferido
                  </label>
                  <select
                    className="w-full rounded-2xl bg-white border border-neutral-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                    value={preferredModel}
                    onChange={(e) => setPreferredModel(e.target.value)}
                    required
                  >
                    <option value="">Selecciona un modelo</option>
                    {MODELOS_SUBARU.map((m) => (
                      <option value={m} key={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-blue-700"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                  />
                  <span className="text-sm text-neutral-700">
                    Acepto bases/consentimiento para participar.
                  </span>
                </label>

                <button
                  onClick={register}
                  disabled={!canSubmit}
                  className="rounded-2xl bg-blue-700 text-white font-semibold py-3.5 disabled:opacity-40 hover:bg-blue-800 transition"
                >
                  {loading ? 'Registrando...' : 'Registrar y obtener código'}
                </button>
              </div>
            ) : (
              <div className="mt-8 text-center">
                <p className="text-neutral-700">Tu código para jugar es:</p>
                <div className="mt-3 inline-flex rounded-3xl border-2 border-blue-700 px-8 py-6">
                  <span className="text-6xl font-black tracking-[0.35em] pl-3 text-blue-700">
                    {playerCode}
                  </span>
                </div>
                <div className="mt-5 flex gap-3 justify-center">
                  <button
                    onClick={() => navigator.clipboard.writeText(playerCode)}
                    className="rounded-2xl border border-neutral-300 px-5 py-3 font-semibold"
                  >
                    Copiar código
                  </button>
                  <button
                    onClick={reset}
                    className="rounded-2xl bg-blue-700 text-white px-5 py-3 font-semibold"
                  >
                    Nuevo jugador
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-neutral-500 mt-4">
            Modo stand · Registro rápido
          </p>
        </div>
      </div>
    </div>
  )
}

/* ---------- COMPONENTE INPUT ---------- */
function Input({
  label,
  value,
  setValue,
  placeholder,
  list,
  required,
  type = 'text',
  inputMode,
  autoComplete,
}: {
  label: string
  value: string
  setValue: (v: string) => void
  placeholder?: string
  list?: string
  required?: boolean
  type?: React.HTMLInputTypeAttribute
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  autoComplete?: string
}) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium text-neutral-800">
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        className="w-full rounded-2xl bg-white border border-neutral-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        list={list}
        required={required}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
      />
    </div>
  )
}
