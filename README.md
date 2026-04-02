# Dominó Venezolano Online

Proyecto para jugar dominó venezolano online bajo contrato autoritativo.

## SPEC de referencia

Base oficial documentada en:
- `docs/official-spec-alignment.md`
- `docs/architecture.md`

## Objetivo actual

Construir una mesa 4 jugadores exactos, 2v2, preset venezolano, con:
- lobby con host y ready
- servidor autoritativo
- realtime robusto
- reconexión
- scoring por ronda y partida
- arquitectura extensible

## Qué ya sirve del código actual

- base Next.js + App Router
- integración con Supabase
- rooms privadas y join por código/link
- asientos north/east/south/west
- snapshot básico de sala
- UI de mesa como prototipo visual
- CPU simple para flujo de pruebas

## Qué no cumple todavía

- no hay engine autoritativo completo
- no hay scoring real por ronda/partida
- no hay reconexión robusta
- no hay lobby con ready/host formal
- no hay separación final entre engine/domain/use-cases/realtime

## Estructura objetivo

```txt
src/lib/domain/
src/lib/engine/
src/lib/realtime/
src/lib/use-cases/
```

## Levantar

```bash
npm install
npm run dev
```

## Base de datos

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```
