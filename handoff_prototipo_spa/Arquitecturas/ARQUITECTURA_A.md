# Arquitectura A — Fluvë Studio SPA (Prototipo / Desarrollo)
### versión 2 · incorpora Módulo de Dominio separado del resto del sistema

> **Propósito:** define la arquitectura del entorno de prototipado y desarrollo.
> Corre en `file://` sin servidor, permite validar todos los flujos del sistema
> antes de migrar a producción, e incorpora una capa de Dominio que concentra
> toda la lógica de negocio única de Fluvë, separada del acceso a datos y de la UI.
>
> Documento complementario: **ARQUITECTURA_B.md** (producción SaaS + guía de migración).

---

## 1 · Restricciones duras

- **Sin servidor.** `index.html` se abre con doble clic desde `file://`. Cero configuración.
- **Sin frameworks JS.** Sin React, Vue, Angular ni similares.
- **Sin build tools.** Sin Webpack, Vite, Babel ni transpilación.
- **Sin módulos ES6 (`import`/`export`).** No funcionan bajo `file://` por CORS.
  Patrón: IIFE + namespace `window.Fluve.*`.
- **Sin dependencias externas JS.** Sin CDN de librerías. Fuentes de Google (`<link>`) es la única excepción de red.
- **Navegador de referencia: Chrome o Edge.** `localStorage` e `IndexedDB` bajo `file://`
  no están garantizados por el estándar; Chrome/Edge los permiten, Firefox los bloquea.

---

## 2 · Los cinco módulos del sistema

La arquitectura se organiza en cinco módulos con responsabilidades estrictamente separadas.

| Módulo | Directorio | Responsabilidad |
|---|---|---|
| **Core** | `app/` | Routing, sesión, shell, i18n, bus de eventos, configuración |
| **Domain** | `domain/` | **Lógica de negocio única de Fluvë** — pura, sin DOM ni BD |
| **Data** | `data/` | Acceso a IndexedDB exclusivamente (db, dao, seed) |
| **Components** | `components/` | Primitivos de UI reutilizables (funciones que devuelven DOM) |
| **Views** | `views/` | Vistas por ruta — rendering y listeners solamente |

**Regla de dependencia:**

```
Views / Components
      ↓ usan
    Domain          ← núcleo de negocio, no depende de nadie
      ↑ recibe datos de
     Data
```

El módulo Domain no conoce ni el DOM ni IndexedDB. Recibe datos como parámetros
y devuelve resultados. Las Views consultan a Data (DAO), obtienen los datos,
y los pasan a Domain para que aplique las reglas de negocio.

> **Consecuencia directa:** al migrar de Arquitectura A a Arquitectura B,
> el módulo `domain/` se copia sin modificar una sola línea.

---

## 3 · Estructura de archivos

