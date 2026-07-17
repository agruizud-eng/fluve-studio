# Fluvë Studio — Documentación del Sistema

> Marketplace creativo de productos personalizados donde artistas, clientes y proveedores se conectan a través de una plataforma central.

---

## 1. Visión del producto

Fluvë Studio es un marketplace de diseño que separa la navegación por intención del usuario: comprar, descubrir arte, explorar artistas o vender diseños. No funciona como una tienda tradicional. La experiencia parte del diseño, no del producto.

**El cliente no busca una camiseta. Busca una pieza con identidad visual.**
**Encontré un diseño que representa algo que quiero usar".**


### Tres pilares del ecosistema

| Pilar | Rol |
|---|---|
| **Artistas** | Generan el contenido. Publican diseños y obtienen regalías. |
| **Clientes** | Descubren diseños, personalizan productos y compran. |
| **Proveedores** | Producen los artículos bajo coordinación de Fluvë. |

---

## 2. Modelo conceptual

### Entidades principales

```
ARTISTA
   │ crea
   ▼
DISEÑO ──────────────► Categoría (tema / estilo / causa)
   │                ► Colección
   │ se aplica sobre
   ▼
PRODUCTO BASE ──────► Variantes (color + talla + stock)
   │                ► Zonas de impresión
   │
   + CONFIGURACIÓN (zona + técnica + cantidad)
   │
   ▼
PEDIDO  ← única entidad con precio final
```

### Tres reglas fundamentales

**Regla 1 — Un diseño puede vivir en infinitos productos.**
`DS001 "Forest Spirit"` puede estar en una remera, una taza, una tote bag y un cuadro al mismo tiempo. La relación no existe en la base de datos hasta que hay un pedido.

**Regla 2 — Un producto puede recibir infinitos diseños.**
Una remera negra puede venderse con `DS001`, `DS002`, `DS099` o con el diseño propio del cliente. El producto no conoce qué diseños se usan sobre él.

**Regla 3 — El precio solo existe en el pedido.**

```
Diseño solo    →  sin precio
Producto solo  →  precio base referencial
Pedido         →  precio final (el que paga el cliente)
```

---

## 3. Ecosistema funcional

### 3.1 Flujo del cliente

```
Cliente
   │
   ▼
Home — Explora el Marketplace
   │
   ├── Categorías de diseño
   ├── Colecciones
   ├── Artistas
   └── Tendencias
   │
   ▼
Selecciona un diseño
   │
   ▼
Elige el producto sobre el que aplicarlo
   ├── Remera · Hoodie · Taza · Tote Bag · Poster · otros
   │
   ▼
Personaliza (color, talla, zona, técnica, cantidad)
   │
   ▼
Carrito → Checkout → Pago
   │
   ▼
Fluvë gestiona la producción
   │
   ▼
Entrega del producto al cliente
```

### 3.2 Flujo del artista

```
Artista solicita unirse → Fluvë aprueba el perfil
   │
   ▼
Accede a su portal privado (/artist/shops/:id)
   │
   ▼
Sube diseño (PNG / SVG / PDF · mín. 2000×2000px · 300 DPI)
Completa: título, descripción, categorías, colecciones, tags
Acepta términos de responsabilidad sobre derechos de autor
   │
   ▼
Diseño queda en estado: pendiente de revisión
   │
   ▼
Fluvë modera y aprueba (checklist de calidad)
   │
   ▼
Diseño publicado en la galería → comienza a generar ventas
   │
   ▼
El artista recibe regalías → liquidación mensual
```

### 3.3 Flujo del proveedor

```
Pedido recibido
   │
   ▼
Fluvë analiza: técnica + zona + capacidad + rating
   │
   ▼
Operador asigna proveedor
   │
   ▼
Proveedor produce
   │
   ▼
Control de calidad → Packaging → Envío → Entregado
```

---

## 4. Motor de publicación de diseños

Antes de que un diseño llegue a la galería pública atraviesa los siguientes pasos:

