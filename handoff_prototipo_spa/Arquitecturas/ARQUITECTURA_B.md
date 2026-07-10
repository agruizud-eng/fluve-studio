# Arquitectura B — Fluvë Studio SaaS (Producción)
### versión 2 · incorpora Módulo de Dominio separado del resto del sistema

> **Propósito:** define la arquitectura de producción del sistema.
> Se construye a partir de la Arquitectura A (prototipo vanilla + IndexedDB)
> una vez validados todos los flujos. El módulo `domain/` migra sin cambios
> desde la Arquitectura A; el resto del sistema se reescribe sobre el stack
> de producción.
>
> Documento complementario: **ARQUITECTURA_A.md** (prototipo SPA).

---

## 1 · Stack tecnológico

| Capa | Tecnología | Rol en el sistema |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Frontend + API routes + SSR/SSG |
| **Lenguaje** | TypeScript | Tipos compartidos entre todas las capas |
| **Domain** | TypeScript puro | Migrado 1:1 desde `domain/*.js` de Arch. A |
| **UI primitivos** | shadcn/ui + Tailwind CSS | Equivale a `components/` de Arch. A |
| **Estado global** | Zustand | Equivale a `hooks.js` event bus + `dom.createStore()` |
| **Backend / BD** | Supabase (PostgreSQL) | Equivale a `data/db.js` + `data/dao.js` |
| **Auth** | Supabase Auth | Equivale a `app/session.js` |
| **Archivos** | Supabase Storage | Diseños, previews, facturas |
| **Server-side** | Supabase Edge Functions | Webhooks de pago, emails, lógica sensible |
| **i18n** | next-intl | Equivale a `app/i18n.js` |
| **Pagos UY** | MercadoPago SDK for Node | Pesos uruguayos + cuotas |
| **Pagos intl** | Stripe | Mercado internacional |
| **Deploy frontend** | Vercel | CI/CD automático desde GitHub |
| **Deploy backend** | Supabase Cloud | BD + Auth + Storage + Edge Functions |

---

## 2 · Los cinco módulos en producción

La misma separación de responsabilidades que en Arquitectura A,
pero cada módulo usa el stack de producción:

| Módulo | Arq. A | Arq. B | Cambio |
|---|---|---|---|
| **Core** | `app/*.js` (IIFE) | Next.js App Router, middleware, providers | Reescribir |
| **Domain** | `domain/*.js` (JS puro) | `domain/*.ts` (TS puro) | **Solo agregar tipos** |
| **Data** | `data/dao.js` + IndexedDB | Supabase client + PostgreSQL | Migrar método a método |
| **Components** | `components/*.js` DOM puro | `components/` React + shadcn/ui | Reescribir en React |
| **Views** | `views/**/*.js` | `app/**/page.tsx` React | Reescribir en React |

> **Regla de dependencia (idéntica a Arch. A):**
> Domain no importa nada de Next.js, React, Supabase ni ningún framework.
> Es TypeScript puro. Domain puede desplegarse como una Edge Function,
> un Server Action, o llamarse desde el cliente — no le importa el contexto.

---

## 3 · Estructura de archivos

