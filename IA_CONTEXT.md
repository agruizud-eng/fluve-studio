# IA_CONTEXT.md — Fluvë Studio
> Archivo de contexto para sesiones de desarrollo con IA.
> Actualizar este archivo al final de cada sesión relevante.
> **Última actualización:** Julio 2026

---

## 1. Qué es el proyecto

Fluvë Studio es un **marketplace creativo de productos personalizados** donde artistas, clientes y proveedores se conectan a través de una plataforma central.

- Los **artistas** suben diseños originales y reciben regalías automáticas por cada venta.
- Los **clientes** descubren diseños, los personalizan sobre productos físicos y compran.
- **Fluvë** coordina la producción a través de una red de proveedores externos especializados en impresión.
- La plataforma actúa como intermediario: selección del diseño, comercialización, producción, QC, entrega y comunidad.

**No es una tienda tradicional.** La compra parte del diseño, no del producto.

---

## 2. Las tres reglas del modelo de negocio

Estas reglas son absolutas. Nunca violarlas en ninguna implementación.

```
REGLA 1 — DISEÑO sin precio
  El diseño por sí solo no tiene precio final.
  No mostrar precio en fichas de diseño, galería ni perfil de artista.

REGLA 2 — PRODUCTO sin diseño
  El producto base es el objeto físico en blanco.
  No tiene artista, no tiene diseño asociado, no tiene precio final.

REGLA 3 — PEDIDO es la única entidad con precio
  Diseño + Producto + Configuración (zona + técnica + color + talla + qty)
  = PEDIDO con precio calculado en el momento de la compra.
```

---

## 3. Stack técnico

### Architecture A — Prototipo funcional (estado actual)

```
Tecnología:   Vanilla JS ES6+ (IIFEs, namespace window.Fluve.*)
Base de datos: IndexedDB · DB_VERSION = 2 · 28 stores
Routing:      Hash-based (#/)
Build:        Sin build tools. Funciona con doble clic en Chrome/Edge (file://)
Testing:      jsdom + fake-indexeddb
```

**Ubicaciones:**
```
/tmp/fluve-studio/        → working directory (fuente principal)
/tmp/test-copy/           → copia para tests jsdom
/tmp/test-harness/        → scripts de test (.js)
Outputs: /mnt/user-data/outputs/fluve-studio-*.zip
```

**Orden de carga de scripts (index.html) — CRÍTICO:**
```
app/util/dom.js
app/util/viewState.js
app/util/confirm.js
app/util/favorites.js
data/db.js
data/dao.js
app/session.js        ← después de dao.js (usa dao en loadSession)
app/router.js         ← después de session.js (importa session)
data/pricing.js
data/seed.js
app/shell.js
app/cart.js
views/client/*.js     (en orden de dependencias)
views/admin/*.js      (en orden de dependencias)
app/main.js           ← siempre el último
```

### Architecture B — Producción (en desarrollo)

```
Frontend:     Next.js 14 App Router + TypeScript strict
Base de datos: Supabase (PostgreSQL + Storage + Auth + RLS)
Estilos:      Tailwind CSS
Entorno local: Docker · npx supabase start --ignore-health-check
API local:    http://127.0.0.1:54321
IDE:          VS Code + Claude Code extension (Windows, Auto-accept mode)
```

**Schema autoritativo:** `fluve_schema.sql` (1,042 líneas)
- 12 enum types
- 19 tablas en orden de FK dependency
- 53 índices
- 7 familias de triggers
- 11 filas seed en `platform_settings`

**Secuencia backend-first acordada:**
```
B1 Storage buckets    ✓ completado (003_storage.sql)
B2 RLS policies       en progreso  (004_rls.sql)
B3 Server actions:    images → designs → products → artists →
                      users → cart/orders → admin →
                      MercadoPago → Stripe → transactional email
B4 Frontend views     pendiente (después de backend estable)
```

---

## 4. Modelo de datos — 20 tablas

