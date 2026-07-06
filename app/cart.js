// app/cart.js — carrito persistente en IndexedDB (F6). Namespace: window.Fluve.cart
(function () {
  const { createStore } = window.Fluve.dom;

  // Store reactivo para el contador del header
  const store = createStore({ count: 0, lines: [], coupon: null });

  function cartId() {
    const u = window.Fluve.session.current();
    return u?.id ?? 'guest';
  }

  function lineKey(cfg) {
    return [cfg.productId, cfg.techniqueId, cfg.color, cfg.size ?? '', cfg.side, cfg.designId ?? ''].join('|');
  }

  function makeLineId() {
    return 'l-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  function updateCounter(count) {
    const badge = document.getElementById('cart-count');
    if (badge) {
      badge.textContent  = String(count);
      badge.setAttribute('data-zero', count === 0 ? 'true' : 'false');
    }
  }

  async function loadCart() {
    try {
      const cid  = cartId();
      const cart = await window.Fluve.dao.carts.get(cid);
      const lines = cart?.lines ?? [];
      const count = lines.reduce((s, l) => s + (l.config?.qty ?? 0), 0);
      store.set({ count, lines, coupon: cart?.coupon ?? null });
      updateCounter(count);
    } catch {
      store.set({ count: 0, lines: [], coupon: null });
    }
  }

  async function _save(lines, coupon = null) {
    const count = lines.reduce((s, l) => s + (l.config?.qty ?? 0), 0);
    try {
      await window.Fluve.dao.carts.put({ id: cartId(), lines, coupon, updatedAt: new Date().toISOString() });
    } catch { /* degradar en silencio */ }
    store.set({ count, lines, coupon });
    updateCounter(count);
  }

  async function addLine(line) {
    const { lines } = store.get();
    const key = lineKey(line.config);
    const existing = lines.find(l => lineKey(l.config) === key);
    let newLines;
    if (existing) {
      newLines = lines.map(l => {
        if (lineKey(l.config) !== key) return l;
        const qty = l.config.qty + line.config.qty;
        return { ...l, config: { ...l.config, qty }, lineTotal: Number((l.unitPrice * qty).toFixed(2)) };
      });
    } else {
      newLines = [...lines, { ...line, lineId: makeLineId() }];
    }
    await _save(newLines, store.get().coupon);
  }

  async function removeLine(lineId) {
    const { lines, coupon } = store.get();
    await _save(lines.filter(l => l.lineId !== lineId), coupon);
  }

  async function updateLineQty(lineId, qty) {
    if (qty < 1) return removeLine(lineId);
    const { lines, coupon } = store.get();
    const newLines = lines.map(l =>
      l.lineId !== lineId ? l : { ...l, config: { ...l.config, qty }, lineTotal: Number((l.unitPrice * qty).toFixed(2)) }
    );
    await _save(newLines, coupon);
  }

  async function clearCart() {
    await _save([], null);
  }

  async function applyCoupon(code) {
    const promo = await window.Fluve.dao.promos.get(code.toUpperCase());
    if (!promo || !promo.active) throw new Error('Cupón inválido o expirado');
    await _save(store.get().lines, promo.code);
    return promo;
  }

  function calcTotals(lines, promoObj = null, shippingCost = 4.90) {
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    let discount = 0;
    if (promoObj?.type === 'percent') discount = subtotal * promoObj.value / 100;
    if (promoObj?.type === 'fixed')   discount = promoObj.value;
    if (promoObj?.type === 'freeship') shippingCost = 0;
    const afterDiscount = Math.max(0, subtotal - discount);
    const freeFrom = 50; // from settings seed
    const shipping = afterDiscount >= freeFrom ? 0 : shippingCost;
    const total = afterDiscount + shipping;
    return { subtotal, discount, shipping, total };
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.cart = { store, loadCart, addLine, removeLine, updateLineQty, clearCart, applyCoupon, calcTotals };
})();