```
fluve-studio/
│
├── domain/                         ← MÓDULO DOMAIN — migrado 1:1 desde Arch. A
│   ├── pricing.ts                  ← domain/pricing.js + tipos TS
│   ├── production.ts               ← domain/production.js + tipos TS
│   ├── customizer.ts               ← domain/customizer.js + tipos TS
│   ├── royalties.ts                ← domain/royalties.js + tipos TS
│   ├── quotation.ts                ← domain/quotation.js + tipos TS
│   ├── quality.ts                  ← domain/quality.js + tipos TS
│   └── inventory.ts                ← domain/inventory.js + tipos TS
│
├── app/                            ← MÓDULO CORE (Next.js App Router)
│   ├── layout.tsx                  ← Root layout, providers, metadatos
│   ├── globals.css                 ← tokens.css + base.css → Tailwind vars
│   │
│   ├── (client)/                   ← Rutas públicas (sin prefijo de URL)
│   │   ├── page.tsx                ← Home
│   │   ├── galeria/page.tsx
│   │   ├── producto/[slug]/
│   │   │   ├── page.tsx            ← ISR: revalidate cada 1h
│   │   │   └── loading.tsx         ← Skeleton (≡ viewState loading)
│   │   ├── personalizar/[slug]/page.tsx
│   │   ├── carrito/page.tsx
│   │   ├── checkout/page.tsx
│   │   └── pedido/[id]/page.tsx
│   │
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── registro/page.tsx
│   │   └── callback/route.ts       ← OAuth callback Supabase
│   │
│   ├── cuenta/
│   │   ├── layout.tsx              ← Verifica sesión; redirige a /login
│   │   └── [[...seccion]]/page.tsx
│   │
│   ├── admin/                      ← Panel admin (role: staff | admin)
│   │   ├── layout.tsx
│   │   ├── page.tsx                ← Dashboard
│   │   ├── pedidos/[id]/page.tsx
│   │   ├── produccion/page.tsx
│   │   ├── productos/page.tsx
│   │   ├── disenos/page.tsx
│   │   ├── artistas/page.tsx
│   │   ├── cotizaciones/page.tsx
│   │   ├── regalias/page.tsx
│   │   ├── calidad/page.tsx
│   │   ├── inventario/page.tsx
│   │   ├── clientes/page.tsx
│   │   ├── reportes/page.tsx
│   │   └── config/page.tsx
│   │
│   └── api/                        ← Solo para webhooks externos
│       ├── webhooks/
│       │   ├── mercadopago/route.ts
│       │   └── stripe/route.ts
│       └── upload/route.ts
│
├── components/                     ← MÓDULO COMPONENTS
│   ├── ui/                         ← shadcn/ui (≡ components/*.js de Arch. A)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx               ← ≡ chip.js
│   │   ├── input.tsx
│   │   ├── dialog.tsx              ← ≡ confirm.js
│   │   └── data-table.tsx          ← ≡ dataTable.js
│   └── features/                   ← Componentes de dominio
│       ├── ProductCard.tsx         ← ≡ productCard.js
│       ├── CartLine.tsx
│       ├── Stepper.tsx
│       ├── FacetSidebar.tsx
│       ├── SearchBox.tsx
│       └── ProductionBadge.tsx     ← usa domain/production.ts
│
├── lib/                            ← MÓDULO DATA (adaptadores de infraestructura)
│   ├── supabase/
│   │   ├── client.ts               ← createBrowserClient() — Client Components
│   │   └── server.ts               ← createServerClient() — Server Components
│   ├── dao/                        ← ≡ data/dao.js — un archivo por entidad
│   │   ├── products.ts
│   │   ├── orders.ts
│   │   ├── designs.ts
│   │   ├── users.ts
│   │   ├── artists.ts
│   │   ├── suppliers.ts
│   │   └── purchases.ts
│   ├── config.ts                   ← ≡ app/config.js + env vars
│   └── utils.ts                    ← money(), date(), cn()
│
├── hooks/                          ← React hooks (≡ session.js + createStore)
│   ├── useCart.ts                  ← Zustand store (≡ cart:* events de hooks.js)
│   ├── useSession.ts
│   ├── useProducts.ts
│   └── useToast.ts
│
├── store/                          ← Zustand (≡ window.Fluve.hooks + dom.createStore)
│   ├── cartStore.ts
│   └── uiStore.ts
│
├── types/
│   └── index.ts                    ← Tipos del dominio (Producto, Diseño, Pedido…)
│
├── supabase/
│   ├── migrations/
│   │   ├── 20240101_schema.sql     ← Esquema base (§4)
│   │   ├── 20240102_rls.sql        ← Row Level Security (§5)
│   │   └── 20240103_seed.sql       ← ≡ data/seed.js
│   └── config.toml
│
├── middleware.ts                    ← Protección de rutas (≡ gating del router)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4 · Módulo Domain en TypeScript

La migración del dominio es la más directa del sistema: se copia la lógica de cada
`domain/*.js` y se agregan los tipos TypeScript. La lógica no cambia.

### 4.1 Tipos compartidos (`types/index.ts`)

```typescript
// types/index.ts — formas de datos del dominio

export type Technique = 'sublimacion' | 'serigrafia' | 'bordado' | 'dtf' | 'vinilo';

export type OrderStage =
  | 'pending' | 'paid' | 'in_production'
  | 'quality_check' | 'packaging' | 'shipped'
  | 'delivered' | 'cancelled';

export interface PricingInput {
  basePrice:  number;
  technique:  Technique;
  qty:        number;
  areaCm2?:   number;
  colors?:    number;
}

export interface PricingResult {
  unitPrice:  number;
  subtotal:   number;
  setupFee:   number;
  total:      number;
  breakdown:  Record<string, number | string>;
}

export interface DesignValidation {
  valid:    boolean;
  errors:   string[];
  warnings: string[];
}

export interface QCResult {
  passed:  boolean;
  missing: { id: string; label: string }[];
}

export interface QuoteLine extends PricingInput {
  productId:     string;
  name:          string;
  baseUnitPrice: number;
  unitPrice:     number;
  subtotal:      number;
}

export interface Quote {
  lines:          QuoteLine[];
  subtotal:       number;
  discountPct:    number;
  discountAmount: number;
  total:          number;
  validDays:      number;
  expiresAt:      string;
}
```

### 4.2 `domain/pricing.ts`

```typescript
import type { PricingInput, PricingResult, Technique } from '@/types';

export const TECHNIQUE_MULTIPLIERS: Record<Technique, number> = {
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

export function calculatePrice(input: PricingInput): PricingResult {
  const { basePrice, technique, qty, areaCm2, colors } = input;
  const techMultiplier = TECHNIQUE_MULTIPLIERS[technique] ?? 1.0;
  const areaFactor     = areaCm2 ? Math.max(1, areaCm2 / 100) : 1;
  const colorFactor    = colors  ? 1 + (colors - 1) * 0.15    : 1;
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
    breakdown:  { basePrice, techMultiplier, areaFactor, colorFactor,
                  qtyDiscount: qtyDiscount * 100 + '%' },
  };
}

export function getSupportedTechniques(): Technique[] {
  return Object.keys(TECHNIQUE_MULTIPLIERS) as Technique[];
}
```

### 4.3 `domain/production.ts`

```typescript
import type { OrderStage } from '@/types';

interface StageDefinition {
  label: string;
  color: string;
  next:  OrderStage[];
}

export const STAGES: Record<OrderStage, StageDefinition> = {
  pending:       { label: 'Pendiente de pago',  color: 'warning', next: ['paid', 'cancelled'] },
  paid:          { label: 'Pago confirmado',     color: 'accent',  next: ['in_production', 'cancelled'] },
  in_production: { label: 'En producción',       color: 'accent',  next: ['quality_check'] },
  quality_check: { label: 'Control de calidad',  color: 'warning', next: ['packaging', 'in_production'] },
  packaging:     { label: 'En empaque',          color: 'accent',  next: ['shipped'] },
  shipped:       { label: 'Despachado',          color: 'success', next: ['delivered'] },
  delivered:     { label: 'Entregado',           color: 'success', next: [] },
  cancelled:     { label: 'Cancelado',           color: 'danger',  next: [] },
};

export const canTransition   = (from: OrderStage, to: OrderStage) =>
  STAGES[from]?.next.includes(to) ?? false;

export const getValidNext    = (current: OrderStage): OrderStage[] =>
  STAGES[current]?.next ?? [];

export const getStageLabel   = (stage: OrderStage) => STAGES[stage]?.label ?? stage;
export const getStageColor   = (stage: OrderStage) => STAGES[stage]?.color ?? 'muted';
export const isTerminal      = (stage: OrderStage) => STAGES[stage]?.next.length === 0;
```

### 4.4 Resto del dominio (estructura idéntica)

Cada uno de los módulos restantes sigue el mismo patrón: copiar la lógica del `.js`
y añadir los tipos TypeScript. Ninguno importa React, Next.js, Supabase ni ningún
framework. Solo importan tipos desde `@/types` cuando es necesario.

```typescript
// domain/customizer.ts — estructura
export function validateDesign(input: DesignInput): DesignValidation { ... }
export function getConstraints(technique: Technique): TechniqueConstraints | null { ... }

// domain/royalties.ts — estructura
export function calculateRoyalty(input: RoyaltyInput): RoyaltyResult { ... }
export function periodSummary(orders: Order[], artistId: string): PeriodSummary { ... }

// domain/quotation.ts — estructura (importa calculatePrice de pricing.ts)
export function generateQuote(input: QuoteInput): Quote { ... }

// domain/quality.ts — estructura
export function getCheckpoints(technique: Technique): QCCheckpoint[] { ... }
export function validateQC(input: QCInput): QCResult { ... }

// domain/inventory.ts — estructura
export function checkAlerts(items: InventoryItem[], overrides?: ReorderOverrides): StockAlert[] { ... }
export function canFulfill(stock: number, qty: number): FulfillResult { ... }
export function recommendedReorderPoint(input: ReorderInput): number { ... }
```

---

## 5 · Módulo Data — Supabase

### 5.1 Esquema PostgreSQL (migrado desde IndexedDB)

```sql
-- ============================================================
-- USUARIOS
-- ============================================================
create table users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  name       text,
  phone      text,
  role       text not null default 'customer'
               check (role in ('guest','customer','staff','admin')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PRODUCTOS
-- ============================================================
create table products (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text,
  base_price  numeric(10,2) not null,
  category    text,
  techniques  text[],
  images      text[],
  featured    boolean default false,
  active      boolean default true,
  sort_order  int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- DISEÑOS
-- ============================================================
create table designs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete cascade,
  product_id  uuid references products(id) on delete restrict,
  name        text,
  config      jsonb not null default '{}',
  preview_url text,
  public      boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- PEDIDOS
-- ============================================================
create table orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references users(id) on delete restrict,
  status           text default 'pending'
                     check (status in ('pending','paid','in_production',
                                       'quality_check','packaging',
                                       'shipped','delivered','cancelled')),
  items            jsonb not null default '[]',
  subtotal         numeric(10,2),
  shipping         numeric(10,2) default 0,
  discount         numeric(10,2) default 0,
  total            numeric(10,2),
  shipping_address jsonb,
  payment_id       text,
  payment_provider text check (payment_provider in ('mercadopago','stripe','manual')),
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ============================================================
-- ARTISTAS
-- ============================================================
create table artists (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references users(id) on delete cascade unique,
  display_name   text not null,
  bio            text,
  avatar_url     text,
  portfolio_url  text,
  featured       boolean default false,
  royalty_pct    numeric(5,2) default 10.00,
  active         boolean default true,
  created_at     timestamptz default now()
);

-- ============================================================
-- PROVEEDORES
-- ============================================================
create table suppliers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  contact_name text,
  email        text,
  phone        text,
  address      jsonb,
  active       boolean default true,
  created_at   timestamptz default now()
);

-- ============================================================
-- COMPRAS / INSUMOS
-- ============================================================
create table purchases (
  id          uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id) on delete restrict,
  items       jsonb not null default '[]',
  total       numeric(10,2),
  status      text default 'pending'
                check (status in ('pending','ordered','received','cancelled')),
  ordered_at  timestamptz,
  received_at timestamptz,
  created_at  timestamptz default now()
);
```

### 5.2 DAO en producción (`lib/dao/orders.ts`)

```typescript
// lib/dao/orders.ts — equivale a dao.orders.* de Arch. A
import { createServerClient } from '@/lib/supabase/server';
import type { OrderStage } from '@/types';

export async function getAll() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, users(name, email)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getById(id: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('orders').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getByUser(userId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Avanza el estado del pedido — usa domain/production.ts para validar
 */
