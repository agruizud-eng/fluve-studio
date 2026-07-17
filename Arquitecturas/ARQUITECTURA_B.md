# Arquitectura B — Fluvë Studio SaaS (Producción)
### versión 3 · 21 tablas · dominio con fórmulas reales · estados de producción completos

> **Propósito:** arquitectura de producción. Se construye a partir de la Arquitectura A
> una vez validados todos los flujos. El módulo `domain/` migra sin cambios desde A.
>
> Documento complementario: **ARQUITECTURA_A.md** (prototipo SPA).

---

## 1 · Stack tecnológico

| Capa | Tecnología | Rol |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Frontend + API routes + SSR/ISR |
| **Lenguaje** | TypeScript estricto | Tipos compartidos en todas las capas |
| **Domain** | TypeScript puro | Migrado 1:1 desde `domain/*.js` de Arch. A |
| **UI base** | shadcn/ui + Tailwind CSS | Equivale a `components/` de Arch. A |
| **Estado global** | Zustand | Equivale a `hooks.js` + `dom.createStore()` |
| **BD** | Supabase (PostgreSQL) | 21 tablas · migrations · RLS |
| **Auth** | Supabase Auth | Equivale a `app/session.js` |
| **Storage** | Supabase Storage | Archivos de diseño, previews, facturas |
| **Server-side** | Supabase Edge Functions | Webhooks, emails, lógica sensible |
| **i18n** | next-intl | Equivale a `app/i18n.js` |
| **Pagos UY** | MercadoPago SDK | Pesos uruguayos + cuotas |
| **Pagos intl** | Stripe | Mercado internacional |
| **Deploy** | Vercel + Supabase Cloud | CI/CD automático |

---

## 2 · Los cinco módulos en producción

| Módulo | Arq. A | Arq. B | Cambio |
|---|---|---|---|
| **Core** | `app/*.js` IIFE | Next.js App Router + middleware | Reescribir |
| **Domain** | `domain/*.js` | `domain/*.ts` | **Solo agregar tipos** |
| **Data** | `data/dao.js` + IndexedDB | `lib/dao/*.ts` + PostgreSQL/Supabase | Migrar 1:1 |
| **Components** | `components/*.js` DOM | `components/` React + shadcn/ui | Reescribir |
| **Views** | `views/**/*.js` | `app/**/page.tsx` | Reescribir |

---

## 3 · Estructura de archivos