1. **Solicitud del artista.** Completa el formulario en "Vende tu arte". Genera una solicitud en estado `pending`.
2. **Aprobación del perfil.** El equipo de Fluvë revisa y aprueba o rechaza la solicitud de artista.
3. **Acceso al portal.** El artista aprobado accede a `/artist/shops/:idArtist`.
4. **Carga del diseño.** Sube el archivo, completa los metadatos y acepta los términos de responsabilidad.
5. **Moderación.** El equipo verifica tres criterios obligatorios:
   - Resolución suficiente para impresión.
   - Contenido apto para todos los públicos.
   - El artista declaró ser titular o tener licencia sobre la obra.
6. **Publicación.** El diseño pasa a estado `approved` y aparece automáticamente en la galería.
7. **Métricas.** El diseño acumula visitas, favoritos y pedidos. Estas métricas determinan su posición en "Diseños destacados".
8. **Regalías.** Cada venta genera una regalía que se acumula y liquida mensualmente.

---

## 5. Motor de pedidos

Cuando el cliente confirma la compra y el pago es acreditado:

```
RECIBIDO
   │  operador verifica diseño + asigna proveedor
   ▼
EN PRODUCCIÓN
   │  proveedor imprime diseño sobre producto base
   ▼
CONTROL DE CALIDAD
   ├── no pasa ──► vuelve a producción
   └── pasa ──────────────────────────┐
                                      ▼
                                 PACKAGING
                                      │
                                      ▼
                                LISTO PARA ENVÍO
                                      │
                                      ▼
                                  EN CAMINO
                                      │
                                      ▼
                                  ENTREGADO
                                      │
                                      ▼
                           REGALÍA CALCULADA → liquidación mensual
```

---

## 6. Gestión de proveedores

Cada proveedor tiene un perfil completo con: técnicas disponibles, zonas de operación, rating histórico de calidad, carga de trabajo actual y notas internas del equipo.

### Motor de asignación

La asignación no es automática. El operador decide con información completa en pantalla. El sistema filtra y ordena los proveedores compatibles según cuatro criterios:

```
Pedido entra al sistema (supplierId: null)
   │
   ├── ¿Qué técnica requiere?
   ├── ¿En qué zona se entrega?
   ├── ¿Cuántos pedidos activos tiene cada proveedor?
   └── ¿Cuál es su rating histórico?
   │
   ▼
Operador elige → acción registrada en audit log
   │
   ▼
EN PRODUCCIÓN → QC → PACKAGING → ENVÍO → ENTREGADO
```

> **Nota:** Se valora implementar un agente de IA que asista al operador con sugerencias de asignación basadas en los cuatro criterios.

### Ejemplo de proveedores

| | Imprenta Sur | TextilPro | GranFormato Co |
|---|---|---|---|
| **Rating** | ★ 4.5 | ★ 4.2 | ★ 4.8 |
| **Zona** | Mvd · Interior | Mvd | Mvd · Remoto |
| **Técnicas** | DTF, Vinilo, Serig, Subl | DTF, Bordado, DTF UV, Serig | Gran formato |
| **Notas** | Proforma para +100u | Requiere archivo DST | Papel fine art 300g |

---

## 7. Flujo económico

### 7.1 Distribución del pago

```
Cliente paga PVP (IVA incluido)
   │
   ▼
Pasarela de pago (MercadoPago / Stripe) cobra ~3%
   │
   ▼
Fluvë recibe el neto
   │
   ├── DGI Uruguay              22% del PVP (IVA)
   ├── Costo producto base      25–35% del neto (costo WA de lotes)
   ├── Costo de impresión       10–20% del neto (según técnica y zona)
   ├── Regalía al artista       10–20% del margen bruto
   ├── Envío y packaging        costo según tipo de envío
   └── Margen neto Fluvë        objetivo 38% del precio neto (ajustable)
```

### 7.2 Fórmulas del motor de precios