```
/  (raíz — se abre index.html con doble clic)
│
├── index.html
│
├── styles/
│   ├── tokens.css          ← :root { --ink … } design tokens
│   ├── base.css            ← reset, tipografía, @keyframes, utilidades
│   ├── components.css      ← estilos de primitivos (button, card, chip…)
│   ├── client.css          ← estilos de la tienda (nav, hero, grids…)
│   └── admin.css           ← estilos del panel admin (rail, tablas…)
│
├── assets/
│   ├── fonts/
│   └── img/
│
├── app/                    ← MÓDULO CORE
│   ├── main.js             ← bootstrap: abre DB, seed si vacía, monta router
│   ├── router.js           ← router por location.hash
│   ├── session.js          ← usuario actual, login/logout, gating por rol
│   ├── shell.js            ← header cliente + rail admin + footer
│   ├── i18n.js             ← diccionario ES/EN + t() + money() + date()
│   ├── hooks.js            ← bus de eventos interno (window.Fluve.hooks)
│   ├── config.js           ← feature flags y configuración de la app
│   └── util/
│       ├── dom.js          ← el(), createStore(), on(), mount()
│       ├── toast.js        ← toast() global
│       ├── viewState.js    ← loading / empty / error states
│       ├── confirm.js      ← confirmDialog()
│       ├── format.js       ← money(), date(), number()
│       └── csv.js          ← exportCsv()
│
├── domain/                 ← MÓDULO DOMAIN — lógica de negocio única de Fluvë
│   ├── pricing.js          ← motor de costeos (era data/pricing.js)
│   ├── production.js       ← flujo y estados del ciclo de producción
│   ├── customizer.js       ← reglas de personalización por técnica y producto
│   ├── royalties.js        ← cálculo de regalías de artistas
│   ├── quotation.js        ← generador de cotizaciones B2B (usa pricing.js)
│   ├── quality.js          ← checkpoints de control de calidad por técnica
│   └── inventory.js        ← reglas de stock mínimo y alertas de reposición
│
├── data/                   ← MÓDULO DATA — solo acceso a IndexedDB
│   ├── db.js               ← apertura/upgrade de IndexedDB, object stores
│   ├── dao.js              ← API de acceso por store (get/getAll/put/delete)
│   └── seed.js             ← dataset semilla + reseed()/wipe()/export()/import()
│
├── components/             ← MÓDULO COMPONENTS
│   ├── logo.js
│   ├── button.js · card.js · chip.js · input.js · swatch.js
│   ├── productCard.js · facetSidebar.js · cartLine.js · stepper.js
│   ├── dataTable.js        ← tabla admin con sort/filtro/paginación/bulk
│   └── searchBox.js        ← búsqueda con debounce + autocomplete
│
└── views/                  ← MÓDULO VIEWS — rendering + listeners únicamente
    ├── client/
    │   ├── home.js · galeria.js · producto.js · personalizador.js
    │   ├── carrito.js · checkout.js · pedido.js · cuenta.js
    │   ├── auth.js · error.js
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

El orden de los `<script>` es el contrato de dependencias del sistema.

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

  <!-- ① CORE util — sin dependencias -->
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

  <!-- ③ DOMAIN — lógica pura, sin DOM ni BD; no depende de nada exterior -->
  <!-- pricing primero; quotation depende de pricing -->
  <script src="domain/pricing.js"></script>
  <script src="domain/production.js"></script>
  <script src="domain/customizer.js"></script>
  <script src="domain/royalties.js"></script>
  <script src="domain/quotation.js"></script>
  <script src="domain/quality.js"></script>
  <script src="domain/inventory.js"></script>

  <!-- ④ DATA — acceso a IndexedDB; depende de config -->
  <script src="data/db.js"></script>
  <script src="data/dao.js"></script>
  <script src="data/seed.js"></script>

  <!-- ⑤ CORE auth + routing — dependen de data -->
  <script src="app/session.js"></script>
  <script src="app/router.js"></script>

  <!-- ⑥ COMPONENTS — dependen de dom.js -->
  <script src="components/logo.js"></script>
  <script src="components/button.js"></script>
  <script src="components/card.js"></script>
  <script src="components/chip.js"></script>
  <script src="components/input.js"></script>
  <script src="components/swatch.js"></script>
  <script src="components/productCard.js"></script>
  <script src="components/facetSidebar.js"></script>
  <script src="components/cartLine.js"></script>
  <script src="components/stepper.js"></script>
  <script src="components/dataTable.js"></script>
  <script src="components/searchBox.js"></script>

  <!-- ⑦ SHELL — depende de session + components -->
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
  <script src="views/client/auth.js"></script>
  <script src="views/client/error.js"></script>

  <!-- ⑨ VIEWS admin -->
  <script src="views/admin/dashboard.js"></script>
  <!-- … resto en orden alfabético … -->
  <script src="views/admin/config.js"></script>

  <!-- ⑩ MAIN — siempre el último -->
  <script src="app/main.js"></script>
</body>
</html>
```

---

## 5 · Módulo Domain (`domain/`)

El módulo de dominio contiene **toda la lógica de negocio propia de Fluvë Studio**.
Es la parte del sistema que no existe en ningún otro e-commerce genérico.

### Qué PUEDE estar en domain/

- Cálculos de precio, descuentos, márgenes
- Reglas de transición del flujo de producción
- Validaciones de diseños (DPI, colores, áreas)
- Cálculo de regalías de artistas
- Generación de cotizaciones
- Checkpoints de calidad por técnica
- Reglas de stock mínimo y reposición
- Cualquier algoritmo de negocio reutilizable entre vistas