```
fluve-studio/
│
├── domain/                              ← MÓDULO DOMAIN (migrado de Arch. A)
│   ├── pricing.ts
│   ├── production.ts
│   ├── customizer.ts
│   ├── royalties.ts
│   ├── supplier.ts
│   ├── shipping.ts
│   ├── quotation.ts
│   ├── quality.ts
│   └── inventory.ts
│
├── app/                                 ← MÓDULO CORE (Next.js)
│   ├── layout.tsx
│   ├── globals.css
│   ├── (client)/
│   │   ├── page.tsx                     ← Home
│   │   ├── galeria/page.tsx
│   │   ├── artistas/
│   │   │   ├── page.tsx                 ← Directorio de artistas
│   │   │   └── [handle]/
│   │   │       ├── page.tsx             ← Perfil público del artista
│   │   │       └── tienda/page.tsx      ← Tienda del artista
│   │   ├── vende-tu-arte/page.tsx
│   │   ├── producto/[slug]/page.tsx
│   │   ├── personalizar/[slug]/page.tsx
│   │   ├── carrito/page.tsx
│   │   ├── checkout/page.tsx
│   │   └── pedido/[id]/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── registro/page.tsx
│   │   └── callback/route.ts
│   ├── cuenta/
│   │   ├── layout.tsx
│   │   └── [[...seccion]]/page.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx                     ← Dashboard
│   │   ├── pedidos/[id]/page.tsx
│   │   ├── produccion/page.tsx
│   │   ├── disenos/page.tsx             ← Moderación de diseños
│   │   ├── artistas/page.tsx
│   │   ├── productos/page.tsx
│   │   ├── cotizaciones/page.tsx
│   │   ├── regalias/page.tsx
│   │   ├── calidad/page.tsx
│   │   ├── inventario/page.tsx
│   │   ├── clientes/page.tsx
│   │   ├── reportes/page.tsx
│   │   └── config/page.tsx
│   └── api/
│       ├── webhooks/
│       │   ├── mercadopago/route.ts
│       │   └── stripe/route.ts
│       └── upload/route.ts
│
├── components/
│   ├── ui/                              ← shadcn/ui
│   │   ├── button.tsx · card.tsx · badge.tsx · input.tsx
│   │   ├── dialog.tsx · data-table.tsx · kanban-board.tsx
│   └── features/
│       ├── ProductCard.tsx · DesignCard.tsx · ArtistCard.tsx
│       ├── CartLine.tsx · Stepper.tsx
│       ├── FacetSidebar.tsx · SearchBox.tsx
│       └── ProductionBadge.tsx          ← usa domain/production.ts
│
├── lib/                                 ← MÓDULO DATA (adaptadores)
│   ├── supabase/
│   │   ├── client.ts                    ← createBrowserClient()
│   │   └── server.ts                    ← createServerClient()
│   ├── dao/                             ← un archivo por entidad principal
│   │   ├── users.ts · artists.ts · designs.ts
│   │   ├── products.ts · variants.ts · zones.ts · techniques.ts
│   │   ├── orders.ts · orderLines.ts
│   │   ├── royalties.ts · payments.ts · purchases.ts · promos.ts
│   │   ├── suppliers.ts · categories.ts
│   │   └── favorites.ts · tickets.ts · activityLog.ts
│   ├── config.ts
│   └── utils.ts                         ← money(), date(), cn()
│
├── hooks/
│   ├── useCart.ts · useSession.ts · useProducts.ts
│
├── store/
│   ├── cartStore.ts · uiStore.ts
│
├── types/
│   └── index.ts                         ← tipos del dominio
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema.sql               ← 21 tablas (§4)
│   │   ├── 002_rls.sql                  ← Row Level Security (§5)
│   │   └── 003_seed.sql                 ← datos semilla
│   └── config.toml
│
├── middleware.ts
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## 4 · Módulo Domain en TypeScript

### 4.1 Tipos compartidos (`types/index.ts`)

```typescript
export type Technique =
  | 'dtf' | 'sublimacion' | 'serigrafia'
  | 'bordado' | 'dtf_uv' | 'gran_formato' | 'vinilo';

export type CostModel = 'area' | 'fixed' | 'screens' | 'stitches';

export type OrderStage =
  | 'pending' | 'paid' | 'received'
  | 'in_production' | 'quality_check' | 'packaging'
  | 'ready_to_ship' | 'in_transit' | 'delivered' | 'cancelled';

export type ArtistTier = 'base' | 'pro';
export type ArtistStatus = 'pending' | 'approved' | 'rejected';
export type DesignStatus  = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface TechniqueConfig {
  costModel:        CostModel;
  ratePerCm2?:      number;
  fixedCost?:       number;
  ratePerScreen?:   number;
  inkCostPerUnit?:  number;
  ratePerMillar?:   number;
  defaultStitchesK?: number;
  surchargeUnit:    number;
  minQty:           number;
}

export interface PricingResult {
  costoReal:       number;
  precioNeto:      number;
  pvpBruto:        number;
  pvpFinal:        number;
  iva:             number;
  margenBruto:     number;
  margenEfectivo:  number;
  margenSource:    'manual' | 'category' | 'global';
  isMinAlert:      boolean;
}

export interface RoyaltyResult {
  margenBruto: number;
  rate:        number;
  royalty:     number;
  tier:        ArtistTier;
}

export interface ShippingResult {
  cost:      number;
  zone:      string;
  zoneName:  string;
  isFree:    boolean;
  freeFrom:  number;
  error?:    string;
}
```

### 4.2 `domain/pricing.ts` — Motor de precios

```typescript
import type { Technique, TechniqueConfig, PricingResult } from '@/types';

export const IVA_RATE       = 0.22;
export const DEFAULT_MARGIN = 0.38;
export const MIN_MARGIN     = 0.25;