export async function advanceStage(orderId: string, to: OrderStage, currentStage: OrderStage) {
  const { canTransition } = await import('@/domain/production');
  if (!canTransition(currentStage, to))
    throw new Error(`Transición inválida: ${currentStage} → ${to}`);

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('orders')
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select().single();
  if (error) throw error;
  return data;
}
```

---

## 6 · Módulo Core — Next.js

### 6.1 Protección de rutas (`middleware.ts`)

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ROLE_REQUIRED: Record<string, string> = {
  '/cuenta': 'customer',
  '/admin':  'staff',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiredRole = Object.entries(ROLE_REQUIRED)
    .find(([prefix]) => pathname.startsWith(prefix))?.[1];
  if (!requiredRole) return NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => request.cookies.get(n)?.value,
                 set: () => {}, remove: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?return=${pathname}`, request.url));

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single();

  const ROLES: Record<string, number> = { guest:0, customer:1, staff:2, admin:3 };
  if ((ROLES[profile?.role ?? 'guest'] ?? 0) < (ROLES[requiredRole] ?? 0))
    return NextResponse.redirect(new URL('/login', request.url));

  return NextResponse.next();
}

export const config = { matcher: ['/cuenta/:path*', '/admin/:path*'] };
```

### 6.2 Row Level Security (`supabase/migrations/20240102_rls.sql`)

```sql
alter table users    enable row level security;
alter table orders   enable row level security;
alter table designs  enable row level security;
alter table products enable row level security;

