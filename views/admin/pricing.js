// views/admin/pricing.js — Motor de costeo integrado (Fase 3 · checkpoint A23/A27/A28/A29).
// Namespace: window.Fluve.views.admin.pricing
(function () {
  const { el } = window.Fluve.dom;

  // ── Valores de referencia del hi-fi §02 para verificación manual ─────────────
  const CASOS_HIFI = [
    { label:'C1', productId:'remera', techniqueId:'dtf',  qty:1,   side:'front', esperado:24.90, nota:'Tramo 1–9' },
    { label:'C2', productId:'remera', techniqueId:'dtf',  qty:10,  side:'front', esperado:21.50, nota:'Tramo 10–49' },
    { label:'C3', productId:'remera', techniqueId:'dtf',  qty:50,  side:'front', esperado:18.25, nota:'Tramo 50–199' },
    { label:'C4', productId:'remera', techniqueId:'dtf',  qty:200, side:'front', esperado:16.35, nota:'Tramo 200+' },
    { label:'C5', productId:'remera', techniqueId:'dtf',  qty:1,   side:'both',  esperado:28.90, nota:'Recargo lado both +$4' },
    { label:'C6', productId:'remera', techniqueId:'bord', qty:1,   side:'front', esperado:30.90, nota:'Recargo bordado +$6' },
    { label:'C7', productId:'taza',   techniqueId:'subl', qty:1,   side:'front', esperado:13.90, nota:'Recargo subl +$2' },
  ];

  // ── Tiers de volumen de la remera (hi-fi §02) ────────────────────────────────
  const TIERS_REMERA = [
    { range:'1 – 9',    minQty:1,   maxQty:9,        price:24.90 },
    { range:'10 – 49',  minQty:10,  maxQty:49,       price:21.50 },
    { range:'50 – 199', minQty:50,  maxQty:199,      price:18.25 },
    { range:'200+',     minQty:200, maxQty:Infinity,  price:16.35 },
  ];

  // ── Helpers de formato ───────────────────────────────────────────────────────
  const $  = n  => (n != null && !isNaN(n)) ? '$' + n.toFixed(2) : '—';
  const pct = n => (n != null && !isNaN(n)) ? (n * 100).toFixed(1) + '%' : '—';

  function sectionHd(title, sub) {
    return el('div', { class: 'section-hd', style: { marginTop: '32px' } },
      el('span', { class: 'section-hd__title' }, title),
      sub ? el('span', { class: 'mono-label', style: { marginLeft: 'auto' } }, sub) : null,
    );
  }

  // ── Vista principal ──────────────────────────────────────────────────────────
  async function adminPricing() {
    const wrap = el('div', { class: 'fu' });
    wrap.append(
      el('h2', {}, 'Precios y costeo'),
      el('p', { style: { marginTop: '6px' } },
        'Motor de costeo (pricing.js) integrado con datos reales de IndexedDB. ' +
        'Costos calculados en el cliente, sin efectos secundarios.'),
    );

    // Carga única de datos compartidos entre las 4 secciones
    const loadingSlot = el('div');
    wrap.append(loadingSlot);
    loadingSlot.append(window.Fluve.viewState('loading', { rows: 5 }));

    let products, purchases, techniques, settings;
    try {
      [products, purchases, techniques, settings] = await Promise.all([
        window.Fluve.dao.products.getAll(),
        window.Fluve.dao.purchases.getAll(),
        window.Fluve.dao.techniques.getAll(),
        window.Fluve.dao.settings.get('pricing'),
      ]);
    } catch (err) {
      loadingSlot.replaceChildren(
        window.Fluve.viewState('error', { message: 'No se pudo cargar la DB: ' + err.message })
      );
      return wrap;
    }

    if (!settings) {
      loadingSlot.replaceChildren(
        window.Fluve.viewState('empty', { title: 'Sin configuración', message: 'Recargá el seed desde Configuración.' })
      );
      return wrap;
    }

    loadingSlot.replaceChildren(
      // ── Sección 1: Catálogo ─────────────────────────────────────────────────
      sectionHd('Catálogo — costos reales y PVP motor', `costingMethod: ${settings.costingMethod}`),
      buildCatalogo(products, purchases, techniques, settings),

      // ── Sección 2: Test de referencia hi-fi §02 ─────────────────────────────
      sectionHd('Casos de prueba vs. hi-fi §02 · Personalizador'),
      buildTestCases(CASOS_HIFI, products, techniques),

      // ── Sección 3: Personalizador interactivo ───────────────────────────────
      sectionHd('Test interactivo del Personalizador'),
      buildInteractivo(products, techniques),

      // ── Sección 4: Palanca maestra ──────────────────────────────────────────
      sectionHd('Palanca maestra — preview sin aplicar (A27)'),
      buildPalanca(products, purchases, techniques, settings),
    );

    return wrap;
  }

  // ── Sección 1: Tabla de catálogo ──────────────────────────────────────────────
  function buildCatalogo(products, purchases, techniques, settings) {
    const pricing = window.Fluve.pricing;

    const head = el('thead', {},
      el('tr', {},
        el('th', {}, 'Producto'),
        el('th', {}, 'Cat.'),
        el('th', {}, 'Técnica'),
        el('th', {}, 'Costo base (WA)'),
        el('th', {}, '+ Impresión'),
        el('th', {}, 'Costo real'),
        el('th', {}, 'PVP motor'),
        el('th', {}, 'Precio actual'),
        el('th', {}, 'Margen real'),
        el('th', {}, 'Estado'),
      ),
    );

    const tbody = el('tbody');
    for (const p of products) {
      tbody.append(buildProductRow(p, purchases, techniques, settings, pricing));
    }

    const note = el('p', { class: 'mono-label', style: { marginTop: '10px' } },
      '* PVP motor = precio mínimo para alcanzar el margen efectivo. ' +
      'Margen real = calculado sobre el precio actual (sin recargo de técnica). ' +
      '⚠ sin lotes = no hay compras registradas para ese producto.'
    );

    return el('div', {},
      el('div', { class: 'tbl-wrap' }, el('table', { class: 'tbl' }, head, tbody)),
      note,
    );
  }

  function buildProductRow(p, purchases, techniques, settings, pricing) {
    const tech = techniques.find(t => t.id === p.defaultTechnique);
    const base = pricing.costoBaseProducto(p.id, purchases, settings.costingMethod ?? 'weighted');
    const hasLots = purchases.some(pu => pu.productId === p.id && pu.type === 'product');
    const imp  = tech ? pricing.costoImpresion(tech, { areaCm2: p.printAreaCm2 }) : 0;
    const real = base + imp;

    const pvpCalc = real > 0 ? pricing.pvp(real, p, settings) : null;

    // Margen real al precio actual (basePrice, sin surcharge de técnica)
    const precioNeto  = p.basePrice / (1 + settings.vat);
    const margenReal  = real > 0 ? (precioNeto - real) / precioNeto : null;

    // Target efectivo para este producto (para comparar el margenReal)
    const targetEfectivo = pricing.margenEfectivo(p, settings);

    let statusLabel, statusCls;
    if (!hasLots) {
      statusLabel = '⚠ sin lotes'; statusCls = 'tbl__badge--yellow';
    } else if (margenReal !== null && margenReal < settings.minMargin) {
      statusLabel = '✗ bajo mínimo'; statusCls = 'tbl__badge--red';
    } else if (margenReal !== null && margenReal < targetEfectivo) {
      statusLabel = '⬇ bajo target'; statusCls = 'tbl__badge--yellow';
    } else {
      statusLabel = '✓ ok'; statusCls = 'tbl__badge--green';
    }

    return el('tr', {},
      el('td', {}, p.name),
      el('td', { class: 'tbl__muted' }, p.category),
      el('td', {}, tech?.name ?? el('span', { class: 'tbl__warn' }, '—')),
      el('td', { class: 'tbl__num' },
        hasLots ? $(base) : el('span', { class: 'tbl__warn' }, '⚠ sin lotes'),
      ),
      el('td', { class: 'tbl__num' }, $(imp)),
      el('td', { class: 'tbl__num' }, real > 0 ? $(real) : '—'),
      el('td', { class: 'tbl__num' }, pvpCalc ? $(pvpCalc.pvp) : '—'),
      el('td', { class: 'tbl__num' }, $(p.basePrice)),
      el('td', { class: 'tbl__num' }, margenReal !== null ? pct(margenReal) : '—'),
      el('td', {}, el('span', { class: `tbl__badge ${statusCls}` }, statusLabel)),
    );
  }

  // ── Sección 2: Casos de prueba hi-fi ─────────────────────────────────────────
  function buildTestCases(casos, products, techniques) {
    const pricing = window.Fluve.pricing;

    const head = el('thead', {},
      el('tr', {},
        el('th', {}, 'Caso'), el('th', {}, 'Producto'), el('th', {}, 'Técnica'),
        el('th', {}, 'Qty'), el('th', {}, 'Lado'),
        el('th', {}, 'Esperado (hi-fi)'), el('th', {}, 'Motor'), el('th', {}, 'OK'),
        el('th', {}, 'Nota'),
      ),
    );

    const tbody = el('tbody');
    for (const c of casos) {
      const product = products.find(p => p.id === c.productId);
      const resultado = product
        ? pricing.precioPersonalizador(
            { qty: c.qty, side: c.side, techniqueId: c.techniqueId, productBasePrice: product.basePrice },
            techniques
          )
        : null;

      const calculado = resultado?.porUnidad ?? null;
      const ok = calculado != null && Math.abs(calculado - c.esperado) < 0.005;

      tbody.append(el('tr', {},
        el('td', { class: 'tbl__muted' }, c.label),
        el('td', {}, product?.name ?? c.productId),
        el('td', {}, techniques.find(t => t.id === c.techniqueId)?.name ?? c.techniqueId),
        el('td', { class: 'tbl__num' }, String(c.qty)),
        el('td', { class: 'tbl__muted' }, c.side),
        el('td', { class: 'tbl__num' }, $(c.esperado)),
        el('td', { class: 'tbl__num' }, calculado != null ? $(calculado) : '—'),
        el('td', { class: ok ? 'test-ok' : 'test-fail' }, ok ? '✓' : '✗'),
        el('td', { class: 'tbl__muted', style: { fontSize: '11px' } }, c.nota),
      ));
    }

    return el('div', { class: 'tbl-wrap' },
      el('table', { class: 'tbl' }, head, tbody),
    );
  }

  // ── Sección 3: Personalizador interactivo ─────────────────────────────────────
  function buildInteractivo(products, techniques) {
    if (!products.length || !techniques.length) return el('p', { class: 'mono-label' }, 'Sin datos.');

    // Estado local
    let selProduct  = products[0];
    let selTech     = techniques.find(t => t.id === selProduct.defaultTechnique) || techniques[0];
    let qty         = 1;
    let side        = 'front';

    const tiersEl   = el('div', { class: 'tier-cards' });
    const breakdownEl = el('div');

    function update() {
      const pricing = window.Fluve.pricing;
      const compatTechs = techniques.filter(t => selProduct.compatibleTechniques?.includes(t.id));
      selTech = compatTechs.find(t => t.id === selTech.id) ?? compatTechs[0] ?? selTech;
      const isRemera = selProduct.basePrice === 24.90 && selProduct.id === 'remera';
      const result   = pricing.precioPersonalizador(
        { qty, side, techniqueId: selTech.id, productBasePrice: selProduct.basePrice },
        techniques
      );

      // Tiers
      tiersEl.replaceChildren();
      if (isRemera) {
        for (const tier of TIERS_REMERA) {
          const active = qty >= tier.minQty && qty <= tier.maxQty;
          tiersEl.append(
            el('div', { class: `tier-card${active ? ' tier-card--active' : ''}` },
              el('div', { class: 'tier-card__range' }, tier.range + ' uds'),
              el('div', { class: 'tier-card__price' }, $(tier.price)),
            )
          );
        }
      } else {
        tiersEl.append(
          el('div', { class: 'tier-card tier-card--active' },
            el('div', { class: 'tier-card__range' }, 'precio base'),
            el('div', { class: 'tier-card__price' }, $(selProduct.basePrice)),
          )
        );
      }

      // Breakdown
      breakdownEl.replaceChildren(
        el('div', { class: 'price-breakdown' },
          el('div', { class: 'breakdown-row' },
            el('span', { class: 'breakdown-row__label' }, 'Precio base (' + (isRemera ? 'tramo activo' : 'flat') + ')'),
            el('span', { class: 'breakdown-row__val' }, $(result.unit)),
          ),
          result.surTech > 0
            ? el('div', { class: 'breakdown-row' },
                el('span', { class: 'breakdown-row__label' }, 'Recargo técnica (' + selTech.name + ')'),
                el('span', { class: 'breakdown-row__val' }, '+' + $(result.surTech)),
              )
            : null,
          result.surSide > 0
            ? el('div', { class: 'breakdown-row' },
                el('span', { class: 'breakdown-row__label' }, 'Recargo lado ambos'),
                el('span', { class: 'breakdown-row__val' }, '+' + $(result.surSide)),
              )
            : null,
          el('div', { class: 'breakdown-row' },
            el('span', { class: 'breakdown-row__label' }, 'Por unidad'),
            el('span', { class: 'breakdown-row__val' }, $(result.porUnidad)),
          ),
          el('div', { class: 'breakdown-row breakdown-row--total' },
            el('span', { class: 'breakdown-row__label' }, `Total (${qty} ud${qty !== 1 ? 's' : ''})`),
            el('span', { class: 'breakdown-row__val' }, $(result.total)),
          ),
        ),
      );
    }

    // Selectores
    const productSel = el('select', { class: 'field__control', style: { width: '200px', minHeight: '44px' },
      onchange: (e) => {
        selProduct = products.find(p => p.id === e.target.value) || products[0];
        selTech = techniques.find(t => t.id === selProduct.defaultTechnique) || techniques[0];
        // Rebuild tech select options
        techSel.replaceChildren(...techniques
          .filter(t => selProduct.compatibleTechniques?.includes(t.id))
          .map(t => el('option', { value: t.id, selected: t.id === selTech.id ? 'true' : null }, t.name))
        );
        update();
      },
    }, ...products.map(p => el('option', { value: p.id }, p.name)));

    const techSel = el('select', { class: 'field__control', style: { width: '180px', minHeight: '44px' },
      onchange: (e) => {
        selTech = techniques.find(t => t.id === e.target.value) || selTech;
        update();
      },
    }, ...techniques
      .filter(t => selProduct.compatibleTechniques?.includes(t.id))
      .map(t => el('option', { value: t.id, selected: t.id === selTech.id ? 'true' : null }, t.name)));

    const qtySel = el('input', { type: 'number', min: '1', max: '9999', value: '1',
      class: 'field__control', style: { width: '90px', minHeight: '44px' },
      oninput: (e) => { qty = Math.max(1, parseInt(e.target.value) || 1); update(); },
    });

    const sideSel = el('select', { class: 'field__control', style: { width: '130px', minHeight: '44px' },
      onchange: (e) => { side = e.target.value; update(); },
    },
      el('option', { value: 'front' }, 'Frente'),
      el('option', { value: 'back' },  'Espalda'),
      el('option', { value: 'both' },  'Ambos (+$4.00)'),
    );

    const form = el('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' } },
      el('div', { class: 'field' }, el('label', { class: 'field__label' }, 'Producto'), productSel),
      el('div', { class: 'field' }, el('label', { class: 'field__label' }, 'Técnica'), techSel),
      el('div', { class: 'field' }, el('label', { class: 'field__label' }, 'Cantidad'), qtySel),
      el('div', { class: 'field' }, el('label', { class: 'field__label' }, 'Lado'), sideSel),
    );

    update();
    return el('div', {}, form, tiersEl, breakdownEl);
  }

  // ── Sección 4: Palanca maestra (preview) ──────────────────────────────────────
  function buildPalanca(products, purchases, techniques, settings) {
    const pricing = window.Fluve.pricing;
    const currentMargin = settings.targetMargin;

    const previewSlot = el('div');

    function runPreview(newMargin) {
      const newSettings    = { ...settings, targetMargin: newMargin };
      const { preview }    = pricing.recalcularCatalogo(products, newSettings, settings, purchases, techniques);

      if (!preview.length) {
        previewSlot.replaceChildren(
          el('p', { class: 'mono-label' }, 'Ningún producto depende directamente del margen global.')
        );
        return;
      }

      const head = el('thead', {},
        el('tr', {},
          el('th', {}, 'Producto'), el('th', {}, 'PVP actual'), el('th', {}, `PVP con ${(newMargin*100).toFixed(0)}%`), el('th', {}, 'Δ'),
        ),
      );
      const tbody = el('tbody');
      for (const row of preview) {
        const up = row.delta > 0;
        tbody.append(el('tr', {},
          el('td', {}, row.name),
          el('td', { class: 'tbl__num' }, $(row.pvpAntes)),
          el('td', { class: 'tbl__num' }, $(row.pvpDespues)),
          el('td', { class: up ? 'test-ok' : 'test-fail', style: { fontFamily: 'var(--font-mono)' } },
            (up ? '▲ +' : '▼ ') + $(Math.abs(row.delta))),
        ));
      }
      previewSlot.replaceChildren(
        el('div', { class: 'tbl-wrap', style: { maxWidth: '540px' } },
          el('table', { class: 'tbl' }, head, tbody),
        ),
        el('p', { class: 'mono-label', style: { marginTop: '8px' } },
          `${preview.length} producto(s) afectado(s). Los que tienen override manual o excepción de categoría no cambian (🔒).`),
      );
    }

    const input = el('input', {
      type: 'number', min: '0.10', max: '0.75', step: '0.01',
      value: String(currentMargin),
      oninput: (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v >= 0.10 && v <= 0.75) runPreview(v);
      },
    });

    const applyBtn = el('button', {
      class: 'btn btn--primary',
      type: 'button',
      disabled: true,
      title: 'La escritura en settings se habilita en la Fase 5',
    }, 'Aplicar cambio (Fase 5)');

    const form = el('div', { class: 'palanca-form' },
      el('div', { class: 'field' },
        el('label', { class: 'field__label' }, `Target margin (actual: ${(currentMargin*100).toFixed(0)}%)`),
        input,
      ),
      applyBtn,
    );

    runPreview(currentMargin);
    return el('div', {}, form, previewSlot);
  }

  // ── Export ───────────────────────────────────────────────────────────────────
  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.admin = window.Fluve.views.admin || {};
  window.Fluve.views.admin.pricing = adminPricing;
})();