export const TECHNIQUE_DEFAULTS: Record<Technique, TechniqueConfig> = {
  dtf:          { costModel: 'area',    ratePerCm2: 0.009,  surchargeUnit: 0,    minQty: 1  },
  sublimacion:  { costModel: 'fixed',   fixedCost: 3.50,    surchargeUnit: 2.00, minQty: 1  },
  serigrafia:   { costModel: 'screens', ratePerScreen: 25,  inkCostPerUnit: 0.80,surchargeUnit: 0, minQty: 10 },
  bordado:      { costModel: 'stitches',ratePerMillar: 1.20,defaultStitchesK: 5, surchargeUnit: 6.00, minQty: 1 },
  dtf_uv:       { costModel: 'area',    ratePerCm2: 0.012,  surchargeUnit: 3.00, minQty: 1  },
  gran_formato: { costModel: 'area',    ratePerCm2: 0.008,  surchargeUnit: 0,    minQty: 1  },
  vinilo:       { costModel: 'area',    ratePerCm2: 0.010,  surchargeUnit: 1.00, minQty: 1  },
};

export function calcPrintingCost(params: {
  technique: Technique; qty: number;
  areaCm2?: number; colors?: number; stitchesK?: number;
  config?: TechniqueConfig;
}): number {
  const { technique, qty, areaCm2 = 0, colors = 1, stitchesK, config } = params;
  const t = config ?? TECHNIQUE_DEFAULTS[technique];
  if (!t) throw new Error(`Técnica desconocida: "${technique}"`);

  let cost = 0;
  switch (t.costModel) {
    case 'area':    cost = (areaCm2 * (t.ratePerCm2 ?? 0) + t.surchargeUnit) * qty; break;
    case 'fixed':   cost = ((t.fixedCost ?? 0) + t.surchargeUnit) * qty; break;
    case 'screens': cost = colors * (t.ratePerScreen ?? 0) + colors * (t.inkCostPerUnit ?? 0) * qty; break;
    case 'stitches':{ const m = stitchesK ?? t.defaultStitchesK ?? 5;
                      cost = (m * (t.ratePerMillar ?? 0) + t.surchargeUnit) * qty; break; }
  }
  return Math.round(cost * 100) / 100;
}

export function roundToNinety(price: number): number {
  const floor = Math.floor(price);
  const c = floor + 0.90;
  return c >= price ? c : floor + 1.90;
}

export function resolveMargin(params: {
  overrideManual?: number | null;
  categoryException?: number | null;
  globalTarget?: number;
}): { margin: number; isMinAlert: boolean; source: 'manual' | 'category' | 'global' } {
  const { overrideManual, categoryException, globalTarget = DEFAULT_MARGIN } = params;
  const margin = overrideManual ?? categoryException ?? globalTarget;
  return {
    margin,
    isMinAlert: margin < MIN_MARGIN,
    source: overrideManual != null ? 'manual' : categoryException != null ? 'category' : 'global',
  };
}

