// views/client/producto.js — Ficha de diseño con producto reactivo.
(function () {
  const { el } = window.Fluve.dom;
  const DE = ['🌺','🌙','🏖️','🦕','⚡','🎨','🌊','🌵','✍️','💙','🔤','🎭'];
  const PE = { remera:'👕', hoodie:'🧥', taza:'☕', tote:'👜', funda:'📱', cuadro:'🖼️' };

  async function producto({ params }) {
    const slot = document.querySelector('[data-view-slot]');
    if (slot) { slot.style.padding='0'; slot.style.maxWidth='none'; }

    const id = parseInt(params.slug,10) || params.slug;
    let design, artist, products, allDesigns;
    try {
      [design,products,allDesigns] = await Promise.all([
        window.Fluve.dao.designs.get(id),
        window.Fluve.dao.products.getAll(),
        window.Fluve.dao.designs.getAll(),
      ]);
      if (design) artist = await window.Fluve.dao.artists.get(design.artistId);
    } catch {}

    if (!design) return window.Fluve.viewState('not-found',{message:'No encontramos ese diseño.'});

    const wrap = el('div',{class:'fu'});
    const emojiIdx = (typeof id==='number' ? id-1 : 0) % DE.length;

    // Breadcrumb
    wrap.append(el('div',{style:'max-width:1300px;margin:0 auto;padding:16px 32px 0'},
      el('div',{class:'mono-label'},
        el('a',{href:'#/galeria',style:'color:var(--mut)'},'Galería'),' › ',
        el('span',{style:'color:var(--txt)'},design.title),
      ),
    ));

    // Grid principal
    const mainGrid = el('div',{style:'max-width:1300px;margin:0 auto;padding:16px 32px 60px;display:grid;grid-template-columns:1.15fr .85fr;gap:34px;align-items:start'});
    wrap.append(mainGrid);

    // Estado reactivo del producto seleccionado
    let selectedProduct = products[0];

    // Elementos reactivos
    const previewProductLabel = el('span',{style:'position:absolute;top:10px;left:10px;font:700 9px "Space Mono";letter-spacing:.5px;text-transform:uppercase;background:rgba(8,11,20,.72);backdrop-filter:blur(8px);border:1px solid var(--line2);border-radius:14px;padding:4px 8px'},selectedProduct?.name??'');
    const priceDisplay = el('div',{style:"font:600 30px 'Space Grotesk';letter-spacing:-1px"},'$'+(selectedProduct?.basePrice?.toFixed(2).replace('.',',')??' '));
    const priceLabel  = el('div',{class:'mono-label'},'Desde · '+(selectedProduct?.name??''));
    const ctaBtn      = el('a',{href:`#/personalizar/${selectedProduct?.id??'remera'}?design=${design.id}`,class:'btn btn--primary',style:'justify-content:center'},'Personalizar este producto →');

    function selectProduct(p) {
      selectedProduct = p;
      priceDisplay.textContent = '$'+p.basePrice.toFixed(2).replace('.',',');
      priceLabel.textContent   = 'Desde · '+p.name;
      previewProductLabel.textContent = p.name;
      ctaBtn.href = `#/personalizar/${p.id}?design=${design.id}`;
      // Actualizar thumbs active
      productThumbs.querySelectorAll('.preview-thumb').forEach(t=>{
        t.classList.toggle('active', t.dataset.pid===p.id);
      });
    }

    // Preview izquierdo
    const preview = el('div',{style:'position:sticky;top:96px'},
      el('div',{style:'position:relative;border-radius:22px;overflow:hidden;border:1px solid var(--line2);background:radial-gradient(circle at 50% 35%,var(--ink4),var(--ink) 75%);aspect-ratio:1'},
        el('div',{style:'position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:38px 38px;opacity:.4;pointer-events:none'}),
        el('div',{style:'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:160px'},DE[emojiIdx]),
        previewProductLabel,
      ),
    );
    mainGrid.append(preview);

    // Thumbnails de producto
    const productThumbs = el('div',{style:'display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-top:12px'});
    products.slice(0,5).forEach((p,i)=>{
      const thumb = el('div',{class:`preview-thumb${i===0?' active':''}`,title:p.name,'data-pid':p.id,onclick:()=>selectProduct(p)},
        el('div',{style:'font-size:28px'},(PE[p.id]??'📦')),
        el('div',{class:'mono-label',style:'margin-top:5px;font-size:9px;text-align:center'},(p.name.split(' ')[0])),
      );
      productThumbs.append(thumb);
    });

    // Info derecha
    const info = el('div',{style:'display:flex;flex-direction:column;gap:20px'},
      el('div',{},
        el('h1',{style:"font:600 34px/1.03 'Space Grotesk';letter-spacing:-1px;margin:0 0 8px"},design.title),
        el('div',{style:'display:flex;align-items:center;gap:12px'},
          el('span',{style:"font:500 13px 'Inter';color:var(--mut)"},'por ',el('span',{style:'color:var(--accent2)'},artist?.handle??'')),
          el('span',{style:'color:var(--yellow);font-size:12px'},'★★★★★'),
          el('span',{class:'mono-label'},'4.9'),
        ),
        design.tags?.length ? el('div',{style:'display:flex;gap:6px;flex-wrap:wrap;margin-top:10px'},
          ...design.tags.map(t=>el('span',{class:'chip'},t)),
        ) : null,
      ),
      el('div',{},
        el('div',{class:'mono-label',style:'margin-bottom:12px'},'Disponible en'),
        productThumbs,
      ),
      el('div',{style:'border-top:1px solid var(--line);padding-top:18px;display:flex;align-items:flex-end;justify-content:space-between'},
        el('div',{},priceLabel,priceDisplay),
        el('div',{style:'text-align:right'},el('div',{class:'mono-label',style:'color:var(--cyan)'},'⚡ 24–48h')),
      ),
      ctaBtn,
      artist ? el('div',{style:'border:1px solid var(--line);border-radius:14px;padding:16px;background:var(--ink2)'},
        el('div',{style:'display:flex;align-items:center;gap:10px;margin-bottom:8px'},
          el('div',{style:'width:34px;height:34px;border-radius:50%;background:var(--ink3);border:1px solid var(--line2);display:flex;align-items:center;justify-content:center;font-size:18px'},'👤'),
          el('div',{},
            el('div',{style:"font:600 13px 'Space Grotesk'"},artist.handle),
            el('div',{class:'mono-label'},'Nivel '+artist.tier+' · regalía '+(artist.royaltyRate*100)+'%'),
          ),
          el('a',{href:'#/galeria',class:'chip',style:'margin-left:auto;text-decoration:none'},'Ver galería'),
        ),
        el('p',{style:"font:400 12px/1.5 'Inter';color:var(--mut);margin:0"},'Artista independiente. Cada compra le genera regalías automáticamente.'),
      ) : null,
    );
    mainGrid.append(info);

    // Diseños relacionados (mismo artista)
    const related = allDesigns.filter(d=>d.id!==design.id&&d.status==='approved'&&d.artistId===design.artistId).slice(0,5);
    if (related.length) {
      const relSection=el('div',{style:'max-width:1300px;margin:0 auto;padding:0 32px 60px'},
        el('h3',{style:"font:600 20px 'Space Grotesk';margin:0 0 16px"},'Más diseños de '+artist?.handle),
        el('div',{style:'display:grid;grid-template-columns:repeat(5,1fr);gap:14px'},
          ...related.map((d,i)=>el('a',{href:`#/producto/${d.id}`,class:'design-card-g'},
            el('div',{class:'design-card-g__img',style:`background:linear-gradient(160deg,rgba(44,92,255,.2),rgba(43,217,228,.1));font-size:44px`},'🎨'),
            el('div',{class:'design-card-g__foot'},el('div',{},el('div',{style:"font:600 12px 'Space Grotesk'"},d.title))),
          )),
        ),
      );
      wrap.append(relSection);
    }

    return wrap;
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  window.Fluve.views.client.producto = producto;
})();