### Tablas por grupo

```
NÚCLEO (5)
  users · artists · designs · orders · order_lines

CATÁLOGO (8)
  products · product_variants · product_print_zones
  zone_techniques · techniques
  categories · design_categories · product_categories

ECONÓMICO (4)
  royalties · payments · purchases · promos

OPERACIÓN (1)
  suppliers

COMUNIDAD (3)
  favorites · tickets · activity_log
```

### Tablas clave con campos mínimos

```sql
users             id · email · name · role(customer|staff|admin) · createdAt
artists           id · userId(FK) · handle · tier(base|pro) · royaltyRate · status
designs           id · artistId(FK) · title · isOwn · status · imageUrl · imageBase64
products          id · slug · name · category · type · material · basePricePVP · active
product_variants  id · productId(FK) · colorName · colorHex · size · sku · stock · stockMinimo
product_print_zones id · productId(FK) · name · location · widthCm · heightCm · areaCm2 · defaultTech
zone_techniques   id · zoneId(FK) · techniqueId(FK) · active
categories        id · type(tema|estilo|causa|producto-tipo|producto-audiencia) · name · parentId
design_categories id · designId(FK) · categoryId(FK)
product_categories id · productId(FK) · categoryId(FK)
techniques        id · name · costModel · rate · rateUnit · minQty
orders            id · userId(FK) · status · total · supplierId(FK) · shippingCost · createdAt
order_lines       id · orderId(FK) · productId · designId · variantId · zoneId · techniqueId · qty · areaCm2 · unitPrice · royaltyAmt
suppliers         id · name · techniques[] · zones[] · rating · active · notes
purchases         id · supplierId(FK) · productId(FK) · type(product|material) · qty · unitCost · areaCm2 · costPerCm2
royalties         id · orderId(FK) · artistId(FK) · designId(FK) · amount · status(pending|paid) · paidAt
payments          id · orderId(FK) · userId(FK) · amount · method(mp|stripe|transfer) · status
favorites         id · userId(FK) · designId(FK) · createdAt
tickets           id · userId(FK) · subject · status(open|closed) · messages[] · createdAt
activity_log      id(auto) · userId(FK) · action · entity · entityId · before(JSON) · after(JSON) · createdAt
```

### Reglas de integridad críticas

```
- El precio NUNCA va en designs ni en products directamente.
  Solo en order_lines.unitPrice.
- El stock NUNCA va en products. Solo en product_variants.stock.
- La relación design↔product NO existe en DB hasta que hay un order_line.
- designs.id es autoIncrement. Al crear manualmente usar Date.now() como ID
  (los rangos no colisionan: auto empieza en 1, Date.now() en ~1700000000000).
- promos.code es PK y SIEMPRE en UPPERCASE.
  cart.js hace .toUpperCase() antes del lookup. El seed debe insertar en UPPERCASE.
- cart.lineKey() usa designId ?? '__none__' (NO vacío). Sin esto colisionan
  líneas con distinto diseño.
```

---

## 5. Fórmulas del motor de precios

```
// Costo real
CostoReal = CostoProductoWA + CostoImpresión(areaCm2 × rate) + Overhead

// Margen (cascada de herencia)
MargenEfectivo = overrideManual ?? excepciónCategoría ?? targetMargin(38%)

// PVP final
PrecioNeto = CostoReal / (1 − MargenEfectivo)
PVPBruto   = PrecioNeto × 1.22                    // IVA Uruguay 22%
PVPFinal   = redondear(PVPBruto, 0.90)             // redondeo comercial

// Regalía del artista (sobre margen bruto, no sobre PVP)
MargenBruto  = PrecioNeto − CostoReal
RegalíaBase  = MargenBruto × 0.10                  // Tier Base
RegalíaPro   = MargenBruto × 0.20                  // Tier Pro
// Diseño propio Fluvë: regalía = 0

// Lo que retiene Fluvë
MargenNetFluvë = PVPFinal − IVA(22%) − CostoReal − Regalía − Pasarela(3%) − Envío
// Objetivo: ≥ 25% del PrecioNeto · Alerta si cae bajo minMargin
```