### Qué NO puede estar en domain/

- Acceso a IndexedDB o cualquier BD → eso es `data/`
- Manipulación del DOM → eso es `views/` o `components/`
- Llamadas a `window.Fluve.hooks.emit()` → eso es responsabilidad de quien llama al domain
- Lectura de `localStorage` → eso es `app/session.js`
- Referencias a `window.Fluve.dom`, `window.Fluve.router`, etc.

### Patrón estándar de un módulo domain

```js
// domain/ejemplo.js
(function () {
  // Toda la lógica es pura: entra data, sale resultado.
  // Sin efectos secundarios, sin dependencias externas.

  function calcularAlgo(parametros) {
    // ... lógica ...
    return resultado;
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.ejemplo = { calcularAlgo };
})();
```

---

### 5.1 `domain/pricing.js` — Motor de costeos

```js
(function () {
  const TECHNIQUE_MULTIPLIERS = {
    sublimacion: 1.00,
    serigrafia:  1.20,
    bordado:     1.50,
    dtf:         1.10,
    vinilo:      0.90,
  };

  const QTY_BREAKS = [
    { from: 50, discount: 0.15 },
    { from: 20, discount: 0.08 },
    { from: 10, discount: 0.04 },
    { from:  1, discount: 0.00 },
  ];

  /**
   * @param {object} input
   * @param {number} input.basePrice     — precio base del producto (USD)
   * @param {string} input.technique     — 'sublimacion' | 'serigrafia' | 'bordado' | 'dtf' | 'vinilo'
   * @param {number} input.qty           — cantidad de unidades
   * @param {number} [input.areaCm2]     — área de impresión en cm²
   * @param {number} [input.colors]      — número de colores (para serigrafía)
   * @returns {{ unitPrice, subtotal, setupFee, total, breakdown }}
   */
  function calculatePrice({ basePrice, technique, qty, areaCm2, colors }) {
    const techMultiplier = TECHNIQUE_MULTIPLIERS[technique] ?? 1.0;
    const areaFactor     = areaCm2  ? Math.max(1, areaCm2 / 100) : 1;
    const colorFactor    = colors   ? 1 + (colors - 1) * 0.15    : 1;
    const qtyDiscount    = QTY_BREAKS.find(b => qty >= b.from)?.discount ?? 0;
    const setupFee       = technique === 'serigrafia' ? (colors ?? 1) * 15 : 0;

    const unitPrice = basePrice * techMultiplier * areaFactor * colorFactor * (1 - qtyDiscount);
    const subtotal  = unitPrice * qty;
    const total     = subtotal + setupFee;

    return {
      unitPrice:  Math.round(unitPrice * 100) / 100,
      subtotal:   Math.round(subtotal  * 100) / 100,
      setupFee,
      total:      Math.round(total     * 100) / 100,
      breakdown: {
        basePrice, techMultiplier, areaFactor,
        colorFactor, qtyDiscount: qtyDiscount * 100 + '%',
      },
    };
  }

  function getSupportedTechniques() {
    return Object.keys(TECHNIQUE_MULTIPLIERS);
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.pricing = { calculatePrice, getSupportedTechniques, TECHNIQUE_MULTIPLIERS };
})();
```

---

### 5.2 `domain/production.js` — Flujo de producción

