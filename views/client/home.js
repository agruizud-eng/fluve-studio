// views/client/home.js — Home completo (Fase 4 rev). Promo bar ahora en shell.
(function () {
  const { el } = window.Fluve.dom;

  // Gradientes por producto (aspecto visual mejorado sin fotos reales)
  const PRODUCT_GRADIENTS = {
    remera:  'linear-gradient(160deg,#1a3580,#0d1f4f)',
    hoodie:  'linear-gradient(160deg,#2d0f40,#1a0828)',
    taza:    'linear-gradient(160deg,#003344,#001525)',
    tote:    'linear-gradient(160deg,#1a3020,#0d1f12)',
    funda:   'linear-gradient(160deg,#3d0f22,#240810)',
    cuadro:  'linear-gradient(160deg,#2d2000,#1a1200)',
  };
  const PRODUCT_EMOJIS = { remera:'👕', hoodie:'🧥', taza:'☕', tote:'👜', funda:'📱', cuadro:'🖼️' };
  const DESIGN_GRADIENTS = [
    'linear-gradient(160deg,rgba(44,92,255,.25),rgba(43,217,228,.15))',
    'linear-gradient(160deg,rgba(255,61,139,.25),rgba(44,92,255,.15))',
    'linear-gradient(160deg,rgba(255,201,61,.25),rgba(63,203,126,.15))',
    'linear-gradient(160deg,rgba(63,203,126,.25),rgba(43,217,228,.15))',
    'linear-gradient(160deg,rgba(44,92,255,.25),rgba(255,61,139,.15))',
    'linear-gradient(160deg,rgba(43,217,228,.25),rgba(255,201,61,.15))',
  ];
  const DESIGN_EMOJIS = ['🌺','🌙','🏖️','🦕','⚡','🎨'];
  const MARQ_COLORS = ['var(--accent2)','var(--cyan)','var(--magenta)','var(--yellow)'];

  async function home() {
    const slot = document.querySelector('[data-view-slot]');
    if (slot) { slot.style.padding = '0'; slot.style.maxWidth = 'none'; }

    const wrap = el('div', { class:'fu' });
    wrap.append(buildHero());
    wrap.append(buildMarquee());

    const productSlot = el('section', { id:'productos', style:'padding:76px 40px;max-width:1280px;margin:0 auto' });
    wrap.append(productSlot); buildProducts(productSlot);

    wrap.append(buildCustomizerTeaser());

    const gallerySlot = el('div', { id:'galeria', class:'gallery-strip' });
    wrap.append(gallerySlot); buildGalleryStrip(gallerySlot);

    wrap.append(buildHIW());
    wrap.append(buildTrust());
    wrap.append(buildFinalCTA());
    // Footer extendido: ya lo agrega el shell en TODAS las páginas (no duplicar)
    return wrap;
  }

  // ── Hero ─────────────────────────────────────────────────────────────────
  function buildHero() {
    const leftCol = el('div', {},
      el('div', { class:'hero-kicker' }, el('span',{class:'hero-kicker-dot'}), 'Imprenta digital · Uruguay'),
      el('h1', { class:'hero-h1' },
        'Imprimimos tus ', el('br'),
        'ideas. ', el('span',{class:'hero-grad'},'Potenciamos'), el('br'),
        ' tu marca.',
      ),
      el('p', { class:'hero-sub' },
        'Personalizá, pagá y recibí. Impresión de alta calidad sobre remeras, hoodies, tazas, tote bags y más — con un unboxing premium a tu puerta.'),
      el('div', { class:'hero-ctas' },
        el('a', { href:'#/galeria', class:'btn btn--primary' }, 'Explorar galería →'),
        el('a', { href:'#/', class:'btn btn--ghost' }, 'Cómo funciona'),
      ),
      el('div', { class:'hero-stats' },
        stat('24–48','h','Entrega express'), el('div',{class:'hero-divider'}),
        stat('8','+ técnicas','DTF · Subl · Bordado…'), el('div',{class:'hero-divider'}),
        stat('100','%','Control de calidad'),
      ),
    );

    // Visual derecho: gradiente + emoji + chips flotantes
    const visual = el('div', { class:'hero-visual' },
      el('div', { class:'hero-visual-inner',
        style:'background:linear-gradient(160deg,var(--ink4),var(--ink2))' },
        el('div',{class:'hero-bg-grid'}),
        el('div',{style:'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:140px;user-select:none'},'👕'),
        // Gradiente inferior para blend
        el('div',{style:'position:absolute;inset:0;background:linear-gradient(180deg,transparent 50%,rgba(8,11,20,.7))'}),
        // Badge "VISTA EN VIVO" (como en customizer teaser hi-fi)
        el('div',{style:'position:absolute;top:16px;left:16px;font:700 10px var(--font-mono);letter-spacing:1px;color:var(--txt);background:rgba(8,11,20,.7);backdrop-filter:blur(8px);border:1px solid var(--line2);border-radius:20px;padding:6px 11px'},'● STUDIO PREVIEW'),
      ),
      // Floating chips
      el('div',{class:'floating-chip floating-chip--left'},
        el('div',{class:'floating-chip__icon'},'⚡'),
        el('div',{},
          el('div',{class:'floating-chip__title'},'Producción hoy'),
          el('div',{class:'floating-chip__sub'},'Listo en 24–48h'),
        ),
      ),
      el('div',{class:'floating-chip floating-chip--right'},
        el('div',{class:'cmyk-dots'},
          el('span',{class:'cmyk-dot',style:'background:var(--cyan)'}),
          el('span',{class:'cmyk-dot',style:'background:var(--magenta)'}),
          el('span',{class:'cmyk-dot',style:'background:var(--yellow)'}),
        ),
        el('div',{},
          el('div',{class:'floating-chip__title'},'Color exacto'),
          el('div',{class:'floating-chip__sub'},'Perfil CMYK calibrado'),
        ),
      ),
      el('div',{class:'register-mark'},
        el('span',{class:'register-mark__h'}),
        el('span',{class:'register-mark__v'}),
        el('span',{class:'register-mark__dot'}),
      ),
    );

    return el('header', { class:'hero' },
      // Orbs de fondo
      el('div',{style:'position:absolute;inset:0;overflow:hidden;pointer-events:none'},
        el('div',{style:'position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse 80% 60% at 50% 30%,#000 40%,transparent 100%)'}),
        el('div',{style:'position:absolute;width:520px;height:520px;left:-80px;top:-120px;background:radial-gradient(circle,var(--accent) 0%,transparent 68%);opacity:.5;filter:blur(20px);animation:orb 14s ease-in-out infinite'}),
        el('div',{style:'position:absolute;width:440px;height:440px;right:-60px;top:40px;background:radial-gradient(circle,var(--magenta) 0%,transparent 66%);opacity:.28;filter:blur(24px);animation:orb 18s ease-in-out infinite reverse'}),
      ),
      el('div',{class:'hero-grid'}, leftCol, visual),
    );
  }

  function stat(val, unit, label) {
    return el('div',{},
      el('div',{class:'hero-stat-val'}, val, el('span',{style:'font-size:15px;color:var(--mut)'},unit)),
      el('div',{class:'hero-stat-sub'}, label),
    );
  }

  // ── Marquee ───────────────────────────────────────────────────────────────
  function buildMarquee() {
    const items = ['DTF','Sublimación','Serigrafía','Bordado','DTF UV','Vinilo textil','Gran formato','Impresión directa'];
    function row(aria) {
      const inner = el('div',{class:'marquee-inner','aria-hidden':aria});
      items.forEach((t,i) => {
        inner.append(el('span',{},t), el('span',{style:'color:'+MARQ_COLORS[i%4]},'◆'));
      });
      return inner;
    }
    return el('div',{class:'marquee-strip'},
      el('div',{class:'marquee-track'}, row(null), row('true')),
    );
  }

  // ── Bento de productos ────────────────────────────────────────────────────
  async function buildProducts(slot) {
    try {
      const products = await window.Fluve.dao.products.getAll();
      const head = el('div',{class:'products-section__head'},
        el('h2',{style:"font:600 40px/1.05 'Space Grotesk';letter-spacing:-1px;margin:0"},'Elegí tu producto'),
        el('a',{href:'#/galeria',style:"font:600 14px 'Space Grotesk';color:var(--mut);text-decoration:none"},'Ver todo el catálogo →'),
      );
      const bento = el('div',{class:'products-bento'});

      if (products.length) {
        const p0 = products[0];
        const grad0 = PRODUCT_GRADIENTS[p0.id] || 'linear-gradient(160deg,var(--ink3),var(--ink2))';
        // Card grande
        bento.append(el('a',{href:`#/personalizar/${p0.id}`,class:'product-tile product-tile--big'},
          el('div',{style:`position:absolute;inset:0;background:${grad0}`}),
          el('div',{style:'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:120px;padding-bottom:60px'},(PRODUCT_EMOJIS[p0.id]||'📦')),
          el('div',{class:'product-tile__overlay'}),
          el('div',{class:'product-tile__info'},
            el('div',{class:'product-tile__tag'},'Más pedido'),
            el('div',{class:'product-tile__name'},p0.name),
            el('div',{class:'product-tile__sub'},(p0.compatibleTechniques?.slice(0,3).join(' · ')||'')+' · desde $'+p0.basePrice.toFixed(2).replace('.',',')),
          ),
        ));

        products.slice(1,5).forEach(p => {
          const grad = PRODUCT_GRADIENTS[p.id] || 'linear-gradient(160deg,var(--ink3),var(--ink2))';
          bento.append(el('a',{href:`#/personalizar/${p.id}`,class:'product-tile product-tile--sm'},
            el('div',{style:`position:absolute;inset:0;background:${grad}`}),
            el('div',{style:'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:64px'},(PRODUCT_EMOJIS[p.id]||'📦')),
            el('div',{class:'product-tile__overlay'}),
            el('div',{class:'product-tile__info'},
              el('div',{class:'product-tile__name',style:'font-size:18px'},p.name),
              el('div',{class:'product-tile__sub'},'desde $'+p.basePrice.toFixed(2).replace('.',',')),
            ),
          ));
        });

        // "+ Ver más" tile
        const extra = Math.max(0, products.length - 5);
        bento.append(el('a',{href:'#/galeria',class:'product-tile product-tile--sm product-tile--more'},
          el('span',{class:'product-tile__more-icon'},'+'),
          el('div',{style:"font:600 14px 'Space Grotesk';color:var(--txt)"},extra > 0 ? 'Ver '+extra+' más' : 'Ver galería'),
          el('div',{style:"font:500 11.5px 'Inter';color:var(--mut)"},'Cuadro · Gorra · Botella…'),
        ));
      }
      slot.replaceChildren(head, bento);
    } catch { slot.replaceChildren(); }
  }

  // ── Customizer teaser ─────────────────────────────────────────────────────
  function buildCustomizerTeaser() {
    const sw = (hex, a) => el('span',{class:`config-swatch${a?' active':''}`,style:`background:${hex}`});
    return el('section',{class:'customizer-teaser'},
      el('div',{class:'customizer-teaser__card'},
        el('div',{style:'position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:44px 44px;opacity:.4;mask-image:radial-gradient(circle at 70% 40%,#000,transparent 75%);pointer-events:none'}),
        el('div',{style:'position:absolute;width:360px;height:360px;right:8%;top:-40px;background:radial-gradient(circle,var(--accent) 0%,transparent 70%);opacity:.35;filter:blur(10px);pointer-events:none'}),
        el('div',{class:'customizer-teaser__inner'},
          el('div',{},
            el('h2',{style:"font:600 38px/1.06 'Space Grotesk';letter-spacing:-1px;margin:0 0 16px"},'Vela antes de',el('br'),'que exista.'),
            el('p',{style:"font:400 15.5px/1.6 'Inter';color:var(--mut);max-width:420px;margin:0 0 26px"},'Elegí prenda, color, talla y técnica — o subí tu propio diseño. El mockup se renderiza al instante para que decidas con confianza.'),
            el('div',{class:'customizer-teaser__config'},
              el('div',{class:'config-row'},el('span',{class:'config-label'},'COLOR'),el('div',{class:'config-swatches'},sw('#0A0E17',true),sw('#fff'),sw('#C9C2B4'),sw('#3B6FB0'),sw('#7A3B3B'))),
              el('div',{class:'config-row'},el('span',{class:'config-label'},'TALLA'),el('div',{class:'config-sizes'},...[['S',false],['M',true],['L',false],['XL',false]].map(([t,a])=>el('span',{class:`config-size${a?' active':''}`},t)))),
              el('div',{class:'config-row'},el('span',{class:'config-label'},'TÉCNICA'),el('div',{class:'config-techs'},...[['DTF',true],['Serigrafía',false],['Bordado',false]].map(([t,a])=>el('span',{class:`config-tech${a?' active':''}`},t)))),
            ),
            el('a',{href:'#/personalizar/remera',class:'btn btn--primary',style:'margin-top:28px'},'Abrir personalizador →'),
          ),
          el('div',{class:'customizer-teaser__visual',style:'background:linear-gradient(160deg,var(--ink4),var(--ink2))'},
            '👕',
            el('div',{class:'customizer-teaser__live-badge'},'● VISTA EN VIVO'),
            el('div',{class:'customizer-teaser__price-badge'},
              el('div',{style:"font:500 10px 'Inter';color:var(--mut)"},'Precio en vivo'),
              el('div',{style:"font:600 20px 'Space Grotesk';color:var(--txt)"},'$24,90'),
            ),
          ),
        ),
      ),
    );
  }

  // ── Gallery strip ─────────────────────────────────────────────────────────
  async function buildGalleryStrip(slot) {
    try {
      const [designs, artists] = await Promise.all([
        window.Fluve.dao.designs.getAll(),
        window.Fluve.dao.artists.getAll(),
      ]);
      const approved = designs.filter(d => d.status === 'approved').slice(0,4);
      const artMap = Object.fromEntries(artists.map(a => [a.id,a]));
      const tags = ['Todos','Ilustración','Tipografía','Abstracto','Streetwear'];

      const grid = el('div',{class:'gallery-strip__grid'});
      approved.forEach((d,i) => {
        const art = artMap[d.artistId];
        const grad = DESIGN_GRADIENTS[i % DESIGN_GRADIENTS.length];
        grid.append(el('a',{href:`#/producto/${d.id}`,class:'design-card-home'},
          el('div',{class:'design-card-home__img',style:`background:${grad}`}, DESIGN_EMOJIS[i%DESIGN_EMOJIS.length]),
          el('div',{class:'design-card-home__foot'},
            el('div',{},
              el('div',{style:"font:600 14px 'Space Grotesk';color:var(--txt)"},d.title),
              el('div',{style:"font:500 11.5px 'Inter';color:var(--mut)"},art?.handle??''),
            ),
            el('span',{style:"font:700 10px 'Space Mono';color:var(--cyan)"},'5 prod.'),
          ),
        ));
      });

      slot.replaceChildren(
        el('div',{class:'gallery-strip__head'},
          el('h2',{style:"font:600 40px/1.05 'Space Grotesk';letter-spacing:-1px;margin:0"},'Diseños destacados'),
          el('a',{href:'#/galeria',style:"font:600 14px 'Space Grotesk';color:var(--mut);text-decoration:none"},'Explorar '+designs.length+' diseños →'),
        ),
        el('div',{class:'gallery-strip__filters'},
          ...tags.map((t,i) => el('span',{class:`filter-pill${i===0?' active':''}`},t)),
        ),
        grid,
      );
    } catch { slot.replaceChildren(); }
  }

  // ── How it works ──────────────────────────────────────────────────────────
  function buildHIW() {
    const steps = [
      {num:'01',color:'var(--accent2)',title:'Elegí o subí tu diseño',text:'De la galería o con tu propio archivo. Te avisamos si necesita ajustes de calidad.'},
      {num:'02',color:'var(--cyan)',title:'Personalizá',text:'Producto, color, talla y técnica. El precio se calcula en vivo, con descuentos por cantidad.'},
      {num:'03',color:'var(--magenta)',title:'Producimos + QC',text:'Imprenta aliada + control de calidad estricto y acabados finales bajo nuestra marca.'},
      {num:'04',color:'var(--yellow)',title:'Recibís en 24–48h',text:'Con packaging premium y ese efecto unboxing que enamora.',accent:true},
    ];
    return el('section',{id:'como',class:'hiw-section'},
      el('div',{class:'hiw-section__head'},
        el('h2',{style:"font:600 40px/1.05 'Space Grotesk';letter-spacing:-1px;margin:0"},'Del clic a tu puerta en 4 pasos'),
      ),
      el('div',{class:'hiw-grid'},
        ...steps.map(s => el('div',{class:`step-card${s.accent?' step-card--accent':''}`},
          el('div',{class:'step-card__num',style:`color:${s.color}`},s.num),
          el('div',{class:'step-card__title'},s.title),
          el('div',{class:'step-card__text'},s.text),
        )),
      ),
    );
  }

  // ── Trust ─────────────────────────────────────────────────────────────────
  function buildTrust() {
    return el('section',{id:'empresas',class:'trust-section'},
      el('div',{class:'trust-grid'},
        el('div',{class:'trust-big',style:'background:linear-gradient(160deg,var(--ink3),var(--ink2))'},
          el('div',{style:'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:96px;opacity:.15'},'📦'),
          el('div',{class:'trust-big__overlay'}),
          el('div',{class:'trust-big__content'},
            el('div',{style:"font:700 11px 'Space Mono';letter-spacing:1.5px;text-transform:uppercase;color:var(--yellow);margin-bottom:12px"},'Experiencia de marca'),
            el('h3',{style:"font:600 30px/1.1 'Space Grotesk';letter-spacing:-.5px;margin:0 0 12px;color:#fff"},'El efecto unboxing Fluvë'),
            el('p',{style:"font:400 14.5px/1.6 'Inter';color:#C4CBDE;margin:0"},'Cada pedido pasa por control de calidad y se empaqueta con acabados de marca.'),
          ),
        ),
        el('div',{class:'trust-right'},
          el('div',{class:'trust-stat-card'},
            el('div',{class:'trust-stat-num'},'+1.200'),
            el('div',{class:'trust-stat-label'},'pedidos entregados en 24–48h'),
            el('div',{style:'height:1px;background:var(--line);margin:20px 0'}),
            el('div',{style:'color:var(--yellow);font-size:12px;margin-bottom:6px'},'★★★★★'),
            el('p',{class:'trust-review'},'"Calidad impecable y llegó al día siguiente. El packaging es otro nivel."'),
            el('div',{class:'trust-reviewer'},
              el('div',{style:'width:32px;height:32px;border-radius:50%;background:var(--accent);opacity:.3;display:flex;align-items:center;justify-content:center;font-size:14px'},'😊'),
              el('div',{},
                el('div',{style:"font:600 12.5px 'Space Grotesk';color:var(--txt)"},'Estudio Creativo'),
                el('div',{style:"font:500 11px 'Inter';color:var(--mut)"},'Cliente mayorista'),
              ),
            ),
          ),
          el('div',{class:'trust-color-card'},
            el('div',{class:'trust-cmyk-dots'},
              ...['var(--cyan)','var(--magenta)','var(--yellow)','var(--txt)'].map(c => el('span',{class:'trust-cmyk-dot',style:`background:${c}`})),
            ),
            el('div',{},
              el('div',{style:"font:600 14px 'Space Grotesk';color:var(--txt)"},'Color garantizado'),
              el('div',{style:"font:500 11.5px 'Inter';color:var(--mut)"},'Perfiles CMYK calibrados por técnica'),
            ),
          ),
        ),
      ),
    );
  }

  // ── Final CTA ─────────────────────────────────────────────────────────────
  function buildFinalCTA() {
    return el('section',{class:'final-cta'},
      el('div',{class:'final-cta__card'},
        el('div',{style:'position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:46px 46px;mask-image:radial-gradient(circle at 50% 50%,#000,transparent 70%)'}),
        el('div',{style:'position:relative'},
          el('h2',{class:'final-cta__title'},'¿Listo para imprimir tu idea?'),
          el('p',{class:'final-cta__sub'},'Empezá ahora y recibí tu producto premium en 24 a 48 horas.'),
          el('div',{class:'final-cta__btns'},
            el('a',{href:'#/personalizar/remera',style:"font:600 15px 'Space Grotesk';color:var(--ink);background:#fff;padding:14px 26px;border-radius:30px;text-decoration:none"},'Personalizar producto'),
            el('a',{href:'#/galeria',style:"font:600 15px 'Space Grotesk';color:#fff;border:1px solid rgba(255,255,255,.35);padding:14px 24px;border-radius:30px;text-decoration:none"},'Explorar galería'),
          ),
        ),
      ),
    );
  }

  // ── Footer extendido (solo en home) ───────────────────────────────────────
  function buildExtFooter() {
    const col = (label, links) => el('div',{},
      el('div',{class:'footer-ext-col-label'},label),
      el('div',{class:'footer-ext-links'},...links.map(l => el('span',{},l))),
    );
    return el('footer',{class:'site-footer-ext'},
      el('div',{class:'footer-ext-grid'},
        el('div',{},
          el('a',{href:'#/',class:'nav-logo',style:'margin-bottom:16px;display:inline-flex'},
            el('span',{class:'nav-logo__mark',style:'width:22px;height:22px'},
              el('span',{class:'nav-logo__c',style:'width:12px;height:12px;background:var(--cyan);left:0;top:4px'}),
              el('span',{class:'nav-logo__c',style:'width:12px;height:12px;background:var(--magenta);right:0;top:4px'}),
              el('span',{class:'nav-logo__c',style:'width:12px;height:12px;background:var(--yellow);left:4px;top:0'}),
            ),
            el('span',{style:"font:600 18px 'Space Grotesk'"}, 'Fluvë', el('span',{style:'color:var(--mut);font-weight:400'},' studio')),
          ),
          el('p',{class:'footer-ext-brand-desc'},'Impresión personalizada de alta gama en Uruguay. Tu visión, con acabado premium y entrega express.'),
          el('div',{class:'footer-ext-socials'},
            ...['in','ig','wa'].map(l => el('span',{class:'footer-ext-social'},l)),
          ),
        ),
        col('Productos',['Remeras','Hoodies','Tazas','Tote bags','Fundas']),
        col('Empresas',['Merch de marca','Pedidos mayoristas','Vende tu arte','Cotización B2B']),
        col('Ayuda',['Cómo funciona','Envíos','Preguntas frecuentes','Contacto']),
      ),
      el('div',{class:'footer-ext-bottom'},
        el('span',{},`© ${new Date().getFullYear()} Fluvë Studio. Hecho en Uruguay.`),
        el('div',{class:'footer-ext-legal'},...['Términos','Privacidad','Cookies'].map(t => el('span',{},t))),
      ),
    );
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  window.Fluve.views.client.home = home;
})();