**Técnicas de impresión:**

| Técnica | Modelo | Rate | Mínimo |
|---|---|---|---|
| DTF | Por área m² | $9/m² | 1 u. |
| Sublimación | Fijo + recargo | $2,80/u + $2 | 1 u. |
| Serigrafía | Por pantallas | $8/pantalla | 10 u. |
| Bordado | Por puntadas | $1,20/millar | 1 u. |
| Gran formato | Por área m² | $18/m² | 1 u. |

---

## 6. Rutas del sistema

### Cliente (públicas)

```
#/                        Home
#/galeria                 Galería de diseños (alias: #/shop)
#/producto/:id            Ficha de diseño
#/personalizar/:slug?     Personalizador
#/carrito                 Carrito
#/checkout                Checkout
#/pedido/:id              Confirmación + tracking
#/auth                    Login / Registro / Recuperar
#/artista/:handle         Perfil público del artista
#/vende-tu-arte           Landing para artistas
#/cotizacion              Cotización B2B (alias: #/empresas)
#/editor                  Editor de diseño online
#/faq                     FAQ (editable desde CMS)
#/como-funciona           Cómo funciona
#/envios                  Envíos y entregas
#/devoluciones            Devoluciones
#/terminos                Términos de uso
#/privacidad              Política de privacidad
#/404  #/500  #/offline   Páginas de error
```

### Cliente (protegidas — role: customer)

```
#/cuenta/:seccion?        Mi cuenta (10 secciones)
#/artist/shops            Redirect al portal del artista
#/artist/shops/:id        Portal privado del artista
```

### Admin (role: staff)

```
#/admin                   Dashboard KPIs (A1)
#/admin/pedidos           Lista pedidos (A2)
#/admin/pedidos/nuevo     Nuevo pedido manual (A39)
#/admin/pedidos/:id       Detalle pedido (A3)
#/admin/produccion        Kanban (A4)
#/admin/proveedores       Lista (A5) · /nuevo (A37) · /:id (A36)
#/admin/calidad           Cola QC (A35)
#/admin/packaging         Packaging (A7)
#/admin/envios            Envíos (A8)
#/admin/productos         Lista (A9) · /:id (A10/C2 alta)
#/admin/precios           Motor de precios (A23)
#/admin/tecnicas          Lista (A11) · /:id/costo (A29)
#/admin/disenos           Moderación (A12) · /nuevo · /:id
#/admin/artistas          Lista + solicitudes (A13) · /:id (A42)
#/admin/regalias          Regalías por diseño (A24)
#/admin/compras           Lista (A28) · /nuevo (A40)
#/admin/inventario        Inventario materiales (A30)
#/admin/clientes          CRM (A14) · /:id (A41)
#/admin/cotizaciones      Cotizaciones B2B (A15)
#/admin/pagos             Pagos (A16)
#/admin/promos            Cupones (A17)
#/admin/soporte           Tickets (A18) · /:id (A43)
#/admin/reportes          Reportes (A19) · /equilibrio (A32)
#/admin/contenido         CMS (A20)
#/admin/ajustes           Ajustes globales (A21)
#/admin/equipo            Equipo y roles (A22)
#/admin/actividad         Audit log (A44)
#/admin/config            Config / Seed / Login As (SIN role — demo entry)
```

**Regla de orden en main.js:** rutas estáticas ANTES de dinámicas.
```js
route('#/admin/pedidos/nuevo', ...)   // primero: estática
route('#/admin/pedidos/:id', ...)     // después: dinámica
route('#/admin/pedidos', ...)         // después: lista
```

---

## 7. Convenciones de código — Architecture A

### Estructura de un módulo cliente