```js
(function () {
  // Máquina de estados del ciclo de vida de un pedido.
  // Define qué transiciones son válidas. La vista solo consulta,
  // nunca toma decisiones de estado por su cuenta.

  const STAGES = {
    pending:      { label: 'Pendiente de pago',   color: '--warning', next: ['paid', 'cancelled'] },
    paid:         { label: 'Pago confirmado',      color: '--accent',  next: ['in_production', 'cancelled'] },
    in_production:{ label: 'En producción',        color: '--accent',  next: ['quality_check'] },
    quality_check:{ label: 'Control de calidad',   color: '--warning', next: ['packaging', 'in_production'] },
    packaging:    { label: 'En empaque',           color: '--accent',  next: ['shipped'] },
    shipped:      { label: 'Despachado',           color: '--success', next: ['delivered'] },
    delivered:    { label: 'Entregado',            color: '--success', next: [] },
    cancelled:    { label: 'Cancelado',            color: '--danger',  next: [] },
  };

  function canTransition(from, to) {
    return (STAGES[from]?.next ?? []).includes(to);
  }

  function getValidNextStages(current) {
    return STAGES[current]?.next ?? [];
  }

  function getStageLabel(stage) {
    return STAGES[stage]?.label ?? stage;
  }

  function getStageColor(stage) {
    return STAGES[stage]?.color ?? '--text-secondary';
  }

  /** Devuelve true si el pedido está en un estado terminal (no puede avanzar ni retroceder) */
  function isTerminal(stage) {
    return STAGES[stage]?.next?.length === 0;
  }

  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.production = {
    STAGES, canTransition, getValidNextStages,
    getStageLabel, getStageColor, isTerminal,
  };
})();
```

---

### 5.3 `domain/customizer.js` — Reglas de personalización

```js
(function () {
  // Restricciones técnicas por método de impresión.
  // La vista del personalizador las consulta para mostrar
  // advertencias en tiempo real y bloquear diseños inválidos.

  const TECHNIQUE_CONSTRAINTS = {
    sublimacion: { minDPI: 150, maxColors: null,  maxAreaCm2: 600, requiresVectorForLargeArea: false },
    serigrafia:  { minDPI: 300, maxColors: 8,     maxAreaCm2: 400, requiresVectorForLargeArea: true  },
    bordado:     { minDPI: null, maxColors: 15,   maxAreaCm2: 100, requiresVectorForLargeArea: true  },
    dtf:         { minDPI: 150, maxColors: null,  maxAreaCm2: 500, requiresVectorForLargeArea: false },
    vinilo:      { minDPI: 300, maxColors: 4,     maxAreaCm2: 300, requiresVectorForLargeArea: true  },
  };

  /**
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  function validateDesign({ technique, dpi, colors, areaCm2, isVector = false }) {
    const c = TECHNIQUE_CONSTRAINTS[technique];
    if (!c) return { valid: false, errors: [`Técnica "${technique}" no soportada`], warnings: [] };

    const errors = [];
    const warnings = [];

    if (c.minDPI && dpi && dpi < c.minDPI)
      errors.push(`Resolución mínima: ${c.minDPI} DPI (actual: ${dpi})`);

    if (c.maxColors && colors && colors > c.maxColors)
      errors.push(`Máximo ${c.maxColors} colores para ${technique} (actual: ${colors})`);

    if (c.maxAreaCm2 && areaCm2 && areaCm2 > c.maxAreaCm2)
      errors.push(`Área máxima: ${c.maxAreaCm2} cm² (actual: ${areaCm2})`);

    if (c.requiresVectorForLargeArea && areaCm2 > 200 && !isVector)
      warnings.push(`Para áreas grandes con ${technique} se recomienda formato vectorial`);

    return { valid: errors.length === 0, errors, warnings };
  }

  function getConstraints(technique) {
    return TECHNIQUE_CONSTRAINTS[technique] ?? null;
  }

  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.customizer = { validateDesign, getConstraints, TECHNIQUE_CONSTRAINTS };
})();
```

---

### 5.4 `domain/royalties.js` — Cálculo de regalías

