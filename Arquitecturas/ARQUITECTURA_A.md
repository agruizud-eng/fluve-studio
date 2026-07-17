# Arquitectura A — Fluvë Studio SPA (Prototipo / Desarrollo)
### versión 3 · modelo de datos completo · dominio con fórmulas reales

> **Propósito:** prototipo de desarrollo que corre en `file://` sin servidor.
> Valida todos los flujos antes de migrar a producción.
> El módulo `domain/` contiene la lógica de negocio real de Fluvë Studio
> y migra sin cambios a Arquitectura B.
>
> Documento complementario: **ARQUITECTURA_B.md** (producción SaaS).

---

## 1 · Restricciones duras

- **Sin servidor.** `index.html` se abre con doble clic desde `file://`.
- **Sin frameworks JS.** Sin React, Vue, Angular ni similares.
- **Sin build tools.** Sin Webpack, Vite, Babel ni transpilación.
- **Sin módulos ES6 (`import`/`export`).** No funcionan bajo `file://` por CORS.
  Patrón obligatorio: IIFE + namespace `window.Fluve.*`.
- **Sin dependencias externas JS.** Sin CDN de librerías.
- **Navegador de referencia: Chrome o Edge.**

---

## 2 · Los cinco módulos del sistema

| Módulo | Directorio | Responsabilidad |
|---|---|---|
| **Core** | `app/` | Routing, sesión, shell, i18n, bus de eventos, configuración |
| **Domain** | `domain/` | **Lógica de negocio única de Fluvë** — pura, sin DOM ni BD |
| **Data** | `data/` | Acceso a IndexedDB exclusivamente (db, dao, seed) |
| **Components** | `components/` | Primitivos de UI (funciones que devuelven nodos DOM) |
| **Views** | `views/` | Vistas por ruta — rendering y listeners únicamente |

**Regla de dependencia:**
```
Views / Components  →  usan  →  Domain  ←  recibe datos de  ←  Data
```
Domain no conoce ni el DOM ni IndexedDB. Recibe datos como parámetros y devuelve resultados.
**Al migrar a Arquitectura B, `domain/` se copia sin modificar una sola línea.**

---

## 3 · Estructura de archivos

```
/  (raíz)
│
├── index.html
│
├── styles/
│   ├── tokens.css           ← design tokens
│   ├── base.css             ← reset, tipografía, animaciones
│   ├── components.css       ← primitivos
│   ├── client.css           ← tienda pública
│   └── admin.css            ← panel admin
│
├── assets/
│   ├── fonts/
│   └── img/
│
├── app/                     ← MÓDULO CORE
│   ├── main.js              ← bootstrap
│   ├── router.js            ← hash routing
│   ├── session.js           ← auth + roles
│   ├── shell.js             ← header + rail + footer
│   ├── i18n.js              ← ES/EN + t() + money() + date()
│   ├── hooks.js             ← bus de eventos interno
│   ├── config.js            ← feature flags + configuración
│   └── util/
│       ├── dom.js · toast.js · viewState.js
│       ├── confirm.js · format.js · csv.js
│
├── domain/                  ← MÓDULO DOMAIN (9 módulos)
│   ├── pricing.js           ← motor de precios: CostoReal → PVP con IVA 22%
│   ├── production.js        ← máquina de estados del ciclo de producción
│   ├── customizer.js        ← validaciones por técnica y zona
│   ├── royalties.js         ← regalías sobre MargenBruto · Tier Base / Pro
│   ├── supplier.js          ← algoritmo de asignación de proveedores
│   ├── shipping.js          ← cálculo de costo de envío por zona
│   ├── quotation.js         ← generador de cotizaciones B2B
│   ├── quality.js           ← checkpoints de calidad por técnica
│   └── inventory.js         ← alertas de stock mínimo
│
├── data/                    ← MÓDULO DATA (21 object stores)
│   ├── db.js                ← IndexedDB: define los 21 stores
│   ├── dao.js               ← API de acceso por store
│   └── seed.js              ← dataset semilla + reseed/wipe/export/import
│
├── components/              ← MÓDULO COMPONENTS
│   ├── logo.js
│   ├── button.js · card.js · chip.js · input.js · swatch.js
│   ├── productCard.js · designCard.js · artistCard.js
│   ├── facetSidebar.js · cartLine.js · stepper.js
│   ├── dataTable.js · searchBox.js · kanbanBoard.js
│
└── views/                   ← MÓDULO VIEWS
    ├── client/
    │   ├── home.js          galeria.js       producto.js
    │   ├── personalizador.js carrito.js      checkout.js
    │   ├── pedido.js        cuenta.js        auth.js
    │   ├── artistas.js      ← directorio público de artistas
    │   ├── artistaPortal.js ← /@handle/tienda (tienda pública del artista)
    │   ├── vendeTuArte.js   ← landing + solicitud para artistas
    │   └── error.js
    └── admin/
        ├── dashboard.js    pedidos.js      pedidoDetalle.js
        ├── produccion.js   proveedores.js  calidad.js
        ├── packaging.js    envios.js       productos.js
        ├── precios.js      tecnicas.js     disenos.js
        ├── artistas.js     compras.js      inventario.js
        ├── clientes.js     cotizaciones.js pagos.js
        ├── promos.js       soporte.js      reportes.js
        ├── cms.js          config.js       preciosGlobales.js
        ├── regalias.js     costeo.js       roles.js
        └── actividad.js
```