```js
// views/client/ejemplo.js
(function () {
  'use strict';
  const { el } = window.Fluve.dom;

  async function miVista({ params, query }) {
    const wrap = el('div', { class: 'fu' });
    // ... lógica
    return wrap;
  }

  window.Fluve.views.client.miVista = miVista;
})();
```

### Estructura de un módulo admin

```js
// views/admin/ejemplo.js
(function () {
  const { el } = window.Fluve.dom;
  const A = () => window.Fluve.admin;

  async function adminEjemplo() {
    const wrap = A().adminPageWrap(
      'Título',
      [el('span', {}, 'Sección'), el('b', { style: 'color:var(--txt)' }, 'Vista')],
      el('button', { class: 'btn btn--primary' }, 'Acción'),
    );
    // ... lógica
    return wrap;
  }

  window.Fluve.views.admin.ejemplo = adminEjemplo;
})();
```

### Creación de elementos DOM — el()

```js
// CORRECTO: null dentro de el() → seguro (el() lo filtra)
el('div', {}, condition ? el('span', {}, 'texto') : null)

// INCORRECTO: null en .append() nativo → renderiza el texto "null"
elemento.append(condition ? el('span', ...) : null)   // ❌ BUG

// CORRECTO: separar el append condicional
if (condition) elemento.append(el('span', ...))       // ✓
```

### Patrones del DAO

```js
// Leer todos
const items = await window.Fluve.dao.designs.getAll();

// Leer uno por PK
const item = await window.Fluve.dao.designs.get(id);

// Crear / actualizar (upsert)
await window.Fluve.dao.designs.put({ id, title, ... });

// Eliminar
await window.Fluve.dao.designs.delete(id);

// Índices secundarios
await window.Fluve.dao.designs.byArtist(artistId);
await window.Fluve.dao.designs.byUser(userId);
await window.Fluve.dao.artists.byUser(userId);     // ← evita getAll()+find O(n)
await window.Fluve.dao.orders.bySupplier(supplierId);
await window.Fluve.dao.favorites.byDesign(designId);

// Audit log
await window.Fluve.dao.logActivity('entity.action', 'tableName', entityId, {
  before: { campo: valorAnterior },
  after:  { campo: valorNuevo },
});
```

### Protección de roles

```js
// En main.js
route('#/admin/pedidos', A.pedidos, { role: 'staff' });    // bloqueado si < staff
route('#/cuenta', C.cuenta, { role: 'customer' });          // bloqueado si no auth

// Jerarquía numérica: customer(1) < artist(2) < staff(3) < admin(4)
// hasRole(minRole) verifica que el rol actual ≥ minRole

// En handlers que verifican propietario manualmente:
if (artist.userId !== user.id && user.role !== 'staff') {
  return viewState('error', { message: 'Acceso denegado' });
}
```

### CSS — clases que existen vs clases que NO existen

```
✓ EXISTEN en client.css:
  .fu .card .btn .btn--primary .btn--ghost .btn--danger
  .mono-label .filter-pill .filter-pill.active .chip
  .fld .fld:focus .field .field__label
  .ctrl-row .ctrl-opts .opt-btn .opt-btn.active
  .gallery-main__meta .gallery-grid .design-card-g
  .design-card-g__img .design-card-g__foot .design-card-g__overlay
  .artist-profile .artist-hero .artist-avatar-big .artist-tier-badge
  .account-layout .account-nav .account-nav__item
  .order-status-chip .status-recibido .status-entregado .status-cancelado

✗ NO existen (no usar):
  .ctrl-label → usar .mono-label
  .ctrl-group → usar div con inline style
  .gallery-meta → usar .gallery-main__meta
  .admin-fld en el cliente → usar .fld
```

---

## 8. Seguridad