export function calculatePVP(params: {
  productCostWA: number; printingCost: number; overhead?: number;
  marginOverride?: number | null; categoryMargin?: number | null;
}): PricingResult {
  const { productCostWA, printingCost, overhead = 0, marginOverride, categoryMargin } = params;
  const { margin, isMinAlert, source } = resolveMargin({ overrideManual: marginOverride, categoryException: categoryMargin });

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
```

### 4.3 `domain/production.ts`

```typescript
import type { OrderStage } from '@/types';

interface StageDefinition { label: string; color: string; next: OrderStage[]; }

export const STAGES: Record<OrderStage, StageDefinition> = {
  pending:       { label: 'Pendiente de pago',   color: 'warning', next: ['paid',         'cancelled'] },
  paid:          { label: 'Pago confirmado',      color: 'accent',  next: ['received',     'cancelled'] },
  received:      { label: 'Recibido en sistema', color: 'accent',  next: ['in_production','cancelled'] },
  in_production: { label: 'En producción',        color: 'accent',  next: ['quality_check'] },
  quality_check: { label: 'Control de calidad',  color: 'warning', next: ['packaging', 'in_production'] },
  packaging:     { label: 'En empaque',          color: 'accent',  next: ['ready_to_ship'] },
  ready_to_ship: { label: 'Listo para envío',    color: 'success', next: ['in_transit'] },
  in_transit:    { label: 'En camino',           color: 'accent',  next: ['delivered'] },
  delivered:     { label: 'Entregado',           color: 'success', next: [] },
  cancelled:     { label: 'Cancelado',           color: 'danger',  next: [] },
};

export const canTransition    = (from: OrderStage, to: OrderStage) => STAGES[from]?.next.includes(to) ?? false;
export const getValidNext     = (s: OrderStage): OrderStage[] => STAGES[s]?.next ?? [];
export const getStageLabel    = (s: OrderStage) => STAGES[s]?.label ?? s;
export const getStageColor    = (s: OrderStage) => STAGES[s]?.color ?? 'muted';
export const isTerminal       = (s: OrderStage) => STAGES[s]?.next.length === 0;
export const requiresSupplier = (to: OrderStage) => to === 'in_production';
```

### 4.4 `domain/royalties.ts`

```typescript
import type { ArtistTier, RoyaltyResult } from '@/types';

export const TIERS: Record<ArtistTier, number> = { base: 0.10, pro: 0.20 };

export function calculateRoyalty(params: {
  precioNeto: number; costoReal: number; artistTier?: ArtistTier;
}): RoyaltyResult {
  const { precioNeto, costoReal, artistTier = 'base' } = params;
  const margenBruto = precioNeto - costoReal;
  const rate        = TIERS[artistTier] ?? TIERS.base;
  const royalty     = Math.max(0, Math.round(margenBruto * rate * 100) / 100);
  return { margenBruto: Math.round(margenBruto * 100) / 100, rate, royalty, tier: artistTier };
}

export function calcNetMargin(p: {
  pvpFinal: number; iva: number; costoReal: number;
  royalty: number; paymentFee: number; shippingCost?: number;
}) {
  const net = p.pvpFinal - p.iva - p.costoReal - p.royalty - p.paymentFee - (p.shippingCost ?? 0);
  return { net: Math.round(net * 100) / 100, netPct: Math.round((net / (p.pvpFinal - p.iva)) * 1000) / 10 };
}
```

### 4.5 `domain/supplier.ts`

```typescript
interface Supplier { id: string; active: boolean; techniques: string[]; zones: string[]; rating: number; }

export function rankSuppliers(
  suppliers: Supplier[],
  req: { technique: string; zone: string },
  activeCounts: { supplierId: string; count: number }[] = []
) {
  const loadMap = Object.fromEntries(activeCounts.map(o => [o.supplierId, o.count]));
  return suppliers
    .filter(s => s.active && s.techniques.includes(req.technique))
    .filter(s => !req.zone || s.zones.includes(req.zone) || s.zones.includes('*'))
    .map(s => ({ ...s, activeOrders: loadMap[s.id] ?? 0, score: s.rating * 10 - (loadMap[s.id] ?? 0) * 2 }))
    .sort((a, b) => b.score - a.score);
}

export function canFulfill(supplier: Supplier, req: { technique: string; zone?: string }) {
  if (!supplier.active)                          return { can: false, reason: 'Proveedor inactivo' };
  if (!supplier.techniques.includes(req.technique)) return { can: false, reason: `No opera con ${req.technique}` };
  if (req.zone && !supplier.zones.includes(req.zone) && !supplier.zones.includes('*'))
    return { can: false, reason: `No cubre la zona ${req.zone}` };
  return { can: true };
}
```

### 4.6 `domain/shipping.ts`

```typescript
import type { ShippingResult } from '@/types';

const ZONES = {
  montevideo: { name: 'Montevideo',       baseCost: 150, freeFrom: 3000 },
  interior:   { name: 'Interior Uruguay', baseCost: 290, freeFrom: 4000 },
  remote:     { name: 'Zona remota',      baseCost: 450, freeFrom: 5000 },
  pickup:     { name: 'Retiro en local',  baseCost: 0,   freeFrom: 0 },
} as const;

export function calculateShipping(params: {
  zone: string; orderSubtotal: number; weightKg?: number;
}): ShippingResult {
  const { zone, orderSubtotal, weightKg = 0.5 } = params;
  const z = ZONES[zone as keyof typeof ZONES];
  if (!z) return { cost: 0, zone, zoneName: zone, isFree: false, freeFrom: 0, error: `Zona "${zone}" no reconocida` };

  const isFree      = z.freeFrom > 0 && orderSubtotal >= z.freeFrom;
  const weightExtra = Math.max(0, weightKg - 1) * 50;
  const cost        = isFree ? 0 : Math.round(z.baseCost + weightExtra);

  return { cost, zone, zoneName: z.name, isFree, freeFrom: z.freeFrom };
}
```

---

## 5 · Módulo Data — Esquema PostgreSQL completo (21 tablas)

```sql
-- ================================================================
-- GRUPO: NÚCLEO
-- ================================================================

create table users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  name        text,
  phone       text,
  role        text not null default 'customer'
                check (role in ('guest','customer','staff','admin')),
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table artists (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade unique,
  handle        text unique not null,       -- para rutas /@handle/tienda
  display_name  text not null,
  bio           text,
  avatar_url    text,
  portfolio_url text,
  tier          text not null default 'base' check (tier in ('base','pro')),
  royalty_rate  numeric(4,2) not null default 0.10,
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  featured      boolean default false,
  active        boolean default true,
  created_at    timestamptz default now()
);

create table designs (
  id               uuid primary key default gen_random_uuid(),
  artist_id        uuid references artists(id) on delete restrict,
  -- artist_id NULL cuando is_own = true (diseño propio del cliente)
  title            text not null,
  description      text,
  is_own           boolean not null default false,
  -- is_own = false → diseño de artista publicado en galería
  -- is_own = true  → diseño propio del cliente (no aparece en galería)
  status           text not null default 'pending'
                     check (status in ('pending','approved','rejected','withdrawn')),
  image_url        text,
  tags             text[] default '{}',
  rejection_reason text,
  views            int default 0,
  favorites_count  int default 0,
  sales_count      int default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
  -- SIN product_id: designs y products no tienen relación directa en BD
);

create table orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references users(id) on delete restrict,
  supplier_id      uuid references suppliers(id),  -- null hasta que el operador asigna
  status           text not null default 'pending'
                     check (status in (
                       'pending','paid','received','in_production',
                       'quality_check','packaging','ready_to_ship',
                       'in_transit','delivered','cancelled'
                     )),
  shipping_cost    numeric(10,2) default 0,
  shipping_zone    text,
  shipping_address jsonb,
  total            numeric(10,2),
  notes            text,
  payment_id       text,
  payment_provider text check (payment_provider in ('mercadopago','stripe','manual')),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table order_lines (
  -- Entidad donde nace la relación DISEÑO + PRODUCTO + ZONA + TÉCNICA
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references orders(id) on delete cascade,
  product_id   uuid references products(id) on delete restrict,
  design_id    uuid references designs(id) on delete restrict,
  variant_id   uuid references product_variants(id),
  zone_id      uuid references product_print_zones(id),
  technique_id text references techniques(id),
  qty          int not null check (qty > 0),
  area_cm2     numeric(10,2),
  colors       int,
  stitches_k   numeric(8,2),            -- miles de puntadas (bordado)
  unit_price   numeric(10,2) not null,  -- PVPFinal calculado en el momento
  precio_neto  numeric(10,2),
  costo_real   numeric(10,2),
  royalty_amt  numeric(10,2) default 0  -- calculado al liquidar
);

-- ================================================================
-- GRUPO: CATÁLOGO
-- ================================================================

create table products (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  category     text,
  type         text,
  subcategory  text,
  fit          text,
  material     text,
  gramaje      int,
  base_price_pvp numeric(10,2),         -- precio referencial (sin impresión)
  featured     boolean default false,
  active       boolean default true,
  sort_order   int default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid references products(id) on delete cascade,
  color_name    text not null,
  color_hex     text,
  size          text not null,
  sku           text unique not null,
  stock         int not null default 0,
  stock_minimo  int not null default 5,
  precio_extra  numeric(10,2) default 0,
  active        boolean default true
);

create table product_print_zones (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid references products(id) on delete cascade,
  name           text not null,
  location       text,
  width_cm       numeric(8,2),
  height_cm      numeric(8,2),
  area_cm2       numeric(10,2),         -- width_cm × height_cm
  default_tech   text references techniques(id),
  sort_order     int default 0,
  active         boolean default true
);

create table zone_techniques (
  id           uuid primary key default gen_random_uuid(),
  zone_id      uuid references product_print_zones(id) on delete cascade,
  technique_id text references techniques(id),
  active       boolean default true,
  unique (zone_id, technique_id)
);

create table techniques (
  id              text primary key,     -- 'dtf' | 'sublimacion' | etc.
  name            text not null,
  cost_model      text not null check (cost_model in ('area','fixed','screens','stitches')),
  rate            numeric(10,4),
  rate_unit       text,                 -- 'm2' | 'u' | 'screen' | 'millar'
  surcharge_unit  numeric(10,2) default 0,
  min_qty         int default 1,
  active          boolean default true
);

create table categories (
  id         uuid primary key default gen_random_uuid(),
  type       text not null
               check (type in ('tema','estilo','causa','producto-tipo','producto-audiencia')),
  name       text not null,
  slug       text unique not null,
  parent_id  uuid references categories(id),
  active     boolean default true,
  sort_order int default 0
);

create table design_categories (
  design_id   uuid references designs(id)    on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (design_id, category_id)
);

create table product_categories (
  product_id  uuid references products(id)   on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (product_id, category_id)
);

-- ================================================================
-- GRUPO: ECONÓMICO
-- ================================================================

create table royalties (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references orders(id),
  order_line_id uuid references order_lines(id),
  artist_id     uuid references artists(id),
  design_id     uuid references designs(id),
  amount        numeric(10,2) not null,
  tier          text not null check (tier in ('base','pro')),
  rate          numeric(4,2)  not null,
  status        text not null default 'pending' check (status in ('pending','paid')),
  paid_at       timestamptz,
  created_at    timestamptz default now()
);

create table payments (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id),
  user_id     uuid references users(id),
  amount      numeric(10,2) not null,
  method      text not null check (method in ('mercadopago','stripe','transfer')),
  status      text not null default 'pending'
                check (status in ('pending','approved','refunded','failed')),
  external_id text,
  created_at  timestamptz default now()
);