---

## 4 · index.html — orden de carga de scripts

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
  <div id="app"></div>
  <div id="toast-root"></div>
  <div id="modal-root"></div>

  <!-- ① CORE util -->
  <script src="app/util/dom.js"></script>
  <script src="app/util/format.js"></script>
  <script src="app/util/toast.js"></script>
  <script src="app/util/viewState.js"></script>
  <script src="app/util/confirm.js"></script>
  <script src="app/util/csv.js"></script>

  <!-- ② CORE base -->
  <script src="app/config.js"></script>
  <script src="app/hooks.js"></script>
  <script src="app/i18n.js"></script>

  <!-- ③ DOMAIN — lógica pura, cero dependencias externas -->
  <!-- pricing primero; quotation depende de pricing -->
  <script src="domain/pricing.js"></script>
  <script src="domain/production.js"></script>
  <script src="domain/customizer.js"></script>
  <script src="domain/royalties.js"></script>
  <script src="domain/supplier.js"></script>
  <script src="domain/shipping.js"></script>
  <script src="domain/quotation.js"></script>
  <script src="domain/quality.js"></script>
  <script src="domain/inventory.js"></script>

  <!-- ④ DATA — IndexedDB -->
  <script src="data/db.js"></script>
  <script src="data/dao.js"></script>
  <script src="data/seed.js"></script>

  <!-- ⑤ CORE auth + routing -->
  <script src="app/session.js"></script>
  <script src="app/router.js"></script>

  <!-- ⑥ COMPONENTS -->
  <script src="components/logo.js"></script>
  <script src="components/button.js"></script>
  <script src="components/card.js"></script>
  <script src="components/chip.js"></script>
  <script src="components/input.js"></script>
  <script src="components/swatch.js"></script>
  <script src="components/productCard.js"></script>
  <script src="components/designCard.js"></script>
  <script src="components/artistCard.js"></script>
  <script src="components/facetSidebar.js"></script>
  <script src="components/cartLine.js"></script>
  <script src="components/stepper.js"></script>
  <script src="components/dataTable.js"></script>
  <script src="components/searchBox.js"></script>
  <script src="components/kanbanBoard.js"></script>

  <!-- ⑦ SHELL -->
  <script src="app/shell.js"></script>

  <!-- ⑧ VIEWS client -->
  <script src="views/client/home.js"></script>
  <script src="views/client/galeria.js"></script>
  <script src="views/client/producto.js"></script>
  <script src="views/client/personalizador.js"></script>
  <script src="views/client/carrito.js"></script>
  <script src="views/client/checkout.js"></script>
  <script src="views/client/pedido.js"></script>
  <script src="views/client/cuenta.js"></script>
  <script src="views/client/artistas.js"></script>
  <script src="views/client/artistaPortal.js"></script>
  <script src="views/client/vendeTuArte.js"></script>
  <script src="views/client/auth.js"></script>
  <script src="views/client/error.js"></script>

  <!-- ⑨ VIEWS admin (orden alfabético) -->
  <script src="views/admin/dashboard.js"></script>
  <!-- … resto de vistas admin … -->
  <script src="views/admin/config.js"></script>

  <!-- ⑩ MAIN — siempre el último -->
  <script src="app/main.js"></script>
</body>
</html>
```

Registro de rutas en `main.js`:

```js
const r = window.Fluve.router;
const v = window.Fluve.views;

// Rutas estáticas primero
r.route('#/',                      v.home);
r.route('#/galeria',               v.galeria);
r.route('#/artistas',              v.artistas);
r.route('#/vende-tu-arte',         v.vendeTuArte);
r.route('#/carrito',               v.carrito);
r.route('#/checkout',              v.checkout);
r.route('#/auth',                  v.auth);

// Dinámicas
r.route('#/producto/:slug',        v.producto);
r.route('#/personalizar/:slug?',   v.personalizador);
r.route('#/pedido/:id',            v.pedido);
r.route('#/artistas/:handle',      v.artistas);           // perfil público
r.route('#/artistas/:handle/tienda', v.artistaPortal);   // tienda del artista

