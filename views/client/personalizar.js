// views/client/personalizar.js — Personalizador interactivo ★ (Fase 4). Referencia: Personalizador (hi-fi).dc.html
(function () {
  const { el } = window.Fluve.dom;
  const DE = ['🌺','🌙','🏖️','🦕','⚡','🎨','🌊','🌵','✍️','💙','🔤','🎭'];
  const PE = { remera:'👕', hoodie:'🧥', taza:'☕', tote:'👜', funda:'📱', cuadro:'🖼️' };

  async function personalizar({ params, query }) {
    const slot = document.querySelector('[data-view-slot]');
    if (slot) { slot.style.padding = '0'; slot.style.maxWidth = 'none'; }

    // Cargar datos
    let products, techniques, designs, initDesign, initProduct;
    try {
      [products, techniques, designs] = await Promise.all([
        window.Fluve.dao.products.getAll(),
        window.Fluve.dao.techniques.getAll(),
        window.Fluve.dao.designs.getAll(),
      ]);
    } catch (err) {
      return window.Fluve.viewState('error', { message: err.message });
    }

    if (!products.length) return window.Fluve.viewState('empty', { title: 'Sin productos', message: 'Recargá el seed.' });

    // Producto inicial por params.slug
    initProduct = products.find(p => p.id === params.slug) || products[0];
    // Diseño inicial por query.design
    if (query.design) {
      const did = parseInt(query.design, 10) || query.design;
      initDesign = designs.find(d => d.id === did) ?? null;
    }

    // Estado del personalizador
    const S = {
      product:   initProduct,
      design:    initDesign,
      color:     initProduct.colors?.[0] ?? { name: 'Negro', hex: '#0A0A0A' },
      size:      initProduct.sizes?.[1] ?? initProduct.sizes?.[0] ?? null,
      side:      'front',
      tech:      techniques.find(t => t.id === initProduct.defaultTechnique) ?? techniques[0],
      qty:       1,
      view:      'front',
    };

    const VIEW_LABELS = { front:'Frente', back:'Espalda', detail:'Detalle', model:'En modelo' };
    const SIDE_LABELS  = { front:'Frente', back:'Espalda', both:'Frente + espalda' };

    // Refs DOM reactivos
    const colorWash      = el('div', { class:'preview-color-wash' });
    const mockupEl       = el('div', { class:'preview-mockup' });
    const techBadge      = el('span', { class:'preview-tech-badge' });
    const colorDot       = el('span', { class:'preview-color-dot' });
    const colorNameEl    = el('span', { class:'preview-glass-badge' });
    const viewBadge      = el('span', { class:'preview-glass-badge' });
    const totalEl        = el('span', { class:'price-panel__total' });
    const unitEl         = el('span', { class:'price-panel__unit' });
    const qtyLabel       = el('span', { class:'qty-num' });
    const tierGrid       = el('div', { class:'tier-grid' });
    const ctaBtn         = el('button', { class:'btn btn--primary', type:'button', style:'flex:1;justify-content:center' });
    const ctaFav         = el('button', { class:'btn btn--ghost', type:'button', style:'padding:14px 18px' }, '♡');
    const sideExtra      = el('span', { class:'mono-label' });
    const techHint       = el('p', { class:'mono-label', style:'margin:9px 0 0;line-height:1.55' });
    const prevThumbsEl   = el('div', { class:'preview-thumbs' });

    function getPrice() {
      return window.Fluve.pricing.precioPersonalizador({
        qty: S.qty, side: S.side,
        techniqueId: S.tech.id,
        productBasePrice: S.product.basePrice,
      }, techniques);
    }

    function updatePrice() {
      const r = getPrice();
      totalEl.textContent = '$' + r.total.toFixed(2).replace('.',',');
      unitEl.textContent  = '$' + r.porUnidad.toFixed(2).replace('.',',') + '/u';
      ctaBtn.textContent  = `Añadir al carrito · $${r.total.toFixed(2).replace('.',',')}`;
      // Tier grid
      const TIERS_REMERA = [{range:'1–9',min:1,max:9},{range:'10–49',min:10,max:49},{range:'50–199',min:50,max:199},{range:'200+',min:200,max:Infinity}];
      const PRICES_REMERA = [24.90,21.50,18.25,16.35];
      tierGrid.replaceChildren();
      if (S.product.id === 'remera') {
        TIERS_REMERA.forEach((tier, i) => {
          const active = S.qty >= tier.min && S.qty <= tier.max;
          tierGrid.append(el('div', { class:`tier-cell${active?' active':''}` },
            el('div', { class:'tier-cell__range' }, tier.range),
            el('div', { class:'tier-cell__price' }, '$' + PRICES_REMERA[i].toFixed(2).replace('.',',')),
          ));
        });
      } else {
        tierGrid.append(el('div', { class:'tier-cell active' },
          el('div', { class:'tier-cell__range' }, 'precio'),
          el('div', { class:'tier-cell__price' }, '$' + S.product.basePrice.toFixed(2).replace('.',',')),
        ));
      }
    }

    function updatePreview() {
      colorWash.style.background = S.color.hex;
      mockupEl.textContent = PE[S.product.id] ?? '📦';
      techBadge.textContent = S.tech.name;
      colorDot.style.background = S.color.hex;
      colorNameEl.textContent = S.color.name + (S.size ? ' · ' + S.size : '');
      viewBadge.textContent = 'Vista: ' + VIEW_LABELS[S.view];
      sideExtra.textContent = SIDE_LABELS[S.side];
      techHint.textContent = S.tech.hint ?? (S.tech.idealFor ?? '');
      qtyLabel.textContent = String(S.qty);
      // Thumbnails de vista
      const views = ['front','back','detail','model'];
      prevThumbsEl.replaceChildren(...views.map(v => {
        const thumb = el('div', { class:`preview-thumb${S.view===v?' active':''}` }, VIEW_LABELS[v].slice(0,3));
        thumb.addEventListener('click', () => { S.view = v; updatePreview(); updatePrice(); });
        return thumb;
      }));
    }

    // Controles de producto
    const productOpts = el('div', { class:'ctrl-opts' });
    products.forEach(p => {
      const btn = el('button', { class:`opt-btn${S.product.id===p.id?' active':''}`, type:'button' }, p.name);
      btn.addEventListener('click', () => {
        S.product = p;
        S.color   = p.colors?.[0] ?? { name:'Negro', hex:'#0A0A0A' };
        S.size    = p.sizes?.[0] ?? null;
        S.tech    = techniques.find(t => t.id === p.defaultTechnique) ?? techniques[0];
        productOpts.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        rebuildColorOpts();
        rebuildTechOpts();
        rebuildSizeOpts();
        updatePreview(); updatePrice();
      });
      productOpts.append(btn);
    });

    // Controles de color
    const colorRow = el('div', { class:'color-swatches' });
    function rebuildColorOpts() {
      colorRow.replaceChildren();
      (S.product.colors ?? []).forEach(c => {
        const sw = el('button', { class:`pers-color-swatch${S.color.hex===c.hex?' active':''}`, type:'button', style:`background:${c.hex}`, title: c.name });
        sw.addEventListener('click', () => {
          S.color = c;
          colorRow.querySelectorAll('.pers-color-swatch').forEach(s => s.classList.remove('active'));
          sw.classList.add('active');
          updatePreview();
        });
        colorRow.append(sw);
      });
    }
    rebuildColorOpts();

    // Talla
    const sizeRow = el('div', { class:'ctrl-opts' });
    function rebuildSizeOpts() {
      sizeRow.replaceChildren();
      if (!S.product.sizes?.length) { sizeRow.append(el('span', { class:'mono-label' }, 'Talla única')); return; }
      S.product.sizes.forEach(s => {
        const btn = el('button', { class:`opt-btn opt-btn--sm${S.size===s?' active':''}`, type:'button' }, s);
        btn.addEventListener('click', () => {
          S.size = s;
          sizeRow.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          updatePreview();
        });
        sizeRow.append(btn);
      });
    }
    rebuildSizeOpts();

    // Lado
    const sideRow = el('div', { class:'ctrl-opts' });
    [['front','Frente'],['back','Espalda'],['both','Ambos (+$4)']].forEach(([val,label]) => {
      const btn = el('button', { class:`opt-btn${S.side===val?' active':''}`, type:'button' }, label);
      btn.addEventListener('click', () => {
        S.side = val;
        sideRow.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updatePreview(); updatePrice();
      });
      sideRow.append(btn);
    });

    // Técnica
    const techRow = el('div', { class:'tech-opts' });
    function rebuildTechOpts() {
      techRow.replaceChildren();
      const compat = techniques.filter(t => S.product.compatibleTechniques?.includes(t.id) ?? true);
      compat.forEach(t => {
        const btn = el('button', { class:`tech-btn${S.tech.id===t.id?' active':''}`, type:'button' }, t.name);
        btn.addEventListener('click', () => {
          S.tech = t;
          techRow.querySelectorAll('.tech-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          updatePreview(); updatePrice();
        });
        techRow.append(btn);
      });
    }
    rebuildTechOpts();

    // Qty
    const decBtn = el('button', { class:'opt-btn opt-btn--sm', type:'button' }, '−');
    const incBtn = el('button', { class:'opt-btn opt-btn--sm', type:'button' }, '+');
    decBtn.addEventListener('click', () => { if (S.qty > 1) { S.qty--; qtyLabel.textContent = String(S.qty); updatePrice(); } });
    incBtn.addEventListener('click', () => { S.qty++; qtyLabel.textContent = String(S.qty); updatePrice(); });

    // Add to cart
    ctaBtn.addEventListener('click', async () => {
      const r = getPrice();
      const line = {
        productId:   S.product.id,
        productName: S.product.name,
        config: {
          color:       S.color.name,
          size:        S.size ?? 'Única',
          side:        S.side,
          techniqueId: S.tech.id,
          designId:    S.design?.id ?? null,
          qty:         S.qty,
        },
        unitPrice:  r.porUnidad,
        lineTotal:  r.total,
      };
      try {
        await window.Fluve.cart.addLine(line);
        window.Fluve.toast(`Añadido al carrito — ${S.product.name} (${S.qty} u.)`, 'success');
      } catch (err) {
        window.Fluve.toast('No se pudo agregar: ' + err.message, 'error');
      }
    });

    ctaFav.addEventListener('click', () => window.Fluve.toast('Guardado en favoritos ♡', 'success'));

    // Render inicial
    updatePreview(); updatePrice();

    // Breadcrumb nav (simplificado en el header de la vista)
    const breadcrumb = el('div', { class:'personalizer-layout', style:'padding-bottom:0;display:block' },
      el('div', { class:'mono-label', style:'padding:16px 0' },
        el('a', { href:'#/galeria', style:'color:var(--mut)' }, 'Galería'),
        S.design ? [' › ', el('a', { href:`#/producto/${S.design.id}`, style:'color:var(--mut)' }, S.design.title)] : null,
        ' › ', el('span', { style:'color:var(--accent2)' }, 'Personalizar'),
      ),
    );

    // Layout
    const layout = el('div', { class:'personalizer-layout' },
      // LEFT: preview
      el('div', { class:'personalizer-preview' },
        el('div', { class:'preview-main' },
          el('div', { class:'preview-bg-grid' }),
          colorWash, mockupEl,
          el('div', { class:'preview-badge-top' }, el('span', { class:'preview-glass-badge' }, '● VISTA EN VIVO'), techBadge),
          el('div', { class:'preview-badge-tr' }, colorDot, colorNameEl),
          el('div', { class:'preview-badge-bl' }, viewBadge),
        ),
        prevThumbsEl,
      ),
      // RIGHT: controls
      el('div', { class:'personalizer-controls' },
        // Title
        el('div', { style:'animation:fadeUp .4s' },
          el('h1', { style:"font:600 30px/1.05 'Space Grotesk';letter-spacing:-1px;margin:0 0 6px" }, S.design?.title ?? 'Diseño personalizado'),
          S.design ? el('div', { style:'display:flex;align-items:center;gap:10px' },
            el('span', { style:"font:500 13px 'Inter';color:var(--mut)" }, 'por ', el('span', { style:'color:var(--accent2)' }, 'artista')),
            el('span', { style:'color:var(--yellow);font-size:12px' }, '★★★★★'),
          ) : null,
        ),
        // Producto
        el('div', {},
          el('div', { class:'ctrl-row' },
            el('span', { class:'mono-label' }, 'Producto'),
            el('span', { class:'mono-label' }, products.length + ' disponibles'),
          ),
          productOpts,
        ),
        // Color
        el('div', {},
          el('div', { class:'ctrl-row' },
            el('span', { class:'mono-label' }, 'Color de la prenda'),
            el('span', { class:'mono-label', style:'color:var(--txt)' }, S.color.name),
          ),
          colorRow,
        ),
        // Talla
        S.product.sizes?.length ? el('div', {},
          el('div', { class:'ctrl-row' },
            el('span', { class:'mono-label' }, 'Talla'),
            el('a', { href:'#', class:'mono-label', style:'color:var(--accent2)' }, 'Guía de tallas ↗'),
          ),
          sizeRow,
        ) : null,
        // Lado
        el('div', {},
          el('div', { class:'ctrl-row' }, el('span', { class:'mono-label' }, 'Lado de impresión'), sideExtra),
          sideRow,
        ),
        // Técnica
        el('div', {},
          el('div', { class:'ctrl-row' },
            el('span', { class:'mono-label' }, 'Técnica'),
            el('a', { href:'#', class:'mono-label', style:'color:var(--accent2)' }, '¿Cuál elijo? ↗'),
          ),
          techRow, techHint,
        ),
        // Upload
        el('div', { class:'upload-zone' },
          el('div', { class:'upload-icon' }, '↑'),
          el('div', { style:'flex:1' },
            el('div', { style:"font:600 13px 'Space Grotesk';color:var(--txt)" }, '¿Tu propio diseño?'),
            el('div', { style:"font:500 11.5px/1.4 'Inter';color:var(--mut)" }, 'PNG/PDF/SVG · min 300 DPI · fondo transparente'),
          ),
          el('button', { class:'opt-btn', type:'button', style:'padding:8px 13px' }, 'Subir'),
        ),
        // Cantidad
        el('div', {},
          el('div', { class:'ctrl-row' },
            el('span', { class:'mono-label' }, 'Cantidad'),
            el('div', { class:'qty-ctrl' }, decBtn, qtyLabel, incBtn),
          ),
          tierGrid,
          el('p', { class:'mono-label' }, 'Precio por unidad según cantidad · tramo activo resaltado'),
        ),
        // Precio + CTA
        el('div', { class:'price-panel' },
          el('div', { class:'price-panel__top' },
            el('div', {},
              el('div', { class:'price-panel__label' }, 'Precio calculado en vivo'),
              el('div', { style:'display:flex;align-items:baseline;gap:8px' }, totalEl, unitEl),
            ),
            el('div', { style:'text-align:right' },
              el('div', { class:'price-panel__delivery-label' }, '⚡ ENTREGA'),
              el('div', { class:'price-panel__delivery-val' }, '24–48h'),
            ),
          ),
          el('div', { class:'price-panel__btns' }, ctaBtn, ctaFav),
        ),
      ),
    );

    // Reviews strip
    const reviews = [
      { stars:'★★★★★', text:'"La calidad del DTF es impecable, colores vivos. Llegó al día siguiente."', name:'Martina L.', tag:'Compra verificada' },
      { stars:'★★★★★', text:'"Pedí 30 para mi marca. El color salió idéntico al mockup."', name:'Estudio Creativo', tag:'Cliente mayorista' },
      { stars:'★★★★☆', text:'"Muy buena impresión. El resto perfecto."', name:'Diego R.', tag:'Compra verificada' },
    ];
    const reviewsStrip = el('section', { style:'border-top:1px solid var(--line);background:var(--ink2);padding:44px 32px' },
      el('div', { style:'max-width:1300px;margin:0 auto' },
        el('div', { style:'display:flex;align-items:baseline;justify-content:space-between;margin-bottom:22px' },
          el('h2', { style:"font:600 26px 'Space Grotesk';letter-spacing:-.5px;margin:0" }, 'Reseñas del producto'),
          el('div', { style:'display:flex;align-items:center;gap:10px' },
            el('span', { style:'color:var(--yellow)' }, '★★★★★'),
            el('span', { class:'mono-label' }, '4.9 / 5 · 128 reseñas'),
          ),
        ),
        el('div', { style:'display:grid;grid-template-columns:repeat(3,1fr);gap:16px' },
          ...reviews.map(r => el('div', { style:'border:1px solid var(--line);border-radius:16px;padding:20px;background:var(--ink3)' },
            el('div', { style:'color:var(--yellow);font-size:13px;margin-bottom:8px' }, r.stars),
            el('p', { style:"font:400 13.5px/1.6 'Inter';color:#C4CBDE;margin:0 0 14px" }, r.text),
            el('div', { style:'display:flex;align-items:center;gap:10px' },
              el('div', { style:'width:30px;height:30px;border-radius:50%;background:var(--ink2);display:flex;align-items:center;justify-content:center;font-size:14px' }, '😊'),
              el('div', {},
                el('div', { style:"font:600 12px 'Space Grotesk'" }, r.name),
                el('div', { class:'mono-label' }, r.tag),
              ),
            ),
          )),
        ),
      ),
    );

    const wrap = el('div', { class:'fu' }, breadcrumb, layout, reviewsStrip);
    return wrap;
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  window.Fluve.views.client.personalizar = personalizar;
})();
