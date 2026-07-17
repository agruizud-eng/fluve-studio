-- ============================================================
--  FLUVË STUDIO — Schema SQL v2.0
--  Arquitectura B · Supabase / PostgreSQL
--  Versión 2.0 · Julio 2026
--
--  Alineado con: fluvestudio-documento.md
--
--  29 tablas · 18 tipos enum · 3 secuencias · 14 familias
--  de triggers · seed de técnicas, categorías y configuración
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 2. TIPOS ENUM
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'customer',
  'artist',
  'staff',
  'admin'
);

CREATE TYPE artist_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'suspended'
);

CREATE TYPE artist_tier AS ENUM (
  'base',   -- regalía 10% del margen bruto (§7.2)
  'pro'     -- regalía 20% del margen bruto (§7.2)
);

CREATE TYPE product_status AS ENUM (
  'active',
  'draft',
  'archived'
);

CREATE TYPE design_status AS ENUM (
  'draft',
  'pending_review',
  'active',
  'rejected',
  'archived'
);

CREATE TYPE order_status AS ENUM (
  'draft',
  'pending',
  'paid',
  'in_production',
  'quality_check',
  'packaging',
  'shipped',
  'delivered',
  'cancelled'
);

-- Agrega quality_check y packaging del motor de pedidos §5

CREATE TYPE ticket_status AS ENUM (
  'open',
  'in_progress',
  'resolved',
  'closed'
);

CREATE TYPE ticket_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

CREATE TYPE quotation_status AS ENUM (
  'pending',
  'quoted',
  'accepted',
  'rejected',
  'expired'
);

CREATE TYPE payment_provider AS ENUM (
  'mercadopago',
  'stripe',
  'cash',
  'bank_transfer'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'refunded'
);

CREATE TYPE royalty_status AS ENUM (
  'pending',
  'confirmed',
  'paid',
  'cancelled'
);

CREATE TYPE notification_type AS ENUM (
  'order_update',
  'ticket_reply',
  'royalty_credit',
  'artist_status',
  'system'
);

CREATE TYPE category_type AS ENUM (
  'tema',               -- ¿De qué trata el diseño? (Animales, Humor…)
  'estilo',             -- ¿Cómo se ve visualmente? (Abstracto, Retro…)
  'causa',              -- ¿Qué valores expresa? (Medio Ambiente…)
  'desafio',            -- Categorías editoriales (Tendencias, Viajes…)
  'producto_tipo',      -- Tipo de objeto físico (Prendas, Accesorios…)
  'producto_audiencia'  -- A quién va dirigido (Hombre, Mujer, Unisex…)
);

CREATE TYPE technique_cost_model AS ENUM (
  'area',     -- costo por m²
  'fixed',    -- precio fijo por unidad
  'screens',  -- costo por pantalla/color (serigrafía)
  'stitches'  -- costo por millar de puntadas (bordado)
);

CREATE TYPE technique_rate_unit AS ENUM (
  'm2',
  'unit',
  'screen',
  'millar'
);

CREATE TYPE purchase_type AS ENUM (
  'product',   -- producto físico (remera, taza…)
  'material'   -- consumible de impresión (rollo DTF, tinta…)
);

CREATE TYPE promo_type AS ENUM (
  'pct',      -- porcentaje de descuento
  'shipping'  -- envío gratis o con descuento
);


-- ============================================================
-- 3. SECUENCIAS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS fluve_order_seq  START 1;
CREATE SEQUENCE IF NOT EXISTS fluve_ticket_seq START 1;
CREATE SEQUENCE IF NOT EXISTS fluve_quote_seq  START 1;


-- ============================================================
-- 4. FUNCIÓN HELPER — updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================
-- 5. TABLAS  (29 tablas en orden de dependencia FK)
-- ============================================================


-- ------------------------------------------------------------
-- 5.1  USERS
-- ------------------------------------------------------------

