# Prompt para Claude Code — Prototipo Fluvë Studio (SPA vanilla + IndexedDB)

> Este archivo es para arrancar el proyecto **con Claude Code**. Tiene 3 partes:
> **A.** El mensaje que le pegás a Claude Code (copiá el bloque).
> **B.** El contenido del `CLAUDE.md` (memoria del proyecto) que Claude Code debe crear.
> **C.** El plan de construcción por fases con checkpoints.

---

## A · Mensaje de arranque (copiá y pegá esto en Claude Code)

Trabajá dentro de la carpeta del proyecto, con `handoff_prototipo_spa/` incluido.

---

Estoy construyendo un **prototipo funcional** de **Fluvë Studio** (e-commerce de impresión personalizada, modelo de intermediación). Esta fase es para **probar navegación, vistas, capa de datos, diseños y flujos** — NO es el stack de producción. Luego migraremos.

**Restricciones técnicas duras (no negociables):**
- HTML5 + CSS3 + JavaScript vanilla (ES6+). **Sin frameworks** (React/Vue/Svelte/Angular/jQuery).
- **Sin build tools** (webpack/Vite/Rollup/Babel/npm). El código corre tal cual.
- **Sin servidor propio.** SPA 100% en el navegador. Para módulos ES se sirve con `python3 -m http.server` (no es dependencia de la app).
- **IndexedDB** como base de datos local. `localStorage` solo para preferencias (idioma/sesión).
- **Routing por `location.hash`** en un único `index.html`. El admin son **rutas protegidas por rol** dentro de la misma SPA (no se separa front de back).
- **Módulos ES6** (`<script type="module">`, `import`/`export`), en varios archivos, sin bundler.

**Antes de escribir una sola línea de código, hacé esto en orden:**

1. **Leé los 4 documentos del handoff, en este orden y completos:**
   1. `handoff_prototipo_spa/README.md` — visión, alcance, design tokens, mapa de pantallas→rutas, convenciones F1–F8 / G1–G8.
   2. `handoff_prototipo_spa/ARQUITECTURA.md` — estructura de archivos, router hash, patrón de componentes, roles, panel reset.
   3. `handoff_prototipo_spa/ESQUEMA_INDEXEDDB.md` — contrato de datos completo (stores, índices, seed, DAO).
   4. `handoff_prototipo_spa/MOTOR_COSTEO.md` — motor de precios/costeo client-side.

2. **Mirá las referencias visuales** en `handoff_prototipo_spa/referencia_diseno/` abriéndolas en el navegador. Son "Design Components" (`.dc.html`): **referencia visual, NO código a copiar.** Ignorá `support.js`, `image-slot.js` y los atributos `dc-*`. Tomá de ahí layout, tokens, copy y comportamiento. Las 6 `... (hi-fi).dc.html` son la referencia visual definitiva; `Fluvë Studio Frontend.dc.html` y `Fluvë Studio Backend.dc.html` dan la cobertura completa (móviles, estados, admin A1–A44).

3. **Creá el archivo de memoria `CLAUDE.md`** en la raíz del proyecto con el contenido de la sección B de este documento (adaptalo si hace falta). Es tu memoria persistente: las reglas del proyecto que debés respetar en cada sesión.

4. **Confirmame** en 5 puntos cómo vas a estructurar el proyecto (carpetas, router, capa de datos, sesión/roles, patrón de componentes) y esperá mi OK antes de codear.

Después construimos **por fases, parando en cada checkpoint** (sección C). No escribas todo de una.

---

## B · Contenido para `CLAUDE.md` (memoria del proyecto)

> Pedile a Claude Code que cree este archivo en la **raíz del proyecto**. Es lo que va a releer en cada sesión para no perder el rumbo.

