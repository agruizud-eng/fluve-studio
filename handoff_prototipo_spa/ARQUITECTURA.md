# Arquitectura del prototipo · Fluvë Studio SPA (vanilla + IndexedDB)

Este documento define **cómo se organiza y ejecuta** el prototipo. Reglas duras: sin frameworks, sin build, sin servidor, módulos ES6 nativos, IndexedDB como base, routing por hash.

---

## 1 · Estructura de archivos

```
/  (raíz del prototipo — se abre index.html)
├── index.html                 ← único HTML raíz. Solo el shell + <script type="module" src="app/main.js">
├── styles/
│   ├── tokens.css             ← :root { --ink … } todos los design tokens del README §5
│   ├── base.css               ← reset, tipografía, animaciones @keyframes, utilidades
│   ├── components.css         ← estilos de los primitivos (button, card, chip, input, toast…)
│   ├── client.css             ← estilos específicos de la tienda (nav, hero, grids…)
│   └── admin.css              ← estilos del panel admin (rail, tablas, cards de ops)
├── assets/
│   ├── fonts/                 ← (opcional) woff2 si se quiere offline total
│   └── img/                   ← imágenes semilla (mockups de producto, avatares)
├── app/
│   ├── main.js                ← bootstrap: abre DB, corre seed si vacía, monta router, pinta shell
│   ├── router.js              ← router por location.hash (§3)
│   ├── i18n.js                ← diccionario ES/EN + t() + formato moneda/fecha (F5)
│   ├── session.js            ← usuario actual, login/logout, gating por rol (§5)
│   ├── shell.js               ← header cliente + rail admin + footer; decide layout por ruta
│   └── util/
│       ├── dom.js             ← helpers: el(), html templating, on(), mount()
│       ├── toast.js           ← toast() (F2/G7)
│       ├── viewState.js       ← loading/empty/error (F3/G4)
│       ├── confirm.js         ← confirmDialog() (G6)
│       ├── format.js          ← money(), date(), number()
│       └── csv.js             ← exportCsv() (G1)
├── data/
│   ├── db.js                  ← apertura/upgrade de IndexedDB, todos los object stores (ver ESQUEMA)
│   ├── dao.js                 ← API de acceso por store (get/getAll/put/delete/query) (ver ESQUEMA)
│   ├── seed.js                ← dataset semilla + reseed()/wipe()/exportJSON()/importJSON()
│   └── pricing.js             ← MOTOR DE COSTEO client-side (ver MOTOR_COSTEO.md) — módulo puro
├── components/                ← componentes de UI reutilizables (funciones que devuelven DOM)
│   ├── logo.js                ← sello CMYK (CSS/SVG)
│   ├── button.js  card.js  chip.js  input.js  swatch.js
│   ├── productCard.js  facetSidebar.js  cartLine.js  stepper.js
│   ├── dataTable.js           ← tabla admin con sort/filtro/paginación/bulk (G2/G3)
│   └── searchBox.js           ← búsqueda con debounce + autocomplete (F7)
└── views/                     ← una función-vista por ruta; recibe params, devuelve DOM y se monta
    ├── client/
    │   ├── home.js  galeria.js  producto.js  personalizador.js
    │   ├── carrito.js  checkout.js  pedido.js  cuenta.js  auth.js  error.js
    └── admin/
        ├── dashboard.js  pedidos.js  pedidoDetalle.js  produccion.js
        ├── proveedores.js  calidad.js  packaging.js  envios.js
        ├── productos.js  precios.js  tecnicas.js  disenos.js  artistas.js
        ├── compras.js  inventario.js  clientes.js  cotizaciones.js
        ├── pagos.js  promos.js  soporte.js  reportes.js  cms.js
        ├── config.js              ← incluye panel de reset/seed (§7)
        ├── preciosGlobales.js  regalias.js  costeo.js  roles.js  actividad.js
```

> No es obligatorio crear los ~50 archivos de golpe. Es el objetivo. Construir por fases (README §10). Lo que **sí** es fijo: la separación `styles / app / data / components / views` y que **todo** se cargue como módulos ES6.

