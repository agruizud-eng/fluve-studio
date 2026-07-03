# Esquema de datos · IndexedDB · Fluvë Studio (prototipo)

Este documento es el **contrato de datos completo** del prototipo. IndexedDB es la base local. Una sola base `fluve_studio`, versión `1`. Cada entidad es un **object store**; los índices habilitan las búsquedas/facetas de la UI.

> Cuando el prototipo se valide y se migre a producción, estos stores se traducen a tablas SQL / colecciones. Los nombres de campo se mantienen para que la migración sea 1:1.

---

## 1 · Apertura y upgrade (`data/db.js`)

```js
export const DB_NAME = 'fluve_studio';
export const DB_VERSION = 1;

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      // crear cada store con su keyPath + índices (tabla §3)
      const defs = STORE_DEFS;              // ver §3
      for (const s of defs) {
        if (db.objectStoreNames.contains(s.name)) continue;
        const os = db.createObjectStore(s.name, { keyPath: s.keyPath, autoIncrement: !!s.auto });
        for (const idx of (s.indexes || [])) os.createIndex(idx.name, idx.key, { unique: !!idx.unique, multiEntry: !!idx.multi });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
```

En `main.js`: abrir la DB; si el store `products` está vacío, correr `seed.reseed()` automáticamente en el primer arranque.

---

## 2 · DAO genérico (`data/dao.js`)

Una fábrica que envuelve cada store en una API basada en Promesas. Todos los métodos son `async`.

```js
function storeApi(name) {
  return {
    get:    (key)        => tx(name, 'readonly',  os => os.get(key)),
    getAll: ()           => tx(name, 'readonly',  os => os.getAll()),
    put:    (val)        => tx(name, 'readwrite', os => os.put(val)),         // upsert
    bulkPut:(arr)        => txBulk(name, arr),
    delete: (key)        => tx(name, 'readwrite', os => os.delete(key)),
    clear:  ()           => tx(name, 'readwrite', os => os.clear()),
    query:  (index, val) => tx(name, 'readonly',  os => os.index(index).getAll(val)),
    count:  ()           => tx(name, 'readonly',  os => os.count()),
  };
}
export const dao = {
  products: storeApi('products'), variants: storeApi('variants'), techniques: storeApi('techniques'),
  designs: storeApi('designs'),   artists: storeApi('artists'),   users: storeApi('users'),
  carts: storeApi('carts'),       orders: storeApi('orders'),     payments: storeApi('payments'),
  suppliers: storeApi('suppliers'), purchases: storeApi('purchases'), inventory: storeApi('inventory'),
  tickets: storeApi('tickets'),   quotes: storeApi('quotes'),     promos: storeApi('promos'),
  royalties: storeApi('royalties'), activity: storeApi('activity'), settings: storeApi('settings'),
  favorites: storeApi('favorites'),
};
```

Helpers específicos que las vistas van a necesitar (agregar sobre el DAO genérico): `products.getBySlug(slug)`, `orders.byUser(userId)`, `variants.byProduct(productId)`, `purchases.byProduct(productId)`, etc. — se resuelven con los índices de §3.

---

## 3 · Object stores (definición completa)

Leyenda: **PK** = keyPath. `idx:` = índices. Tipos orientativos.

### `products` — catálogo base
- **PK** `id` (string, slug-like: `"remera"`, `"hoodie"`)
- `idx:` `slug` (unique), `category`, `active`
- Campos: `id`, `slug`, `name`, `category` (`ropa|hogar|accesorios|granformato`), `basePrice` (number), `printAreaCm2` (number, área imprimible), `compatibleTechniques` (string[] de `techniqueId`), `defaultTechnique`, `colors` (`[{name, hex}]`), `sizes` (string[] o `null`), `images` (`{colorName: url}`), `description`, `pricingOverrideMargin` (number|null → si null hereda), `active` (bool), `createdAt`.

### `variants` — combinación color/talla con stock/costo (opcional pero recomendado)
- **PK** `id` (auto)
- `idx:` `productId`, `sku` (unique)
- Campos: `id`, `productId`, `sku`, `color`, `size`, `stock`, `costOverride` (number|null).

### `techniques` — técnicas de impresión + modelo de costo (A29)
- **PK** `id` (`"dtf"`, `"subl"`, `"serig"`, `"bord"`, `"vinil"`, `"dtfuv"`, `"granformato"`)
- Campos: `id`, `name`, `costModel` (`area|fixed|screens|stitches`), `rate` (number), `rateUnit` (`ml|m2|u|screen|millar`), `minQty`, `surchargePerUnit` (number, recargo al cliente en el personalizador), `idealFor`, `hint`, `active`.
- Modelos semilla (del backend A29):
  - `dtf` → área · $9,00/ml · `costModel:'area', rate:9, rateUnit:'ml'`
  - `subl` (Sublimación) → fijo · $2,80/u · `costModel:'fixed', rate:2.8, rateUnit:'u'`
  - `serig` (Serigrafía) → colores+tirada · $8/pantalla · `costModel:'screens', rate:8, rateUnit:'screen', minQty:10`
  - `bord` (Bordado) → puntadas · $1,20/millar · `costModel:'stitches', rate:1.2, rateUnit:'millar'`
  - `dtfuv` (DTF UV) → área · $12,00/ml
  - `granformato` (Gran formato) → área · $18,00/m² · `rateUnit:'m2'`
  - `vinil` (Vinilo textil) → área · $7,00/ml