```markdown
# CLAUDE.md — Fluvë Studio (prototipo SPA)

## Qué es
Prototipo funcional de un e-commerce de impresión personalizada (cliente + admin en una sola SPA).
Fase de prototipo para probar flujos y datos. NO es producción.

## Restricciones duras (NUNCA violar)
- HTML5 + CSS3 + JS vanilla ES6+. Sin frameworks, sin librerías JS externas, sin CDN de JS.
- Sin build tools, sin npm, sin bundler. El código corre tal cual en el navegador.
- Sin servidor propio (SPA client-side). Solo static server para servir módulos ES.
- IndexedDB = base de datos. localStorage solo para idioma y sesión.
- Routing por location.hash en un único index.html. Admin = rutas protegidas por rol.
- Módulos ES6 (import/export). Nada de globals salvo el montaje raíz.
- Única excepción de red: fuentes de Google Fonts por <link>.

## Fuente de verdad
- Spec completa: handoff_prototipo_spa/{README, ARQUITECTURA, ESQUEMA_INDEXEDDB, MOTOR_COSTEO}.md
- Referencia visual: handoff_prototipo_spa/referencia_diseno/*.dc.html (NO copiar código; ignorar support.js, image-slot.js, atributos dc-*).
- Ante conflicto: hi-fi manda para lo visual; lo-fi manda para cobertura de casos.

## Estructura de archivos (ver ARQUITECTURA.md §1)
styles/ (tokens, base, components, client, admin) · app/ (main, router, i18n, session, shell, util/) ·
data/ (db, dao, seed, pricing) · components/ · views/ (client/, admin/) · assets/

## Design tokens (README §5) — NO inventar colores fuera de la paleta
Fondo --ink #080B14 · superficies --ink2/3/4 · acento --accent #2C5CFF / --accent2 #4D7BFF ·
CMYK --cyan #2BD9E4 / --magenta #FF3D8B / --yellow #FFC93D · --green #3FCB7E ·
texto --txt #EDF1FB / --mut #8A93AD · bordes --line / --line2.
Tipos: Space Grotesk (display/UI), Inter (cuerpo), Space Mono (labels/datos).
Logo = sello CMYK (3 círculos con mix-blend-mode:screen), en CSS/SVG, nunca imagen.

## Datos (ESQUEMA_INDEXEDDB.md)
Base fluve_studio v1. Stores: products, variants, techniques, designs, artists, users, carts,
orders, payments, suppliers, purchases, inventory, quotes, promos, royalties, tickets, favorites,
activity, settings. Seed poblado en primer arranque. Panel reset/seed en Admin → Config general.

## Motor de costeo (MOTOR_COSTEO.md) — módulo puro data/pricing.js (sin IndexedDB adentro)
PVP = costoReal / (1 - margenEfectivo) * (1+IVA), redondeado a ,90.
Costo base = promedio ponderado de lotes (purchases). Costo impresión por técnica (área/fijo/pantallas/puntadas).
Personalizador: tramos por qty + recargos (lado both +$4; técnica surchargePerUnit).
Regalías: tier base 10% / pro 20% sobre el total de línea.

## Convenciones que aplican a TODAS las vistas
Cliente F1–F8: gating+retorno, toasts, estados de vista (loading/vacío/error), validación en vivo,
i18n ES/EN, carrito/sesión persistentes, búsqueda con debounce, a11y+responsive.
Admin G1–G8: exportar, buscar/filtrar/paginar, acciones en lote, estados de vista, nav desde dashboard,
confirmaciones en acciones sensibles, notificaciones, audit log (store activity).

## Reglas de código
- async/await para todo IndexedDB (los DAO devuelven Promesas).
- Ninguna vista en blanco: siempre loading/vacío/sin-resultados/error.
- Todo texto por t() (i18n). Nada hardcodeado.
- Acciones sensibles del admin → logActivity() (store activity).
- Pedidos guardan snapshot de precio/config al comprar (no cambian si cambia el catálogo).
- Prohibido scrollIntoView (usar window.scrollTo(0,0)). No innerHTML con datos sin escapar.
- Targets ≥44px, :focus-visible con --accent, contraste AA.

## Roles
guest < customer < staff < admin. Router redirige a #/auth?return=… si falta rol.
Panel de config permite "iniciar sesión como" usuario semilla para probar gating.

## Flujo de trabajo con Claude Code
- Construir por fases (ver PROMPT_CLAUDE_CODE.md sección C). Parar en cada checkpoint para revisión.
- No escribir todo el sistema de una. Preguntar antes de asumir.
- Cablear el panel reset/seed temprano (fase 2) para iterar rápido.
```