```
Autenticación:   Sessions en localStorage (prototype).
                 Production: Supabase Auth con JWT.

#/admin/config:  INTENCIONALMENTE público — es el punto de entrada demo.
                 Permite Login As sin password.
                 EN PRODUCCIÓN: eliminar o proteger con auth real.

loginAs():       Solo disponible en config.js (modo demo/desarrollo).
                 Permite impersonar cualquier usuario sin validar password.

Passwords:       En prototype se guardan en plano en IndexedDB (demo only).
                 En Architecture B: Supabase maneja auth completamente.

RLS:             004_rls.sql en progreso para Architecture B.
                 Cada tabla debe tener políticas por rol antes de producción.
```

---

## 9. Flujos principales implementados

### Flujo de compra (cliente)

```
#/ → galería → ficha diseño → personalizar → carrito → checkout → pedido confirmado
```

### Flujo del artista

```
#/vende-tu-arte (CTA) → según estado:
  Sin auth       → #/auth?mode=reg&return=...
  Sin solicitud  → scroll al formulario
  Pendiente      → toast "en revisión"
  Aprobado       → #/artist/shops/:artistId
```

### Flujo de moderación de diseños (admin)

```
Artista sube diseño → status:'pending'
G7 notificación → #/admin/artistas (tab Solicitudes)
Operador completa checklist → aprueba o rechaza
status:'approved' → aparece en galería automáticamente
```

### Flujo de pedido (producción)

```
RECIBIDO → [asignar proveedor] → EN PRODUCCIÓN →
CONTROL DE CALIDAD → [pasa/falla] → PACKAGING →
LISTO PARA ENVÍO → EN CAMINO → ENTREGADO →
[calcular regalía] → liquidación mensual
```

---

## 10. Estado actual de implementación

### Completado ✓

```
Frontend cliente:
  ✓ Home (#/) con 6 productos más vendidos + 4 diseños destacados
  ✓ Galería (#/galeria / #/shop) con filtros reactivos (Para, Sobre producto, Color)
  ✓ Ficha de diseño (#/producto/:id)
  ✓ Personalizador (#/personalizar/:slug) con §8.3 logo options y §8.4 "Necesito un diseño"
  ✓ Carrito, checkout, pedido confirmado + tracking
  ✓ Auth (login / registro / recuperar) con checkbox de términos funcional
  ✓ Mi Cuenta (10 secciones: resumen, perfil, seguridad, facturación, pedidos, diseños,
     favoritos, pagos+PDF, soporte+chat, direcciones)
  ✓ Portal privado del artista (#/artist/shops/:id) con 9 módulos
  ✓ Perfil público del artista (sin info privada — §9.2)
  ✓ Galería sin precio en diseños (§9.3)
  ✓ Favoritos funcionales con toggle real a IndexedDB
  ✓ Páginas de error (404, 500, offline)
  ✓ FAQ dinámica desde CMS
  ✓ Términos y Privacidad (#/terminos, #/privacidad)
  ✓ Vende tu arte con CTA inteligente (3 estados)
  ✓ Cotización B2B con campo Observaciones
  ✓ Editor de diseño online (simplificado)

Backend admin (A1-A44):
  ✓ Dashboard KPIs (A1)
  ✓ Pedidos: lista (A2), detalle (A3), nuevo manual (A39)
  ✓ Producción kanban (A4)
  ✓ Proveedores: lista (A5), detalle (A36), alta/editar (A37)
  ✓ Calidad QC (A35), Packaging (A7), Envíos (A8)
  ✓ Productos: lista (A9), detalle+alta editable con tabs (A10/C2)
  ✓ Motor de precios (A23)
  ✓ Técnicas: lista (A11), modelo de costo (A29)
  ✓ Diseños: moderación con preview+checklist (A12), alta diseño propio, detalle/editar
  ✓ Artistas: lista+solicitudes+rechazados (A13), detalle (A42)
  ✓ Regalías por diseño (A24)
  ✓ Compras/Lotes: lista (A28), registrar (A40)
  ✓ Inventario (A30)
  ✓ Clientes CRM: lista (A14), detalle (A41)
  ✓ Cotizaciones B2B (A15), Pagos (A16), Cupones (A17)
  ✓ Soporte: lista (A18), detalle ticket (A43)
  ✓ Reportes (A19), punto equilibrio (A32)
  ✓ CMS / Contenido (A20)
  ✓ Ajustes globales (A21)
  ✓ Equipo y roles con Login As (A22)
  ✓ Audit log inmutable (A44)
  ✓ Config / Seed (entrada demo, sin role)
  ✓ Notificaciones G7: panel real con alertas por categoría

Infraestructura:
  ✓ DB_VERSION = 2 con índices: artists.userId, designs.userId,
    favorites.designId, orders.supplierId
  ✓ DAO helpers: byUser, byArtist, bySupplier, byDesign
  ✓ Mega menú artistas dinámico (4 bloques × 6, links a #/artista/:handle)
  ✓ Router con try/catch en render()
  ✓ cart.lineKey() con __none__ sentinel
  ✓ Favorites utility (window.Fluve.favs)
```

