import Link from 'next/link'

export default function Home() {
  const items = [
    {
      title: 'Registro',
      desc: 'Formulario para generar código del jugador.',
      href: '/ruleta',
      badge: '1',
    },
    {
      title: 'Stand',
      desc: 'Pantalla para ingresar código y girar la ruleta.',
      href: '/stand',
      badge: '2',
    },
    {
      title: 'Staff',
      desc: 'Ajuste de % y reportes (PIN requerido).',
      href: '/admin/premios',
      badge: '3',
    },
  ] as const

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* Marco 16:9 */}
      <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
        <div className="rounded-[28px] border border-neutral-200 bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-6 px-8 py-6 border-b border-neutral-200">
            <div className="flex items-center gap-4">
              {/* Si tienes logo: /public/images/subaru.png */}
              <img
                src="/images/subaru.png"
                alt="Subaru"
                className="h-10 w-auto object-contain"
              />
              <div>
                <div className="text-2xl font-black tracking-tight text-blue-800">
                  Ruleta Subaru Jazz
                </div>
                <div className="text-sm text-neutral-600">
                  Menú rápido · Acceso a Registro / Stand / Staff
                </div>
              </div>
            </div>

            {/* Header evento (si existe) */}
            <img
              src="/images/header-evento2.jpg"
              alt="Evento"
              className="hidden md:block h-14 w-auto object-contain"
            />
          </div>

          {/* Contenido */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className="group rounded-3xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-5xl font-black text-blue-700/15 leading-none">
                      {it.badge}
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-blue-700 text-white flex items-center justify-center font-black group-hover:scale-105 transition">
                      →
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-2xl font-black text-neutral-900 group-hover:text-blue-800 transition">
                      {it.title}
                    </div>
                    <div className="mt-1 text-neutral-600">{it.desc}</div>
                  </div>

                  <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-bold text-neutral-700">
                    Ir a {it.title}
                    <span className="text-blue-800">•</span>
                    {it.href}
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-5">
              <div className="text-sm font-bold text-blue-900">Tip stand</div>
              <div className="text-sm text-blue-900/80 mt-1">
                En la pantalla Stand puedes iniciar con click derecho (si está habilitado en tu página de stand)
                y el menú del mouse debería quedar bloqueado.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 border-t border-neutral-200 text-xs text-neutral-500 flex items-center justify-between">
            <span>Subaru · Ruleta Stand</span>
            <span>Home / menú</span>
          </div>
        </div>
      </div>
    </main>
  )
}