```
// Costo real del pedido
CostoReal = CostoProductoWA + CostoImpresión + Overhead

// Margen efectivo (herencia en cascada)
MargenEfectivo = overrideManual ?? excepciónCategoría ?? targetMargin (38%)

// PVP final
PrecioNeto = CostoReal / (1 − MargenEfectivo)
PVPBruto   = PrecioNeto × 1.22            // IVA 22%
PVPFinal   = redondear(PVPBruto, 0.90)    // redondeo comercial a ,90

// Regalía del artista
MargenBruto  = PrecioNeto − CostoReal
RegalíaBase  = MargenBruto × 0.10         // Tier Base
RegalíaPro   = MargenBruto × 0.20         // Tier Pro

// Margen final de Fluvë
MargenNetFluvë = PVPFinal − IVA − CostoReal − Regalía − ComisiónPasarela − Envío
// Objetivo: ≥ 25% del PrecioNeto
```

### 7.3 Técnicas de impresión

| Técnica | Modelo de costo | Mínimo | Recargo | Ideal para |
|---|---|---|---|---|
| DTF | Por área (m²) | 1 u. | — | Colores vivos, fotos, degradados |
| Sublimación | Precio fijo | 1 u. | +$2/u | Tazas, fundas, poliéster 100% |
| Serigrafía | Por pantallas | 10 u. | — | Tiradas altas, pocas tintas |
| Bordado | Por puntadas (millar) | 1 u. | +$6/u | Gorras, polos, prendas premium |
| DTF UV | Por área (m²) | 1 u. | +$3/u | Superficies rígidas, metálicos |
| Gran formato | Por área (m²) | 1 u. | — | Posters, cuadros, lonas |
| Vinilo textil | Por área (m²) | 1 u. | +$1/u | Nombres, números, textos cortos |

---

## 8. Modelo de datos

### 8.1 Relación Diseño → Producto → Pedido

El diseño y el producto son entidades completamente independientes. No existe una tabla que los una directamente. La relación nace en el pedido.

```
designs                    products
───────────────────        ──────────────────────────
id:       DS001            id:          remera-premium
title:    Forest Spirit    name:        Remera Unisex
artistId: artist-ana       basePricePVP: $24,90
isOwn:    false            colors:      [Negro, Blanco...]
status:   approved         sizes:       [S, M, L, XL]

No conoce ningún producto  No conoce ningún diseño
No tiene precio            Tiene precio referencial
No tiene talla ni color    No tiene artista

designs ✗────────────────✗ products   (sin relación directa en DB)


order_lines  ← aquí nace el vínculo
───────────────────────────────────────────────────────────
productId:    remera          ← qué producto
designId:     DS001           ← qué diseño
variantId:    var-remera-negro-m
zoneId:       zona-pecho-centro
techniqueId:  dtf
color:        Negro
size:         M
areaCm2:      600
qty:          2
unitPrice:    $26,90          ← precio calculado en el momento
royaltyAmt:   pendiente       ← calculado al liquidar
```

### 8.2 Zonas de impresión y su impacto en el precio

Una misma remera con el mismo diseño tiene precios distintos según la zona elegida:

| Zona | Área | Costo DTF | PVP final |
|---|---|---|---|
| Logo pecho izquierdo | 25 cm² (5×5) | $0,23 | ~$16,90 |
| Diseño pecho estándar | 600 cm² (30×20) | $5,40 | ~$26,90 |
| Estampado espalda A3 | 1.200 cm² (30×40) | $10,80 | ~$36,90 |
| Logo manga | 80 cm² (8×10) | $0,72 | ~$18,90 |

### 8.3 Modelo de base de datos — 20 tablas

#### Núcleo

```
users               artists             designs
────────────────    ────────────────    ────────────────────
id        PK        id        PK        id          PK
email               userId    FK→users  artistId    FK→artists
name                handle              title
role                tier                isOwn       bool
createdAt           royaltyRate         status
                    status              imageUrl
                    createdAt           description
                                        createdAt
```

#### Catálogo de productos

