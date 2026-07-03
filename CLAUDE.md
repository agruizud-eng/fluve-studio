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
