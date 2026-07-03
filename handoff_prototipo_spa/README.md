# Handoff · Fluvë Studio — Prototipo SPA (vanilla + IndexedDB)

> **Este paquete es distinto al handoff de producción.** Acá el objetivo NO es el stack final (Next.js/React). El objetivo es un **prototipo funcional para probar**: navegación, vistas, capa de datos, diseños y flujos completos, corriendo enteramente en el navegador, sin servidor. Una vez validado el prototipo, se migra a la arquitectura de producción.

---

## 1 · Qué vamos a construir

Una **aplicación de página única (SPA)** que implementa **todo Fluvë Studio** — tienda del cliente **y** panel de administración/operaciones — en una sola app, con estos límites técnicos duros:

- **HTML5 + CSS3 + JavaScript vanilla (ES6+).** Sin frameworks (nada de React, Vue, Svelte, Angular, jQuery).
- **Sin build tools.** Sin webpack, Vite, Rollup, Parcel, Babel ni npm. El código se ejecuta tal cual lo escribimos.
- **Sin servidor.** Se abre `index.html` en el navegador (o vía un static server trivial tipo `python -m http.server` solo para permitir módulos ES). No hay backend, ni API, ni rutas de servidor.
- **Persistencia con IndexedDB.** IndexedDB es la "base de datos" real de la app: productos, pedidos, usuarios, carrito, proveedores, lotes, inventario, tickets, etc. `localStorage` solo para preferencias volátiles (idioma, sesión actual, último tramo visto).
- **Routing interno por hash.** Toda la navegación se resuelve con un router de `location.hash` dentro de un único HTML raíz. Sin recargas, sin rutas de servidor. No se separa frontend de backend: es **una sola SPA** donde el área admin es un conjunto de rutas protegidas por rol.
- **Módulos ES6.** El código se organiza en varios archivos `.js`/`.css` cargados con `<script type="module">` e `import`/`export` nativos (ver `ARQUITECTURA.md`). Ordenado, pero sin bundler.

Todos los mockups y diseños de este paquete deben leerse pensando en esa traducción directa: **componentes de UI simples en HTML/CSS/JS puro, sin dependencias externas, listos para conectarse a la capa de datos local en IndexedDB.**

---

## 2 · Documentos de este paquete (leer en este orden)

1. **`README.md`** (este archivo) — visión, alcance, tokens, mapa de pantallas, convenciones.
2. **`ARQUITECTURA.md`** — estructura de archivos, router hash, patrón de componentes vanilla, gating por rol, panel de reset/seed.
3. **`ESQUEMA_INDEXEDDB.md`** — todos los object stores, índices, datos semilla y la API de acceso a datos (DAO). **Es el contrato de datos completo.**
4. **`MOTOR_COSTEO.md`** — el motor de precios y costeo corriendo client-side (fórmulas exactas, tramos, promedio ponderado, costo por técnica, regalías).
5. **`PROMPT_AGENTE.md`** — prompt de arranque listo para pegar a un dev o agente de código.
6. **`referencia_diseno/`** — los prototipos HTML de diseño (hi-fi + lo-fi). **Referencia visual, no código a copiar.** Abrilos en el navegador para ver la apariencia y el comportamiento buscados.

---

## 3 · Referencias de diseño (carpeta `referencia_diseno/`)

Son "Design Components" (`.dc.html`): HTML con estilos inline. **No copies `support.js`, `image-slot.js` ni los atributos `dc-*`** — son andamiaje del entorno de prototipado. Tomá de ellos el **layout, los tokens visuales, el copy y el comportamiento**.

**Alta fidelidad (referencia visual definitiva del cliente):**
- `Fluvë Studio - Home (hi-fi).dc.html`
- `Fluvë Studio - Personalizador (hi-fi).dc.html` ★ (pantalla estrella, interactiva)
- `Fluvë Studio - Galería + Ficha (hi-fi).dc.html`
- `Fluvë Studio - Checkout + Tracking (hi-fi).dc.html`
- `Fluvë Studio - Mi Cuenta (hi-fi).dc.html` (interactiva)
- `Fluvë Studio - Auth + Error (hi-fi).dc.html` (interactiva)

**Baja fidelidad (cobertura completa de estructura y flujo):**
- `Fluvë Studio Frontend.dc.html` — wireframe del frontend completo (incluye móviles + estados).
- `Fluvë Studio Backend.dc.html` — panel de admin/operaciones completo (todas las pantallas A1–A44, convenciones G1–G8, motor de precios/regalías).

> Donde hi-fi y lo-fi difieran: manda el **hi-fi para lo visual** y el **lo-fi para la cobertura de casos**. El backend/admin solo existe en lo-fi: aplicarle el sistema visual hi-fi al construirlo.

---

## 4 · El negocio en una línea

Fluvë Studio es una plataforma e-commerce de **impresión personalizada** bajo **modelo de intermediación**: el cliente personaliza y paga de forma 100% autónoma; la orden se transfiere a imprentas aliadas (outsourcing de producción); Fluvë centraliza control de calidad, acabados y packaging de marca; entrega en 24–48h vía logística local express. El **motor de costeo** (margen global → precio, costo por promedio ponderado de lotes, costo por técnica, regalías de artista) es el corazón del negocio y debe correr client-side en el prototipo (`MOTOR_COSTEO.md`).