create table purchases (
  id          uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id),
  product_id  uuid references products(id),
  type        text not null check (type in ('product','material')),
  qty         int  not null,
  unit_cost   numeric(10,2),
  area_cm2    numeric(10,2),
  cost_per_cm2 numeric(10,4),
  status      text not null default 'pending'
                check (status in ('pending','ordered','received','cancelled')),
  ordered_at  timestamptz,
  received_at timestamptz,
  created_at  timestamptz default now()
);

create table promos (
  code        text primary key,
  type        text not null check (type in ('pct','shipping')),
  value       numeric(10,2) not null,
  min_amount  numeric(10,2) default 0,
  active      boolean default true,
  expires_at  timestamptz
);

-- ================================================================
-- GRUPO: OPERACIÓN
-- ================================================================

create table suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_name  text,
  email         text,
  phone         text,
  address       jsonb,
  techniques    text[] default '{}',   -- ['dtf','bordado',...]
  zones         text[] default '{}',   -- ['montevideo','interior','*']
  rating        numeric(3,2) default 5.00,
  active        boolean default true,
  notes         text,
  created_at    timestamptz default now()
);

-- ================================================================
-- GRUPO: COMUNIDAD
-- ================================================================

create table favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id) on delete cascade,
  design_id  uuid references designs(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, design_id)
);

