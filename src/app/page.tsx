import { HomeClient } from '@/components/home-client';

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b_0%,#020617_42%,#020617_100%)] px-6 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Dominó venezolano online</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
            Salas privadas reales con chat y base de partida compartida.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
            Primer avance funcional real: crear sala, entrar por código o link, hablar en vivo y sincronizar lobby/turno base en PC y móvil.
          </p>
        </header>
        <HomeClient />
      </div>
    </main>
  );
}