### Pendiente ✗

```
Alta prioridad:
  ✗ product_print_zones: zonas de impresión formales en DB y UI
  ✗ product_variants: stock real por color+talla (hoy stock está en products)
  ✗ Mockup realista: composición visual diseño+producto con cambio de color
  ✗ Editor avanzado (canvas real con Fabric.js o Konva — actual es DOM simplificado)
  ✗ Generación de archivo de producción (PDF/PNG limpio sin mockup)

Medio plazo:
  ✗ Sistema de categorías formal (hoy son tags planos, no tabla categories)
  ✗ Colecciones de diseños
  ✗ Design Challenges (votación de la comunidad)
  ✗ Historial de búsquedas
  ✗ i18n real ES/EN (textos hardcodeados hoy)
  ✗ Cookie consent
  ✗ Reseñas de productos conectadas a DB
  ✗ Migración pedidos guest → userId al crear cuenta

Architecture B pendiente:
  ✗ B2 RLS policies completas (004_rls.sql)
  ✗ Server actions: images → designs → products → artists → users →
    cart/orders → admin → MercadoPago → Stripe → email transaccional
  ✗ Vistas frontend de Architecture B (después de backend estable)
  ✗ Migración seed.js a SQL inserts (parcialmente hecho)

Futuro:
  ✗ Agente IA para asignación de proveedor (sugerencias automáticas)
  ✗ Gift cards
  ✗ Ranking de artistas y diseños
  ✗ Integración logística real (seguimiento de envíos)
```

---

## 11. Bugs conocidos y errores comunes

### Bugs resueltos (no volver a introducir)

```
BUG: null en .append() y .replaceChildren() nativos renderiza como texto "null"
FIX: Usar if() separado o array.push() condicional. Nunca pasar null directo.

BUG: ctrl-label / ctrl-group → clases que no existen en client.css
FIX: Usar .mono-label y div con inline style respectivamente.

BUG: gallery-meta → clase incorrecta
FIX: Usar .gallery-main__meta (tiene el flex layout definido).

BUG: admin-fld en componentes del cliente
FIX: Usar .fld para inputs del cliente. .admin-fld solo en vistas admin.

BUG: Wrapper div alrededor de design-card-g rompe el grid CSS
FIX: El fav button debe ir DENTRO del <a class='design-card-g'> (tiene position:relative).

BUG: Ruta estática después de dinámica del mismo prefijo
FIX: Siempre registrar estáticas ANTES en main.js:
     route('#/admin/pedidos/nuevo', ...)   primero
     route('#/admin/pedidos/:id', ...)     después

BUG: params.idShopArtist → params era {}, id era undefined
FIX: Usar :id en lugar de :idShopArtist en la definición de ruta.

BUG: artists.getAll() + .find(a => a.userId === user.id) → O(n) en cada request
FIX: Usar dao.artists.byUser(userId) que usa el índice userId.

BUG: cart.lineKey con designId??'' → colisión entre líneas sin diseño y diseño vacío
FIX: Usar designId??'__none__' como sentinel.

BUG: promos con código en minúsculas no encontradas (lookup es case-sensitive)
FIX: Siempre insertar códigos en UPPERCASE. El seed ya usa WELCOME10, FREESHIP.
```