create table tickets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references users(id),
  subject    text not null,
  status     text not null default 'open' check (status in ('open','closed')),
  messages   jsonb not null default '[]',
  created_at timestamptz default now()
);

create table activity_log (
  id         bigserial primary key,
  user_id    uuid references users(id),
  action     text not null,
  entity     text not null,
  entity_id  text,
  before     jsonb,
  after      jsonb,
  created_at timestamptz default now()
);
```

---

## 6 · Row Level Security (`supabase/migrations/002_rls.sql`)

```sql
alter table users          enable row level security;
alter table orders         enable row level security;
alter table order_lines    enable row level security;
alter table designs        enable row level security;
alter table royalties      enable row level security;
alter table favorites      enable row level security;
alter table products       enable row level security;

-- Lectura pública: diseños aprobados y no propios
create policy "designs_public_read"
  on designs for select
  using (status = 'approved' and is_own = false);

-- Clientes ven sus propios diseños (is_own) independiente del status
create policy "designs_own_read"
  on designs for select
  using (artist_id is null and
    exists (select 1 from artists a join users u on a.user_id = u.id
            where u.id = auth.uid()));

-- Solo artista dueño modifica su diseño
create policy "designs_artist_write"
  on designs for all
  using (exists (select 1 from artists where id = designs.artist_id and user_id = auth.uid()));

