/*
 * Fluvë Studio — esquema de datos para Arquitectura A
 *
 * Reemplaza la ejecución de fluve_schema_v2.sql durante la etapa de prototipo.
 * Arquitectura A no usa PostgreSQL ni servidor: este archivo es la definición
 * ejecutable de los object stores de IndexedDB que debe consumir data/db.js.
 *
 * Convenciones de la migración v2 (producción) -> A (prototipo):
 * - order_items             -> order_lines
 * - royalty_records         -> royalties
 * - design_categories y product_categories -> arrays categories[]
 * - zone_techniques         -> product_print_zones.techniques[]
 * - supplier_techniques     -> suppliers.techniques[]
 * - ticket_messages         -> tickets.messages[]
 * - production_log y quality_checks -> activity_log (prototipo)
 * - Las categorías se usan como strings; no existe un store categories.
 *
 * El precio final se persiste únicamente en order_lines.unitPrice. Los módulos
 * domain/ continúan siendo la única fuente de reglas de negocio.
 */
(function () {
  'use strict';

  const DB_NAME = 'fluve_studio';
  const DB_VERSION = 1;

  /**
   * Los índices compuestos requieren que los campos estén presentes en el
   * objeto. No se generan claves artificiales ni relaciones producto-diseño.
   */
  const STORES = Object.freeze({
    users: {
      keyPath: 'id',
      indexes: [
        ['email', 'email', { unique: true }],
        ['role', 'role'],
        ['createdAt', 'createdAt'],
      ],
    },
    artists: {
      keyPath: 'id',
      indexes: [
        ['userId', 'userId', { unique: true }],
        ['handle', 'handle', { unique: true }],
        ['status', 'status'],
        ['featured', 'featured'],
      ],
    },
    designs: {
      keyPath: 'id',
      indexes: [
        ['artistId', 'artistId'],
        ['status', 'status'],
        ['featured', 'featured'],
        ['score', 'score'],
        ['categories', 'categories', { multiEntry: true }],
        ['createdAt', 'createdAt'],
      ],
    },
    orders: {
      keyPath: 'id',
      indexes: [
        ['userId', 'userId'],
        ['status', 'status'],
        ['supplierId', 'supplierId'],
        ['createdAt', 'createdAt'],
      ],
    },
    order_lines: {
      keyPath: 'id',
      indexes: [
        ['orderId', 'orderId'],
        ['productId', 'productId'],
        ['designId', 'designId'],
        ['artistId', 'artistId'],
        ['variantId', 'variantId'],
        ['techniqueId', 'techniqueId'],
      ],
    },
    products: {
      keyPath: 'id',
      indexes: [
        ['slug', 'slug', { unique: true }],
        ['active', 'active'],
        ['featured', 'featured'],
        ['categories', 'categories', { multiEntry: true }],
        ['sortOrder', 'sortOrder'],
      ],
    },
    product_variants: {
      keyPath: 'id',
      indexes: [
        ['productId', 'productId'],
        ['sku', 'sku', { unique: true }],
        ['active', 'active'],
        ['stock', 'stock'],
      ],
    },
    product_print_zones: {
      keyPath: 'id',
      indexes: [
        ['productId', 'productId'],
        ['active', 'active'],
        ['defaultTechId', 'defaultTechId'],
      ],
    },
    techniques: {
      keyPath: 'id',
      indexes: [
        ['active', 'active'],
        ['costModel', 'costModel'],
      ],
    },
    royalties: {
      keyPath: 'id',
      indexes: [
        ['artistId', 'artistId'],
        ['orderId', 'orderId'],
        ['orderLineId', 'orderLineId'],
        ['status', 'status'],
        ['paidAt', 'paidAt'],
      ],
    },
    payments: {
      keyPath: 'id',
      indexes: [
        ['orderId', 'orderId'],
        ['userId', 'userId'],
        ['status', 'status'],
        ['externalId', 'externalId'],
      ],
    },
    purchases: {
      keyPath: 'id',
      indexes: [
        ['supplierId', 'supplierId'],
        ['productId', 'productId'],
        ['variantId', 'variantId'],
        ['status', 'status'],
      ],
    },
    promos: {
      keyPath: 'id',
      indexes: [
        ['code', 'code', { unique: true }],
        ['active', 'active'],
        ['expiresAt', 'expiresAt'],
      ],
    },
    suppliers: {
      keyPath: 'id',
      indexes: [
        ['active', 'active'],
        ['rating', 'rating'],
        ['name', 'name'],
      ],
    },
    favorites: {
      keyPath: 'id',
      indexes: [
        ['userId', 'userId'],
        ['designId', 'designId'],
        ['user_design', ['userId', 'designId'], { unique: true }],
        ['createdAt', 'createdAt'],
      ],
    },
    cart_items: {
      keyPath: 'id',
      indexes: [
        ['userId', 'userId'],
        ['updatedAt', 'updatedAt'],
        ['user_product_design', ['userId', 'productId', 'designId']],
      ],
    },
    quotations: {
      keyPath: 'id',
      indexes: [
        ['userId', 'userId'],
        ['status', 'status'],
        ['expiresAt', 'expiresAt'],
        ['createdAt', 'createdAt'],
      ],
    },
    tickets: {
      keyPath: 'id',
      indexes: [
        ['userId', 'userId'],
        ['orderId', 'orderId'],
        ['status', 'status'],
        ['createdAt', 'createdAt'],
      ],
    },
    activity_log: {
      keyPath: 'id',
      indexes: [
        ['entity', 'entity'],
        ['entity_entityId', ['entity', 'entityId']],
        ['userId', 'userId'],
        ['createdAt', 'createdAt'],
      ],
    },
    platform_settings: {
      keyPath: 'key',
      indexes: [
        ['autoload', 'autoload'],
      ],
    },
    notifications: {
      keyPath: 'id',
      indexes: [
        ['userId', 'userId'],
        ['user_readAt', ['userId', 'readAt']],
        ['createdAt', 'createdAt'],
      ],
    },
  });

  /**
   * Registro de forma canónica. Es documentación ejecutable para seed.js y DAO;
   * no valida los objetos para no duplicar las validaciones de domain/ y views/.
   */
  const RECORDS = Object.freeze({
    users: '{ id, email, name, phone, role, avatarUrl, createdAt }',
    artists: '{ id, userId, handle, displayName, bio, avatarUrl, portfolioUrl, tier, royaltyRate, status, featured, active, createdAt }',
    designs: '{ id, artistId, title, description, isOwn, status, imageUrl, tags: [], categories: [], rejectionReason, stats: { views, favorites, sales }, score, featured, createdAt, updatedAt }',
    orders: '{ id, userId, status, supplierId, shippingCost, shippingAddress, total, notes, paymentId, paymentProvider, createdAt, updatedAt }',
    order_lines: '{ id, orderId, productId, designId, artistId, variantId, zoneId, techniqueId, qty, areaCm2, colors, stitchesK, unitPrice, precioNeto, costoReal, royaltyAmt }',
    products: '{ id, slug, name, category, type, subcategory, fit, material, gramaje, basePricePVP, categories: [], images: {}, active, featured, sortOrder, createdAt }',
    product_variants: '{ id, productId, colorName, colorHex, size, sku, stock, stockMinimo, precioExtra, active }',
    product_print_zones: '{ id, productId, name, location, widthCm, heightCm, areaCm2, defaultTechId, sortOrder, active, techniques: [] }',
    techniques: '{ id, name, costModel, rate, rateUnit, surchargeUnit, minQty, active, notes }',
    royalties: '{ id, orderId, orderLineId, artistId, designId, amount, tier, rate, status, paidAt, createdAt }',
    payments: '{ id, orderId, userId, amount, method, status, externalId, createdAt }',
    purchases: '{ id, supplierId, productId, variantId, type, qty, unitCost, areaCm2, costPerCm2, status, orderedAt, receivedAt, createdAt }',
    promos: '{ id, code, type, value, minAmount, active, expiresAt }',
    suppliers: '{ id, name, contactName, email, phone, address, techniques: [], zones: [], rating, currentLoad, active, notes, createdAt }',
    favorites: '{ id, userId, designId, createdAt }',
    cart_items: '{ id, userId, productId, designId, variantId, zoneId, techniqueId, qty, unitPrice, createdAt, updatedAt }',
    quotations: '{ id, userId, status, items: [], subtotal, discountPct, discountAmount, total, validDays, expiresAt, createdAt }',
    tickets: '{ id, userId, orderId, subject, status, priority, messages: [], createdAt, updatedAt }',
    activity_log: '{ id, userId, action, entity, entityId, before: {}, after: {}, createdAt }',
    platform_settings: '{ key, value, description, autoload, updatedAt }',
    notifications: '{ id, userId, type, title, body, readAt, createdAt }',
  });

  let dbPromise = null;

  function createStores(database, upgradeTransaction) {
    Object.keys(STORES).forEach((name) => {
      const definition = STORES[name];
      const store = database.objectStoreNames.contains(name)
        ? upgradeTransaction.objectStore(name)
        : database.createObjectStore(name, { keyPath: definition.keyPath });

      definition.indexes.forEach(([indexName, keyPath, options = {}]) => {
        if (!store.indexNames.contains(indexName)) {
          store.createIndex(indexName, keyPath, options);
        }
      });
    });
  }

  function open() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB no está disponible en este navegador.'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => createStores(request.result, request.transaction);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB.'));
      request.onblocked = () => reject(new Error('La base de datos está bloqueada por otra pestaña.'));
    });

    return dbPromise;
  }

  function close() {
    if (!dbPromise) return;
    dbPromise.then((database) => database.close()).catch(() => {});
    dbPromise = null;
  }

  function destroy() {
    close();
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('No se pudo eliminar IndexedDB.'));
      request.onblocked = () => reject(new Error('Cerrá las otras pestañas para reiniciar los datos.'));
    });
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.data = window.Fluve.data || {};
  window.Fluve.data.schema = { DB_NAME, DB_VERSION, STORES, RECORDS };
  window.Fluve.data.db = { open, close, destroy };
})();
