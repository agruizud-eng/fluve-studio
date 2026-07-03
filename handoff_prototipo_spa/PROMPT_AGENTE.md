# Prompt de arranque — Prototipo SPA (vanilla + IndexedDB)

Copiá y pegá esto como primer mensaje al dev/agente de código, dentro de la carpeta del proyecto (con este handoff incluido en `handoff_prototipo_spa/`).

---

Estoy construyendo un **prototipo funcional** de **Fluvë Studio**, una plataforma e-commerce de impresión personalizada bajo modelo de intermediación. El objetivo de esta fase es **probar navegación, vistas, capa de datos, diseños y flujos completos** — no es el stack de producción. Una vez validado, migraremos a la arquitectura final.

**Restricciones técnicas duras (no negociables en esta fase):**
- **HTML5 + CSS3 + JavaScript vanilla (ES6+).** Sin frameworks (nada de React, Vue, Svelte, Angular, jQuery).
- **Sin build tools** (sin webpack, Vite, Rollup, Babel, npm). El código corre tal cual.
- **Sin servidor propio.** Es una SPA que corre 100% en el navegador. (Para permitir módulos ES se sirve la carpeta con un static server trivial tipo `python3 -m http.server` — eso no es una dependencia de la app.)
- **Persistencia con IndexedDB** como base de datos local embebida. `localStorage` solo para preferencias (idioma, sesión).
- **Routing interno por `location.hash`** dentro de un único `index.html`. **No** se separa frontend de backend: es una sola SPA donde el admin son rutas protegidas por rol.
- **Módulos ES6** (`<script type="module">`, `import`/`export`). Código ordenado en varios archivos, sin bundler.

**Documentación (leer en este orden, está en `handoff_prototipo_spa/`):**
1. `README.md` — visión, alcance, design tokens, mapa de pantallas→rutas, convenciones F1–F8 / G1–G8.
2. `ARQUITECTURA.md` — estructura de archivos, router hash, patrón de componentes vanilla, gating por rol, panel de reset/seed.
3. `ESQUEMA_INDEXEDDB.md` — **contrato de datos completo**: todos los object stores, índices, seed y la API DAO.
4. `MOTOR_COSTEO.md` — motor de precios/costeo client-side (fórmulas exactas, tramos, promedio ponderado, costo por técnica, regalías).
5. `referencia_diseno/` — prototipos HTML de diseño (hi-fi + lo-fi). **Referencia visual, NO código a copiar.** Abrilos en el navegador. Ignorá `support.js`, `image-slot.js` y atributos `dc-*`.

**Empecemos así:**
1. Confirmá que leíste los 4 documentos y resumime en 5 puntos cómo vas a estructurar el proyecto (carpetas, router, capa de datos, sesión/roles, patrón de componentes).
2. Armá la **base**: `index.html` raíz + `styles/tokens.css` (todos los tokens del README §5) + `styles/base.css` + el router hash (`app/router.js`) + el shell (header cliente / rail admin) + los primitivos (`button`, `card`, `chip`, `input`, `toast`, `viewState`, el logo CMYK).
3. Armá la **capa de datos**: `data/db.js` (apertura/upgrade con TODOS los stores del ESQUEMA), `data/seed.js` (dataset semilla del ESQUEMA §4) y `data/dao.js`. **Cableá temprano el panel de reset/seed** en Admin → Configuración general (ARQUITECTURA §7) para poder iterar rápido.
4. Implementá `data/pricing.js` (MOTOR_COSTEO) como módulo puro y verificalo con un par de casos.
5. Después, pantalla por pantalla en orden de flujo: **Home → Galería/Ficha → Personalizador → Carrito/Checkout/Tracking → Mi cuenta → Auth/Error**, y luego el admin.

Avanzá por fases y **pará para que revise** al terminar cada una. Preguntame lo que necesites antes de asumir. No escribas todo el sistema de una.

---

## Recordatorios de calidad
- **Estados de vista siempre (F3/G4):** ninguna vista en blanco — loading (skeleton), vacío, sin resultados, error/404.
- **A11y (F8):** targets ≥44px, `:focus-visible` con `--accent`, contraste AA, ARIA en modales/toasts.
- **i18n (F5):** todo texto por `t()`; ES/EN; persiste en localStorage.
- **Auditoría (G8):** toda acción sensible del admin escribe en el store `activity`.
- **Snapshots:** los pedidos guardan precio/config al comprar; cambiar el catálogo no altera pedidos pasados.
- **Nada de `scrollIntoView`**; usar `window.scrollTo(0,0)`.
- **El Personalizador y el motor de costeo son lo más complejo** — abordarlos con cuidado y temprano.
