# Motor de costeo y precios · client-side · Fluvë Studio (prototipo)

Se implementa completo en `data/pricing.js` como **módulo puro** (funciones sin efectos secundarios; recibe datos, devuelve números). Es el corazón del negocio y se puede testear aislado. Toda la config sale del store `settings` (fila `pricing`) — ver `ESQUEMA_INDEXEDDB.md` §3.

Hay **dos caras** del motor:
1. **Precio de venta (PVP)** que ve el cliente — margen-driven, por tramos de volumen. (Backend A23/A27, hi-fi §02.)
2. **Costo real** que alimenta ese precio — promedio ponderado de lotes + costo por técnica + inventario por área. (Backend A28/A29/A30.)
3. **Regalías** de artista sobre el diseño. (Backend A24/A42.)

---

## 1 · Config maestra (store `settings` → `pricing`)

```js
{
  targetMargin: 0.38,        // margen objetivo global (palanca maestra, A27)
  vat: 0.22,                 // IVA
  gatewayFee: 0.03,          // comisión de pasarela
  minMargin: 0.25,           // margen mínimo (bloqueo)
  rounding: 0.90,            // redondeo de PVP a ,90
  costingMethod: 'weighted', // 'weighted' (promedio ponderado) | 'fifo'
  categoryExceptions: { hogar: 0.50, granformato: 0.45 }, // margen por categoría
  royaltyTiers: { base: 0.10, pro: 0.20 }                 // % regalía por nivel de artista
}
```

**Herencia del margen** (en cascada, A27):
```
margen efectivo = producto.pricingOverrideMargin
              ?? categoryExceptions[producto.category]
              ?? targetMargin
```

---

## 2 · Fórmula de PVP (margen-driven, A23)

El costo real **no se teclea**: se calcula (§3). A partir de él:

```js
// precio neto a partir del costo y el margen objetivo
precioNeto = costoReal / (1 - margenEfectivo);

// PVP con IVA
pvpBruto = precioNeto * (1 + vat);

// redondeo comercial a ,90 (rounding)
pvp = redondearA90(pvpBruto);
```

```js
export function redondearA90(x) {
  // deja el precio terminado en ,90 (p. ej. 27,13 → 27,90 ; 26,40 → 26,90 ; 26,05 → 25,90/26,90 según política)
  const entero = Math.floor(x);
  const cand = entero + 0.90;
  return cand >= x ? cand : cand + 1; // sube al ,90 inmediato ≥ x
}
```

**Bloqueo por margen mínimo:** si el margen resultante cae por debajo de `minMargin`, marcar el precio como inválido/alerta (no se aplica). Útil en el admin (A23/A27) al previsualizar el impacto de cambiar el global.

**El markup es derivado**, solo para mostrar: `markup = pvpNeto/costo - 1`.

---

## 3 · Costo real por unidad

```
costoReal(unidad) = costoBaseProducto + costoImpresion(tecnica, area) [+ costoDiseño si aplica]
```

### 3.1 · Costo base del producto — promedio ponderado de lotes (A28)

```js
export function costoBaseProducto(productId, purchases, method = 'weighted') {
  const lots = purchases.filter(p => p.productId === productId && p.type === 'product');
  if (!lots.length) return 0;
  if (method === 'fifo') return lots.sort((a,b)=>a.date.localeCompare(b.date))[0].unitCost;
  // promedio ponderado por cantidad
  const totQty  = lots.reduce((s,l)=>s + l.qty, 0);
  const totCost = lots.reduce((s,l)=>s + l.qty * l.unitCost, 0);
  return totCost / totQty;
}
```
Cada compra a distinto precio (store `purchases`) queda reflejada. `costingMethod` conmuta weighted/FIFO (A27).

### 3.2 · Costo de impresión por técnica (A29)

Cada técnica tiene un `costModel` (ver `ESQUEMA` §3). `area` en cm² viene de `producto.printAreaCm2` (o del área real del diseño).

```js
export function costoImpresion(tech, { areaCm2 = 0, colors = 1, qty = 1, stitches = 0 }) {
  switch (tech.costModel) {
    case 'area': {
      // rate está en $/ml (metro lineal, ancho de material) o $/m². Convertir área.
      if (tech.rateUnit === 'm2')  return (areaCm2 / 10000) * tech.rate;         // cm²→m²
      // 'ml': aprox. por metro lineal del material según ancho de rollo (inventario A30)
      return (areaCm2 / 10000) * tech.rate;   // simplificación prototipo: tratar ml≈m² lineal del arte
    }
    case 'fixed':  return tech.rate;                       // $/u (sublimación $2,80)
    case 'screens':return (tech.rate * colors) / qty;      // serigrafía: $8/pantalla × nº colores ÷ tirada
    case 'stitches':return (stitches / 1000) * tech.rate;  // bordado: $1,20/millar de puntadas
    default: return 0;
  }
}
```

> Nota prototipo: para técnicas por `area` en `ml`, la conversión exacta usa el ancho de rollo del inventario (§3.3). Para el prototipo alcanza la aproximación por área del arte; dejar un `TODO` marcado para afinar en producción.

### 3.3 · Inventario por área — consumibles en rollo (A30)