```js
(function () {
  /**
   * Calcula la regalía de un artista para un ítem de pedido.
   * @param {object} p
   * @param {number} p.salePrice        — precio de venta total del ítem
   * @param {number} p.artistRoyaltyPct — porcentaje acordado con el artista
   * @param {boolean} [p.applyOnNet]    — si true, descuenta primero los descuentos aplicados
   * @param {number} [p.discountAmount] — monto de descuento aplicado al ítem
   */
  function calculateRoyalty({ salePrice, artistRoyaltyPct, applyOnNet = true, discountAmount = 0 }) {
    const base    = applyOnNet ? Math.max(0, salePrice - discountAmount) : salePrice;
    const royalty = Math.round(base * (artistRoyaltyPct / 100) * 100) / 100;
    return { base, royalty, pct: artistRoyaltyPct };
  }

  /**
   * Calcula el resumen de regalías de un artista en un conjunto de pedidos.
   * @param {object[]} orders    — pedidos con estado 'delivered'
   * @param {string}   artistId
   */
  function periodSummary(orders, artistId) {
    return orders
      .filter(o => o.status === 'delivered')
      .reduce((acc, o) => {
        const items = (o.items ?? []).filter(i => i.designArtistId === artistId);
        items.forEach(item => {
          const { royalty, base } = calculateRoyalty({
            salePrice:        item.unitPrice * item.qty,
            artistRoyaltyPct: item.royaltyPct ?? 10,
          });
          acc.totalSales     += base;
          acc.totalRoyalties += royalty;
          acc.itemCount      += item.qty;
        });
        return acc;
      }, { totalSales: 0, totalRoyalties: 0, itemCount: 0 });
  }

  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.royalties = { calculateRoyalty, periodSummary };
})();
```

---

### 5.5 `domain/quotation.js` — Generador de cotizaciones B2B

```js
(function () {
  // Depende de domain/pricing.js (cargado antes en index.html)

  /**
   * Genera una cotización B2B a partir de líneas de pedido.
   * @param {object} p
   * @param {object[]} p.items          — líneas con { productId, name, technique, qty, baseUnitPrice, areaCm2?, colors? }
   * @param {object}  [p.clientPrices]  — mapa { productId: precioEspecial } para este cliente
   * @param {number}  [p.validDays=30]  — vigencia de la cotización
   * @param {number}  [p.globalDiscount] — descuento global en porcentaje (0-100)
   */
  function generateQuote({ items, clientPrices = {}, validDays = 30, globalDiscount = 0 }) {
    const { calculatePrice } = window.Fluve.domain.pricing;

    const lines = items.map(item => {
      const basePrice = clientPrices[item.productId] ?? item.baseUnitPrice;
      const priced    = calculatePrice({
        basePrice,
        technique: item.technique,
        qty:       item.qty,
        areaCm2:   item.areaCm2,
        colors:    item.colors,
      });
      return { ...item, ...priced };
    });

    const subtotal        = lines.reduce((s, l) => s + l.subtotal, 0);
    const discountAmount  = Math.round(subtotal * (globalDiscount / 100) * 100) / 100;
    const total           = Math.round((subtotal - discountAmount) * 100) / 100;
    const expiresAt       = new Date(Date.now() + validDays * 86_400_000).toISOString();

    return {
      lines,
      subtotal:       Math.round(subtotal * 100) / 100,
      discountPct:    globalDiscount,
      discountAmount,
      total,
      validDays,
      expiresAt,
    };
  }

  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.quotation = { generateQuote };
})();
```

---

### 5.6 `domain/quality.js` — Control de calidad

```js
(function () {
  // Define los checkpoints obligatorios por técnica de impresión.
  // La vista de calidad los renderiza; domain solo define cuáles son
  // y si un lote pasó o no el control.

  const CHECKPOINTS = {
    sublimacion: [
      { id: 'color_match',    label: 'Coincidencia de color con prueba' },
      { id: 'no_bleeding',    label: 'Sin sangrado de tinta' },
      { id: 'full_coverage',  label: 'Cobertura 100% del área' },
    ],
    serigrafia: [
      { id: 'color_match',    label: 'Coincidencia de color Pantone' },
      { id: 'no_smearing',    label: 'Sin corrimiento de tinta' },
      { id: 'registration',   label: 'Registro correcto entre capas' },
      { id: 'opacity',        label: 'Opacidad uniforme' },
    ],
    bordado: [
      { id: 'thread_tension', label: 'Tensión de hilo correcta' },
      { id: 'no_loose_ends',  label: 'Sin cabos sueltos' },
      { id: 'backing_clean',  label: 'Respaldo limpio y cortado' },
      { id: 'density',        label: 'Densidad de puntadas correcta' },
    ],
    dtf: [
      { id: 'adhesion',       label: 'Adhesión completa sin burbujas' },
      { id: 'no_cracking',    label: 'Sin cuarteado en dobleces' },
      { id: 'color_match',    label: 'Coincidencia de color' },
    ],
    vinilo: [
      { id: 'edges_clean',    label: 'Bordes limpios sin levantamiento' },
      { id: 'no_bubbles',     label: 'Sin burbujas de aire' },
      { id: 'color_match',    label: 'Coincidencia de color' },
    ],
  };

  function getCheckpoints(technique) {
    return CHECKPOINTS[technique] ?? [];
  }

  /**
   * @param {{ technique: string, completedIds: string[] }}
   * @returns {{ passed: boolean, missing: object[] }}
   */
  function validateQC({ technique, completedIds }) {
    const required = getCheckpoints(technique);
    const missing  = required.filter(c => !completedIds.includes(c.id));
    return { passed: missing.length === 0, missing };
  }

  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.quality = { getCheckpoints, validateQC, CHECKPOINTS };
})();
```

