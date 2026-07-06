// data/dao.js — DAO genérico + helpers específicos + logActivity (ESQUEMA §2).
// Todos los métodos son async (devuelven Promesas). Namespace: window.Fluve.dao
// IMPORTANTE: tx() y txBulk() deben hacer todas sus escrituras de forma síncrona
// dentro del mismo stackframe — no usar await dentro de una transacción (ESQUEMA §5 nota).
(function () {

  // ── Primitivos de transacción ────────────────────────────────────────────────

  /** Envuelve una sola operación de store en una Promesa. */
  function tx(name, mode, fn) {
    return new Promise((resolve, reject) => {
      const db = window.Fluve.db.getDB();
      if (!db) { reject(new Error('DB no inicializada')); return; }
      const t   = db.transaction(name, mode);
      const os  = t.objectStore(name);
      const req = fn(os);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
      t.onerror     = () => reject(t.error);
    });
  }

  /** Inserta/actualiza un array en UNA sola transacción (evita auto-commit prematuro). */
  function txBulk(name, arr) {
    return new Promise((resolve, reject) => {
      if (!arr || arr.length === 0) { resolve(); return; }
      const db = window.Fluve.db.getDB();
      if (!db) { reject(new Error('DB no inicializada')); return; }
      const t  = db.transaction(name, 'readwrite');
      const os = t.objectStore(name);
      // Todas las escrituras en el mismo stackframe — no await dentro de esto
      for (const item of arr) os.put(item);
      t.oncomplete = () => resolve();
      t.onerror    = () => reject(t.error);
    });
  }

  /** Vacía un store y luego lo repobla en una sola transacción. */
  function txClearAndBulk(name, arr) {
    return new Promise((resolve, reject) => {
      const db = window.Fluve.db.getDB();
      if (!db) { reject(new Error('DB no inicializada')); return; }
      const t  = db.transaction(name, 'readwrite');
      const os = t.objectStore(name);
      os.clear();
      if (arr && arr.length) for (const item of arr) os.put(item);
      t.oncomplete = () => resolve();
      t.onerror    = () => reject(t.error);
    });
  }

  // ── Fábrica de API por store ─────────────────────────────────────────────────

  function storeApi(name) {
    return {
      get:      (key)         => tx(name, 'readonly',  os => os.get(key)),
      getAll:   ()            => tx(name, 'readonly',  os => os.getAll()),
      put:      (val)         => tx(name, 'readwrite', os => os.put(val)),
      bulkPut:  (arr)         => txBulk(name, arr),
      delete:   (key)         => tx(name, 'readwrite', os => os.delete(key)),
      clear:    ()            => tx(name, 'readwrite', os => os.clear()),
      query:    (index, val)  => tx(name, 'readonly',  os => os.index(index).getAll(val)),
      count:    ()            => tx(name, 'readonly',  os => os.count()),
    };
  }

  // ── Instancias por store (los 19 del ESQUEMA) ────────────────────────────────

  const dao = {
    products:   storeApi('products'),
    variants:   storeApi('variants'),
    techniques: storeApi('techniques'),
    designs:    storeApi('designs'),
    artists:    storeApi('artists'),
    users:      storeApi('users'),
    carts:      storeApi('carts'),
    orders:     storeApi('orders'),
    payments:   storeApi('payments'),
    suppliers:  storeApi('suppliers'),
    purchases:  storeApi('purchases'),
    inventory:  storeApi('inventory'),
    quotes:     storeApi('quotes'),
    promos:     storeApi('promos'),
    royalties:  storeApi('royalties'),
    tickets:    storeApi('tickets'),
    favorites:  storeApi('favorites'),
    activity:   storeApi('activity'),
    settings:   storeApi('settings'),
  };

  // ── Helpers específicos (ESQUEMA §2) ─────────────────────────────────────────

  /** Busca un producto por su campo `slug` (índice único). */
  dao.products.getBySlug = (slug) => tx('products', 'readonly', os => os.index('slug').get(slug));

  /** Todos los pedidos de un usuario. */
  dao.orders.byUser = (userId) => tx('orders', 'readonly', os => os.index('userId').getAll(userId));

  /** Todos los pedidos en un estado dado. */
  dao.orders.byStatus = (status) => tx('orders', 'readonly', os => os.index('status').getAll(status));

  /** Variantes de un producto. */
  dao.variants.byProduct = (productId) => tx('variants', 'readonly', os => os.index('productId').getAll(productId));

  /** Lotes de compra de un producto. */
  dao.purchases.byProduct = (productId) => tx('purchases', 'readonly', os => os.index('productId').getAll(productId));

  /** Todos los diseños de un artista. */
  dao.designs.byArtist = (artistId) => tx('designs', 'readonly', os => os.index('artistId').getAll(artistId));

  /** Designs en un estado dado ('approved', 'pending', etc.). */
  dao.designs.byStatus = (status) => tx('designs', 'readonly', os => os.index('status').getAll(status));

  /** Regalías de un artista. */
  dao.royalties.byArtist = (artistId) => tx('royalties', 'readonly', os => os.index('artistId').getAll(artistId));

  /** Favoritos de un usuario. */
  dao.favorites.byUser = (userId) => tx('favorites', 'readonly', os => os.index('userId').getAll(userId));

  /** Tickets de un usuario. */
  dao.tickets.byUser = (userId) => tx('tickets', 'readonly', os => os.index('userId').getAll(userId));

  /** Util interno: vacía y repuebla. Usado por seed.reseed(). */
  dao._clearAndBulk = txClearAndBulk;

  // ── logActivity: audit log (G8) ──────────────────────────────────────────────
  // No incluye `id` → auto-increment. La llamada es async → se hace FUERA de transacciones
  // multi-store para no bloquear el commit.
  dao.logActivity = async function (action, entity, entityId, { before = null, after = null } = {}) {
    const user = window.Fluve.session?.current?.();
    await dao.activity.put({
      at:       new Date().toISOString(),
      userId:   user?.id ?? 'guest',
      action,
      entity,
      entityId: String(entityId),
      before,
      after,
    });
  };

  window.Fluve = window.Fluve || {};
  window.Fluve.dao = dao;
})();