// Área privada cliente
r.route('#/cuenta/:seccion?',      v.cuenta,  { role: 'customer' });

// Admin
r.route('#/admin',                 v.adminDashboard,    { role: 'staff'  });
r.route('#/admin/pedidos',         v.adminPedidos,      { role: 'staff'  });
r.route('#/admin/produccion',      v.adminProduccion,   { role: 'staff'  });
r.route('#/admin/artistas',        v.adminArtistas,     { role: 'staff'  });
r.route('#/admin/disenos',         v.adminDisenos,      { role: 'staff'  });
r.route('#/admin/config',          v.adminConfig,       { role: 'admin'  });
// … resto de rutas admin …
```

---

## 5 · Modelo de datos — IndexedDB (21 stores)

### 5.1 Reglas del modelo

**Regla 1.** `DISEÑO` y `PRODUCTO` son entidades independientes. **No existe relación directa entre ellas.** La relación nace únicamente en `order_lines`.

**Regla 2.** El precio final vive exclusivamente en `order_lines.unitPrice`. `designs` no tiene precio. `products` tiene `basePricePVP` como referencia comercial, no como precio de venta definitivo.

**Regla 3.** Las categorías se guardan **desnormalizadas** en el prototipo (arrays dentro del objeto) para evitar joins complejos en IndexedDB. En Arquitectura B se convierten a las tablas `design_categories` y `product_categories`.

### 5.2 Los 21 object stores

```
Grupo       Store                   Nota sobre desnormalización en prototipo
─────────────────────────────────────────────────────────────────────────────
NÚCLEO      users
            artists                 handle, tier (base|pro), status
            designs                 categories[] desnormalizado · isOwn bool
            orders                  supplierId FK
            order_lines             vincula design + product + zone + technique

CATÁLOGO    products                categories[] desnormalizado
            product_variants        color + talla + sku + stock por variante
            product_print_zones     zones[].techniques[] desnormalizado
                                    (evita store separado zone_techniques)
            techniques              costModel + rates por técnica

ECONÓMICO   royalties               status: pending | paid
            payments                method: mp | stripe | transfer
            purchases               lotes de compra + costo unitario
            promos                  códigos de descuento

OPERACIÓN   suppliers               techniques[] + zones[] + rating

COMUNIDAD   favorites               userId + designId
            tickets                 messages[] desnormalizado
            activity_log            before/after JSON — audit trail
```

### 5.3 Forma de cada objeto (referencia para seed y DAO)

```js
// users
{ id, email, name, phone, role: 'guest|customer|staff|admin', avatarUrl, createdAt }

// artists
{ id, userId, handle, displayName, bio, avatarUrl, portfolioUrl,
  tier: 'base|pro', royaltyRate: 0.10, status: 'pending|approved|rejected',
  featured, active, createdAt }

// designs
{ id, artistId, title, description, isOwn: false,
  status: 'pending|approved|rejected|withdrawn',
  imageUrl, tags: [], categories: ['tema-animales', 'estilo-ilustracion'],
  rejectionReason: null,
  stats: { views: 0, favorites: 0, sales: 0 },
  createdAt, updatedAt }

// products
{ id, slug, name, category, type, subcategory, fit, material, gramaje,
  basePricePVP,   // ← precio referencial; el precio real se calcula en order_lines
  categories: ['prendas-hombre', 'prendas-unisex'],
  images: {},     // { [colorName]: [url, ...] }
  active, featured, sortOrder, createdAt }

// product_variants
{ id, productId, colorName, colorHex, size, sku, stock, stockMinimo, precioExtra, active }

// product_print_zones
{ id, productId, name, location, widthCm, heightCm,
  areaCm2,        // widthCm × heightCm
  defaultTechId, sortOrder, active,
  techniques: ['dtf', 'sublimacion'] }  // ← desnormalizado (evita zone_techniques store)

// techniques
{ id: 'dtf|sublimacion|serigrafia|bordado|dtf_uv|gran_formato|vinilo',
  name, costModel: 'area|fixed|screens|stitches',
  rate, rateUnit: 'm2|u|screen|millar',
  surchargeUnit: 0,   // recargo adicional por unidad
  minQty: 1, active }

// orders
{ id, userId, status: 'pending|paid|received|in_production|quality_check|packaging|ready_to_ship|in_transit|delivered|cancelled',
  supplierId,         // null hasta que el operador asigna
  shippingCost, shippingAddress, total, notes,
  paymentId, paymentProvider: 'mercadopago|stripe|manual',
  createdAt, updatedAt }

// order_lines  ← entidad donde nace la relación diseño + producto
{ id, orderId, productId, designId, variantId, zoneId, techniqueId,
  qty, areaCm2, colors, stitchesK,
  unitPrice,      // ← precio calculado en el momento de la compra
  precioNeto,     // ← sin IVA
  costoReal,      // ← para calcular regalía
  royaltyAmt: 0   // ← calculado al liquidar (cuando status = 'delivered')
}