Materiales tipo film DTF/vinilo se costean en **$/cm²** con promedio ponderado sobre $/cm² (así lotes de 55 y 60 cm de ancho se promedian bien). El consumo descuenta **área**.

```js
export function avgCostPerCm2(material, inventoryLots) {
  const lots = inventoryLots.filter(l => l.material === material);
  const totArea = lots.reduce((s,l)=>s + l.areaCm2, 0);
  const totCost = lots.reduce((s,l)=>s + l.areaCm2 * l.costPerCm2, 0);
  return totArea ? totCost / totArea : 0;
}
// costo de imprimir un arte de A cm² con ese material:
//   costoMaterial = areaCm2 * avgCostPerCm2(material, lots)
```

---

## 4 · Precio en el personalizador (cliente) — hi-fi §02

El personalizador muestra precio en vivo. Su lógica visible (del hi-fi) opera sobre **tramos de volumen** y **recargos**, no re-teclea el costo:

### 4.1 · Tramos de volumen (para la remera de referencia)
| Cantidad | Precio unitario base |
|---|---|
| 1–9 | $24,90 |
| 10–49 | $21,50 |
| 50–199 | $18,25 |
| 200+ | $16,35 |

```js
export function tramoUnitario(qty) {
  if (qty >= 200) return 16.35;
  if (qty >= 50)  return 18.25;
  if (qty >= 10)  return 21.50;
  return 24.90;
}
```
> En producción, cada tramo se deriva del motor margen-driven (el costo del proveedor baja por volumen y el margen se mantiene, así el PVP baja solo — A23). En el prototipo, los tramos pueden venir precomputados por producto en el store `products`, o calcularse con §2 usando el costo del lote correspondiente al volumen.

### 4.2 · Recargos
- **Lado de impresión** (`side`): `front`/`back` = +$0 ; `both` = **+$4**.
- **Técnica** (`surchargePerUnit`, recargo al cliente): `{ dtf:0, subl:2, serig:0, bord:6, vinil:1 }`.

### 4.3 · Precio final
```js
export function precioPersonalizador({ qty, side, techniqueId }, techniques) {
  const unit       = tramoUnitario(qty);
  const surTech    = techniques.find(t => t.id === techniqueId)?.surchargePerUnit ?? 0;
  const surSide    = side === 'both' ? 4 : 0;
  const porUnidad  = unit + surTech + surSide;
  const total      = porUnidad * qty;
  return { unit, porUnidad, total };
}
```
El **tramo activo se resalta** en la UI. "Añadir al carrito" persiste una `CartLine` (ESQUEMA §3 `carts`) con `unitPrice = porUnidad` y `lineTotal = total`, y actualiza el contador (F2/F6).

---

## 5 · Regalías de artista (A24/A42)

Si la línea usa un diseño de artista, se genera regalía:

```js
export function regalia(lineTotal, artist, tiers) {
  const rate = tiers[artist.tier] ?? tiers.base;   // base 10% / pro 20%
  return lineTotal * rate;
}
```
Al crear un pedido con diseños de artista: acumular en `artist.royaltiesPending` y crear/actualizar un registro en `royalties` (`status:'pending'`). La acción admin **"Liquidar / Marcar pagado"** (A42) pasa a `paid`, registra un egreso en `payments` y una entrada en `activity` (G8).

---

## 6 · Rentabilidad de pedido (A25) — para el admin

```js
margenPedido = (order.total - costoProveedor - order.shippingCost - regalías - order.tax*0) / order.total
```
Mostrar en el detalle de pedido y el dashboard (KPI "margen bruto ~41% tras proveedor+envío"). El costo de proveedor por línea = `costoReal(unidad) * qty` con §3.

---

## 7 · La palanca maestra (A27) — cambiar el margen global

Al editar `settings.pricing.targetMargin`:
1. Recalcular PVP de **todos los productos que heredan** (los que tienen `pricingOverrideMargin === null` y cuya categoría no tiene excepción propia — o sí, según cascada §1).
2. Los productos con **override manual** no se tocan (🔒).
3. Previsualizar impacto (nº afectados, variación media de PVP, ejemplos antes/después) antes de aplicar — como en el hi-fi del backend A27.
4. Versionar el cambio en `activity` (G8) para poder revertir. Los pedidos ya pagados no cambian (usan su snapshot).

---

## 8 · Resumen de exports de `pricing.js`

```js
export function margenEfectivo(product, settings) {…}
export function costoBaseProducto(productId, purchases, method) {…}
export function costoImpresion(tech, ctx) {…}
export function avgCostPerCm2(material, inventoryLots) {…}
export function costoReal(product, tech, ctx, purchases, settings) {…}
export function pvp(costoReal, product, settings) {…}          // §2 completo (margen→IVA→redondeo)
export function redondearA90(x) {…}
export function tramoUnitario(qty) {…}
export function precioPersonalizador(config, techniques) {…}
export function regalia(lineTotal, artist, tiers) {…}
export function margenPedido(order, costos) {…}
export function recalcularCatalogo(products, settings, purchases) {…} // §7 palanca maestra
```

> Mantener `pricing.js` **sin acceso a IndexedDB**: recibe los datos ya leídos por el DAO y devuelve números. Así es puro, testeable y migrable 1:1 a producción.
