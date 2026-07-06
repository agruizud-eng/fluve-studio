// data/db.js — apertura de IndexedDB y definición de los 19 object stores (ESQUEMA §1/§3).
// Namespace: window.Fluve.db. Sin import/export; scripts clásicos (ver CLAUDE.md).
(function () {
  const DB_NAME    = 'fluve_studio';
  const DB_VERSION = 1;

  // ── Definición completa de stores (ESQUEMA §3) ──────────────────────────────
  const STORE_DEFS = [
    { name: 'products',   keyPath: 'id',   indexes: [
      { name: 'slug',      key: 'slug',     unique: true },
      { name: 'category',  key: 'category' },
      { name: 'active',    key: 'active' },
    ]},
    { name: 'variants',   keyPath: 'id',   auto: true, indexes: [
      { name: 'productId', key: 'productId' },
      { name: 'sku',       key: 'sku',      unique: true },
    ]},
    { name: 'techniques', keyPath: 'id',   indexes: [] },
    { name: 'designs',    keyPath: 'id',   auto: true, indexes: [
      { name: 'artistId',  key: 'artistId' },
      { name: 'status',    key: 'status' },
      { name: 'tags',      key: 'tags',     multi: true },
    ]},
    { name: 'artists',    keyPath: 'id',   indexes: [
      { name: 'handle',    key: 'handle',   unique: true },
    ]},
    { name: 'users',      keyPath: 'id',   indexes: [
      { name: 'email',     key: 'email',    unique: true },
      { name: 'role',      key: 'role' },
    ]},
    { name: 'carts',      keyPath: 'id',   indexes: [] },
    { name: 'orders',     keyPath: 'id',   indexes: [
      { name: 'userId',    key: 'userId' },
      { name: 'status',    key: 'status' },
      { name: 'createdAt', key: 'createdAt' },
    ]},
    { name: 'payments',   keyPath: 'id',   indexes: [
      { name: 'orderId',   key: 'orderId' },
      { name: 'status',    key: 'status' },
    ]},
    { name: 'suppliers',  keyPath: 'id',   indexes: [] },
    { name: 'purchases',  keyPath: 'id',   auto: true, indexes: [
      { name: 'productId',   key: 'productId' },
      { name: 'materialId',  key: 'materialId' },
      { name: 'supplierId',  key: 'supplierId' },
      { name: 'date',        key: 'date' },
    ]},
    { name: 'inventory',  keyPath: 'id',   indexes: [] },
    { name: 'quotes',     keyPath: 'id',   indexes: [
      { name: 'clientId',  key: 'clientId' },
      { name: 'status',    key: 'status' },
    ]},
    { name: 'promos',     keyPath: 'code', indexes: [] },
    { name: 'royalties',  keyPath: 'id',   auto: true, indexes: [
      { name: 'artistId',  key: 'artistId' },
      { name: 'status',    key: 'status' },
    ]},
    { name: 'tickets',    keyPath: 'id',   indexes: [
      { name: 'userId',    key: 'userId' },
      { name: 'orderId',   key: 'orderId' },
      { name: 'status',    key: 'status' },
    ]},
    { name: 'favorites',  keyPath: 'id',   auto: true, indexes: [
      { name: 'userId',    key: 'userId' },
      { name: 'productId', key: 'productId' },
    ]},
    { name: 'activity',   keyPath: 'id',   auto: true, indexes: [
      { name: 'entity',    key: 'entity' },
      { name: 'at',        key: 'at' },
    ]},
    { name: 'settings',   keyPath: 'key',  indexes: [] },
  ];

  let _db = null;

  // ── openDB: abre (o crea) la base y aplica el schema si es necesario ────────
  function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      let req;
      try {
        req = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (err) {
        reject(new Error('IndexedDB no está disponible en este contexto. Usá Chrome o Edge con file://'));
        return;
      }

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        for (const s of STORE_DEFS) {
          if (db.objectStoreNames.contains(s.name)) continue;
          const os = db.createObjectStore(s.name, {
            keyPath: s.keyPath || 'id',
            autoIncrement: !!s.auto,
          });
          for (const idx of (s.indexes || [])) {
            os.createIndex(idx.name, idx.key, {
              unique: !!idx.unique,
              multiEntry: !!idx.multi,
            });
          }
        }
      };

      req.onsuccess = () => {
        _db = req.result;

        // Reconectar si la base se cierra inesperadamente (ESQUEMA §5)
        _db.onversionchange = () => { _db.close(); _db = null; };
        _db.onclose = () => { _db = null; };

        resolve(_db);
      };

      req.onerror = () => reject(req.error);
      req.onblocked = () => console.warn('Fluvë DB bloqueada (otra pestaña con versión más vieja).');
    });
  }

  function getDB()      { return _db; }
  function getStoreDefs() { return STORE_DEFS; }

  window.Fluve = window.Fluve || {};
  window.Fluve.db = { openDB, getDB, getStoreDefs, DB_NAME, DB_VERSION };
})();