-- Clientes solo ven sus pedidos
create policy "orders_own"
  on orders for select using (user_id = auth.uid());

-- Staff ve y modifica todos los pedidos
create policy "orders_staff_all"
  on orders for all
  using (exists (select 1 from users where id = auth.uid() and role in ('staff','admin')));

-- Lectura pública de productos activos
create policy "products_public_read"
  on products for select using (active = true);

-- Admin escribe productos
create policy "products_admin_write"
  on products for insert with check (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );

-- Artistas ven sus propias regalías
create policy "royalties_artist_read"
  on royalties for select
  using (artist_id in (select id from artists where user_id = auth.uid()));

-- Clientes ven y gestionan sus favoritos
create policy "favorites_own"
  on favorites for all using (user_id = auth.uid());
```

---

## 7 · DAO — ejemplo de uso con dominio (`lib/dao/orders.ts`)

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { canTransition, requiresSupplier } from '@/domain/production';
import { calculateRoyalty } from '@/domain/royalties';
import type { OrderStage } from '@/types';

export async function advanceStage(
  orderId: string,
  to: OrderStage,
  currentStage: OrderStage,
  supplierId?: string
) {
  // Validar transición con el dominio
  if (!canTransition(currentStage, to))
    throw new Error(`Transición inválida: ${currentStage} → ${to}`);

  if (requiresSupplier(to) && !supplierId)
    throw new Error('Se requiere asignar un proveedor antes de pasar a producción');

  const supabase = createServerClient();

  const { data: order, error } = await supabase
    .from('orders')
    .update({
      status:      to,
      supplier_id: supplierId ?? undefined,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', orderId)
    .select().single();

  if (error) throw error;

  // Registrar en audit_log
  await supabase.from('activity_log').insert({
    action:    'stage_changed',
    entity:    'orders',
    entity_id: orderId,
    before:    { status: currentStage },
    after:     { status: to, supplier_id: supplierId },
  });

  // Cuando se entrega, calcular regalías en order_lines
  if (to === 'delivered') {
    await computeRoyalties(orderId, supabase);
  }

  return order;
}

async function computeRoyalties(orderId: string, supabase: ReturnType<typeof createServerClient>) {
  const { data: lines } = await supabase
    .from('order_lines')
    .select('*, designs(artist_id, artists(tier, royalty_rate))')
    .eq('order_id', orderId);

  for (const line of lines ?? []) {
    const artist = line.designs?.artists;
    if (!artist || !line.precio_neto || !line.costo_real) continue;

    const { royalty, tier, rate } = calculateRoyalty({
      precioNeto:  line.precio_neto,
      costoReal:   line.costo_real,
      artistTier:  artist.tier,
    });

    await supabase.from('royalties').insert({
      order_id:      orderId,
      order_line_id: line.id,
      artist_id:     artist.id ?? line.designs?.artist_id,
      design_id:     line.design_id,
      amount:        royalty,
      tier,
      rate,
      status:        'pending',
    });

    // Actualizar royalty_amt en la línea
    await supabase.from('order_lines')
      .update({ royalty_amt: royalty }).eq('id', line.id);
  }
}
```

---