```
products                    product_variants
────────────────────        ────────────────────────────
id          PK              id          PK
slug                        productId   FK→products
name                        colorName
category                    colorHex
type                        size
subcategory                 sku         único
fit                         stock       ← cantidad disponible
material                    stockMinimo
gramaje                     precioExtra
basePricePVP                active
active
createdAt

product_print_zones         zone_techniques
────────────────────        ────────────────────────────
id          PK              id          PK
productId   FK→products     zoneId      FK→zones
name                        techniqueId FK→techniques
location                    active
widthCm
heightCm
areaCm2     ← determina el costo
defaultTech FK→techniques
active
sortOrder
```

#### Categorías (sistema unificado)

```
categories                  design_categories       product_categories
────────────────────        ──────────────────      ──────────────────
id          PK              designId  FK→designs     productId  FK→products
type                        categoryId FK→cat        categoryId FK→cat
  tema | estilo | causa
  producto-tipo
  producto-audiencia
name
slug
parentId    FK→categories   (árbol jerárquico)
active
sortOrder
```

#### Técnicas

```
techniques
────────────────────────────────────────
id          dtf | subl | serig | bord | dtfuv | granformato | vinil
name
costModel   area | fixed | screens | stitches
rate
rateUnit    m2 | u | screen | millar
minQty
active
```

#### Pedidos

```
orders                      order_lines
────────────────────        ────────────────────────────────
id          PK              id          PK
userId      FK→users        orderId     FK→orders
status                      productId   FK→products
total                       designId    FK→designs
supplierId  FK→suppliers    variantId   FK→variants
shippingCost                zoneId      FK→zones
createdAt                   techniqueId FK→techniques
                            qty
                            areaCm2
                            unitPrice   ← calculado en el momento
                            royaltyAmt  ← calculado al liquidar
```

#### Proveedores e inventario

```
suppliers                   purchases
────────────────────        ────────────────────────────
id          PK              id          PK
name                        supplierId  FK→suppliers
techniques  []              productId   FK→products
zones       []              type        product | material
rating                      qty
active                      unitCost
notes                       areaCm2
                            costPerCm2  ← para materiales
```

#### Económico

```
royalties                   payments
────────────────────        ────────────────────────────
id          PK              id          PK
orderId     FK→orders       orderId     FK→orders
artistId    FK→artists      userId      FK→users
designId    FK→designs      amount
amount                      method      mp | stripe | transfer
status      pending|paid    status      pending | approved
paidAt                      createdAt
```

#### Comunidad y soporte

```
favorites                   tickets
────────────────────        ────────────────────────────
id          PK              id          PK
userId      FK→users        userId      FK→users
designId    FK→designs      subject
createdAt                   status      open | closed
                            messages    []
                            createdAt

promos                      activity_log
────────────────────        ────────────────────────────
code        PK              id          PK (auto)
type        pct | shipping  userId      FK→users
value                       action
minAmount                   entity
active                      entityId
expiresAt                   before      JSON
                            after       JSON
                            createdAt
```

#### Resumen de tablas

| Grupo | Tablas |
|---|---|
| Núcleo | `users` `artists` `designs` `orders` `order_lines` |
| Catálogo | `products` `product_variants` `product_print_zones` `zone_techniques` `techniques` `categories` `design_categories` `product_categories` |
| Económico | `royalties` `payments` `purchases` `promos` |
| Operación | `suppliers` |
| Comunidad | `favorites` `tickets` `activity_log` |

---

## 9. Categorías del sistema

### 9.1 Categorías de diseño (aplican al artwork)

Las categorías de diseño responden a tres preguntas distintas:

**Temas** — ¿De qué trata?

```
├── Animales          ├── Horror
├── Naturaleza        ├── Espacio exterior
├── Humor             ├── Música
├── Fantasía          ├── Comida
├── Cute / Kawaii     ├── Videojuegos
└── Memes
```

**Estilos** — ¿Cómo se ve visualmente?

```
├── Abstracto         ├── Comics
├── Ilustración       ├── Tatuajes
├── Diseño Gráfico    ├── Estampados
├── Retro / Vintage   └── Patrones
└── Tipografía y Frases
```

**Causas** — ¿Qué valores expresa?

```
├── Derechos Humanos  ├── Salud Mental
├── Movimientos       ├── Justicia Racial
├── Medio Ambiente    ├── Bienestar Animal
└── Ayuda Humanitaria
```