- **Recargo al cliente** (personalizador, del hi-fi §02): `{dtf:0, subl:2, serig:0, bord:6, vinil:1}` — es `surchargePerUnit`, distinto del costo interno.

### `designs` — diseños/arte (de artistas)
- **PK** `id` (auto) · `idx:` `artistId`, `status`
- Campos: `id`, `title`, `artistId`, `imageUrl`, `status` (`pending|approved|rejected`), `tags` (string[], `multi`), `royaltyTier` (`base|pro`), `createdAt`.

### `artists` — creadores + regalías (A13/A42)
- **PK** `id` · `idx:` `handle` (unique)
- Campos: `id`, `handle` (`@kookylove`), `name`, `avatarUrl`, `tier` (`base|pro`), `royaltyRate` (number, %; deriva del tier vía config A24), `salesMonth` (number), `royaltiesAccrued` (number), `royaltiesPending` (number), `active`.

### `users` — clientes y staff (auth mock, F1)
- **PK** `id` · `idx:` `email` (unique), `role`
- Campos: `id`, `email`, `name`, `role` (`customer|staff|admin`), `passwordHash` (mock, texto plano en prototipo), `phone`, `addresses` (`[{id,label,line,city,zip,rut,default}]`), `taxId` (RUT/CI para e-factura DGI), `provider` (`email|google|apple`), `createdAt`.

### `carts` — carrito persistente (F6)
- **PK** `id` (`userId` o `"guest"`) · Campos: `id`, `lines` (`[CartLine]`), `coupon` (string|null), `updatedAt`.
- **CartLine:** `{ lineId, productId, config:{ color, size, side, techniqueId, designId|null, qty }, unitPrice, lineTotal }`. `config` es exactamente lo que consume el motor de costeo (`MOTOR_COSTEO.md`).

### `orders` — pedidos (A2/A3)
- **PK** `id` (`"FLV-2840"`) · `idx:` `userId`, `status`, `createdAt`
- Campos: `id`, `userId` (o guest), `lines` (snapshot de CartLine + mockup), `contact`, `shippingAddress`, `shippingMethod` (`express|standard`), `shippingCost`, `subtotal`, `tax`, `total`, `paymentId`, `status` (`recibido|produccion|qc|en_camino|entregado|cancelado`), `supplierId` (asignado en admin), `qcStatus`, `trackingSteps` (`[{step, at, done}]`), `createdAt`.
- Los **5 pasos de tracking**: `recibido → produccion → qc → en_camino → entregado` (README §9).

### `payments` — pagos simulados (A16)
- **PK** `id` (`"TX-9910"`) · `idx:` `orderId`, `status`
- Campos: `id`, `orderId`, `method` (`card|paypal|transfer|mercadopago`), `amount`, `status` (`approved|refunded|failed`), `createdAt`, `refundOf` (id|null).

### `suppliers` — imprentas aliadas (A5/A36)
- **PK** `id` · Campos: `id`, `name`, `techniques` (string[]), `rating` (number), `zones` (string[]), `active`, `notes`.

### `purchases` — compras/lotes (A28/A40) → base del promedio ponderado
- **PK** `id` (auto) · `idx:` `productId`, `supplierId`, `date`
- Campos: `id`, `productId` (o `materialId` para consumibles), `supplierId`, `qty`, `unitCost`, `date`, `type` (`product|material`), `width` (para rollos DTF, cm), `areaCm2` (para materiales por área).
- El **costo base de un producto** = promedio ponderado de `unitCost` sobre las `purchases` de ese `productId` (ver `MOTOR_COSTEO.md`).

### `inventory` — inventario por área (A30) → consumibles en rollo
- **PK** `id` · Campos: `id`, `material` (`dtf_film`, `vinilo`…), `unit` (`cm2`), `stockArea` (cm² disponibles), `avgCostPerCm2` (promedio ponderado sobre $/cm²), `lots` (`[{purchaseId, areaCm2, costPerCm2}]`).
- El consumo descuenta **área**, no unidades; lotes de distinto ancho (55 vs 60 cm) se promedian sobre $/cm².

### `quotes` — cotizaciones B2B (A15/A26)
- **PK** `id` · `idx:` `clientId`, `status` · Campos: `id`, `clientId`, `items`, `subtotal`, `margin`, `status` (`draft|sent|accepted|rejected`), `createdAt`.

