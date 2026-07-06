// data/pricing.js — motor de costeo client-side, MÓDULO PURO (sin IndexedDB).
// Recibe datos ya leídos por el DAO; devuelve números. Namespace: window.Fluve.pricing
// Referencia: handoff_prototipo_spa/MOTOR_COSTEO.md
(function () {

  // ── §1 Herencia de margen ─────────────────────────────────────────────────────
  /** Margen efectivo en cascada: override → categoría → global. */
  function margenEfectivo(product, settings) {
    if (product.pricingOverrideMargin != null) return product.pricingOverrideMargin;
    if (settings.categoryExceptions?.[product.category] != null)
      return settings.categoryExceptions[product.category];
    return settings.targetMargin;
  }

  // ── §2 Fórmula de PVP ────────────────────────────────────────────────────────
  /** Redondeo comercial a ,90: sube al siguiente ,90 ≥ x. */
  function redondearA90(x) {
    const entero = Math.floor(x);
    const cand   = entero + 0.90;
    return cand >= x ? cand : cand + 1;
  }

  /**
   * PVP completo dado un costo real y el producto + settings.
   * @returns {{ precioNeto, pvpBruto, pvp, margen, markupPct, alerta }}
   */
  function pvp(costoRealVal, product, settings) {
    const margen    = margenEfectivo(product, settings);
    const precioNeto = costoRealVal / (1 - margen);
    const pvpBruto  = precioNeto * (1 + settings.vat);
    const pvpFinal  = redondearA90(pvpBruto);
    const alerta    = margen < settings.minMargin;
    const markupPct = (pvpFinal / costoRealVal - 1) * 100;
    return { precioNeto, pvpBruto, pvp: pvpFinal, margen, markupPct, alerta };
  }

  // ── §3.1 Costo base del producto — promedio ponderado de lotes ────────────────
  function costoBaseProducto(productId, purchases, method = 'weighted') {
    const lots = purchases.filter(p => p.productId === productId && p.type === 'product');
    if (!lots.length) return 0;
    if (method === 'fifo')
      return [...lots].sort((a, b) => a.date.localeCompare(b.date))[0].unitCost;
    const totQty  = lots.reduce((s, l) => s + l.qty, 0);
    const totCost = lots.reduce((s, l) => s + l.qty * l.unitCost, 0);
    return totQty ? totCost / totQty : 0;
  }

  // ── §3.2 Costo de impresión por técnica ───────────────────────────────────────
  /**
   * @param {object} tech - registro de techniques
   * @param {{ areaCm2?: number, colors?: number, qty?: number, stitches?: number }} ctx
   */
  function costoImpresion(tech, { areaCm2 = 0, colors = 1, qty = 1, stitches = 0 } = {}) {
    switch (tech.costModel) {
      case 'area':
        // TODO producción: usar ancho de rollo real del inventario para ml exactos.
        // Prototipo: tratar ml ≈ m² del arte (simplificación documentada en MOTOR_COSTEO §3.2).
        if (tech.rateUnit === 'm2') return (areaCm2 / 10000) * tech.rate;
        return (areaCm2 / 10000) * tech.rate;
      case 'fixed':
        return tech.rate;
      case 'screens':
        return qty > 0 ? (tech.rate * colors) / qty : 0;
      case 'stitches':
        return (stitches / 1000) * tech.rate;
      default:
        return 0;
    }
  }

  // ── §3.3 Inventario por área — consumibles en rollo ──────────────────────────
  /** Promedio ponderado de $/cm² sobre los lotes de un material. */
  function avgCostPerCm2(material, inventoryLots) {
    const lots    = inventoryLots.filter(l => l.material === material);
    const totArea = lots.reduce((s, l) => s + l.areaCm2, 0);
    const totCost = lots.reduce((s, l) => s + l.areaCm2 * l.costPerCm2, 0);
    return totArea ? totCost / totArea : 0;
  }

  // ── Costo real compuesto ──────────────────────────────────────────────────────
  /** costoReal = costoBase + costoImpresión. */
  function costoReal(product, tech, ctx, purchases, settings) {
    const base      = costoBaseProducto(product.id, purchases, settings?.costingMethod ?? 'weighted');
    const impresion = costoImpresion(tech, { areaCm2: product.printAreaCm2, ...ctx });
    return base + impresion;
  }

  // ── §4 Precio en el personalizador ───────────────────────────────────────────
  /** Tramos de volumen para la remera de referencia (los otros productos escalan con su basePrice). */
  function tramoUnitario(qty, basePrice = 24.90) {
    // Tramos del hi-fi §02 para la remera; otros productos usan su propio basePrice sin descuento de tramo
    // por ahora (TODO: extraer tramos por producto en Fase 4).
    if (basePrice !== 24.90) return basePrice; // productos sin tramo definido: precio base plano
    if (qty >= 200) return 16.35;
    if (qty >= 50)  return 18.25;
    if (qty >= 10)  return 21.50;
    return 24.90;
  }

  /**
   * Precio visible en el personalizador (incluye recargos de lado y técnica).
   * @param {{ qty: number, side: string, techniqueId: string, productBasePrice?: number }} config
   * @param {object[]} techniques
   * @returns {{ unit, porUnidad, total }}
   */
  function precioPersonalizador({ qty, side, techniqueId, productBasePrice = 24.90 }, techniques) {
    const unit     = tramoUnitario(qty, productBasePrice);
    const tech     = techniques.find(t => t.id === techniqueId);
    const surTech  = tech?.surchargePerUnit ?? 0;
    const surSide  = side === 'both' ? 4 : 0;
    const porUnidad = unit + surTech + surSide;
    return { unit, surTech, surSide, porUnidad, total: porUnidad * qty };
  }

  // ── §5 Regalías ──────────────────────────────────────────────────────────────
  function regalia(lineTotal, artist, tiers) {
    const rate = tiers?.[artist.tier] ?? tiers?.base ?? 0.10;
    return lineTotal * rate;
  }

  // ── §6 Rentabilidad de pedido ─────────────────────────────────────────────────
  function margenPedido(order, { costoProveedor = 0, royalties = 0 } = {}) {
    if (!order.total || order.total === 0) return 0;
    return (order.total - costoProveedor - (order.shippingCost || 0) - royalties) / order.total;
  }

  // ── §7 Palanca maestra — recalcular catálogo ──────────────────────────────────
  /**
   * Devuelve { affected: Product[], preview: [{id, pvpAntes, pvpDespues}] } sin mutar nada.
   * El admin puede confirmar antes de aplicar (A27).
   */
  /**
   * Devuelve los productos cuyo PVP cambiaría si se modifica `settings.targetMargin`.
   * Solo afecta productos donde el margen efectivo ES targetMargin (sin override ni excepción de categoría).
   * @param {object[]} products
   * @param {object}   settings     — con el NUEVO targetMargin ya seteado
   * @param {object}   settingsAntes — con el targetMargin anterior (para mostrar pvpAntes)
   * @param {object[]} purchases
   * @param {object[]} techniques
   */
  function recalcularCatalogo(products, settings, settingsAntes, purchases, techniques) {
    // Afectados: sin override manual Y sin excepción de categoría → su efectivo viene de targetMargin
    const affected = products.filter(p =>
      p.pricingOverrideMargin == null &&
      settings.categoryExceptions?.[p.category] == null
    );
    const preview = affected.map(p => {
      const tech  = techniques?.find(t => t.id === p.defaultTechnique);
      const costo = costoBaseProducto(p.id, purchases, settings.costingMethod ?? 'weighted');
      const imp   = tech ? costoImpresion(tech, { areaCm2: p.printAreaCm2 }) : 0;
      const real  = costo + imp;
      if (real === 0) return null;
      const pvpA = pvp(real, p, settingsAntes ?? settings);
      const pvpD = pvp(real, p, settings);
      return {
        id: p.id, name: p.name,
        pvpAntes:  pvpA.pvp,
        pvpDespues: pvpD.pvp,
        delta: pvpD.pvp - pvpA.pvp,
      };
    }).filter(Boolean);
    return { affected, preview };
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.pricing = {
    margenEfectivo, costoBaseProducto, costoImpresion, avgCostPerCm2,
    costoReal, pvp, redondearA90, tramoUnitario, precioPersonalizador,
    regalia, margenPedido, recalcularCatalogo,
  };
})();