---

### 5.7 `domain/inventory.js` — Reglas de inventario

```js
(function () {
  const DEFAULT_REORDER_POINT = 10; // unidades

  /**
   * Analiza el inventario y devuelve solo los ítems que requieren atención.
   * @param {object[]} items     — registros de stock con { sku, name, stock, reorderPoint? }
   * @param {object}  [overrides] — { [sku]: reorderPoint } para sobreescribir el punto de reposición
   * @returns {object[]} solo los ítems con status 'low' o 'out'
   */
  function checkAlerts(items, overrides = {}) {
    return items
      .map(item => {
        const reorderPoint = overrides[item.sku] ?? item.reorderPoint ?? DEFAULT_REORDER_POINT;
        const status = item.stock <= 0        ? 'out' :
                       item.stock <= reorderPoint ? 'low' : 'ok';
        return { ...item, reorderPoint, status };
      })
      .filter(item => item.status !== 'ok');
  }

  /**
   * Verifica si hay stock suficiente para cubrir una cantidad pedida.
   */
  function canFulfill(currentStock, qtyRequested) {
    if (currentStock >= qtyRequested)
      return { canFulfill: true, remaining: currentStock - qtyRequested };
    return { canFulfill: false, shortage: qtyRequested - currentStock };
  }

  /**
   * Calcula el punto de reposición recomendado basado en el consumo diario.
   */
  function recommendedReorderPoint({ dailyUsage, leadTimeDays, safetyDays = 3 }) {
    return Math.ceil(dailyUsage * (leadTimeDays + safetyDays));
  }

  window.Fluve.domain = window.Fluve.domain || {};
  window.Fluve.domain.inventory = { checkAlerts, canFulfill, recommendedReorderPoint };
})();
```

---

## 6 · Módulo Core (`app/`)

### 6.1 Router (`app/router.js`)

```js
(function () {
  const routes = [];

  function route(pattern, handler, opts = {}) {
    routes.push({ pattern, handler, opts });
  }

  function navigate(hash) { location.hash = hash; }

  function startRouter() {
    window.addEventListener('hashchange', render);
    render();
  }

  function render() {
    try {
      const { path, query } = parseHash(location.hash);
      for (const r of routes) {
        const params = match(r.pattern, path);
        if (params) {
          if (r.opts.role && !window.Fluve.session.hasRole(r.opts.role)) {
            return navigate(`#/auth?return=${encodeURIComponent(location.hash)}`);
          }
          mountView(r.handler, { params, query });
          return;
        }
      }
      mountView(window.Fluve.views.error, { params: {}, query: {} });
    } catch (e) {
      console.error('[router]', e);
    }
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.router = { route, navigate, startRouter };
})();
```

Registro de rutas en `main.js` (estáticas ANTES que dinámicas con `:param`):

```js
const { route } = window.Fluve.router;
const v = window.Fluve.views;