---

## 5 · Design tokens (definitivos — mapear a CSS custom properties)

Definirlos una sola vez como variables CSS en `:root` (ver `ARQUITECTURA.md` → `styles/tokens.css`). **No inventar colores fuera de esta paleta.**

### Colores
| Token CSS | Hex | Uso |
|---|---|---|
| `--ink` | `#080B14` | Fondo base |
| `--ink2` | `#0E1322` | Superficie / cards |
| `--ink3` | `#151C2E` | Superficie elevada / inputs |
| `--ink4` | `#1B2338` | Superficie más clara / gradientes |
| `--accent` | `#2C5CFF` | Azul MultiPrint — CTAs, foco, selección |
| `--accent2` | `#4D7BFF` | Azul claro — links, acentos de texto |
| `--cyan` | `#2BD9E4` | CMYK cian — acento imprenta, badges |
| `--magenta` | `#FF3D8B` | CMYK magenta — acento |
| `--yellow` | `#FFC93D` | CMYK amarillo — estrellas/rating, acento |
| `--green` | `#3FCB7E` | Éxito, estado "entregado" |
| `--line` | `rgba(255,255,255,.09)` | Bordes sutiles / grid |
| `--line2` | `rgba(255,255,255,.15)` | Bordes normales |
| `--txt` | `#EDF1FB` | Texto principal |
| `--mut` | `#8A93AD` | Texto secundario / muted |

El **logo/marca** es el sello CMYK: tres círculos cian/magenta/amarillo con `mix-blend-mode:screen`. Recrearlo con CSS o un SVG inline, **nunca como imagen**. Se repite en nav, footer y auth.

### Tipografía (Google Fonts)
- **Display / UI:** `Space Grotesk` (400/500/600/700). Titulares con `letter-spacing:-1px a -3px`.
- **Cuerpo:** `Inter` (400/500/600).
- **Mono / etiquetas / datos:** `Space Mono` (400/700). Labels en `text-transform:uppercase; letter-spacing:1px`, precios técnicos, badges.

Escala aprox.: hero 62px · h1 pantalla 28–38px · h2 sección 26–40px · card title 14–18px · body 13–16px · label mono 10.5px.

> El prototipo puede cargar las fuentes desde Google Fonts por `<link>`. Si se requiere offline total, descargar los `.woff2` a `assets/fonts/` y declararlas con `@font-face`.

### Radios, sombras, espaciado
- Radios: inputs/cards chicas `10–16px`, cards grandes `16–22px`, botones/pills `20–30px`, swatches `50%`.
- Sombra CTA: `0 12px 30px -8px var(--accent)`.
- Grid decorativo: `linear-gradient(var(--line) 1px, transparent 1px)` en ambos ejes, `background-size:34–56px`, a menudo con `mask-image:radial-gradient(...)`.
- Página: max-width `1180–1300px`, padding lateral `32px`.
- Nav/badges glass: `backdrop-filter: blur(18px)` sobre `rgba(8,11,20,.82)`.

### Animaciones (CSS puro con `@keyframes`)
`floaty`/`floaty2` (chips ±10–14px), `orb` (glows radiales), `marq` (marquee de técnicas), `spin` (marca de registro), `fadeUp`/`fu` (entrada de paneles). 14–26s ambiente; 0.3–0.4s transiciones de UI.

---

## 6 · Mapa de pantallas → rutas hash

Toda la app vive bajo `#/`. El área admin exige rol `staff`/`admin` (ver gating en `ARQUITECTURA.md`).

### Cliente (tienda)
| Ruta hash | Pantalla | Referencia |
|---|---|---|
| `#/` | Home / Portada | Home (hi-fi) |
| `#/galeria` | Galería (grid + facetas) | Galería + Ficha (hi-fi) A |
| `#/producto/:slug` | Ficha de producto | Galería + Ficha (hi-fi) B |
| `#/personalizar/:slug?` | **Personalizador** ★ | Personalizador (hi-fi) |
| `#/carrito` | Carrito | Checkout + Tracking (hi-fi) A |
| `#/checkout` | Checkout (stepper Datos→Envío→Pago) | Checkout + Tracking (hi-fi) B |
| `#/pedido/:id` | Confirmación + tracking | Checkout + Tracking (hi-fi) C |
| `#/cuenta/:seccion?` | Mi cuenta (7 secciones) | Mi Cuenta (hi-fi) |
| `#/auth?mode=login\|reg\|rec&return=…` | Auth (3 modos) | Auth + Error (hi-fi) A |
| `#/404` `#/500` `#/offline` | Estados de error | Auth + Error (hi-fi) B |