**Desafíos** — Categorías editoriales y de comunidad

```
├── Tendencias        ├── Viajes
├── Aves              ├── Cosas Extrañas
├── Mascotas          └── Diseños Icónicos
```

### 9.2 Categorías de producto (aplican al objeto físico)

**Prendas**

```
├── Hombre            ├── Mujer             ├── Unisex
│   ├── Remeras       │   ├── Remeras       │   ├── Remeras
│   ├── Premium       │   ├── Musculosas    │   ├── Hoodies
│   ├── Extra Soft    │   ├── Hoodies       │   ├── Sweatshirts
│   ├── Musculosas    │   ├── Sweatshirts   │   └── Camperas
│   ├── Manga Larga   │   └── Leggings      │
│   ├── Hoodies       │                     └── Niños y Bebés
│   └── Sweatshirts                             ├── Remeras
                                                ├── Hoodies
                                                └── Productos bebé
```

**Gorros y headwear**

```
├── Impresos                    └── Bordados
│   ├── Trucker Hats                ├── Snapback
│   └── Gorras                      ├── Dad Hats
                                    └── Gorros de lana
```

**Accesorios**

```
├── Bolsos y Mochilas           ├── Tazas y Termos
│   ├── Tote Bag tela           │   ├── Taza blanca / colores / mágica
│   ├── Tote Bag con cierre     │   ├── Taza de café · Termo
│   ├── Mochila · ligera        │   └── Jarra de cerveza
│   └── Bolso deportivo         │
├── Fundas                      └── Estilo de Vida
│   ├── Funda celular               ├── Stickers · Pines · Imanes
│   └── Funda laptop                ├── Bufandas · Rompecabezas
                                    └── Toallas de playa
```

**Gran Formato**

```
├── Impresos                    └── Enmarcados
│   ├── Poster                      ├── Canvas en bastidor
│   ├── Lámina de arte              ├── Cuadro con marco
│   └── Fine Art / Giclée           └── Fine Art enmarcado
```

**Hogar**

```
├── Decoración                  ├── Baño                └── Cocina
│   ├── Almohadón               │   ├── Alfombra         ├── Posavasos
│   └── Manta                   │   ├── Cortina ducha    └── Imanes
                                │   └── Toalla playa
```

**Oficina**

```
├── Mouse Pad · Desk Pad
├── Tarjetas personales · Folletos
└── Cuadernos · Agendas
```

---

## 10. Estructura de navegación pública

```
Fluvë Studio
│
├── Buscar          búsqueda global de diseños, productos y artistas
│
├── Artistas        directorio de artistas y sus tiendas públicas
│
├── Vende tu Arte   landing para artistas · solicitud · portal privado
│
├── Temas           navegación por categorías de diseño
│   ├── Temas       (Animales, Humor, Naturaleza, Fantasía...)
│   ├── Estilos     (Abstracto, Ilustración, Retro...)
│   ├── Desafíos    (Tendencias, Mascotas, Viajes...)
│   └── Causas      (Medio Ambiente, Salud Mental...)
│
├── Prendas         catálogo de productos de vestimenta
│   ├── Hombre · Mujer · Unisex · Niños
│
├── Headwear        gorras y gorros
│
├── Accesorios      bolsos, tazas, fundas, estilo de vida, oficina
│
├── Gran Formato    posters, láminas, cuadros, canvas
│
├── Hogar           decoración, baño, cocina
│
└── Comunidad       design challenges, votaciones, valores, eventos
```

---

## 11. Requisitos funcionales por módulo

### Módulo Diseño
- Crear diseño y subir archivo (PNG / SVG / PDF)
- Asociar artista, colección, categorías (tema + estilo + causa) y etiquetas
- Moderar y aprobar con checklist de calidad
- Rechazar con motivo registrado y visible para el artista
- Versionar o reemplazar el archivo
- Previsualizar sobre producto (mockup)
- Publicar o retirar del catálogo
- Calcular métricas (pedidos, favoritos, visitas)