-- Clientes solo ven sus propios pedidos
create policy "customers_own_orders"
  on orders for select using (user_id = auth.uid());

-- Clientes solo modifican sus propios diseños
create policy "customers_own_designs"
  on designs for all using (user_id = auth.uid());

-- Staff ve y modifica todos los pedidos
create policy "staff_all_orders"
  on orders for all
  using (exists (
    select 1 from users where id = auth.uid() and role in ('staff','admin')
  ));

-- Productos activos son de lectura pública
create policy "products_public_read"
  on products for select using (active = true);

-- Solo admin puede escribir productos
create policy "admin_products_write"
  on products for insert with check (
    exists (select 1 from users where id = auth.uid() and role = 'admin')
  );
```

---

## 7 · Uso del dominio desde el frontend React

```typescript
// app/admin/cotizaciones/page.tsx — ejemplo de uso del dominio en producción

import { generateQuote } from '@/domain/quotation';
import { calculatePrice } from '@/domain/pricing';
import * as dao from '@/lib/dao/orders';

// En un Server Action:
async function crearCotizacion(formData: FormData) {
  'use server';

  const items = JSON.parse(formData.get('items') as string);
  const clientId = formData.get('clientId') as string;

  // El dominio no sabe si está en un Server Action o en una Edge Function.
  // Solo recibe datos y devuelve resultados.
  const quote = generateQuote({
    items,
    clientPrices: {},     // se podría cargar de la BD
    validDays: 30,
    globalDiscount: 0,
  });

  // Guardamos en BD
  await dao.orders.createQuote({ clientId, ...quote });
  return quote;
}
```

```typescript
// app/(client)/personalizar/[slug]/page.tsx — dominio en el cliente