### Errores comunes que evitar

```
ERROR: Mostrar precio en ficha de diseño o galería → viola Regla 3
ERROR: Mostrar royaltyRate en perfil público del artista → info privada (§9.2)
ERROR: Usar datos hardcodeados cuando deben venir de DB
ERROR: Olvidar logActivity() en operaciones admin (se pierde el audit trail)
ERROR: Llamar session.js o router.js antes de db.js y dao.js en el HTML
ERROR: Exportar handlers en el orden incorrecto (el último archivo gana)
       Ejemplo: si fase6.js exporta tecnicaCosto después de catalogo.js, gana fase6.js
ERROR: DB_VERSION sin incrementar al agregar nuevos índices
       → Los usuarios con DB existente nunca obtienen los nuevos índices
ERROR: .replaceChildren(null) → renderiza "null" como texto
```

---

## 12. Lo que NO tocar

```
INTOCABLE — Lógica de negocio validada:
  data/pricing.js              Motor de precios con 29 tests
  Las 3 reglas del modelo de negocio (ver §2)
  El cálculo de regalías (royaltyRate × MargenBruto)

INTOCABLE — Diseño visual existente:
  Cualquier elemento de diseño sin autorización explícita del usuario
  Regla: SOLO agregar mejoras. Nunca modificar lo existente sin pedirlo.
  Las PIL de color (CSS vars: --accent, --cyan, --magenta, --yellow, --green)

INTOCABLE — Estructura de archivos:
  app/util/dom.js              Función el() con filtrado de null
  app/util/viewState.js        Estados loading/empty/error/not-found
  app/util/confirm.js          Dialog de confirmación
  El orden de carga de scripts en index.html

INTOCABLE — Seguridad:
  El role gating en main.js (no bajar el nivel de protección de ninguna ruta)
  La verificación de propietario en artist-shop.js (artist.userId !== user.id)

CUIDADO — Puede cambiar con autorización:
  DB_VERSION → incrementar SIEMPRE que se agreguen índices o stores nuevos
  main.js → cualquier cambio de rutas requiere verificar el orden estático/dinámico
```

---

## 13. Credenciales de demo

```
Panel admin:    #/admin/config → Login As staff
                admin@fluve.uy / admin123
                staff@fluve.uy / staff123

Artistas:       @kookylove, @studiofolk, @lettering.uy  (password: test123)
Clientes:       cliente1@test.com, cliente2@test.com    (password: test123)

Cupones:        WELCOME10 (10% descuento)
                FREESHIP  (envío gratis)

Supabase local: http://127.0.0.1:54321
                (configurado en .env.local y CLAUDE.local.md)
```

---

## 14. Patrones de testing

```js
// Estructura base de test jsdom
const { JSDOM } = require('jsdom');
process.on('unhandledRejection', r => { if (r?.message?.includes('IndexedDB')) return; });

(async () => {
  const dom = await JSDOM.fromFile('/tmp/test-copy/index.html', {
    url: 'file:///tmp/test-copy/index.html',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true
  });
  await new Promise(r => setTimeout(r, 1500)); // esperar inicialización

  const w = dom.window, F = w.Fluve;
  let p = 0, f = 0;
  function ck(label, condition) {
    if (condition) { console.log(' ✓ ' + label); p++; }
    else           { console.log(' ✗ ' + label); f++; }
  }

  // Login como staff para acceder a admin
  F?.session?.loginAs({ id: 'adm', name: 'Admin', email: 'a@a.com', role: 'staff' });

  // Navegar y esperar
  w.location.hash = '#/admin/productos';
  await new Promise(r => setTimeout(r, 400));
  ck('Ruta carga', w.location.hash === '#/admin/productos');

  console.log(`\nTotal: ${p+f} · ✓ ${p} · ✗ ${f}`);
  dom.window.close();
})();
```