---

## C · Plan de construcción por fases (checkpoints)

Claude Code debe **parar al final de cada fase** para que revises antes de seguir.

### Fase 0 — Lectura y setup de memoria
- Lee los 4 docs + mira las referencias visuales.
- Crea `CLAUDE.md` (sección B).
- Devuelve el resumen de 5 puntos y espera OK. **[checkpoint]**

### Fase 1 — Base y shell
- `index.html` raíz (solo shell + `<script type="module">`).
- `styles/tokens.css` (todos los tokens) + `base.css` (reset, tipografía, `@keyframes`).
- `app/router.js` (router hash con params + querystring + gating por rol).
- `app/shell.js` (header cliente + rail admin + footer, decide layout por ruta).
- Primitivos: `logo` (CMYK), `button`, `card`, `chip`, `input`, `toast`, `viewState`.
- **Verificación:** navegar entre 2–3 rutas dummy, ver el shell y un toast. **[checkpoint]**

### Fase 2 — Capa de datos + reset/seed
- `data/db.js` (apertura/upgrade con TODOS los stores del ESQUEMA).
- `data/seed.js` (dataset semilla del ESQUEMA §4 + `reseed`/`wipe`/`exportJSON`/`importJSON`).
- `data/dao.js` (DAO genérico + helpers `getBySlug`, `byUser`, etc.).
- Vista `views/admin/config.js` con el **panel de reset/seed** funcionando.
- **Verificación:** cargar seed, ver conteos por store, exportar/importar JSON, resetear. **[checkpoint]**

### Fase 3 — Motor de costeo
- `data/pricing.js` (módulo puro, todos los exports de MOTOR_COSTEO §8).
- Un par de casos de prueba manuales (PVP de remera/hoodie, promedio ponderado, tramos, regalía).
- **Verificación:** los números coinciden con los ejemplos del hi-fi/backend. **[checkpoint]**

### Fase 4 — Cliente (en orden de flujo)
Home → Galería → Ficha → **Personalizador** (el más complejo) → Carrito → Checkout → Confirmación/Tracking → Mi cuenta → Auth → Error.
- Cada pantalla respeta F1–F8. Parar tras Home y tras el Personalizador como mínimo. **[checkpoints]**

### Fase 5 — Admin (por grupos del rail)
Dashboard → Pedidos (lista/detalle) → Productos/Precios → Compras/Lotes → Inventario → Artistas/Regalías → resto.
- Cada pantalla respeta G1–G8 y escribe en `activity`. Parar tras cada grupo. **[checkpoints]**

### Fase 6 — Pulido
- i18n ES/EN completo, estados de vista faltantes, a11y, responsive, simulaciones (pago, tracking timer opcional).
- **Verificación:** recorrer un flujo completo cliente (comprar) y uno admin (procesar el pedido hasta entregado). **[checkpoint final]**

---

## Notas de uso con Claude Code
- Pedile que **actualice `CLAUDE.md`** si acuerdan un cambio de convención — así la memoria queda al día.
- Si una sesión se corta, la próxima arranca releyendo `CLAUDE.md` + el estado del código; no hace falta re-explicar todo.
- El **Personalizador** y el **motor de costeo** son lo más delicado: abordarlos temprano y con casos de prueba.
- Podés arrastrar imágenes reales a los slots de las referencias hi-fi para ver cómo lucen antes de codear.