'use client';
import { validateDesign }  from '@/domain/customizer';
import { calculatePrice }  from '@/domain/pricing';
import { useState }        from 'react';

export default function PersonalizadorPage({ params }: { params: { slug: string } }) {
  const [config, setConfig] = useState({ technique: 'sublimacion', qty: 1, colors: 1 });

  // Mismo código que en Arquitectura A — el dominio no cambió
  const validation = validateDesign({
    technique: config.technique,
    dpi:       150,
    colors:    config.colors,
    areaCm2:   300,
  });

  const price = calculatePrice({
    basePrice:  25,
    technique:  config.technique,
    qty:        config.qty,
    areaCm2:    300,
  });

  return (
    <div>
      {!validation.valid && <ul>{validation.errors.map(e => <li key={e}>{e}</li>)}</ul>}
      <p>Total: ${price.total}</p>
      {/* … */}
    </div>
  );
}
```

---

## 8 · Integración de pagos

```typescript
// app/api/webhooks/mercadopago/route.ts
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const body = await request.json();
  if (body.type !== 'payment') return new Response('ok', { status: 200 });

  const supabase = createServerClient();
  const { canTransition } = await import('@/domain/production');

  // Buscar el pedido
  const orderId = body.data?.external_reference;
  const { data: order } = await supabase
    .from('orders').select('status').eq('id', orderId).single();

  // Verificar transición con el dominio antes de persistir
  if (order && canTransition(order.status, 'paid')) {
    await supabase
      .from('orders')
      .update({ status: 'paid', payment_id: String(body.data.id),
                payment_provider: 'mercadopago', updated_at: new Date().toISOString() })
      .eq('id', orderId);
  }

  return new Response('ok', { status: 200 });
}
```

---

## 9 · Guía de migración desde Arquitectura A

### 9.1 Tabla de equivalencias completa

| Arquitectura A | Arquitectura B | Tipo |
|---|---|---|
| `domain/*.js` | `domain/*.ts` | **Copiar + tipos TS únicamente** |
| `data/dao.js` método por método | `lib/dao/*.ts` función por función | Migrar 1:1 |
| `data/db.js` | Supabase schema SQL | Convertir stores → tablas |
| `data/seed.js` → SEED objects | `supabase/migrations/*_seed.sql` | Convertir objetos → INSERT |
| `app/session.js` | Supabase Auth + `useSession.ts` | Adaptar |
| `app/router.js` | Next.js App Router (file system) | Reemplazar |
| `app/hooks.js` (event bus) | Zustand store + React events | Adaptar |
| `app/config.js` | `lib/config.ts` + `NEXT_PUBLIC_*` env vars | Adaptar |
| `app/i18n.js` | `next-intl` | Reemplazar |
| `app/util/dom.js` → `el()` | JSX / React | Reemplazar |
| `components/*.js` | `components/ui/*.tsx` (shadcn/ui) | Reescribir |
| `views/client/*.js` | `app/(client)/*/page.tsx` | Reescribir |
| `views/admin/*.js` | `app/admin/*/page.tsx` | Reescribir |
| `localStorage.fluve_session` | Cookie httpOnly (Supabase Auth) | Automático |
| Roles: `guest/customer/staff/admin` | Columna `role` en `users` + RLS | Migrar |

### 9.2 Prompt tipo para pedir a Claude/Gemini la migración de una vista

```
Tengo esta vista en vanilla JS (Arquitectura A):