## 8 · Middleware de rutas (`middleware.ts`)

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED: Record<string, string> = {
  '/cuenta': 'customer',
  '/admin':  'staff',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const required = Object.entries(PROTECTED).find(([p]) => pathname.startsWith(p))?.[1];
  if (!required) return NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: n => request.cookies.get(n)?.value, set: () => {}, remove: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?return=${pathname}`, request.url));

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  const ROLES: Record<string, number> = { guest: 0, customer: 1, staff: 2, admin: 3 };
  if ((ROLES[profile?.role ?? 'guest'] ?? 0) < (ROLES[required] ?? 0))
    return NextResponse.redirect(new URL('/login', request.url));

  return NextResponse.next();
}

export const config = { matcher: ['/cuenta/:path*', '/admin/:path*'] };
```

---

## 9 · Integración de pagos

```typescript
// app/api/webhooks/mercadopago/route.ts
import { createServerClient } from '@/lib/supabase/server';
import { canTransition } from '@/domain/production';

export async function POST(request: Request) {
  const body = await request.json();
  if (body.type !== 'payment') return new Response('ok');

  const supabase = createServerClient();
  const orderId  = body.data?.external_reference;

  const { data: order } = await supabase.from('orders').select('status').eq('id', orderId).single();

  // Usar el dominio para validar la transición antes de persistir
  if (order && canTransition(order.status, 'paid')) {
    await supabase.from('orders').update({
      status:           'paid',
      payment_id:       String(body.data.id),
      payment_provider: 'mercadopago',
      updated_at:       new Date().toISOString(),
    }).eq('id', orderId);

    await supabase.from('payments').insert({
      order_id:    orderId,
      amount:      body.data.transaction_amount,
      method:      'mercadopago',
      status:      'approved',
      external_id: String(body.data.id),
    });

    await supabase.from('activity_log').insert({
      action: 'payment_confirmed', entity: 'orders', entity_id: orderId,
      before: { status: order.status }, after: { status: 'paid' },
    });
  }

  return new Response('ok');
}
```

---

## 10 · Guía de migración desde Arquitectura A

### Tabla de equivalencias

| Arquitectura A | Arquitectura B | Tipo |
|---|---|---|
| `domain/*.js` (9 módulos) | `domain/*.ts` | **Copiar + tipos TS** |
| `data/dao.js` método → | `lib/dao/*.ts` función → | Migrar 1:1 |
| `data/db.js` store por store | SQL migrations tablas | Convertir |
| `data/seed.js` | `supabase/migrations/003_seed.sql` | Convertir |
| `app/session.js` | Supabase Auth + middleware | Adaptar |
| `app/router.js` | Next.js App Router | Reemplazar |
| `app/hooks.js` | Zustand + React Context | Adaptar |
| `app/config.js` | `lib/config.ts` + env vars | Adaptar |
| `app/i18n.js` | next-intl | Reemplazar |
| `components/*.js` | `components/ui/*.tsx` shadcn/ui | Reescribir |
| `views/client/*.js` | `app/(client)/*/page.tsx` | Reescribir |
| `views/admin/*.js` | `app/admin/*/page.tsx` | Reescribir |
| `designs[].categories[]` array | tabla `design_categories` | Normalizar |
| `products[].categories[]` array | tabla `product_categories` | Normalizar |
| `zones[].techniques[]` array | tabla `zone_techniques` | Normalizar |

### Prompt tipo para migrar una vista usando dominio

```
Tengo esta vista en vanilla JS (Arquitectura A):
[pegar views/admin/produccion.js]

El dominio que usa es (NO modificar):
- domain/production.ts: canTransition(), getValidNext(), requiresSupplier()
- domain/supplier.ts: rankSuppliers(), canFulfill()

El DAO equivalente:
- lib/dao/orders.ts: getAll(), advanceStage(orderId, to, current, supplierId?)
- lib/dao/suppliers.ts: getAll(), getActiveOrderCounts()

Migrala a Next.js 14 con:
- Server Component donde sea posible, Server Actions para mutaciones
- shadcn/ui para tabla y badges de estado
- TypeScript estricto
- Misma lógica de negocio exactamente
```

### Orden recomendado de migración

```
Fase 1 — Base
  → SQL schema (001_schema.sql) + RLS (002_rls.sql) + seed (003_seed.sql)
  → Supabase Auth + users + middleware

Fase 2 — Domain (sin cambios de lógica)
  → Copiar domain/*.js → domain/*.ts + agregar tipos

Fase 3 — Catálogo (solo lectura)
  → home, galería, producto, artistas (Server Components, ISR)

Fase 4 — Interacción
  → personalizador (usa pricing + customizer)
  → carrito (Zustand store) + checkout + pagos

Fase 5 — Cuenta + artista
  → cuenta del cliente, portal del artista

Fase 6 — Admin
  → pedidos + producción (usa production + supplier)
  → diseños moderación · cotizaciones · regalías · calidad · inventario
```

---

## 11 · Variables de entorno

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

MP_ACCESS_TOKEN=APP_USR-xxxx
MP_PUBLIC_KEY=APP_USR-xxxx
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx

NEXT_PUBLIC_URL=https://fluve.studio
NEXT_PUBLIC_FEATURE_ARTIST_PORTAL=true
NEXT_PUBLIC_FEATURE_B2B=true
```