---

## 2 · index.html (esqueleto)

Un único HTML. No mete lógica; solo el punto de montaje y la carga del módulo raíz.

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fluvë Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles/tokens.css">
  <link rel="stylesheet" href="styles/base.css">
  <link rel="stylesheet" href="styles/components.css">
  <link rel="stylesheet" href="styles/client.css">
  <link rel="stylesheet" href="styles/admin.css">
</head>
<body>
  <div id="app"><!-- shell + vista activa se montan acá --></div>
  <div id="toast-root"></div>
  <div id="modal-root"></div>
  <script type="module" src="app/main.js"></script>
</body>
</html>
```

> **Módulos ES6 y `file://`:** los navegadores bloquean `import` bajo `file://` (CORS). Para probar hay que servir la carpeta con un static server trivial: `python3 -m http.server 8080` o `npx serve` (no es un build ni una dependencia de la app — es solo servir archivos). Documentarlo en el README del repo del prototipo.

---

## 3 · Router por hash (`app/router.js`)

Un router mínimo, sin dependencias. Mapea patrones de `location.hash` a funciones-vista. Soporta params (`:id`) y querystring.

```js
// router.js — API objetivo
const routes = [];
export function route(pattern, handler, opts = {}) { routes.push({ pattern, handler, opts }); }

export function navigate(hash) { location.hash = hash; }        // dispara hashchange

export function startRouter() {
  window.addEventListener('hashchange', render);
  render();
}

function render() {
  const { path, query } = parseHash(location.hash);   // "#/producto/remera?x=1" → {path, query}
  for (const r of routes) {
    const params = match(r.pattern, path);            // "#/producto/:slug" → {slug:'remera'}
    if (params) {
      if (r.opts.role && !hasRole(r.opts.role)) return navigate(`#/auth?return=${encodeURIComponent(location.hash)}`);
      mountView(r.handler, { params, query });
      return;
    }
  }
  mountView(view404, {});                              // fallback F3/G4
}
```

Registro de rutas (en `main.js`), incluyendo el gating por rol del admin:

```js
route('#/',                       home);
route('#/galeria',                galeria);
route('#/producto/:slug',         producto);
route('#/personalizar/:slug?',    personalizador);
route('#/carrito',                carrito);
route('#/checkout',               checkout);
route('#/pedido/:id',             pedido);
route('#/cuenta/:seccion?',       cuenta,  { role: 'customer' }); // exige sesión (F1)
route('#/auth',                   auth);
// admin — todas exigen rol staff/admin (§5)
route('#/admin',                  adminDashboard, { role: 'staff' });
route('#/admin/pedidos',          adminPedidos,   { role: 'staff' });
// … resto de rutas admin con { role: 'staff' } o { role: 'admin' } según sensibilidad
```

**Patrón de vista.** Cada vista es una función que recibe `{params, query}` y devuelve un nodo DOM (o async que resuelve a uno). El router limpia `#app`, monta el shell adecuado (cliente vs admin) y coloca la vista dentro.

```js
export async function personalizador({ params }) {
  const producto = await dao.products.getBySlug(params.slug ?? 'remera');
  const el = renderPersonalizador(producto);   // DOM puro, listeners con addEventListener
  return el;
}
```

> **Sin `scrollIntoView`.** Para llevar el scroll al tope tras navegar usar `window.scrollTo(0,0)` o `container.scrollTop = 0`.

---

## 4 · Patrón de componentes vanilla

Sin JSX ni framework. Un componente es **una función que devuelve un nodo DOM** y adjunta sus listeners. Estado local con cierres; estado global en IndexedDB + un `store` observable simple para lo reactivo (carrito, sesión, idioma).

```js
// util/dom.js
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) node.append(c?.nodeType ? c : document.createTextNode(c ?? ''));
  return node;
}
```

**Store observable mínimo** para lo reactivo transversal (contador de carrito, sesión, idioma):

```js
// util/store.js
export function createStore(initial) {
  let state = initial; const subs = new Set();
  return {
    get: () => state,
    set: (patch) => { state = { ...state, ...patch }; subs.forEach(f => f(state)); },
    subscribe: (f) => { subs.add(f); return () => subs.delete(f); }
  };
}
```

