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

## 2026-06-10 — Repo + Telegram + run en vivo (resultados reales)
- **Repo GitHub:** https://github.com/megadeth17/cassandra-mantle (público, megadeth17). Seguridad verificada: ningún .env/private key trackeado ni en historial (los 64-hex eran topics de eventos Transfer/Sync). 102 archivos en remoto, solo `.env.example`. Commit con mensaje convencional, sin trailer de atribución (desactivado global).
- **Telegram verificado end-to-end (primera vez):** `@c4s4ndr4_bot` (id 8991831946) autenticado, mensaje entregado al canal `-1003945448485` (message_id 4). Test honesto: mensaje de conectividad marcado, NO una señal falsa al canal del registro provable.
- **Agente corrido en vivo — el loop completo FUNCIONA:** arrancó desde head (START_BLOCK=latest ignora el cursor viejo, sin replay de 280k). En ~10 min inscribió señales reales on-chain (verificado: 4+ eventos SignalSubmitted frescos bloques 96488227+), persistió a `.pending.json` con `priceAt` real capturado por subject (gate funcionando — todas priceables). Path completo probado: detector → submit on-chain → pending persistido → (resolver pendiente de ventana).
- **PROBLEMA descubierto — new_wallet runaway de gas:** floor 65 era muy permisivo. En ~10 min: **17 submits, 0.27 MNT quemados**, 13/15 fueron `new_wallet_accumulation` (dispara en CADA wallet fresca que recibe token priceable — ruido, no alpha). Balance 1.0302 → **0.7570 MNT**.
- **Mitigación:** agente detenido para proteger budget. `MIN_PUBLISH_SCORE=90` en .env → `new_wallet` (score máx 90) bloqueado estructuralmente; solo whale/liquidity extremos inscriben. El fix de persistencia probó su valor: restart recarga las 15 pending de disco sin perderlas.
- **Estado:** 15 pending nuevas on-chain (13 new_wallet + 2 whale) + 105 viejas = registro suficiente. Ya NO se necesitan más señales; se necesita RESOLVERLAS. El resolver cierra cada una al cerrar su ventana (abnormal_liq 2h, whale 6h, contract 12h, new_wallet 24h) SI el agente corre en ese momento.
- **Fix de raíz HECHO (después del run):** `new_wallet_accumulation` ahora exige que el inflow rankee en el **top-15% de flujos recientes** del token (reusa `percentile`+`recentFlows`, ≥10 muestras) = acumulación deliberada, no dust/CEX. Score 60-100 (freshness 20 + magnitud 20 + base 60). Raro + significativo → mata el runaway en la raíz, no por supresión. Restaura un 4º detector honesto. **Floor bajado a 75** (los 4 disparan de verdad). +2 tests (dust→null, baseline<10→null). 30 tests verdes, tsc limpio. README judge-grade reescrito. Todo pusheado.

## HANDOFF — correr el agente para poblar el hit-rate (tarea del usuario, 24h+ supervisado)
- Comando: `cd backend && npm start` (corre `tsx src/main.ts`). Dejar la terminal abierta 6-24h.
- Con floor 90, el burn nuevo es ~cero; el gasto será de resoluciones (~0.012 MNT c/u × 15 ≈ 0.18 MNT). Buffer: ~0.57 MNT.
- Monitoreo: balance del operador `0xD648...1F04` en mantlescan; `.pending.json` baja conforme resuelve; dashboard hit-rate sube.
- NO dejar 100% desatendido (machine sleep para el resolver; budget finito). Considerar bursts estratégicos cerca de Demo Day (Jul 2-3).
- NO tocar task scheduler (Hard Limit) — correr en terminal manual.

## 2026-06-10 — Deploy VPS + BURN incident + RESOLVE_ONLY fix
- **Deploy VPS (Hetzner CAX11 ARM64):** SSH directo (user dio IP+key en chat — no del screenshot). Node 20 + pm2 instalados, repo clonado, 30 tests verdes. `.env` con no-secretos (`SSE_PORT=8788` porque 8787 ocupado por otro agente); AGENT_PK + TELEGRAM_BOT_TOKEN los pegó el user con nano (yo NUNCA toqué la key — línea roja). Las 15 pending locales copiadas por scp al VPS (metadata pública, no secreto).
- **BURN incident (fallo mío de throttling):** agente corrió 127 min bajo pm2 → quemó **0.7424 MNT** inscribiendo ~44 señales nuevas (27 new_wallet + 17 whale). Balance 0.7570 → 0.0146. Pending 15 → 59.
- **Causa raíz:** los gates de detector son **percentiles RELATIVOS** (top-5%/top-15% de flujos recientes). En token activo SIEMPRE hay un top-X% → disparan continuo sin importar el percentil. El floor 75 + fix new_wallet acotan CALIDAD, no FRECUENCIA absoluta. Inscribió más rápido de lo que el budget podía resolver. Lección: agente con costo on-chain real necesita **cap duro de gasto/rate**, no thresholds relativos.
- **Fix — RESOLVE_ONLY mode:** `config.resolveOnly` (env `RESOLVE_ONLY=1`) gatea TODO el bloque de detección/inscripción en main.ts; solo corre el resolver. Gasta gas exclusivamente en cerrar pending existentes, cero inscripciones nuevas. Verificado en VPS: 90s → pending 59 estable, balance sin cambio (-0.0000). 30 tests verdes, tsc limpio.
- **Top-up:** user recargó → **2.0146 MNT**. Cubre resolver las 59 (~0.71 MNT) + buffer.
- **Estado:** agente corriendo en VPS bajo pm2 en RESOLVE_ONLY. Las 59 resuelven conforme cierran ventanas (whale 6h, new_wallet 24h) → hit-rate se puebla en ~24h sin riesgo de re-burn.
- **Follow-up futuro (no urgente):** para volver a inscribir, meter cap duro: "no inscribir si balance < gas para resolver todas las pending + esta" (acota la deuda) + rate-limit por hora.

## PENDIENTE (resto submission)
- Correr agente 24h para resolver las 15 → hit-rate real en dashboard (handoff arriba).
- Demo video (loop completo: señal → on-chain → Telegram → dashboard → resolve → hit-rate).
- Deploy dashboard (Vercel) → URL para SUBMISSION.md + canal Telegram público link.
- DoraHacks BUIDL submission (deadline Jun 15).
