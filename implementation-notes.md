# Cassandra — Implementation Notes

## 2026-06-10 — Frontend honesty pass (remove all fabricated numbers)
- **Decisión:** Eliminar las 3 capas de datos falsos del landing. (1) Hero fallbacks en `app/page.tsx` (73.4% hit-rate, 1284 inscribed, 312 resolved, 427d uptime, 4.2h, +3.1σ). (2) `MOCK` en `lib/useSignals.ts` (2 señales falsas en fallo de RPC). (3) Replay SEED en `lib/useLedger.ts` (10 filas fabricadas + inscripciones/resoluciones falsas animadas + block ticker random).
- **Razón:** La tesis del proyecto es "the record cannot be faked". Un juez (Nansen/Elfa) que lea el source y encuentre números inventados destruye la credibilidad. Datos honestos pequeños > datos falsos grandes.
- **Cómo:** page.tsx deriva todo de `calls` reales con estados jóvenes/vacíos honestos. useSignals devuelve `[]` + flag `error` en fallo (sin mock). useLedger reescrito a solo-real con estado vacío honesto ("awaiting its first live call"). Block number leído de Mantle real, sin random walk.
- **Tradeoff:** Se perdió la resiliencia de "demo siempre animada" del replay. Ganamos consistencia con la tesis. El agente estará vivo igual, así que el path real domina.

## 2026-06-10 — BUG CRÍTICO: dashboard nunca leyó sus señales reales (paging de getLogs)
- **Síntoma:** Dashboard mostraba 0 señales pese a haber 105 on-chain.
- **Causa raíz:** RPC público de Mantle limita `eth_getLogs` a 10,000 bloques por llamada. Registro desplegado en bloque 96206837; head ~96486188 → span 279k bloques. La llamada única se rechazaba con `block range greater than 10000 max` → useSignals lanzaba → caía a vacío. El dashboard SIEMPRE cayó a MOCK/vacío; nunca mostró el registro real.
- **Fix:** `getLogsPaged()` en `lib/useSignals.ts` — pagina en ventanas de 9000 bloques desde FROM_BLOCK hasta head y agrega. Genérico sobre el evento para preservar el decode de `args`.
- **Verificado:** Dashboard ahora lee 105 calls reales, 0 resueltas, 105 pending, 12 filas en ledger.

## 2026-06-10 — useCountUp robusto ante rAF throttled
- **Decisión:** Re-animar cuando `end` cambia (datos async on-chain llegan después del mount) + fallback `setTimeout(duration+150)` que fija el valor final.
- **Razón:** El hero intersecta en mount con `calls=[]`, el hook fire-once quedaba en 0 cuando llegaban los datos. Además rAF se pausa en tabs background/headless → el número honesto nunca aparecía. El setTimeout garantiza el valor real en cualquier entorno.

## 2026-06-10 — RESOLVER ROTO: 0/105 resueltas (causa raíz + fix forward-only)
- **Síntoma:** 105 señales on-chain, 0 resueltas. Hit-rate indefinido = sin track record para el track "AI Alpha & Data".
- **Causa raíz 1 — pending solo en memoria:** `main.ts` arrancaba `pending = []`. Solo se llenaba con señales publicadas en ESA corrida. Al reiniciar, las 105 ya en cadena nunca se cargaban → huérfanas para siempre. El agente se paró → jamás se resolverían.
- **Causa raíz 2 — cobertura de precio = 4 tokens:** `SUBJECT_POOL` mapea solo MOE/WMNT/USDC/USDT. whale/new_wallet usan `priceToken = ev.token` (cualquier token). Si no está en el map → trata el token como pool → `getReserves` falla → 0 → "unresolvable" → pending eterno. contract_spike tiene `priceToken: undefined` → nunca resoluble (25% de detectores = solo-pending por diseño).
- **Fix (forward-only, plan A limpio):**
  1. `state-pending.ts` (nuevo) — persiste el array `pending` a `.pending.json`, parametrizable por path (testeable). `loadPending` al boot, `savePending` tras cada push y cada resolución. Las resoluciones sobreviven reinicios.
  2. Gate de resolubilidad en `publish()` — computa `priceAt` ANTES de gastar gas; si el subject no es priceable (0/non-finite), skip + broadcast "skip-unpriceable". Garantiza que cada call on-chain SEA resoluble Y conserva gas (cero submits desperdiciados). contract_spike queda fuera de writes on-chain (sigue en el feed SSE "thinking" para el demo).
  3. `MIN_PUBLISH_SCORE` (env, default 0) — floor de convicción; conserva gas y mantiene el registro a calls fuertes.
- **Por qué NO ampliar SUBJECT_POOL:** `abnormal_liquidity` ya precia cualquier pool clásico dinámicamente (subject = pool, lo lee directo) → da variedad orgánica al ledger sin riesgo de verificar mal addresses de pools. 3 de 4 detectores producen calls resolubles.
- **Las 105 existentes:** El contrato no guarda `priceAt`, así que no se pueden resolver honestamente con baseline correcto. Quedan como historial honesto "inscribed before outcome". El fix es forward-only.
- **Verificado:** 28 tests verdes (23 previos + 5 nuevos de persistencia), `tsc --noEmit` exit 0.

## 2026-06-10 — Gas real medido (Mantle mainnet)
- Balance operador `0xD648...1F04`: **1.0302 MNT** (la nota de sesión decía 2.68 — desactualizada; nonce 107).
- Costo por submit: **~0.016 MNT** (gasUsed 290k–326k; L1 fee ~0.0003, insignificante). Sample receipts cerca del deploy.
- Resolve estimado: ~0.010–0.013 MNT.
- **Ciclo completo (submit+resolve): ~0.027 MNT → headroom ~38 ciclos**, o ~64 submits solos.
- Implicación: MNT es el constraint binding (no el tiempo). El gate de precio + score floor + cooldown deben curar a ~30 ciclos resolubles en 3 semanas para un hit-rate real en Demo Day (Jul 2-3).

## PENDIENTE (requiere gastar MNT real — held hasta OK explícito)
- Setear `MIN_PUBLISH_SCORE` (~75) en backend `.env`, considerar cooldown 6h.
- Reiniciar agente + resolver en vivo (gasta MNT, corre 3 semanas).
- Telegram live test end-to-end (envía al canal real).
- Repo GitHub + push, demo video, SUBMISSION.md links, DoraHacks BUIDL (deadline Jun 15).