CREATE TABLE users (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text        NOT NULL UNIQUE,
  display_name  text,
  avatar_url    text,
  phone         text,
  role          user_role   NOT NULL DEFAULT 'customer',
  is_active     boolean     NOT NULL DEFAULT true,
  last_seen_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  users           IS 'Perfil de aplicación vinculado a auth.users de Supabase.';
COMMENT ON COLUMN users.role      IS 'Jerarquía numérica implícita: customer(1) < artist(2) < staff(3) < admin(4).';


-- ------------------------------------------------------------
-- 5.2  CATEGORIES
--      Sistema unificado jerárquico: temas · estilos · causas ·
--      desafíos · producto-tipo · producto-audiencia (§9).
--      parent_id es DEFERRABLE para permitir inserción en batch.
-- ------------------------------------------------------------

CREATE TABLE categories (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  type       category_type NOT NULL,
  name       text          NOT NULL,
  slug       text          NOT NULL UNIQUE,
  parent_id  uuid          REFERENCES categories(id) ON DELETE SET NULL
                           DEFERRABLE INITIALLY DEFERRED,
  active     boolean       NOT NULL DEFAULT true,
  sort_order integer       NOT NULL DEFAULT 0,
  created_at timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  categories           IS 'Sistema de taxonomía unificado y jerárquico. Cubre temas, estilos, causas, desafíos y categorías de producto (§9).';
COMMENT ON COLUMN categories.parent_id IS 'FK autorreferencial DEFERRABLE para árbol jerárquico. NULL = categoría raíz.';


-- ------------------------------------------------------------
-- 5.3  TECHNIQUES
--      Siete técnicas de impresión del documento §7.3.
--      El campo cost_model determina cómo domain/pricing.ts
--      calcula el costo: por área, por unidad, por pantalla o
--      por millar de puntadas.
-- ------------------------------------------------------------

CREATE TABLE techniques (
  id                 uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text                  NOT NULL UNIQUE,
  name               text                  NOT NULL,
  cost_model         technique_cost_model  NOT NULL,
  rate               numeric(10,4)         NOT NULL CHECK (rate >= 0),
  rate_unit          technique_rate_unit   NOT NULL,
  surcharge_per_unit numeric(10,2)         NOT NULL DEFAULT 0 CHECK (surcharge_per_unit >= 0),
  -- recargo adicional por unidad producida (§7.3: sublimación +$2/u, bordado +$6/u…)
  min_qty            integer               NOT NULL DEFAULT 1 CHECK (min_qty >= 1),
  active             boolean               NOT NULL DEFAULT true,
  notes              text,
  created_at         timestamptz           NOT NULL DEFAULT now(),
  updated_at         timestamptz           NOT NULL DEFAULT now()
);

COMMENT ON TABLE  techniques                   IS 'Técnicas de impresión disponibles. 7 técnicas definidas en §7.3 del documento.';
COMMENT ON COLUMN techniques.rate              IS 'Tasa de costo según rate_unit: $/m² para área, $/u para fixed, $/pantalla para serigrafía, $/millar para bordado.';
COMMENT ON COLUMN techniques.surcharge_per_unit IS 'Recargo adicional por unidad: DTF UV +$3/u, Bordado +$6/u, Sublimación +$2/u, Vinilo +$1/u.';


-- ------------------------------------------------------------
-- 5.4  SUPPLIERS
--      Perfil de proveedores externos (imprentas, talleres).
--      El campo zones almacena zonas geográficas como array:
--      ['Mvd', 'Interior', 'Remoto'].
-- ------------------------------------------------------------

CREATE TABLE suppliers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  contact_name  text,
  contact_email text,
  contact_phone text,
  zones         text[]      NOT NULL DEFAULT '{}',
  -- Zonas de cobertura: ['Mvd', 'Interior', 'Remoto']
  rating        numeric(3,2) NOT NULL DEFAULT 0
                CHECK (rating >= 0 AND rating <= 5),
  active        boolean     NOT NULL DEFAULT true,
  current_load  integer     NOT NULL DEFAULT 0 CHECK (current_load >= 0),
  -- Pedidos activos asignados. Actualizado por trigger.
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  suppliers              IS 'Proveedores externos. El motor de asignación (§6) filtra por técnica, zona, carga y rating.';
COMMENT ON COLUMN suppliers.current_load IS 'Pedidos en estado in_production asignados a este proveedor. Actualizado por trigger al cambiar orders.status.';
COMMENT ON COLUMN suppliers.zones        IS 'Array de zonas geográficas de cobertura: {Mvd, Interior, Remoto}.';


-- ------------------------------------------------------------
-- 5.5  PROMOS
--      Cupones de descuento. Referenciados desde orders.
-- ------------------------------------------------------------

CREATE TABLE promos (
  code       text        PRIMARY KEY,
  type       promo_type  NOT NULL,
  value      numeric(10,2) NOT NULL CHECK (value > 0),
  -- pct: porcentaje (ej. 15 = 15%) · shipping: monto fijo UYU
  min_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (min_amount >= 0),
  max_uses   integer,
  -- NULL = usos ilimitados
  uses_count integer     NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  active     boolean     NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  promos      IS 'Cupones de descuento. uses_count incrementado por trigger al usar en un pedido.';
COMMENT ON COLUMN promos.type IS 'pct = porcentaje del subtotal. shipping = descuento en costo de envío.';


-- ------------------------------------------------------------
-- 5.6  ARTISTS
-- ------------------------------------------------------------

CREATE TABLE artists (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  handle           text          NOT NULL UNIQUE,
  -- URL pública: /artistas/:handle
  display_name     text          NOT NULL,
  bio              text,
  avatar_url       text,
  banner_url       text,
  shop_name        text,
  shop_description text,
  tier             artist_tier   NOT NULL DEFAULT 'base',
  -- base → royalty_rate 10% · pro → royalty_rate 20% (§7.2)
  status           artist_status NOT NULL DEFAULT 'pending',
  rejection_note   text,
  royalty_rate     numeric(5,4)  NOT NULL DEFAULT 0.1000
                   CHECK (royalty_rate >= 0 AND royalty_rate <= 1),
  -- Tasa negociada. Punto de partida según tier (base=0.10, pro=0.20).
  featured         boolean       NOT NULL DEFAULT false,
  total_sales      integer       NOT NULL DEFAULT 0,
  total_royalties  numeric(12,2) NOT NULL DEFAULT 0.00,
  applied_at       timestamptz   NOT NULL DEFAULT now(),
  approved_at      timestamptz,
  approved_by      uuid          REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT chk_handle_format CHECK (handle ~ '^[a-z0-9\-]{3,50}$')
);

COMMENT ON TABLE  artists              IS 'Perfil de artista. El estado inicial es pending hasta aprobación del admin (§4).';
COMMENT ON COLUMN artists.tier         IS 'base → 10% regalía / pro → 20% regalía. Define el royalty_rate por defecto.';
COMMENT ON COLUMN artists.royalty_rate IS 'Fracción decimal negociada individualmente. Se copia como snapshot en royalty_records.rate.';


-- ------------------------------------------------------------
-- 5.7  SUPPLIER_TECHNIQUES
--      Qué técnicas puede ejecutar cada proveedor.
--      Usado por el motor de asignación (§6).
-- ------------------------------------------------------------

CREATE TABLE supplier_techniques (
  supplier_id  uuid    NOT NULL REFERENCES suppliers(id)  ON DELETE CASCADE,
  technique_id uuid    NOT NULL REFERENCES techniques(id) ON DELETE CASCADE,
  active       boolean NOT NULL DEFAULT true,
  notes        text,
  PRIMARY KEY (supplier_id, technique_id)
);

COMMENT ON TABLE supplier_techniques IS 'Pivot proveedores ↔ técnicas. Filtra proveedores compatibles con la técnica del pedido (§6).';


-- ------------------------------------------------------------
-- 5.8  PRODUCTS
-- ------------------------------------------------------------

CREATE TABLE products (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text           NOT NULL UNIQUE,
  name         text           NOT NULL,
  description  text,
  product_type text           NOT NULL,
  -- 'remera' | 'hoodie' | 'taza' | 'tote_bag' | 'poster' | 'gorra' …
  category     text,
  -- Agrupación de navegación: 'prendas' | 'headwear' | 'accesorios' | 'gran_formato' | 'hogar' | 'oficina'
  fit          text,
  material     text,
  gramaje      text,
  -- Características físicas del producto base
  base_price   numeric(10,2)  NOT NULL CHECK (base_price >= 0),
  -- Precio de referencia sin diseño. El precio real vive en el PEDIDO.
  images       jsonb          NOT NULL DEFAULT '[]',
  -- [{ url, alt, is_primary, color_name }]
  status       product_status NOT NULL DEFAULT 'draft',
  featured     boolean        NOT NULL DEFAULT false,
  sort_order   integer        NOT NULL DEFAULT 0,
  meta         jsonb          NOT NULL DEFAULT '{}',
  created_at   timestamptz    NOT NULL DEFAULT now(),
  updated_at   timestamptz    NOT NULL DEFAULT now()
);

COMMENT ON TABLE  products            IS 'Catálogo de productos físicos. No tiene precio final ni conoce qué diseños se aplican sobre él (Regla 2, §2).';
COMMENT ON COLUMN products.base_price IS 'Precio referencial sin diseño. El precio final (PVP) solo existe en order_items.unit_price (Regla 3, §2).';
COMMENT ON COLUMN products.images     IS 'Imágenes generales del producto. Para imágenes por color de variante, ver product_variants.images.';


-- ------------------------------------------------------------
-- 5.9  PRODUCT_VARIANTS
--      Variantes del producto: combinación color × talla.
--      Cada variante tiene su propio stock, SKU y precio extra.
-- ------------------------------------------------------------

CREATE TABLE product_variants (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_name  text,
  color_hex   char(7),
  -- Formato '#RRGGBB'. NULL si no aplica color.
  size        text,
  -- 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'Única' | NULL
  sku         text          NOT NULL UNIQUE,
  stock_qty   integer       NOT NULL DEFAULT 0  CHECK (stock_qty >= 0),
  -- Actualizado por trigger al registrar lotes (purchases) y pedidos (orders).
  stock_min   integer       NOT NULL DEFAULT 5,
  -- Umbral de alerta de reposición (§11 Módulo Inventario).
  price_extra numeric(10,2) NOT NULL DEFAULT 0  CHECK (price_extra >= 0),
  -- Adicional sobre el base_price del producto (ej. talle XXL).
  images      jsonb         NOT NULL DEFAULT '[]',
  -- Imágenes del producto en este color específico.
  active      boolean       NOT NULL DEFAULT true,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  product_variants           IS 'Variantes del producto (color × talla). Cada variante tiene stock y SKU propios.';
COMMENT ON COLUMN product_variants.stock_qty IS 'Stock disponible. Incrementado por trigger en purchases INSERT. Decrementado en orders → paid.';
COMMENT ON COLUMN product_variants.stock_min IS 'Stock mínimo. Cuando stock_qty <= stock_min se emite alerta de reposición.';


-- ------------------------------------------------------------
-- 5.10 PRODUCT_PRINT_ZONES
--      Zonas de impresión de cada producto con sus dimensiones.
--      area_cm2 se calcula automáticamente (GENERATED).
--      El costo de impresión = area_cm2 / 10000 * technique.rate.
-- ------------------------------------------------------------

CREATE TABLE product_print_zones (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           uuid          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name                 text          NOT NULL,
  -- 'Pecho centro' | 'Espalda A3' | 'Manga izquierda' | 'Logo pecho izq.'
  location             text,
  -- Descripción de posición: 'Frente, centrado en el pecho'
  width_cm             numeric(8,2)  NOT NULL CHECK (width_cm > 0),
  height_cm            numeric(8,2)  NOT NULL CHECK (height_cm > 0),
  area_cm2             numeric(10,2) GENERATED ALWAYS AS (width_cm * height_cm) STORED,
  -- Determinante del costo de impresión (§8.2). Calculado automáticamente.
  default_technique_id uuid          REFERENCES techniques(id) ON DELETE SET NULL,
  active               boolean       NOT NULL DEFAULT true,
  sort_order           integer       NOT NULL DEFAULT 0,
  created_at           timestamptz   NOT NULL DEFAULT now(),
  updated_at           timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  product_print_zones          IS 'Zonas de impresión físicas por producto con sus dimensiones reales (§8.2).';
COMMENT ON COLUMN product_print_zones.area_cm2 IS 'Área en cm² calculada automáticamente. Ejemplo: 30×20cm → 600 cm² → costo DTF = 600/10000 * rate.';


-- ------------------------------------------------------------
-- 5.11 ZONE_TECHNIQUES
--      Qué técnicas están habilitadas por zona de impresión.
-- ------------------------------------------------------------

CREATE TABLE zone_techniques (
  zone_id      uuid    NOT NULL REFERENCES product_print_zones(id) ON DELETE CASCADE,
  technique_id uuid    NOT NULL REFERENCES techniques(id)           ON DELETE CASCADE,
  active       boolean NOT NULL DEFAULT true,
  PRIMARY KEY (zone_id, technique_id)
);

COMMENT ON TABLE zone_techniques IS 'Técnicas permitidas por zona de impresión. El personalizador filtra las opciones disponibles.';


-- ------------------------------------------------------------
-- 5.12 DESIGNS
-- ------------------------------------------------------------

CREATE TABLE designs (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id      uuid          REFERENCES artists(id) ON DELETE RESTRICT,
  -- NULL = diseño propio de la plataforma (is_own = true)
  slug           text          NOT NULL UNIQUE,
  name           text          NOT NULL,
  description    text,
  images         jsonb         NOT NULL DEFAULT '[]',
  -- [{ url, alt, is_primary }]
  is_own         boolean       NOT NULL DEFAULT false,
  -- true = diseño propio de Fluvë o del cliente. false = diseño de artista.
  style          text,
  audience       text,
  price_addition numeric(10,2) NOT NULL DEFAULT 0 CHECK (price_addition >= 0),
  -- Se suma al base_price + price_extra del producto en el motor de precios.
  status         design_status NOT NULL DEFAULT 'draft',
  rejection_note text,
  featured       boolean       NOT NULL DEFAULT false,
  score          numeric(10,4) NOT NULL DEFAULT 0,
  -- Puntuación para "Diseños destacados" (§4.7). Actualizada por trigger.
  -- score = (sales_count * 3) + (fav_count * 2) + (view_count * 0.1) + (featured::int * 100)
  sales_count    integer       NOT NULL DEFAULT 0,
  fav_count      integer       NOT NULL DEFAULT 0,
  view_count     integer       NOT NULL DEFAULT 0,
  meta           jsonb         NOT NULL DEFAULT '{}',
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  designs              IS 'Diseños de artistas. No tiene precio propio (Regla 3, §2). No conoce qué productos lo usarán (Regla 1, §2).';
COMMENT ON COLUMN designs.is_own       IS 'true = diseño propio de Fluvë o subido por cliente. false = diseño de artista (artist_id requerido).';
COMMENT ON COLUMN designs.price_addition IS 'Incremento al precio base. Incluye el margen del artista antes de calcular PVP.';


-- ------------------------------------------------------------
-- 5.13 DESIGN_CATEGORIES
-- ------------------------------------------------------------

CREATE TABLE design_categories (
  design_id   uuid NOT NULL REFERENCES designs(id)    ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (design_id, category_id)
);

COMMENT ON TABLE design_categories IS 'M2M diseños ↔ categorías (temas, estilos, causas, desafíos). Un diseño puede pertenecer a múltiples categorías.';


-- ------------------------------------------------------------
-- 5.14 PRODUCT_CATEGORIES
-- ------------------------------------------------------------

CREATE TABLE product_categories (
  product_id  uuid NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

COMMENT ON TABLE product_categories IS 'M2M productos ↔ categorías (producto_tipo, producto_audiencia). Para navegación de catálogo (§10).';


-- ------------------------------------------------------------
-- 5.15 FAVORITES
-- ------------------------------------------------------------

CREATE TABLE favorites (
  user_id    uuid        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  design_id  uuid        NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, design_id)
);

COMMENT ON TABLE favorites IS 'Diseños favoritos del usuario. INSERT/DELETE disparan actualización de designs.fav_count.';


-- ------------------------------------------------------------
-- 5.16 CART_ITEMS
--      Incluye variant_id, zone_id y technique_id alineados
--      con la configuración del personalizador (§3.1).
--      line_key usa '__none__' como sentinel para FKs nulos.
-- ------------------------------------------------------------

CREATE TABLE cart_items (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid          NOT NULL REFERENCES users(id)               ON DELETE CASCADE,
  product_id   uuid          NOT NULL REFERENCES products(id)            ON DELETE RESTRICT,
  variant_id   uuid                   REFERENCES product_variants(id)    ON DELETE SET NULL,
  design_id    uuid                   REFERENCES designs(id)             ON DELETE SET NULL,
  zone_id      uuid                   REFERENCES product_print_zones(id) ON DELETE SET NULL,
  technique_id uuid                   REFERENCES techniques(id)          ON DELETE SET NULL,
  line_key     text          NOT NULL GENERATED ALWAYS AS (
                 product_id::text
                 || '_' || COALESCE(variant_id::text,   '__none__')
                 || '_' || COALESCE(design_id::text,    '__none__')
                 || '_' || COALESCE(zone_id::text,      '__none__')
                 || '_' || COALESCE(technique_id::text, '__none__')
               ) STORED,
  qty          integer       NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_price   numeric(10,2) NOT NULL           CHECK (unit_price >= 0),
  -- Snapshot del precio calculado al agregar al carrito.
  custom_text  text,
  custom_options jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now(),

  UNIQUE (user_id, line_key)
);

COMMENT ON TABLE  cart_items          IS 'Ítems del carrito. Se vacía al confirmar el pedido (checkout).';
COMMENT ON COLUMN cart_items.line_key IS 'Clave de unicidad generada. Usa __none__ para FKs NULL. Equivalente a lineKey() del prototipo A.';


-- ------------------------------------------------------------
-- 5.17 ORDERS
-- ------------------------------------------------------------

CREATE TABLE orders (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     text          NOT NULL UNIQUE DEFAULT (
    'FLV-' || to_char(now(), 'YYYY') || '-'
    || LPAD(nextval('fluve_order_seq')::text, 5, '0')
  ),
  user_id          uuid          NOT NULL REFERENCES users(id)      ON DELETE RESTRICT,
  supplier_id      uuid                   REFERENCES suppliers(id)  ON DELETE SET NULL,
  -- Proveedor asignado para producción (motor de asignación §6).
  status           order_status  NOT NULL DEFAULT 'draft',
  subtotal         numeric(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount       numeric(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  -- IVA 22% sobre el subtotal neto.
  shipping_amount  numeric(10,2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  discount_amount  numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total            numeric(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  -- total = subtotal + tax_amount + shipping_amount - discount_amount
  currency         char(3)       NOT NULL DEFAULT 'UYU',
  promo_code       text                   REFERENCES promos(code)   ON DELETE SET NULL,
  shipping_address jsonb         NOT NULL DEFAULT '{}',
  -- { name, address, city, department, zip, phone }
  billing_address  jsonb         NOT NULL DEFAULT '{}',
  tracking_code    text,
  -- Código de seguimiento del envío (§11 Módulo Envíos).
  notes            text,
  admin_notes      text,
  paid_at          timestamptz,
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  cancelled_at     timestamptz,
  cancelled_reason text,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  orders              IS 'Pedidos confirmados. Estado sigue el flujo del motor de pedidos (§5).';
COMMENT ON COLUMN orders.supplier_id  IS 'Proveedor asignado manualmente por operador. NULL hasta asignación (§6).';
COMMENT ON COLUMN orders.promo_code   IS 'Cupón aplicado. FK a promos. uses_count incrementado por trigger.';
COMMENT ON COLUMN orders.tracking_code IS 'Código de seguimiento del envío. Se registra al pasar a estado shipped.';


-- ------------------------------------------------------------
-- 5.18 ORDER_ITEMS
--      Incluye snapshot de nombre, color, talla, zona, técnica
--      y área para preservar el historial aunque se eliminen
--      productos, variantes o diseños.
-- ------------------------------------------------------------

CREATE TABLE order_items (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid          NOT NULL REFERENCES orders(id)               ON DELETE CASCADE,
  product_id      uuid          NOT NULL REFERENCES products(id)             ON DELETE RESTRICT,
  variant_id      uuid                   REFERENCES product_variants(id)     ON DELETE SET NULL,
  design_id       uuid                   REFERENCES designs(id)              ON DELETE RESTRICT,
  artist_id       uuid                   REFERENCES artists(id)              ON DELETE SET NULL,
  zone_id         uuid                   REFERENCES product_print_zones(id)  ON DELETE SET NULL,
  technique_id    uuid                   REFERENCES techniques(id)           ON DELETE SET NULL,
  -- ---- Snapshots (preservan historial) ----
  product_name    text          NOT NULL,
  product_slug    text          NOT NULL,
  design_name     text,
  design_slug     text,
  variant_color   text,
  variant_size    text,
  variant_sku     text,
  zone_name       text,
  technique_name  text,
  -- ---- Cálculo de precio ----
  qty             integer       NOT NULL DEFAULT 1 CHECK (qty > 0),
  area_cm2        numeric(10,2),
  -- Área de impresión usada para calcular el costo de técnica (§8.2).
  unit_price      numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  -- PVP unitario calculado en el momento del pedido.
  royalty_amount  numeric(10,2) NOT NULL DEFAULT 0 CHECK (royalty_amount >= 0),
  -- Regalía por este ítem: price_addition × qty × royalty_rate.
  custom_text     text,
  custom_options  jsonb         NOT NULL DEFAULT '{}',
  preview_url     text,
  -- URL de la imagen generada por el personalizador.
  created_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  order_items              IS 'Ítems del pedido con snapshot completo de precios, variante, zona y técnica.';
COMMENT ON COLUMN order_items.area_cm2     IS 'Área de impresión usada (cm²). Determina el costo de técnica según §8.2.';
COMMENT ON COLUMN order_items.unit_price   IS 'PVP final calculado por domain/pricing.ts en el momento del pedido. Inmutable.';
COMMENT ON COLUMN order_items.royalty_amount IS 'Regalía del artista por este ítem. Calculada al marcar el pedido como paid.';


-- ------------------------------------------------------------
-- 5.19 PAYMENTS
--      Registro financiero de pagos. Un pedido puede tener
--      múltiples intentos (rejected) y un pago exitoso.
-- ------------------------------------------------------------

CREATE TABLE payments (
  id                  uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid             NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id             uuid             NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
  amount              numeric(10,2)    NOT NULL CHECK (amount > 0),
  method              payment_provider NOT NULL,
  status              payment_status   NOT NULL DEFAULT 'pending',
  provider_payment_id text,
  -- ID externo del proveedor de pago (MercadoPago preference_id, Stripe PaymentIntent ID).
  provider_data       jsonb            NOT NULL DEFAULT '{}',
  -- Snapshot raw del webhook. Inmutable tras escritura.
  created_at          timestamptz      NOT NULL DEFAULT now(),
  updated_at          timestamptz      NOT NULL DEFAULT now()
);

COMMENT ON TABLE  payments                    IS 'Registro de pagos por pedido. Permite múltiples intentos. approved → actualiza orders.status a paid.';
COMMENT ON COLUMN payments.provider_data      IS 'Snapshot raw del webhook de MercadoPago o Stripe. No modificar tras escribir.';
COMMENT ON COLUMN payments.provider_payment_id IS 'ID externo: MercadoPago preference_id / Stripe PaymentIntent ID.';


-- ------------------------------------------------------------
-- 5.20 PRODUCTION_LOG
--      Registro inmutable de transiciones de estado del pedido.
--      Generado automáticamente por trigger.
-- ------------------------------------------------------------

CREATE TABLE production_log (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status order_status,
  -- NULL en la primera entrada.
  to_status   order_status NOT NULL,
  changed_by  uuid         REFERENCES users(id) ON DELETE SET NULL,
  notes       text,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE production_log IS 'Audit trail inmutable de transiciones de estado de pedidos. Solo INSERT, nunca UPDATE ni DELETE.';


-- ------------------------------------------------------------
-- 5.21 QUALITY_CHECKS
--      Control de calidad por pedido e ítem (§11 Módulo Producción).
--      Si no pasa QC el pedido vuelve a in_production (§5 motor).
-- ------------------------------------------------------------

CREATE TABLE quality_checks (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid        NOT NULL REFERENCES orders(id)      ON DELETE CASCADE,
  order_item_id uuid                 REFERENCES order_items(id) ON DELETE CASCADE,
  -- NULL = control a nivel de pedido completo.
  checked_by    uuid        REFERENCES users(id) ON DELETE SET NULL,
  passed        boolean     NOT NULL,
  checklist     jsonb       NOT NULL DEFAULT '{}',
  -- {
  --   color_match:    bool,
  --   print_quality:  bool,
  --   size_correct:   bool,
  --   material_ok:    bool,
  --   packaging_ok:   bool
  -- }
  notes         text,
  images        jsonb       NOT NULL DEFAULT '[]',
  -- URLs de fotos del control de calidad.
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE quality_checks IS 'Controles de calidad. passed=false dispara retorno a in_production según el motor de pedidos (§5).';


-- ------------------------------------------------------------
-- 5.22 PURCHASES
--      Lotes de compra de productos y materiales consumibles.
--      Alimenta el cálculo de costo promedio ponderado (WA)
--      que usa domain/pricing.ts (§7.2: CostoProductoWA).
-- ------------------------------------------------------------

CREATE TABLE purchases (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  uuid                   REFERENCES suppliers(id)        ON DELETE SET NULL,
  product_id   uuid                   REFERENCES products(id)         ON DELETE RESTRICT,
  variant_id   uuid                   REFERENCES product_variants(id) ON DELETE RESTRICT,
  -- Para type='material' (consumibles de impresión) los FKs de producto/variante son NULL.
  type         purchase_type NOT NULL,
  qty          integer       NOT NULL CHECK (qty > 0),
  unit_cost    numeric(10,2) NOT NULL CHECK (unit_cost >= 0),
  -- Para materiales de impresión:
  area_cm2     numeric(10,2),
  -- Área total del lote (ej. metros de rollo DTF).
  cost_per_cm2 numeric(10,6),
  -- Calculado a nivel de aplicación: unit_cost / area_cm2.
  notes        text,
  purchased_at timestamptz   NOT NULL DEFAULT now(),
  created_at   timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE  purchases              IS 'Lotes de compra para cálculo de costo WA (§7.2) e inventario (§11). INSERT dispara actualización de stock en product_variants.';
COMMENT ON COLUMN purchases.cost_per_cm2 IS 'Calculado a nivel de aplicación: unit_cost / area_cm2. Para materiales de impresión (type=material).';


-- ------------------------------------------------------------
-- 5.23 ROYALTY_RECORDS
--      Una regalía por order_item. Ciclo de vida:
--      pending → confirmed (entregado) → paid (transferido).
-- ------------------------------------------------------------

CREATE TABLE royalty_records (
  id            uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id     uuid           NOT NULL REFERENCES artists(id)     ON DELETE RESTRICT,
  order_id      uuid           NOT NULL REFERENCES orders(id)      ON DELETE RESTRICT,
  order_item_id uuid           NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  design_id     uuid                    REFERENCES designs(id)     ON DELETE SET NULL,
  amount        numeric(10,2)  NOT NULL CHECK (amount >= 0),
  rate          numeric(5,4)   NOT NULL CHECK (rate >= 0 AND rate <= 1),
  -- Snapshot de artists.royalty_rate al momento del pedido. Inmutable.
  status        royalty_status NOT NULL DEFAULT 'pending',
  paid_at       timestamptz,
  payment_ref   text,
  -- Referencia de transferencia bancaria o método de liquidación.
  created_at    timestamptz    NOT NULL DEFAULT now(),
  updated_at    timestamptz    NOT NULL DEFAULT now(),

  UNIQUE (order_item_id)
  -- Un ítem genera exactamente una regalía.
);

COMMENT ON TABLE  royalty_records       IS 'Regalías por ítem. Liquidación mensual: pending→confirmed→paid. UNIQUE(order_item_id) garantiza 1:1.';
COMMENT ON COLUMN royalty_records.rate  IS 'Snapshot de royalty_rate del artista al momento del pedido. Inmutable para preservar historial.';


-- ------------------------------------------------------------
-- 5.24 QUOTATIONS
--      Solicitudes B2B. Gestionadas por staff desde el panel admin.
-- ------------------------------------------------------------

CREATE TABLE quotations (
  id              uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number    text             NOT NULL UNIQUE DEFAULT (
    'FLV-Q-' || to_char(now(), 'YYYY') || '-'
    || LPAD(nextval('fluve_quote_seq')::text, 5, '0')
  ),
  user_id         uuid             REFERENCES users(id) ON DELETE SET NULL,
  status          quotation_status NOT NULL DEFAULT 'pending',
  contact_name    text             NOT NULL,
  contact_email   text             NOT NULL,
  contact_phone   text,
  company_name    text,
  items           jsonb            NOT NULL DEFAULT '[]',
  -- [{
  --   product_type:   text,
  --   technique_slug: text,
  --   qty:            int,
  --   design_brief:   text,
  --   size_breakdown: {}  -- { XS:5, S:20, M:30, L:20, XL:5 }
  -- }]
  observations    text,
  estimated_total numeric(10,2),
  valid_until     date,
  internal_notes  text,
  assigned_to     uuid             REFERENCES users(id) ON DELETE SET NULL,
  responded_at    timestamptz,
  created_at      timestamptz      NOT NULL DEFAULT now(),
  updated_at      timestamptz      NOT NULL DEFAULT now()
);

COMMENT ON TABLE  quotations             IS 'Cotizaciones B2B. Gestionadas por staff (§11 Módulo B2B).';
COMMENT ON COLUMN quotations.observations IS 'Notas adicionales del cliente en el formulario público.';


-- ------------------------------------------------------------
-- 5.25 TICKETS
-- ------------------------------------------------------------

CREATE TABLE tickets (
  id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text            NOT NULL UNIQUE DEFAULT (
    'TKT-' || to_char(now(), 'YYYY') || '-'
    || LPAD(nextval('fluve_ticket_seq')::text, 5, '0')
  ),
  user_id       uuid            NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
  order_id      uuid                     REFERENCES orders(id) ON DELETE SET NULL,
  subject       text            NOT NULL,
  status        ticket_status   NOT NULL DEFAULT 'open',
  priority      ticket_priority NOT NULL DEFAULT 'normal',
  assigned_to   uuid                     REFERENCES users(id)  ON DELETE SET NULL,
  resolved_at   timestamptz,
  created_at    timestamptz     NOT NULL DEFAULT now(),
  updated_at    timestamptz     NOT NULL DEFAULT now()
);

COMMENT ON TABLE tickets IS 'Tickets de soporte vinculables a un pedido (§11 Módulo Soporte).';


-- ------------------------------------------------------------
-- 5.26 TICKET_MESSAGES
--      Threading via parent_id (patrón comment_parent de WP).
-- ------------------------------------------------------------

CREATE TABLE ticket_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid        NOT NULL REFERENCES tickets(id)         ON DELETE CASCADE,
  parent_id   uuid                 REFERENCES ticket_messages(id) ON DELETE CASCADE
                          DEFERRABLE INITIALLY DEFERRED,
  author_id   uuid        NOT NULL REFERENCES users(id)           ON DELETE RESTRICT,
  content     text        NOT NULL,
  attachments jsonb       NOT NULL DEFAULT '[]',
  -- [{ url, filename, mime_type, size_bytes }]
  is_internal boolean     NOT NULL DEFAULT false,
  -- Nota interna de staff. No visible al cliente.
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  ticket_messages            IS 'Mensajes del chat de soporte. Threading via parent_id.';
COMMENT ON COLUMN ticket_messages.is_internal IS 'Nota interna de staff. El cliente no la ve en su vista de Mi Cuenta.';


-- ------------------------------------------------------------
-- 5.27 PLATFORM_SETTINGS
--      Config del sistema en KV con autoload.
--      Patrón wp_options adaptado a Supabase (§2 análisis).
-- ------------------------------------------------------------

CREATE TABLE platform_settings (
  key        text        PRIMARY KEY,
  value      jsonb       NOT NULL,
  description text,
  autoload   boolean     NOT NULL DEFAULT true,
  updated_by uuid        REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  platform_settings        IS 'Configuración del sistema en KV. autoload=true → cargar en boot (precios, IVA). Fuente de verdad de domain/pricing.ts.';
COMMENT ON COLUMN platform_settings.autoload IS 'true = cargar en cada request. false = cargar bajo demanda (feature flags, config avanzada).';


-- ------------------------------------------------------------
-- 5.28 NOTIFICATIONS
-- ------------------------------------------------------------

CREATE TABLE notifications (
  id         uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      text              NOT NULL,
  body       text,
  data       jsonb             NOT NULL DEFAULT '{}',
  -- { order_id?, ticket_id?, royalty_id? } — para deep-link en el cliente.
  read_at    timestamptz,
  -- NULL = no leída.
  created_at timestamptz       NOT NULL DEFAULT now()
);

COMMENT ON TABLE notifications IS 'Notificaciones in-app por usuario. read_at NULL = no leída. Inmutables tras inserción.';


-- ------------------------------------------------------------
-- 5.29 ACTIVITY_LOG
--      Audit log general de todas las entidades.
--      Registra before/after en JSON para auditoría completa.
-- ------------------------------------------------------------

CREATE TABLE activity_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES users(id) ON DELETE SET NULL,
  -- NULL cuando la acción es del sistema (trigger automático).
  action     text        NOT NULL,
  -- 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'assign' | 'login' …
  entity     text        NOT NULL,
  -- Nombre de la tabla afectada: 'orders', 'designs', 'artists' …
  entity_id  text        NOT NULL,
  -- UUID del registro afectado como text (para admitir cualquier tipo de PK).
  before     jsonb,
  -- Estado antes del cambio. NULL en CREATE.
  after      jsonb,
  -- Estado después del cambio. NULL en DELETE.
  ip_addr    inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  activity_log          IS 'Audit log inmutable de todas las entidades. Usado por el panel admin. Solo INSERT.';
COMMENT ON COLUMN activity_log.entity   IS 'Nombre de la tabla afectada. Permite filtrar por tipo: WHERE entity = ''orders''.';
COMMENT ON COLUMN activity_log.before   IS 'Estado JSON antes del cambio. NULL en acciones de tipo CREATE.';


-- ============================================================
-- 6. ÍNDICES
-- ============================================================

-- users
CREATE INDEX idx_users_role      ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = false;

-- categories
CREATE INDEX idx_categories_type      ON categories(type);
CREATE INDEX idx_categories_slug      ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_categories_active    ON categories(active, type);

-- techniques
CREATE INDEX idx_techniques_slug   ON techniques(slug);
CREATE INDEX idx_techniques_active ON techniques(active) WHERE active = true;

-- suppliers
CREATE INDEX idx_suppliers_rating  ON suppliers(rating DESC);
CREATE INDEX idx_suppliers_active  ON suppliers(active) WHERE active = true;
CREATE INDEX idx_suppliers_load    ON suppliers(current_load ASC);

-- supplier_techniques
CREATE INDEX idx_supplier_techniques_technique ON supplier_techniques(technique_id);

-- promos
CREATE INDEX idx_promos_active     ON promos(active, expires_at) WHERE active = true;

-- artists
CREATE INDEX idx_artists_user_id   ON artists(user_id);
CREATE INDEX idx_artists_handle    ON artists(handle);
CREATE INDEX idx_artists_status    ON artists(status);
CREATE INDEX idx_artists_tier      ON artists(tier);
CREATE INDEX idx_artists_featured  ON artists(featured) WHERE featured = true;

-- products
CREATE INDEX idx_products_type_status ON products(product_type, status);
CREATE INDEX idx_products_category    ON products(category) WHERE category IS NOT NULL;
CREATE INDEX idx_products_featured    ON products(featured)  WHERE featured = true;
CREATE INDEX idx_products_sort        ON products(sort_order);

-- product_variants
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_sku        ON product_variants(sku);
CREATE INDEX idx_product_variants_low_stock  ON product_variants(product_id)
  WHERE active = true AND stock_qty <= stock_min;
-- Índice parcial para alertas de stock mínimo.

-- product_print_zones
CREATE INDEX idx_print_zones_product_id ON product_print_zones(product_id);
CREATE INDEX idx_print_zones_active     ON product_print_zones(product_id, active);

-- zone_techniques
CREATE INDEX idx_zone_techniques_technique ON zone_techniques(technique_id);

-- designs
CREATE INDEX idx_designs_artist_id   ON designs(artist_id) WHERE artist_id IS NOT NULL;
CREATE INDEX idx_designs_status      ON designs(status);
CREATE INDEX idx_designs_featured    ON designs(featured)     WHERE featured = true;
CREATE INDEX idx_designs_score       ON designs(score         DESC);
CREATE INDEX idx_designs_sales       ON designs(sales_count   DESC);
CREATE INDEX idx_designs_created_at  ON designs(created_at    DESC);
CREATE INDEX idx_designs_style       ON designs(style)         WHERE style IS NOT NULL;
CREATE INDEX idx_designs_audience    ON designs(audience)      WHERE audience IS NOT NULL;
CREATE INDEX idx_designs_is_own      ON designs(is_own)        WHERE is_own = true;

-- design_categories / product_categories
CREATE INDEX idx_design_categories_category   ON design_categories(category_id);
CREATE INDEX idx_product_categories_category  ON product_categories(category_id);

-- favorites
CREATE INDEX idx_favorites_design_id ON favorites(design_id);

-- cart_items
CREATE INDEX idx_cart_items_user_id    ON cart_items(user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);

-- orders
CREATE INDEX idx_orders_user_id       ON orders(user_id);
CREATE INDEX idx_orders_supplier_id   ON orders(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_orders_status        ON orders(status);
CREATE INDEX idx_orders_promo_code    ON orders(promo_code)  WHERE promo_code IS NOT NULL;
CREATE INDEX idx_orders_created_at    ON orders(created_at DESC);

-- order_items
CREATE INDEX idx_order_items_order_id     ON order_items(order_id);
CREATE INDEX idx_order_items_design_id    ON order_items(design_id)    WHERE design_id    IS NOT NULL;
CREATE INDEX idx_order_items_artist_id    ON order_items(artist_id)    WHERE artist_id    IS NOT NULL;
CREATE INDEX idx_order_items_technique_id ON order_items(technique_id) WHERE technique_id IS NOT NULL;

-- payments
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status   ON payments(status);

-- production_log
CREATE INDEX idx_production_log_order_id ON production_log(order_id);

-- quality_checks
CREATE INDEX idx_quality_checks_order_id ON quality_checks(order_id);

-- purchases
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_purchases_variant_id  ON purchases(variant_id)  WHERE variant_id  IS NOT NULL;
CREATE INDEX idx_purchases_type        ON purchases(type, purchased_at DESC);

-- royalty_records
CREATE INDEX idx_royalty_artist_id ON royalty_records(artist_id);
CREATE INDEX idx_royalty_order_id  ON royalty_records(order_id);
CREATE INDEX idx_royalty_status    ON royalty_records(status);

-- quotations
CREATE INDEX idx_quotations_status      ON quotations(status);
CREATE INDEX idx_quotations_assigned_to ON quotations(assigned_to) WHERE assigned_to IS NOT NULL;

-- tickets
CREATE INDEX idx_tickets_user_id     ON tickets(user_id);
CREATE INDEX idx_tickets_order_id    ON tickets(order_id)    WHERE order_id    IS NOT NULL;
CREATE INDEX idx_tickets_status      ON tickets(status);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to) WHERE assigned_to IS NOT NULL;

-- ticket_messages
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_parent_id ON ticket_messages(parent_id) WHERE parent_id IS NOT NULL;

-- notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

-- activity_log
CREATE INDEX idx_activity_log_entity    ON activity_log(entity, entity_id);
CREATE INDEX idx_activity_log_user_id   ON activity_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_activity_log_created   ON activity_log(created_at DESC);


-- ============================================================
-- 7. TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- 7.1  updated_at automático
-- ------------------------------------------------------------

CREATE TRIGGER trg_users_upd             BEFORE UPDATE ON users             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_techniques_upd        BEFORE UPDATE ON techniques        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_suppliers_upd         BEFORE UPDATE ON suppliers         FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_promos_upd            BEFORE UPDATE ON promos            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_artists_upd           BEFORE UPDATE ON artists           FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_products_upd          BEFORE UPDATE ON products          FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_product_variants_upd  BEFORE UPDATE ON product_variants  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_print_zones_upd       BEFORE UPDATE ON product_print_zones FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_designs_upd           BEFORE UPDATE ON designs           FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_cart_items_upd        BEFORE UPDATE ON cart_items        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_orders_upd            BEFORE UPDATE ON orders            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_payments_upd          BEFORE UPDATE ON payments          FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_royalty_upd           BEFORE UPDATE ON royalty_records   FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_quotations_upd        BEFORE UPDATE ON quotations        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_tickets_upd           BEFORE UPDATE ON tickets           FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ------------------------------------------------------------
-- 7.2  designs.fav_count — sincronizado con favorites
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_sync_fav_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE designs SET fav_count = fav_count + 1 WHERE id = NEW.design_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE designs SET fav_count = GREATEST(fav_count - 1, 0) WHERE id = OLD.design_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_favorites_sync_fav_count
  AFTER INSERT OR DELETE ON favorites
  FOR EACH ROW EXECUTE FUNCTION fn_sync_fav_count();


-- ------------------------------------------------------------
-- 7.3  designs.sales_count + artists.total_sales
--      Actualizado al insertar items en un pedido.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_sync_sales_on_item_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.design_id IS NOT NULL THEN
    UPDATE designs SET sales_count = sales_count + NEW.qty WHERE id = NEW.design_id;
  END IF;
  IF NEW.artist_id IS NOT NULL THEN
    UPDATE artists SET total_sales = total_sales + NEW.qty WHERE id = NEW.artist_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_order_items_sync_sales
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION fn_sync_sales_on_item_insert();


-- ------------------------------------------------------------
-- 7.4  designs.score — recalculado al cambiar contadores
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_recalc_design_score()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.score := (NEW.sales_count * 3)
             + (NEW.fav_count   * 2)
             + (NEW.view_count  * 0.1)
             + (CASE WHEN NEW.featured THEN 100 ELSE 0 END);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_designs_recalc_score
  BEFORE UPDATE OF sales_count, fav_count, view_count, featured ON designs
  FOR EACH ROW EXECUTE FUNCTION fn_recalc_design_score();


-- ------------------------------------------------------------
-- 7.5  artists.total_royalties — al liquidar una regalía
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_sync_artist_royalties()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    UPDATE artists
      SET total_royalties = total_royalties + NEW.amount
      WHERE id = NEW.artist_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_royalty_sync_artist_total
  AFTER UPDATE OF status ON royalty_records
  FOR EACH ROW EXECUTE FUNCTION fn_sync_artist_royalties();


-- ------------------------------------------------------------
-- 7.6  production_log — automático al cambiar orders.status
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_log_order_status_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO production_log (order_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_log_status
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_log_order_status_change();


-- ------------------------------------------------------------
-- 7.7  product_variants.stock_qty — al registrar un lote
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_purchase_update_stock()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type = 'product' AND NEW.variant_id IS NOT NULL THEN
    UPDATE product_variants
      SET stock_qty = stock_qty + NEW.qty
      WHERE id = NEW.variant_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_purchase_update_stock
  AFTER INSERT ON purchases
  FOR EACH ROW EXECUTE FUNCTION fn_purchase_update_stock();


-- ------------------------------------------------------------
-- 7.8  suppliers.current_load — al asignar/liberar proveedor
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_sync_supplier_load()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- El pedido entra a producción
  IF NEW.status = 'in_production'
     AND OLD.status <> 'in_production'
     AND NEW.supplier_id IS NOT NULL THEN
    UPDATE suppliers SET current_load = current_load + 1 WHERE id = NEW.supplier_id;
  END IF;
  -- El pedido sale de producción (entregado o cancelado)
  IF OLD.status = 'in_production'
     AND NEW.status IN ('delivered', 'cancelled')
     AND OLD.supplier_id IS NOT NULL THEN
    UPDATE suppliers
      SET current_load = GREATEST(current_load - 1, 0)
      WHERE id = OLD.supplier_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_sync_supplier_load
  AFTER UPDATE OF status, supplier_id ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_sync_supplier_load();


-- ------------------------------------------------------------
-- 7.9  promos.uses_count — al usar un cupón en un pedido
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_promo_increment_uses()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.promo_code IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.promo_code IS DISTINCT FROM NEW.promo_code) THEN
    UPDATE promos SET uses_count = uses_count + 1 WHERE code = NEW.promo_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_promo_uses
  AFTER INSERT OR UPDATE OF promo_code ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_promo_increment_uses();


-- ------------------------------------------------------------
-- 7.10 platform_settings.updated_at
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_platform_settings_upd
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION fn_settings_updated_at();


-- ============================================================
-- 8. DATOS INICIALES
-- ============================================================


-- ------------------------------------------------------------
-- 8.1  TECHNIQUES — 7 técnicas del documento §7.3
-- ------------------------------------------------------------

INSERT INTO techniques (slug, name, cost_model, rate, rate_unit, surcharge_per_unit, min_qty, notes)
VALUES
  ('dtf',
   'DTF — Direct to Film',
   'area', 90.00, 'm2', 0.00, 1,
   'Colores vivos, fotos, degradados. Costo: área_cm2 / 10000 × $90.'),

  ('subl',
   'Sublimación',
   'fixed', 200.00, 'unit', 2.00, 1,
   'Tazas, fundas, poliéster 100%. Precio fijo $200/u + $2 recargo.'),

  ('serig',
   'Serigrafía',
   'screens', 50.00, 'screen', 0.00, 10,
   'Por pantalla/color. Mínimo 10 unidades. Ideal para tiradas altas.'),

  ('bord',
   'Bordado',
   'stitches', 0.05, 'millar', 6.00, 1,
   'Por millar de puntadas + $6 recargo/u. Requiere archivo DST.'),

  ('dtfuv',
   'DTF UV',
   'area', 120.00, 'm2', 3.00, 1,
   'Superficies rígidas, metálicos. Costo: área/10000 × $120 + $3/u.'),

  ('granformato',
   'Gran Formato',
   'area', 80.00, 'm2', 0.00, 1,
   'Posters, cuadros, lonas. Papel fine art 300g disponible.'),

  ('vinil',
   'Vinilo Textil',
   'area', 90.00, 'm2', 1.00, 1,
   'Nombres, números, textos cortos. Costo: área/10000 × $90 + $1/u.')

ON CONFLICT (slug) DO NOTHING;


-- ------------------------------------------------------------
-- 8.2  CATEGORIES — estructura completa del documento §9
-- ------------------------------------------------------------

-- Raíces de primer nivel
INSERT INTO categories (id, type, name, slug, parent_id, sort_order) VALUES

  -- Temas
  ('00000000-0000-0000-0001-000000000001', 'tema',               'Animales',          'animales',          NULL, 1),
  ('00000000-0000-0000-0001-000000000002', 'tema',               'Naturaleza',         'naturaleza',        NULL, 2),
  ('00000000-0000-0000-0001-000000000003', 'tema',               'Humor',              'humor',             NULL, 3),
  ('00000000-0000-0000-0001-000000000004', 'tema',               'Fantasía',           'fantasia',          NULL, 4),
  ('00000000-0000-0000-0001-000000000005', 'tema',               'Cute / Kawaii',      'cute-kawaii',       NULL, 5),
  ('00000000-0000-0000-0001-000000000006', 'tema',               'Memes',              'memes',             NULL, 6),
  ('00000000-0000-0000-0001-000000000007', 'tema',               'Horror',             'horror',            NULL, 7),
  ('00000000-0000-0000-0001-000000000008', 'tema',               'Espacio Exterior',   'espacio',           NULL, 8),
  ('00000000-0000-0000-0001-000000000009', 'tema',               'Música',             'musica',            NULL, 9),
  ('00000000-0000-0000-0001-000000000010', 'tema',               'Comida',             'comida',            NULL, 10),
  ('00000000-0000-0000-0001-000000000011', 'tema',               'Videojuegos',        'videojuegos',       NULL, 11),

  -- Estilos
  ('00000000-0000-0000-0002-000000000001', 'estilo',             'Abstracto',          'abstracto',         NULL, 1),
  ('00000000-0000-0000-0002-000000000002', 'estilo',             'Ilustración',        'ilustracion',       NULL, 2),
  ('00000000-0000-0000-0002-000000000003', 'estilo',             'Diseño Gráfico',     'diseno-grafico',    NULL, 3),
  ('00000000-0000-0000-0002-000000000004', 'estilo',             'Retro / Vintage',    'retro-vintage',     NULL, 4),
  ('00000000-0000-0000-0002-000000000005', 'estilo',             'Tipografía y Frases','tipografia',        NULL, 5),
  ('00000000-0000-0000-0002-000000000006', 'estilo',             'Comics',             'comics',            NULL, 6),
  ('00000000-0000-0000-0002-000000000007', 'estilo',             'Tatuajes',           'tatuajes',          NULL, 7),
  ('00000000-0000-0000-0002-000000000008', 'estilo',             'Estampados',         'estampados',        NULL, 8),
  ('00000000-0000-0000-0002-000000000009', 'estilo',             'Patrones',           'patrones',          NULL, 9),

  -- Causas
  ('00000000-0000-0000-0003-000000000001', 'causa',              'Derechos Humanos',   'derechos-humanos',  NULL, 1),
  ('00000000-0000-0000-0003-000000000002', 'causa',              'Salud Mental',       'salud-mental',      NULL, 2),
  ('00000000-0000-0000-0003-000000000003', 'causa',              'Movimientos',        'movimientos',       NULL, 3),
  ('00000000-0000-0000-0003-000000000004', 'causa',              'Justicia Racial',    'justicia-racial',   NULL, 4),
  ('00000000-0000-0000-0003-000000000005', 'causa',              'Medio Ambiente',     'medio-ambiente',    NULL, 5),
  ('00000000-0000-0000-0003-000000000006', 'causa',              'Bienestar Animal',   'bienestar-animal',  NULL, 6),
  ('00000000-0000-0000-0003-000000000007', 'causa',              'Ayuda Humanitaria',  'ayuda-humanitaria', NULL, 7),

  -- Desafíos editoriales
  ('00000000-0000-0000-0004-000000000001', 'desafio',            'Tendencias',         'tendencias',        NULL, 1),
  ('00000000-0000-0000-0004-000000000002', 'desafio',            'Viajes',             'viajes',            NULL, 2),
  ('00000000-0000-0000-0004-000000000003', 'desafio',            'Aves',               'aves',              NULL, 3),
  ('00000000-0000-0000-0004-000000000004', 'desafio',            'Cosas Extrañas',     'cosas-extranas',    NULL, 4),
  ('00000000-0000-0000-0004-000000000005', 'desafio',            'Mascotas',           'mascotas',          NULL, 5),
  ('00000000-0000-0000-0004-000000000006', 'desafio',            'Diseños Icónicos',   'iconicos',          NULL, 6),

  -- Tipo de producto (navegación de catálogo §10)
  ('00000000-0000-0000-0005-000000000001', 'producto_tipo',      'Prendas',            'prendas',           NULL, 1),
  ('00000000-0000-0000-0005-000000000002', 'producto_tipo',      'Headwear',           'headwear',          NULL, 2),
  ('00000000-0000-0000-0005-000000000003', 'producto_tipo',      'Accesorios',         'accesorios',        NULL, 3),
  ('00000000-0000-0000-0005-000000000004', 'producto_tipo',      'Gran Formato',       'gran-formato',      NULL, 4),
  ('00000000-0000-0000-0005-000000000005', 'producto_tipo',      'Hogar',              'hogar',             NULL, 5),
  ('00000000-0000-0000-0005-000000000006', 'producto_tipo',      'Oficina',            'oficina',           NULL, 6),

  -- Audiencia de producto
  ('00000000-0000-0000-0006-000000000001', 'producto_audiencia', 'Hombre',             'hombre',            NULL, 1),
  ('00000000-0000-0000-0006-000000000002', 'producto_audiencia', 'Mujer',              'mujer',             NULL, 2),
  ('00000000-0000-0000-0006-000000000003', 'producto_audiencia', 'Unisex',             'unisex',            NULL, 3),
  ('00000000-0000-0000-0006-000000000004', 'producto_audiencia', 'Niños y Bebés',      'ninos-bebes',       NULL, 4)

ON CONFLICT (slug) DO NOTHING;


-- ------------------------------------------------------------
-- 8.3  PLATFORM_SETTINGS — config del motor de precios (§7.2)
-- ------------------------------------------------------------

INSERT INTO platform_settings (key, value, description, autoload) VALUES

  ('pricing_base', '{
    "remera":     450,
    "hoodie":     680,
    "taza":       250,
    "tote_bag":   180,
    "gorra":      320,
    "poster":     290,
    "funda_cel":  220
  }',
  'Precios base por tipo de producto (UYU). Fuente de domain/pricing.ts.', true),

  ('iva_rate', '0.22',
   'IVA Uruguay (22%). DGI. Aplicado sobre PrecioNeto.', true),

  ('target_margin', '0.38',
   'Margen neto objetivo de Fluvë (38% del precio neto, §7.2).', true),

  ('royalty_tier_base', '0.10',
   'Regalía tier Base: 10% del margen bruto (§7.2).', true),

  ('royalty_tier_pro', '0.20',
   'Regalía tier Pro: 20% del margen bruto (§7.2).', true),

  ('payment_gateway_fee', '0.03',
   'Comisión pasarela de pago ~3% del PVP (§7.1).', true),

  ('shipping_flat', '150',
   'Costo de envío fijo en UYU.', true),

  ('shipping_free_threshold', '2000',
   'Monto mínimo de pedido para envío gratis (UYU).', true),

  ('mp_currency', '"UYU"',
   'Código ISO 4217 para MercadoPago.', true),

  ('rounding_cents', '0.90',
   'Redondeo comercial del PVP final a ,90 (§7.2: redondear(PVPBruto, 0.90)).', true),

  ('min_design_resolution', '2000',
   'Resolución mínima en px para archivos de diseño (§4, paso 4).', true),

  ('max_cart_items',   '20', 'Máximo de líneas distintas en el carrito.', true),
  ('max_qty_per_line', '50', 'Máximo de unidades por línea de carrito.',  true),

  ('feature_b2b',            'true',  'Módulo de cotizaciones B2B activo.', false),
  ('feature_artist_portal',  'true',  'Portal de artistas activo.',         false),
  ('feature_quality_module', 'false', 'Módulo de QA (en desarrollo).',      false),
  ('feature_ai_assignment',  'false', 'Agente IA de asignación de proveedor (§6, nota futura).', false)

ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- FIN DEL SCHEMA v2.0
-- ============================================================
--
--  Próximos pasos fuera del scope de este archivo:
--
--  A. RLS (Row Level Security) por tabla en Supabase
--     - users: solo el propio usuario lee/actualiza su fila
--     - orders / cart_items / favorites: WHERE user_id = auth.uid()
--     - designs: artista ve sus propios drafts; todos ven active
--     - royalty_records: artista ve las suyas; admin ve todas
--     - activity_log / production_log: solo staff y admin
--     - ticket_messages (is_internal=true): solo staff y admin
--
--  B. Storage buckets en Supabase
--     - 'design-images'      (público, escribe el artista owner)
--     - 'product-images'     (público, escribe solo admin)
--     - 'ticket-attachments' (privado, lectura restringida)
--     - 'quality-photos'     (privado, solo staff/admin)
--
--  C. Migración de seed.js del prototipo A
--     - INSERT INTO products   (desde PRODUCT_CONFIG)
--     - INSERT INTO designs    (desde data/seed.js)
--     - INSERT INTO users + artists (desde cuentas de demo)
--     - INSERT INTO product_print_zones (definir zonas por producto)
--     - INSERT INTO product_variants   (definir tallas/colores)
--
--  D. Colecciones de artista (pendiente de scope)
--     - Tabla 'collections' (artist_id, name, slug)
--     - FK 'designs.collection_id' → collections
--
--  E. Migración domain/*.js → domain/*.ts
--     - domain/pricing.ts leerá platform_settings
--     - domain/production.ts usará order_status enum
--     - domain/royalties.ts leerá royalty_records
--     - domain/inventory.ts leerá product_variants + purchases
-- ============================================================
