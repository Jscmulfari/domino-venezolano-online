import type { ChatMessage, RoomMember } from '@/lib/domino/types';

type Props = {
  roomCode: string;
  members: RoomMember[];
  messages: ChatMessage[];
};

export function RoomShell({ roomCode, members, messages }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <aside className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Sala</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">#{roomCode}</h2>
        <div className="mt-4 space-y-3">
          {members.map((member) => (
            <div key={member.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <p className="font-medium text-white">{member.displayName}</p>
              <p className="text-sm text-slate-400">{member.seat}</p>
            </div>
          ))}
        </div>
      </aside>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Mesa</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Tablero de juego</h3>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">MVP shell</span>
        </div>
        <div className="mt-6 grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-white/15 bg-slate-950/40 text-center text-slate-400">
          <div>
            <p className="text-lg font-medium text-white">Zona de mesa</p>
            <p className="mt-2 max-w-md text-sm">Aquí vivirá el tablero, fichas jugadas, turno actual y acciones válidas según reglas venezolanas.</p>
          </div>
        </div>
      </section>

      <aside className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Chat</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Conversación</h3>
        <div className="mt-4 space-y-3">
          {messages.map((message) => (
            <div key={message.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
              <p className="text-sm font-medium text-white">{message.authorName}</p>
              <p className="mt-1 text-sm text-slate-300">{message.body}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