### `promos` — promociones/cupones (A17)
- **PK** `code` (`"WELCOME10"`) · Campos: `code`, `type` (`percent|fixed|freeship`), `value`, `active`, `expiresAt`, `minSubtotal`.

### `royalties` — liquidaciones de regalías (A24/A42)
- **PK** `id` (auto) · `idx:` `artistId`, `status` · Campos: `id`, `artistId`, `amount`, `status` (`pending|paid`), `paidAt`, `orderRefs` (string[]).

### `tickets` — soporte (A18/A43)
- **PK** `id` · `idx:` `userId`, `orderId`, `status` · Campos: `id`, `userId`, `orderId` (o null), `subject`, `messages` (`[{from, text, at}]`), `status` (`open|pending|closed`), `createdAt`.

### `favorites` — favoritos (F6)
- **PK** `id` (auto) · `idx:` `userId`, `productId` · Campos: `id`, `userId`, `productId`, `createdAt`.

### `activity` — audit log (G8)
- **PK** `id` (auto) · `idx:` `entity`, `at` · Campos: `id`, `at`, `userId`, `action`, `entity`, `entityId`, `before`, `after`.
- Escribir con `logActivity(action, entity, entityId, {before, after})` en toda acción sensible del admin (G6/G8).

### `settings` — configuración global (A21/A27) → una sola fila
- **PK** `key` · Fila principal `key:'pricing'`:
  - `targetMargin` (0.38), `vat` (0.22), `gatewayFee` (0.03), `minMargin` (0.25), `rounding` (`.90`), `costingMethod` (`weighted|fifo`).
  - `categoryExceptions` (`{ hogar:0.50, granformato:0.45 }`), `royaltyTiers` (`{ base:0.10, pro:0.20 }`).
  - `shipping` (`{ expressCost:4.9, standardFree:true, freeFrom:50 }`).
- Otras filas: `key:'i18n'` (idioma default), `key:'schema'` (`{version, lastSeed}`).

---

## 4 · Datos semilla (`data/seed.js` → `SEED`)

El seed debe alcanzar para que **toda la UI se sienta viva** (nada vacío). Mínimos recomendados:

- **products (≥6):** `remera` ($24,90), `hoodie` ($44,90), `taza` ($11,90), `tote` ($14,90), `funda` ($16,90), + `cuadro`/`gorra`. Con `colors`, `sizes`, `printAreaCm2`, `compatibleTechniques`, `images` (usar los PNG de `assets/img/` o los que ya cargó el cliente).
- **techniques (7):** las de §3 con sus modelos de costo exactos.
- **artists (≥3):** `@kookylove`, `@studiofolk`, `@lettering.uy` con tier y regalías (espejar el backend A13).
- **designs (≥12):** repartidos entre artistas, mayoría `approved`, algunos `pending` (para moderación).
- **users (≥4):** 1 `admin`, 1 `staff`, 2 `customer` (uno con pedidos e historial). Passwords mock.
- **suppliers (≥3):** `Imprenta Sur`, `TextilPro`, `GranFormato Co` con técnicas y rating.
- **purchases (≥8):** varios lotes por producto a **distinto `unitCost`** — para que el promedio ponderado dé un número no trivial. Incluir lotes de material DTF de 55 y 60 cm de ancho (para inventario por área).
- **inventory (≥2 materiales):** `dtf_film`, `vinilo` con `avgCostPerCm2` derivado de sus lotes.
- **orders (≥6):** repartidos en los 5 estados de tracking (uno en cada paso + uno entregado + uno cancelado), ligados a un customer.
- **payments:** uno por pedido pagado; incluir 1 `refunded`.
- **promos:** `WELCOME10` (percent 10), `FREESHIP` (freeship).
- **royalties:** algunas `pending` y alguna `paid` (para probar liquidación).
- **tickets (≥2):** uno abierto ligado a pedido, uno cerrado.
- **settings:** la fila `pricing` con los valores de §3.
- **activity:** algunas entradas de ejemplo (asignó proveedor, editó precio global, liquidó regalías…) espejando el audit log del backend.

> Todos los importes en la misma moneda del prototipo. Fechas relativas a "hoy" para que el dashboard se vea actual.

---

## 5 · Notas de integridad

- **IDs legibles** donde el negocio los usa (`FLV-2840`, `TX-9910`, slugs de producto); `autoIncrement` para entidades internas.
- **Snapshots en pedidos:** un `order.line` guarda el precio y config al momento de comprar; cambiar el catálogo después no altera pedidos pasados (regla del A27).
- **Fusión de carrito (F6):** al iniciar sesión, mergear `carts['guest']` con `carts[userId]` y borrar el guest.
- **Transacciones:** operaciones que tocan varios stores (crear pedido = `orders.put` + `payments.put` + `logActivity` + limpiar carrito) deben ir en una sola transacción IndexedDB cuando sea posible, o secuenciadas con manejo de error.