route('#/',                    v.home);
route('#/galeria',             v.galeria);
route('#/carrito',             v.carrito);
route('#/checkout',            v.checkout);
route('#/auth',                v.auth);
route('#/producto/:slug',      v.producto);
route('#/personalizar/:slug?', v.personalizador);
route('#/pedido/:id',          v.pedido);
route('#/cuenta/:seccion?',    v.cuenta,               { role: 'customer' });
route('#/admin',               v.adminDashboard,       { role: 'staff' });
route('#/admin/pedidos',       v.adminPedidos,         { role: 'staff' });
route('#/admin/config',        v.adminConfig,          { role: 'admin' });
// … resto de rutas admin con { role: 'staff' } o { role: 'admin' } …
```

### 6.2 Bus de eventos (`app/hooks.js`)

```js
(function () {
  const _listeners = {};

  function on(event, handler) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(handler);
    return () => off(event, handler);
  }

  function off(event, handler) {
    if (_listeners[event])
      _listeners[event] = _listeners[event].filter(h => h !== handler);
  }

  function emit(event, payload) {
    (_listeners[event] || []).forEach(h => {
      try { h(payload); }
      catch (e) { console.error(`[hooks] error en "${event}"`, e); }
    });
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.hooks = { on, off, emit };
})();
```

**Catálogo de eventos del sistema:**

| Evento | Payload | Emisor | Escuchan |
|---|---|---|---|
| `cart:item-added` | `{ productId, designId, qty, price }` | personalizador | shell (badge), analytics |
| `cart:updated` | `{ items, total }` | carrito | shell (badge counter) |
| `session:changed` | `user \| null` | session.js | shell, router |
| `lang:changed` | `'es' \| 'en'` | i18n.js | router (re-render) |
| `order:placed` | `{ orderId }` | checkout | admin, email mock |
| `production:stage-changed` | `{ orderId, from, to }` | admin/produccion | dashboard, notif |
| `seed:reset` | `void` | admin/config | main (reload) |

### 6.3 Configuración (`app/config.js`)

```js
(function () {
  const CONFIG = Object.freeze({
    features: {
      artistPortal:   true,
      b2bQuotations:  true,
      multiCurrency:  false,
      promos:         true,
      qualityControl: true,
    },
    defaultCurrency:     'USD',
    defaultLang:         'es',
    maxCartItems:        50,
    maxDesignFileSizeMB: 10,
    pricingVersion:      'v1',
    toastDurationMs:     4000,
    debounceSearchMs:    300,
    paginationPageSize:  20,
    seedOnEmpty:         true,
    debugRouter:         false,
    debugDao:            false,
  });

  window.Fluve = window.Fluve || {};
  window.Fluve.config = CONFIG;
})();
```

### 6.4 Sesión y roles (`app/session.js`)

Roles disponibles: `guest · customer · staff · admin`.
Jerarquía: `guest < customer < staff < admin`.

```js
(function () {
  const ROLES = { guest: 0, customer: 1, staff: 2, admin: 3 };

  function current() {
    try {
      const id = localStorage.getItem('fluve_session');
      return id ? window.Fluve._sessionUser ?? null : null;
    } catch { return null; }
  }

  function hasRole(min) {
    const u = current();
    return (ROLES[u?.role ?? 'guest'] ?? 0) >= (ROLES[min] ?? 0);
  }

  async function login(userId) {
    const user = await window.Fluve.dao.users.get(userId);
    if (!user) return false;
    window.Fluve._sessionUser = user;
    try { localStorage.setItem('fluve_session', String(userId)); } catch {}
    window.Fluve.hooks.emit('session:changed', user);
    return true;
  }

  function logout() {
    window.Fluve._sessionUser = null;
    try { localStorage.removeItem('fluve_session'); } catch {}
    window.Fluve.hooks.emit('session:changed', null);
    window.Fluve.router.navigate('#/auth');
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.session = { current, hasRole, login, logout };
})();
```

---

## 7 · Patrón de componentes IIFE

Cada archivo es un IIFE. Toma dependencias de `window.Fluve.*` (ya cargadas por el
orden de `<script>`) y expone su API en el mismo namespace.

```js
// components/button.js
(function () {
  const { el } = window.Fluve.dom;

  function button({ label, variant = 'primary', onClick, disabled = false }) {
    return el('button', {
      class:    `btn btn--${variant}`,
      onClick,
      disabled: disabled ? 'disabled' : null,
    }, label);
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.components = window.Fluve.components || {};
  window.Fluve.components.button = button;
})();
```

**Uso del dominio desde una vista:**

```js
// views/client/personalizador.js — ejemplo de cómo una vista usa domain/
(function () {
  const { el }         = window.Fluve.dom;
  const { validateDesign } = window.Fluve.domain.customizer;
  const { calculatePrice } = window.Fluve.domain.pricing;

  async function personalizadorView({ params }) {
    const producto = await window.Fluve.dao.products.getBySlug(params.slug);

    function onDesignChange(designConfig) {
      // La vista delega la validación al dominio
      const { valid, errors } = validateDesign({
        technique: designConfig.technique,
        dpi:       designConfig.dpi,
        colors:    designConfig.colors,
        areaCm2:   designConfig.areaCm2,
      });

      // Y delega el cálculo de precio al dominio
      const price = calculatePrice({
        basePrice: producto.base_price,
        technique: designConfig.technique,
        qty:       designConfig.qty,
        areaCm2:   designConfig.areaCm2,
      });

      // La vista solo renderiza los resultados que el dominio calculó
      updatePriceDisplay(price.total);
      updateValidationDisplay(valid, errors);
    }

    return renderPersonalizador(producto, onDesignChange);
  }

  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.personalizador = personalizadorView;
})();
```

---

## 8 · Reglas de código

1. **IIFE por archivo, namespace `window.Fluve.*`.** Sin globals sueltos.
2. **Orden de `<script>` = contrato de dependencias.** No se puede invertir.
3. **Domain nunca toca el DOM ni IndexedDB.** Solo parámetros → resultados.
4. **`async/await` para todo lo de IndexedDB.** Los DAO devuelven Promesas.
5. **`localStorage` e `IndexedDB` siempre en `try/catch`** con fallback en memoria.
6. **Sin `innerHTML` con datos del usuario.** Siempre `textContent` o nodos DOM.
7. **Sin `scrollIntoView`.** Usar `window.scrollTo(0,0)` tras navegar.
8. **Estados de vista siempre:** loading · vacío · sin resultados · error.
9. **Accesibilidad:** targets ≥ 44px · `:focus-visible` · ARIA en modales.
10. **`router.render()` en `try/catch`.** Evita fallos silenciosos.
11. **Llave de línea de carrito:** `'__none__'` como sentinel, no `designId ?? ''`.
12. **Las vistas no contienen lógica de negocio.** Delegan al domain y renderizan el resultado.

---

## 9 · Mapa de migración hacia Arquitectura B

| Arquitectura A | Arquitectura B | Tipo de migración |
|---|---|---|
| `domain/pricing.js` | `domain/pricing.ts` | Copiar + agregar tipos TS |
| `domain/production.js` | `domain/production.ts` | Copiar + agregar tipos TS |
| `domain/customizer.js` | `domain/customizer.ts` | Copiar + agregar tipos TS |
| `domain/royalties.js` | `domain/royalties.ts` | Copiar + agregar tipos TS |
| `domain/quotation.js` | `domain/quotation.ts` | Copiar + agregar tipos TS |
| `domain/quality.js` | `domain/quality.ts` | Copiar + agregar tipos TS |
| `domain/inventory.js` | `domain/inventory.ts` | Copiar + agregar tipos TS |
| `app/router.js` | Next.js App Router | Adaptar |
| `app/session.js` | Supabase Auth + middleware | Adaptar |
| `app/hooks.js` (event bus) | Zustand store + React Context | Adaptar |
| `app/config.js` | `lib/config.ts` + env vars | Adaptar |
| `app/i18n.js` | `next-intl` | Reemplazar |
| `data/db.js` + `data/dao.js` | Supabase client + queries | Migrar 1:1 por método |
| `data/seed.js` | `supabase/migrations/*_seed.sql` | Convertir objetos → INSERT |
| `components/*.js` | `components/ui/*.tsx` (shadcn/ui) | Reescribir en React |
| `views/client/*.js` | `app/(client)/*/page.tsx` | Reescribir en React |
| `views/admin/*.js` | `app/admin/*/page.tsx` | Reescribir en React |