[pegar views/admin/produccion.js]

El sistema usa estas funciones del dominio que NO deben modificarse:
- domain/production.ts: canTransition(), getValidNextStages(), getStageLabel()
- domain/quality.ts: getCheckpoints(), validateQC()

Las queries a la base de datos usan este DAO:
- lib/dao/orders.ts: getAll(), advanceStage()

Migrala a un Next.js 14 Server Component con:
- shadcn/ui para la tabla y los badges de estado
- Tailwind CSS
- TypeScript estricto
- Server Actions para las transiciones de estado (no endpoints REST)
- Mantén la misma lógica de negocio exactamente
```

### 9.3 Orden de migración recomendado

```
Fase 1 — Infraestructura base
  → Schema SQL + RLS + seed SQL desde data/seed.js
  → Supabase Auth + tabla users + middleware

Fase 2 — Dominio (sin cambios de lógica)
  → Copiar domain/*.js → domain/*.ts
  → Agregar tipos TypeScript
  → Verificar que ningún módulo domain importa React o Supabase

Fase 3 — Vistas más simples (Server Components)
  → home, galería, producto (solo lectura, sin estado)

Fase 4 — Vistas con estado del cliente
  → personalizador (usa domain/pricing + domain/customizer)
  → carrito (Zustand store ≡ hooks.js event bus)
  → checkout + integración MercadoPago

Fase 5 — Área privada cliente
  → cuenta, pedidos del cliente

Fase 6 — Panel admin (vista por vista)
  → pedidos + avance de estado (usa domain/production)
  → cotizaciones (usa domain/quotation)
  → calidad (usa domain/quality)
  → regalías (usa domain/royalties)
  → inventario (usa domain/inventory)
  → reportes, config
```

---

## 10 · Variables de entorno

```bash
# .env.local — NUNCA commitear a git
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1...

MP_ACCESS_TOKEN=APP_USR-xxxx
MP_PUBLIC_KEY=APP_USR-xxxx
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx

NEXT_PUBLIC_URL=https://fluve.studio
NEXT_PUBLIC_FEATURE_ARTIST_PORTAL=true
NEXT_PUBLIC_FEATURE_B2B=true
```