### Admin / operaciones (rutas `#/admin/...`, protegidas por rol)
Cobertura completa en `Fluvë Studio Backend.dc.html` (IDs A1–A44). Grupos del rail:
- **Operación:** dashboard, pedidos (lista/detalle/imprimir/nuevo), producción, proveedores (lista/detalle/alta), calidad (cola/detalle), packaging, envíos, P&L, rentabilidad.
- **Catálogo:** productos (lista/detalle), motor de precios, técnicas + costo, diseños (moderación), artistas + detalle (regalías), compras/lotes, registrar compra, inventario por área.
- **Comercial:** clientes + ficha, cotizaciones B2B + rentabilidad, pagos (con reembolso), promos.
- **Sistema:** soporte + detalle ticket, reportes, punto de equilibrio, CMS, **Configuración (incluye el panel de reset/seed — ver §8)**, precios globales, regalías, costeo avanzado, roles, registro de actividad (audit log).

---

## 7 · Convenciones globales (aplican a TODAS las vistas)

### Frontend cliente (F1–F8)
- **F1 · Auth & gating:** acciones con sesión (favoritos, cuenta, publicar arte) abren Auth con retorno (`?return=`); checkout permite invitado.
- **F2 · Feedback (toasts):** añadir/guardar/cupón/enviar → toast éxito/error + actualización visible (contador carrito, corazón).
- **F3 · Estados de vista:** cargando (skeleton), vacío, sin resultados, error/404. Nunca callejón sin salida.
- **F4 · Validación:** en vivo, mensajes por campo, bloqueo de submit, foco al primer error.
- **F5 · Idioma ES/EN + moneda:** toggle persiste (localStorage/perfil), traduce toda la UI, formatea moneda/fecha. Textos desde diccionario i18n.
- **F6 · Carrito/sesión persistentes:** carrito en IndexedDB (invitado) que se fusiona con el del usuario al iniciar sesión; favoritos sincronizan.
- **F7 · Búsqueda:** debounce + autocompletado, recientes, salida siempre útil.
- **F8 · A11y + responsive:** targets ≥44px, foco visible, contraste AA, breakpoints coherentes con las versiones móviles; consentimiento de cookies + legales en footer.

### Backend admin (G1–G8)
G1 Exportar · G2 Buscar/filtrar/ordenar/paginar · G3 Acciones en lote · G4 Estados de vista · G5 Navegación desde dashboard · G6 Confirmaciones + acciones sensibles · G7 Notificaciones · G8 Trazabilidad (audit log en el store `activity`).

> Implementar estas convenciones como **utilidades/componentes compartidos vanilla** (ver `ARQUITECTURA.md`): `toast()`, `viewState()`, `formField()`, `authGate()`, `i18n`, `useCart`, `searchBox()`, `dataTable()`, `confirmDialog()`, `exportCsv()`, `logActivity()`.

---

## 8 · Panel de reset / seed (requisito)

En **Admin → Sistema → Configuración general** debe existir una sección de herramientas de datos para probar:
- **Recargar datos semilla:** borra la base y la repuebla con el dataset semilla definido en `ESQUEMA_INDEXEDDB.md`.
- **Vaciar base (wipe):** borra todos los object stores sin repoblar.
- **Exportar/Importar JSON:** volcar toda la base a un `.json` descargable y volver a cargarla (útil para compartir estados de prueba).
- Confirmación destructiva (conv. G6) antes de borrar. Detalle de implementación en `ARQUITECTURA.md` §7.

---

## 9 · Qué se simula (sin backend real)

- **Pago/checkout:** simulado. El "pago" siempre aprueba (o falla si se fuerza), crea el pedido en IndexedDB y dispara el avance de estados.
- **Auth/sesión:** usuarios fake en el store `users`; la sesión es un id en localStorage. Login social = mock que crea/recupera un usuario.
- **Motor de precios/costeo:** corre client-side completo (`MOTOR_COSTEO.md`).
- **Estados de pedido/tracking:** avanzan por acción manual desde el admin (o por un timer opcional de demo) a través de los 5 pasos: Recibido → Producción → QC+Packaging → En camino → Entregado.
- **i18n ES/EN:** funcional, diccionario local, persiste preferencia.

---

## 10 · Orden sugerido de construcción

1. **Base:** `index.html` raíz + `tokens.css`/`base.css`, router hash, shell (header cliente + rail admin), primitivos (`button`, `card`, `chip`, `input`, `toast`, `viewState`, logo CMYK).
2. **Capa de datos:** módulo `db.js` (apertura/upgrade de IndexedDB con todos los stores), `seed.js`, y los DAO (`ESQUEMA_INDEXEDDB.md`). Cablear el panel de reset temprano para poder iterar.
3. **Motor de costeo** (`MOTOR_COSTEO.md`) como módulo puro `pricing.js` — testeable de forma aislada.
4. **Cliente en orden de flujo:** Home → Galería/Ficha → **Personalizador** (el más complejo; empezar temprano) → Carrito/Checkout/Tracking → Mi cuenta → Auth/Error.
5. **Admin:** dashboard + pedidos + productos/precios + compras/lotes + inventario + artistas/regalías + configuración (con reset), guiándose por el índice A1–A44 y G1–G8.

> Avanzar pantalla por pantalla y parar para revisar. No escribir todo el sistema de una.