### Módulo Catálogo
- Crear productos base con todos sus atributos
- Crear variantes (color + talla) con stock individual y SKU
- Definir zonas de impresión con dimensiones reales
- Asociar técnicas permitidas por zona
- Gestionar imágenes del producto por color
- Alertas de stock mínimo por variante
- Asociar categorías de producto
- Calcular costo por zona (área × técnica)

### Módulo Marketplace
- Explorar por tema, estilo, causa, artista, colección y tendencias
- Buscar diseños y productos con filtros combinados
- Ver perfil público del artista
- Guardar favoritos
- Personalizar: elegir diseño + producto + zona + técnica + cantidad
- Vista previa en tiempo real (mockup dinámico)
- Calcular precio en tiempo real según configuración
- Editor de diseño online
- Aplicar cupones de descuento
- Carrito persistente y checkout con datos de envío

### Módulo Artistas
- Solicitar y aprobar ingreso al programa de artistas
- Definir tier (base / pro) y porcentaje de regalía
- Portal privado del artista (diseños, estadísticas, regalías, pagos, perfil)
- Subir y gestionar diseños desde el portal
- Ver métricas de ventas propias y historial de liquidaciones

### Módulo Producción
- Crear y gestionar órdenes de producción
- Asignar proveedor según técnica, zona, carga y rating
- Seguimiento por estados con historial de timestamps
- Control de calidad con checklist por ítem
- Rechazar y reenviar a producción si no pasa QC
- Gestionar packaging y registrar código de seguimiento
- Alertas de SLA para pedidos con demora
- Kanban de producción en tiempo real

### Módulo Motor de Precios
- Calcular costo real (producto WA + técnica + zona)
- Calcular PVP con margen configurable y cascada de excepciones
- Redondeo comercial automático
- Alertas cuando el margen cae bajo el mínimo
- Simular precios antes de publicar
- Calcular punto de equilibrio

### Módulo Pagos
- Procesar pagos con MercadoPago y Stripe
- Gestionar reembolsos
- Generar comprobante de pago
- Liquidar regalías a artistas mensualmente
- Registrar historial de transacciones

### Módulo Envíos
- Calcular costo de envío por zona geográfica
- Aplicar envío gratis desde monto mínimo configurable
- Registrar código de seguimiento
- Notificar al cliente en cada cambio de estado

### Módulo Inventario
- Registrar lotes de compra de productos y materiales consumibles
- Calcular costo promedio ponderado (WA)
- Controlar stock mínimo por variante con alertas de reposición

### Módulo Clientes / CRM
- Gestionar clientes, historial de pedidos y gasto acumulado
- Gestionar direcciones de entrega y datos de facturación

### Módulo Reportes
- KPIs del negocio (ventas, margen, pedidos)
- Ventas por período, productos y diseños más vendidos
- Punto de equilibrio y regalías liquidadas vs pendientes

### Módulo Soporte
- Tickets de soporte con conversación tipo chat
- Clasificar por tipo, estado y escalar a administración

### Módulo CMS / Contenido
- Editar textos del sitio, FAQ, cupones y parámetros globales

### Módulo Comunidad *(futuro)*
- Design Challenges con votación
- Ranking de artistas y diseños
- Eventos y colecciones especiales

---

## 12. Flujo conceptual del ecosistema

```
                     FLUVË STUDIO
                          │
                          ▼
                Marketplace Central
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   Clientes           Artistas         Proveedores
        │                 │                 │
   Descubren          Publican         Reciben órdenes
   diseños            diseños          de producción
        │                 │                 │
        └────────┬─────────┘         ────────┘
                 │
                 ▼
        Catálogo personalizable
                 │
                 ▼
        Carrito → Pago confirmado
                 │
                 ▼
        Pedido administrado ◄── Control de calidad
                 │
                 ▼
        Entrega al cliente
                 │
                 ▼
        Experiencia postventa → Recompra → Comunidad
```

---

*Documento generado a partir de notas de trabajo y conversaciones de diseño del sistema.*
*Versión estructurada — Fluvë Studio · Montevideo, Uruguay*