Los primitivos (`button`, `card`, `chip`, `input`, `swatch`) y los compuestos (`productCard`, `dataTable`, `stepper`, `cartLine`) viven en `components/` y se estilan con las clases de `styles/components.css`. Toda la apariencia sale de los tokens del README §5 — nada de colores hardcodeados fuera de la paleta.

---

## 5 · Sesión y gating por rol (`app/session.js`)

Una sola SPA para cliente y admin; el admin es un conjunto de rutas protegidas.

- **Roles:** `guest` (sin sesión) · `customer` · `staff` (operaciones) · `admin` (config sensible: precios globales, roles, costeo, reset de datos).
- **Sesión actual:** `localStorage.fluve_session = <userId>`; el usuario se lee del store `users` en IndexedDB. `session.current()` devuelve el usuario o `null`.
- **`hasRole(min)`** con jerarquía `guest < customer < staff < admin`. El router redirige a `#/auth?return=…` si falta rol (F1).
- **Cambio de usuario para probar:** el panel de config (§7) permite "iniciar sesión como" cualquier usuario semilla (customer / staff / admin) sin contraseña, para testear el gating rápido.

```js
export function hasRole(min) {
  const order = { guest:0, customer:1, staff:2, admin:3 };
  const u = current();
  return order[u?.role ?? 'guest'] >= order[min];
}
```

---

## 6 · i18n (`app/i18n.js`) — F5

- Diccionario `{ es: {...}, en: {...} }` con claves por texto. `t('home.hero.title')`.
- Idioma actual en `localStorage.fluve_lang` (default `es`); toggle en el header re-renderiza la vista activa.
- `money(n)` y `date(d)` formatean según idioma/moneda (prototipo: USD con coma decimal estilo UY, configurable).
- Todo texto visible pasa por `t()`; nada de strings sueltos en las vistas.

---

## 7 · Panel de reset / seed (Admin → Configuración general) — requisito

En `views/admin/config.js`, sección **"Herramientas de datos (entorno de prueba)"**, solo visible para rol `admin`:

- **Recargar datos semilla** → `confirmDialog()` (G6) → `await seed.reseed()` (wipe + repueblan todos los stores desde `data/seed.js`) → toast (G7) → recarga la vista.
- **Vaciar base (wipe)** → confirm destructivo → `await seed.wipe()`.
- **Exportar base a JSON** → `seed.exportJSON()` genera y descarga `fluve-db-<fecha>.json` (todos los stores).
- **Importar base desde JSON** → file input → `seed.importJSON(file)` reemplaza la base.
- Mostrar métricas rápidas: nº de registros por store, versión del esquema, fecha del último seed.

```js
// data/seed.js — API objetivo
export async function reseed()            // wipe() + poblar todos los stores con SEED
export async function wipe()              // clear() de cada object store
export async function exportJSON()        // → Blob con { version, stores:{...} }, dispara descarga
export async function importJSON(file)    // parsea y repuebla
export const SEED = { products:[...], users:[...], suppliers:[...], purchases:[...], /* … ver ESQUEMA */ }
```

> Cablear esto **temprano** (fase 2) — hace la iteración del resto mucho más rápida.

---

## 8 · Reglas de estilo de código

- **Módulos ES6** con `import`/`export` nombrados. Nada de globals salvo el montaje raíz.
- **Sin dependencias externas** (ni CDN de librerías JS). Fuentes por `<link>` es la única excepción de red.
- **Async/await** para todo lo de IndexedDB (los DAO devuelven Promesas — ver ESQUEMA).
- **Accesibilidad (F8):** targets ≥44px, `:focus-visible` con el `--accent`, roles ARIA en modales/toasts, contraste AA.
- **Estados de vista siempre (F3/G4):** ninguna vista queda en blanco — loading (skeleton), vacío, sin resultados, error.
- **Sin `scrollIntoView`**, sin `innerHTML` con datos del usuario sin escapar (usar `textContent`/nodos).
