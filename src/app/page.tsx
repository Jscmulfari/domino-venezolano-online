import Link from 'next/link';

const stack = [
  'Next.js 16 + App Router',
  'Supabase Realtime para salas/chat/partida',
  'Vercel para deploy',
  'UI responsive para PC y móvil',
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b_0%,#020617_42%,#020617_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Dominó venezolano online</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            Salas privadas para jugar, hablar y llevar la partida en tiempo real.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
            Base inicial del MVP para familia y amigos: salas privadas, chat tipo Discord dentro de la web y mesa preparada para reglas venezolanas.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/rooms/demo-sala" className="rounded-xl bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300">
              Ver sala demo
            </Link>
            <a href="/docs/architecture" className="rounded-xl border border-white/15 px-5 py-3 font-medium text-white transition hover:bg-white/5">
              Arquitectura MVP
            </a>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stack.map((item) => (
            <article key={item} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              {item}
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">MVP foco</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                <h2 className="text-xl font-semibold">Salas privadas</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">Código de sala, lobby, presencia y acceso simple para familia/amigos.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                <h2 className="text-xl font-semibold">Chat realtime</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">Conversación lateral persistida y sincronizada por sala.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                <h2 className="text-xl font-semibold">Juego en vivo</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">Estado de mesa, turnos, jugadas válidas y score por equipos.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                <h2 className="text-xl font-semibold">Vercel-friendly</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">Sin servidor socket custom; realtime delegado a Supabase.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/20 to-indigo-500/10 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Estado inicial</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-100">
              <li>• Scaffold Next listo para continuar</li>
              <li>• Tipos base de dominó/sala/chat</li>
              <li>• Documento de arquitectura MVP</li>
              <li>• Shell inicial de sala de juego</li>
              <li>• README con fases del MVP</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