// royalties
{ id, orderId, orderLineId, artistId, designId,
  amount, tier: 'base|pro', rate,
  status: 'pending|paid', paidAt, createdAt }

// payments
{ id, orderId, userId, amount,
  method: 'mp|stripe|transfer', status: 'pending|approved|refunded',
  externalId, createdAt }

// suppliers
{ id, name, contactName, email, phone, address,
  techniques: ['dtf', 'bordado'],   // capacidades
  zones: ['montevideo', 'interior'], // cobertura geográfica
  rating: 4.5, active, notes, createdAt }

// purchases
{ id, supplierId, productId, type: 'product|material',
  qty, unitCost, areaCm2, costPerCm2,
  status: 'pending|ordered|received|cancelled',
  orderedAt, receivedAt, createdAt }

// promos
{ id: 'code', type: 'pct|shipping', value, minAmount, active, expiresAt }

// favorites
{ id, userId, designId, createdAt }

// tickets
{ id, userId, subject, status: 'open|closed',
  messages: [{ author, body, createdAt }],
  createdAt }

// activity_log
{ id, userId, action, entity, entityId,
  before: {}, after: {}, createdAt }
```

---

## 6 · Módulo Domain (`domain/`)

### 6.1 Reglas del módulo

- **Solo puede**: recibir datos como parámetros, aplicar reglas, devolver resultados.
- **No puede**: acceder a IndexedDB, manipular el DOM, emitir eventos con `hooks.emit()`, leer `localStorage`.
- **Migración**: los 9 archivos `.js` se copian a `.ts` agregando tipos. Sin cambiar lógica.

---

### 6.2 `domain/pricing.js` — Motor de precios

Implementa las fórmulas reales de Fluvë Studio:

```
CostoReal   = productCostWA + printingCost + overhead
PrecioNeto  = CostoReal / (1 − MargenEfectivo)
PVPBruto    = PrecioNeto × 1.22              (IVA Uruguay 22%)
PVPFinal    = redondeo comercial a ,90
MargenBruto = PrecioNeto − CostoReal
```

```js
(function () {
  'use strict';

  const IVA_RATE       = 0.22;
  const DEFAULT_MARGIN = 0.38;
  const MIN_MARGIN     = 0.25;

  // Configuración de referencia para el prototipo.
  // En producción, estos valores vienen de la tabla `techniques`.
  const TECHNIQUE_DEFAULTS = {
    dtf:          { costModel: 'area',    ratePerCm2: 0.009,  surchargeUnit: 0,    minQty: 1  },
    sublimacion:  { costModel: 'fixed',   fixedCost: 3.50,    surchargeUnit: 2.00, minQty: 1  },
    serigrafia:   { costModel: 'screens', ratePerScreen: 25,  inkCostPerUnit: 0.80,minQty: 10 },
    bordado:      { costModel: 'stitches',ratePerMillar: 1.20,defaultStitchesK: 5, surchargeUnit: 6.00, minQty: 1 },
    dtf_uv:       { costModel: 'area',    ratePerCm2: 0.012,  surchargeUnit: 3.00, minQty: 1  },
    gran_formato: { costModel: 'area',    ratePerCm2: 0.008,  surchargeUnit: 0,    minQty: 1  },
    vinilo:       { costModel: 'area',    ratePerCm2: 0.010,  surchargeUnit: 1.00, minQty: 1  },
  };

  /**
   * Calcula el costo de impresión según el modelo de la técnica.
   * @param {{ technique, qty, areaCm2?, colors?, stitchesK?, config? }} p
   */
  function calcPrintingCost({ technique, qty, areaCm2 = 0, colors = 1, stitchesK, config }) {
    const t = config ?? TECHNIQUE_DEFAULTS[technique];
    if (!t) throw new Error(`Técnica desconocida: "${technique}"`);

    let cost = 0;
    switch (t.costModel) {
      case 'area':
        cost = (areaCm2 * t.ratePerCm2 + t.surchargeUnit) * qty;
        break;
      case 'fixed':
        cost = (t.fixedCost + t.surchargeUnit) * qty;
        break;
      case 'screens':
        cost = colors * t.ratePerScreen + colors * (t.inkCostPerUnit ?? 0) * qty;
        break;
      case 'stitches': {
        const millares = stitchesK ?? t.defaultStitchesK ?? 5;
        cost = (millares * t.ratePerMillar + t.surchargeUnit) * qty;
        break;
      }
    }
    return Math.round(cost * 100) / 100;
  }

  /** Redondeo comercial al ,90 más cercano por encima. */
  function roundToNinety(price) {
    const floor = Math.floor(price);
    const c     = floor + 0.90;
    return c >= price ? c : floor + 1.90;
  }

  /**
   * Cascada de margen: overrideManual ?? excepciónCategoría ?? targetGlobal (38%).
   */
  function resolveMargin({ overrideManual, categoryException, globalTarget = DEFAULT_MARGIN }) {
    const margin = overrideManual ?? categoryException ?? globalTarget;
    return {
      margin,
      isMinAlert: margin < MIN_MARGIN,
      source: overrideManual != null ? 'manual' : categoryException != null ? 'category' : 'global',
    };
  }

  /**
   * Cálculo principal: CostoReal → PVPFinal con IVA 22% y redondeo ,90.
   *
   * @param {{ productCostWA, printingCost, overhead?, marginOverride?, categoryMargin? }} p
   */
  function calculatePVP({ productCostWA, printingCost, overhead = 0, marginOverride, categoryMargin }) {
    const { margin, isMinAlert, source } = resolveMargin({
      overrideManual: marginOverride, categoryException: categoryMargin,
    });

    const costoReal   = productCostWA + printingCost + overhead;
    const precioNeto  = costoReal / (1 - margin);
    const pvpBruto    = precioNeto * (1 + IVA_RATE);
    const pvpFinal    = roundToNinety(pvpBruto);
    const margenBruto = precioNeto - costoReal;

    return {
      costoReal:      Math.round(costoReal   * 100) / 100,
      precioNeto:     Math.round(precioNeto  * 100) / 100,
      pvpBruto:       Math.round(pvpBruto    * 100) / 100,
      pvpFinal,
      iva:            Math.round(precioNeto * IVA_RATE * 100) / 100,
      margenBruto:    Math.round(margenBruto * 100) / 100,
      margenEfectivo: margin,
      margenSource:   source,
      isMinAlert,
    };
  }

  /** Punto de equilibrio: unidades mínimas para cubrir costos fijos. */
  function breakEven({ fixedCosts, unitMarginNeto }) {
    return unitMarginNeto > 0 ? Math.ceil(fixedCosts / unitMarginNeto) : Infinity;
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.pricing = {
    calcPrintingCost, calculatePVP, resolveMargin, roundToNinety, breakEven,
    TECHNIQUE_DEFAULTS, IVA_RATE, DEFAULT_MARGIN, MIN_MARGIN,
  };
})();
```

---

### 6.3 `domain/production.js` — Máquina de estados

```js
(function () {
  // Estados alineados con el flujo del documento §5.
  // 'received' = RECIBIDO: pago confirmado, operador asigna proveedor.
  // 'ready_to_ship' = LISTO PARA ENVÍO: código de seguimiento registrado.

  const STAGES = {
    pending:       { label: 'Pendiente de pago',    color: '--warning', next: ['paid',         'cancelled'] },
    paid:          { label: 'Pago confirmado',       color: '--accent',  next: ['received',     'cancelled'] },
    received:      { label: 'Recibido en sistema',  color: '--accent',  next: ['in_production','cancelled'] },
    in_production: { label: 'En producción',         color: '--accent',  next: ['quality_check'] },
    quality_check: { label: 'Control de calidad',   color: '--warning', next: ['packaging', 'in_production'] },
    packaging:     { label: 'En empaque',           color: '--accent',  next: ['ready_to_ship'] },
    ready_to_ship: { label: 'Listo para envío',     color: '--success', next: ['in_transit'] },
    in_transit:    { label: 'En camino',            color: '--accent',  next: ['delivered'] },
    delivered:     { label: 'Entregado',            color: '--success', next: [] },
    cancelled:     { label: 'Cancelado',            color: '--danger',  next: [] },
  };

  // Nota: la regalía se calcula (royalties.calculateRoyalty) cuando el pedido
  // llega a 'delivered'. El resultado se persiste en el store 'royalties', no
  // como un estado adicional del pedido.

  const canTransition    = (from, to)  => (STAGES[from]?.next ?? []).includes(to);
  const getValidNext     = (current)   => STAGES[current]?.next ?? [];
  const getStageLabel    = (stage)     => STAGES[stage]?.label ?? stage;
  const getStageColor    = (stage)     => STAGES[stage]?.color ?? '--text-secondary';
  const isTerminal       = (stage)     => (STAGES[stage]?.next?.length ?? 0) === 0;

  // Devuelve true cuando la transición requiere que supplierId esté asignado
  const requiresSupplier = (to)        => to === 'in_production';

  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.production = {
    STAGES, canTransition, getValidNext,
    getStageLabel, getStageColor, isTerminal, requiresSupplier,
  };
})();
```

---

### 6.4 `domain/customizer.js` — Validaciones por técnica

```js
(function () {
  const TECHNIQUE_CONSTRAINTS = {
    dtf:          { minDPI: 150, maxColors: null, maxAreaCm2: 600,  requiresVector: false },
    sublimacion:  { minDPI: 150, maxColors: null, maxAreaCm2: 600,  requiresVector: false },
    serigrafia:   { minDPI: 300, maxColors: 8,    maxAreaCm2: 400,  requiresVector: true  },
    bordado:      { minDPI: null,maxColors: 15,   maxAreaCm2: 100,  requiresVector: true  },
    dtf_uv:       { minDPI: 150, maxColors: null, maxAreaCm2: 500,  requiresVector: false },
    gran_formato: { minDPI: 150, maxColors: null, maxAreaCm2: 20000,requiresVector: false },
    vinilo:       { minDPI: 300, maxColors: 4,    maxAreaCm2: 300,  requiresVector: true  },
  };

  function validateDesign({ technique, dpi, colors, areaCm2, isVector = false }) {
    const c = TECHNIQUE_CONSTRAINTS[technique];
    if (!c) return { valid: false, errors: [`Técnica "${technique}" no soportada`], warnings: [] };

    const errors = [], warnings = [];
    if (c.minDPI   && dpi     && dpi     < c.minDPI)   errors.push(`Mín. ${c.minDPI} DPI (actual: ${dpi})`);
    if (c.maxColors && colors && colors  > c.maxColors) errors.push(`Máx. ${c.maxColors} colores (actual: ${colors})`);
    if (c.maxAreaCm2 && areaCm2 && areaCm2 > c.maxAreaCm2) errors.push(`Área máxima: ${c.maxAreaCm2} cm²`);
    if (c.requiresVector && areaCm2 > 150 && !isVector)
      warnings.push(`Para áreas grandes con ${technique} se recomienda vectorial`);

    return { valid: errors.length === 0, errors, warnings };
  }

  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.customizer = { validateDesign, TECHNIQUE_CONSTRAINTS };
})();
```

---

### 6.5 `domain/royalties.js` — Cálculo de regalías

> **Base correcta:** la regalía se calcula sobre el **MargenBruto**, no sobre el precio de venta.
> `MargenBruto = PrecioNeto − CostoReal`

```js
(function () {
  const TIERS = {
    base: 0.10,  // Tier Base: 10% del MargenBruto
    pro:  0.20,  // Tier Pro:  20% del MargenBruto
  };

  /**
   * @param {{ precioNeto, costoReal, artistTier? }}
   */
  function calculateRoyalty({ precioNeto, costoReal, artistTier = 'base' }) {
    const margenBruto = precioNeto - costoReal;
    const rate        = TIERS[artistTier] ?? TIERS.base;
    const royalty     = Math.max(0, Math.round(margenBruto * rate * 100) / 100);
    return { margenBruto: Math.round(margenBruto * 100) / 100, rate, royalty, tier: artistTier };
  }

  /**
   * Margen neto final de Fluvë para un pedido.
   * MargenNetFluvë = PVPFinal − IVA − CostoReal − Regalía − ComisiónPasarela − Envío
   */
  function calcNetMargin({ pvpFinal, iva, costoReal, royalty, paymentFee, shippingCost = 0 }) {
    const net    = pvpFinal - iva - costoReal - royalty - paymentFee - shippingCost;
    const netPct = Math.round((net / (pvpFinal - iva)) * 1000) / 10;
    return { net: Math.round(net * 100) / 100, netPct };
  }

  /**
   * Resumen de período para un artista (trabaja sobre registros del store 'royalties').
   */
  function periodSummary(royaltyRecords, artistId) {
    const mine = royaltyRecords.filter(r => r.artistId === artistId);
    return {
      pending:    mine.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0),
      paid:       mine.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0),
      total:      mine.reduce((s, r) => s + r.amount, 0),
      count:      mine.length,
    };
  }

  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.royalties = { calculateRoyalty, calcNetMargin, periodSummary, TIERS };
})();
```

---

### 6.6 `domain/supplier.js` — Asignación de proveedores

```js
(function () {
  /**
   * Filtra y ordena los proveedores compatibles para un pedido.
   * El operador toma la decisión final — este módulo solo prepara la información.
   *
   * Criterios (doc §6): técnica compatible · zona de entrega · carga actual · rating.
   *
   * @param {object[]} suppliers   — todos los suppliers activos del store
   * @param {{ technique, zone }}  — requisitos del pedido
   * @param {object[]} activeCounts — [{ supplierId, count }] carga actual
   */
  function rankSuppliers(suppliers, { technique, zone }, activeCounts = []) {
    const loadMap = Object.fromEntries(activeCounts.map(o => [o.supplierId, o.count]));

    return suppliers
      .filter(s => s.active)
      .filter(s => s.techniques?.includes(technique))
      .filter(s => !zone || s.zones?.includes(zone) || s.zones?.includes('*'))
      .map(s => ({
        ...s,
        activeOrders: loadMap[s.id] ?? 0,
        // Score: mayor rating = mejor; menor carga = mejor
        score: (s.rating ?? 0) * 10 - (loadMap[s.id] ?? 0) * 2,
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Valida si un proveedor específico puede aceptar un pedido.
   */
  function canFulfill(supplier, { technique, zone }) {
    if (!supplier.active)                        return { can: false, reason: 'Proveedor inactivo' };
    if (!supplier.techniques?.includes(technique))
      return { can: false, reason: `No opera con ${technique}` };
    if (zone && !supplier.zones?.includes(zone) && !supplier.zones?.includes('*'))
      return { can: false, reason: `No cubre la zona ${zone}` };
    return { can: true };
  }

  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.supplier = { rankSuppliers, canFulfill };
})();
```

---

### 6.7 `domain/shipping.js` — Costo de envío

```js
(function () {
  // Zonas de referencia para el prototipo.
  // En producción, los costos vienen de configuración en la BD.
  const ZONES = {
    montevideo: { name: 'Montevideo',       baseCost: 150, freeFrom: 3000 },
    interior:   { name: 'Interior Uruguay', baseCost: 290, freeFrom: 4000 },
    remote:     { name: 'Zona remota',      baseCost: 450, freeFrom: 5000 },
    pickup:     { name: 'Retiro en local',  baseCost: 0,   freeFrom: 0    },
  };

  const EXTRA_KG_COST = 50; // UYU por cada kg adicional sobre 1 kg

  /**
   * @param {{ zone, orderSubtotal, weightKg? }}
   */
  function calculateShipping({ zone, orderSubtotal, weightKg = 0.5 }) {
    const z = ZONES[zone];
    if (!z) return { cost: 0, isFree: false, error: `Zona "${zone}" no reconocida` };

    const isFree       = z.freeFrom > 0 && orderSubtotal >= z.freeFrom;
    const weightExtra  = Math.max(0, weightKg - 1) * EXTRA_KG_COST;
    const cost         = isFree ? 0 : z.baseCost + weightExtra;

    return { cost: Math.round(cost), zone, zoneName: z.name, isFree, freeFrom: z.freeFrom };
  }

  function getSupportedZones() {
    return Object.entries(ZONES).map(([id, z]) => ({ id, ...z }));
  }

  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.shipping = { calculateShipping, getSupportedZones, ZONES };
})();
```

---

### 6.8 `domain/quotation.js` — Cotizaciones B2B

```js
(function () {
  // Depende de domain/pricing.js (cargado antes en index.html)

  function generateQuote({ items, clientPrices = {}, validDays = 30, globalDiscount = 0 }) {
    const { calcPrintingCost, calculatePVP } = window.Fluve.domain.pricing;

    const lines = items.map(item => {
      const productCostWA = clientPrices[item.productId] ?? item.productCostWA;
      const printingCost  = calcPrintingCost({
        technique: item.techniqueId, qty: item.qty,
        areaCm2: item.areaCm2, colors: item.colors,
      });
      const { pvpFinal, precioNeto, costoReal } = calculatePVP({
        productCostWA, printingCost,
        marginOverride: item.marginOverride,
      });
      return { ...item, printingCost, unitPrice: pvpFinal, precioNeto, costoReal,
               subtotal: Math.round(pvpFinal * item.qty * 100) / 100 };
    });

    const subtotal       = lines.reduce((s, l) => s + l.subtotal, 0);
    const discountAmount = Math.round(subtotal * (globalDiscount / 100) * 100) / 100;
    const total          = Math.round((subtotal - discountAmount) * 100) / 100;
    const expiresAt      = new Date(Date.now() + validDays * 86_400_000).toISOString();

    return { lines, subtotal: Math.round(subtotal * 100) / 100, discountPct: globalDiscount,
             discountAmount, total, validDays, expiresAt };
  }

  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.quotation = { generateQuote };
})();
```

---

### 6.9 `domain/quality.js` y `domain/inventory.js` (sin cambios)

Estos módulos no requieren modificaciones respecto a la versión anterior.
`quality.js` define checkpoints por técnica (7 técnicas).
`inventory.js` calcula alertas de stock y punto de reposición.

---

## 7 · Core — módulos de infraestructura

### 7.1 Sesión y roles (`app/session.js`)

Roles: `guest · customer · staff · admin` (jerarquía: `guest < customer < staff < admin`).

```js
(function () {
  const ROLES = { guest: 0, customer: 1, staff: 2, admin: 3 };

  function current()       { /* lee _sessionUser de memoria + localStorage */ }
  function hasRole(min)    { return (ROLES[current()?.role ?? 'guest'] ?? 0) >= (ROLES[min] ?? 0); }
  async function login(id) { /* busca en dao.users.get(id), emite session:changed */ }
  function logout()        { /* limpia estado, emite session:changed, navega a #/auth */ }

  window.Fluve = window.Fluve || {};
  window.Fluve.session = { current, hasRole, login, logout };
})();
```

### 7.2 Bus de eventos (`app/hooks.js`)

```js
(function () {
  const _listeners = {};
  const on   = (event, handler) => { (_listeners[event] ||= []).push(handler); return () => off(event, handler); };
  const off  = (event, handler) => { if (_listeners[event]) _listeners[event] = _listeners[event].filter(h => h !== handler); };
  const emit = (event, payload) => (_listeners[event] || []).forEach(h => { try { h(payload); } catch(e) { console.error(`[hooks] ${event}`, e); } });
  window.Fluve = window.Fluve || {};
  window.Fluve.hooks = { on, off, emit };
})();
```

**Catálogo de eventos:**

| Evento | Payload | Emisor |
|---|---|---|
| `cart:item-added` | `{ productId, designId, qty, price }` | personalizador |
| `cart:updated` | `{ items, total }` | carrito |
| `session:changed` | `user \| null` | session.js |
| `lang:changed` | `'es' \| 'en'` | i18n.js |
| `order:placed` | `{ orderId }` | checkout |
| `production:stage-changed` | `{ orderId, from, to, supplierId? }` | admin/produccion |
| `design:approved` | `{ designId }` | admin/disenos |
| `seed:reset` | `void` | admin/config |

---

## 8 · Reglas de código

1. **IIFE por archivo, namespace `window.Fluve.*`.** Sin globals sueltos.
2. **Orden de `<script>` = contrato de dependencias.**
3. **Domain nunca toca el DOM ni IndexedDB.** Parámetros → resultados.
4. **`designs` nunca tiene FK a `products`.** La relación nace en `order_lines`.
5. **El precio final vive en `order_lines.unitPrice`, no en `designs` ni en `products`.**
6. **`async/await` para todo lo de IndexedDB.** Los DAO devuelven Promesas.
7. **`localStorage` e `IndexedDB` siempre en `try/catch`** con fallback en memoria.
8. **Sin `innerHTML` con datos del usuario.** Siempre `textContent` o nodos DOM.
9. **Sin `scrollIntoView`.** Usar `window.scrollTo(0,0)` tras navegar.
10. **Estados de vista obligatorios:** loading · vacío · sin resultados · error.
11. **Accesibilidad:** targets ≥ 44px · `:focus-visible` · ARIA en modales.
12. **Las vistas no contienen lógica de negocio.** Delegan al domain.
13. **Categorías desnormalizadas en prototipo**: arrays en `designs.categories[]` y `products.categories[]`. En Arquitectura B se convierten a tablas junction.
14. **`product_print_zones[].techniques[]` reemplaza la tabla `zone_techniques`** en el prototipo. En producción existe como tabla separada.
15. **Transición a `in_production` requiere `supplierId`** asignado. `domain/production.requiresSupplier()` lo verifica.

---

## 9 · Mapa de migración hacia Arquitectura B

| Arquitectura A | Arquitectura B | Tipo |
|---|---|---|
| `domain/*.js` (9 módulos) | `domain/*.ts` (mismo código + tipos) | **Copiar + tipado TS** |
| `data/db.js` (21 stores) | 21 tablas PostgreSQL en Supabase | Convertir |
| `data/dao.js` método a método | `lib/dao/*.ts` función a función | Migrar 1:1 |
| `data/seed.js` objetos JS | `supabase/migrations/*_seed.sql` | Convertir a INSERT |
| `app/session.js` | Supabase Auth + middleware | Adaptar |
| `app/router.js` hash | Next.js App Router file-system | Reemplazar |
| `app/hooks.js` event bus | Zustand store + React Context | Adaptar |
| `app/config.js` | `lib/config.ts` + env vars | Adaptar |
| `app/i18n.js` | next-intl | Reemplazar |
| `components/*.js` | `components/ui/*.tsx` shadcn/ui | Reescribir |
| `views/client/*.js` | `app/(client)/*/page.tsx` | Reescribir |
| `views/admin/*.js` | `app/admin/*/page.tsx` | Reescribir |
| `designs[].categories[]` (array) | tabla `design_categories` | Normalizar |
| `products[].categories[]` (array) | tabla `product_categories` | Normalizar |
| `zones[].techniques[]` (array) | tabla `zone_techniques` | Normalizar |
| `localStorage.fluve_session` | Cookie httpOnly Supabase Auth | Reemplazar |