**Antes de ejecutar tests:**
```bash
cp -r /tmp/fluve-studio/* /tmp/test-copy/
python3 -c "
import re, pathlib
p = pathlib.Path('/tmp/test-copy/index.html')
p.write_text(re.sub(r'<link[^>]*fonts\.g[^>]+>\n?', '', p.read_text()))
"
```

**Verificar sintaxis de todos los archivos:**
```bash
cd /tmp/fluve-studio && for f in $(find app views -name "*.js"); do
  node --check "$f" 2>&1 | grep -v "^$" | sed "s|^|FAIL: $f: |"
done && echo "=== Todos OK ==="
```

---

## 15. Arquitectura de la capa de navegación pública

```
Menú principal
│
├── Galería / Shop (#/galeria)
│   ├── Pills superiores: filtro por Estilo (único lugar — §7.2)
│   ├── Sidebar: Para, Sobre producto, Color (filtros reactivos — §7.1)
│   ├── Meta: conteo + "Más populares / Más recientes" (combobox .fld)
│   └── Cards: design-card-g con ♡ dentro del card, artista como link
│
├── Mega menú Artistas (§5.1)
│   ├── Bloque 1: Nuevos artistas (sort createdAt DESC)
│   ├── Bloque 2: Recién actualizados (sort updatedAt DESC)
│   ├── Bloque 3: Populares (sort diseños aprobados DESC)
│   └── Bloque 4: Recomendados (featured primero, luego diseños)
│   Cada artista → #/artista/:handle (NO a galería)
│   Carga async desde DB (openMega soporta Promise)
│
└── Portada (#/) — §6
    ├── Hero: CTA "Personalizar ahora" → #/personalizar/remera
    ├── "Elegí tu producto": 6 más vendidos por salesCount real
    │   (1 big + 5 small + tile "Ver más")
    └── "Diseños destacados": 4 diseños ordenados por
        pedidos DESC → favoritos DESC → fecha DESC
        Sin precio. Métrica: "N pedidos / N favs / Nuevo"
```

---

## 16. Convenciones de commits y entregas

```
Cada entrega:
  1. Verificar sintaxis: node --check en todos los archivos modificados
  2. Ejecutar tests jsdom relevantes
  3. Empaquetar: cd /tmp/fluve-studio && zip -r /mnt/user-data/outputs/fluve-studio-FASE.zip .
  4. Actualizar este archivo IA_CONTEXT.md si hubo cambios estructurales

Naming de ZIPs:
  fluve-studio-fase8.zip      → entrega principal de fase
  fluve-studio-fase8b.zip     → corrección dentro de la misma fase
  fluve-studio-auditoria-e2e.zip → auditorías completas

Al inicio de cada sesión:
  1. Leer este archivo completo
  2. Preguntar al usuario: ¿qué queremos trabajar hoy?
  3. Verificar el estado actual antes de escribir código nuevo
  4. Nunca asumir el estado del archivo — usar grep/view para confirmar
```

---

## 17. Referencias y documentos relacionados

```
Documento de requerimientos:
  handoff_prototipo_spa/referencia_diseno/Fluvë Studio Frontend.dc.html
  handoff_prototipo_spa/referencia_diseno/Fluvë Studio Backend.dc.html

Schema de base de datos:
  fluve_schema.sql (Architecture B — autoritativo)
  data/db.js       (Architecture A — IndexedDB)

Documentación técnica generada:
  fluvestudio-documento.md         Documentación completa del sistema
  fluvestudio-flujo-economico.html Flujo económico interactivo
  IA_CONTEXT.md                    Este archivo

Repositorio:
  https://github.com/agruizud-eng/fluve-studio/tree/main
```

---

*Este archivo debe mantenerse actualizado. Es la única fuente de verdad para iniciar sesiones de desarrollo con IA.*
