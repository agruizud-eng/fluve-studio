// views/client/galeria.js — Galeria con filtros reactivos reales.
(function () {
  const { el } = window.Fluve.dom;
  const GRADS = [
    'linear-gradient(160deg,rgba(44,92,255,.3),rgba(43,217,228,.15))',
    'linear-gradient(160deg,rgba(255,61,139,.3),rgba(44,92,255,.15))',
    'linear-gradient(160deg,rgba(255,201,61,.3),rgba(63,203,126,.15))',
    'linear-gradient(160deg,rgba(63,203,126,.3),rgba(43,217,228,.15))',
    'linear-gradient(160deg,rgba(44,92,255,.3),rgba(255,61,139,.15))',
    'linear-gradient(160deg,rgba(43,217,228,.3),rgba(255,201,61,.15))',
  ];
  const DE = ['🌺','🌙','🏖️','🦕','⚡','🎨','🌊','🌵','✍️','💙','🔤','🎭'];
  const STYLE_MAP = {
    'Todos':       null,
    'Ilustración': ['illustration','ilustración','naturaleza','forest'],
    'Tipografía':  ['tipografia','lettering','tipo','texto','script','minimal','bold'],
    'Abstracto':   ['abstracto','fluido','geo'],
    'Streetwear':  ['urbano','streetwear','neon','japones'],
    'Retro':       ['retro'],
    'Naturaleza':  ['naturaleza','forest','tropical','botanico','suave','desierto'],
  };
  const STYLE_KEYS = Object.keys(STYLE_MAP);

  async function galeria({ query: urlQ }) {
    const slot = document.querySelector('[data-view-slot]');
    if (slot) { slot.style.padding='0'; slot.style.maxWidth='none'; }
    const wrap = el('div',{class:'fu gallery-view'});

    wrap.append(
      el('div',{class:'gallery-view__head'},
        el('h1',{style:"font:600 38px/1.02 'Space Grotesk';letter-spacing:-1.2px;margin:0"},'Galería de diseños'),
      ),
      el('p',{class:'gallery-view__sub'},'Explorá por estilo, artista o producto. Los filtros se aplican en tiempo real.'),
    );

    // Estado reactivo compartido
    const S = { query: urlQ.q||'', styleKey:'Todos', artistId:null, productId:null, sortBy:'popular' };
    const mainCol  = el('div',{});
    const layout   = el('div',{class:'gallery-layout'});
    wrap.append(layout);
    const sidebarEl = el('div',{class:'gallery-sidebar'});
    layout.append(sidebarEl, mainCol);
    mainCol.append(window.Fluve.viewState('loading',{rows:3}));

    let allDesigns=[], artMap={}, products=[];
    try {
      const [des,arts,prods] = await Promise.all([
        window.Fluve.dao.designs.getAll(),
        window.Fluve.dao.artists.getAll(),
        window.Fluve.dao.products.getAll(),
      ]);
      allDesigns = des.filter(d=>d.status==='approved');
      artMap = Object.fromEntries(arts.map(a=>[a.id,a]));
      products = prods;
    } catch(err) {
      mainCol.replaceChildren(window.Fluve.viewState('error',{message:'Error al cargar: '+err.message}));
      return wrap;
    }

    function filtered() {
      return allDesigns.filter(d => {
        if (S.query) {
          const q=S.query.toLowerCase(), art=artMap[d.artistId];
          if (!d.title.toLowerCase().includes(q) && !d.tags?.some(t=>t.includes(q)) && !art?.handle?.toLowerCase().includes(q) && !art?.name?.toLowerCase().includes(q)) return false;
        }
        const tl = STYLE_MAP[S.styleKey];
        if (tl && !d.tags?.some(dt=>tl.some(st=>dt.toLowerCase().includes(st)))) return false;
        if (S.artistId && d.artistId !== S.artistId) return false;
        return true;
      });
    }

    function render() {
      const filt = S.sortBy==='newest' ? [...filtered()].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')) : filtered();
      mainCol.replaceChildren(
        buildPills(S,render),
        buildMeta(filt,S,render),
        filt.length ? buildGrid(filt,artMap,products) : buildEmpty(S,render),
        filt.length>6 ? buildPag() : null,
      );
      updateSidebar(sidebarEl,S);
    }

    buildSidebar(sidebarEl,S,artMap,products,render);
    render();
    return wrap;
  }

  function buildPills(S,render) {
    const row = el('div',{style:'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px'});
    STYLE_KEYS.forEach(key=>{
      const pill = el('span',{class:`filter-pill${S.styleKey===key?' active':''}`,style:'cursor:pointer',
        onclick:()=>{ S.styleKey=key; render(); }
      },key);
      row.append(pill);
    });
    return row;
  }

  function buildMeta(filt,S,render) {
    const sortSel = el('select',{class:'chip',style:'cursor:pointer;padding:6px 12px',
      onchange:(e)=>{ S.sortBy=e.target.value; render(); }
    },
      el('option',{value:'popular',selected:S.sortBy==='popular'||null},'Populares'),
      el('option',{value:'newest',selected:S.sortBy==='newest'||null},'Más nuevos'),
    );
    return el('div',{class:'gallery-main__meta'},
      el('span',{class:'mono-label'},`${filt.length} diseño${filt.length!==1?'s':''}${S.query?' · "'+S.query+'"':''}`),
      sortSel,
    );
  }

  function buildGrid(designs,artMap,products) {
    const basePrice = products[0]?.basePrice??24.90;
    const grid = el('div',{class:'gallery-grid'});
    designs.slice(0,6).forEach((d,i)=>{
      const art=artMap[d.artistId], grad=GRADS[i%GRADS.length];
      const card = el('a',{href:`#/producto/${d.id}`,class:'design-card-g'},
        i===0?el('span',{class:'design-card-g__badge',style:'color:var(--cyan)'},'★ Top ventas'):null,
        el('div',{class:'design-card-g__img',style:`background:${grad};font-size:60px`},DE[i%DE.length]),
        el('div',{class:'design-card-g__overlay'},el('span',{style:"font:500 10px 'Space Mono';color:var(--txt)"},'Personalizar →')),
        el('div',{class:'design-card-g__foot'},
          el('div',{},
            el('div',{style:"font:600 14px 'Space Grotesk'"},d.title),
            el('div',{class:'mono-label'},art?.handle??''),
          ),
          el('span',{class:'mono-label',style:'color:var(--txt)'},'$'+basePrice.toFixed(2).replace('.',',')),
        ),
      );
      grid.append(card);
    });
    return grid;
  }

  function buildEmpty(S,render) {
    return window.Fluve.viewState('empty',{
      title:'No encontramos diseños',
      message: S.query?`Sin resultados para "${S.query}"`:S.artistId?'Sin diseños de este artista':S.styleKey!=='Todos'?`Sin diseños en "${S.styleKey}"`:'La galería está vacía.',
      action: el('button',{class:'btn btn--ghost',type:'button',style:'margin-top:6px',
        onclick:()=>{ S.query=''; S.styleKey='Todos'; S.artistId=null; S.productId=null; render(); }
      },'Limpiar filtros'),
    });
  }

  function buildPag() {
    return el('div',{class:'gallery-pagination'},
      ...['‹','1','2','3','›'].map((t,i)=>el('span',{class:`page-btn${i===1?' active':''}`},t)),
    );
  }

  function buildSidebar(sidebar,S,artMap,products,render) {
    const COLORS=['#0A0E17','#FFFFFF','#FF3D8B','#2BD9E4','#FFC93D','#3FCB7E'];
    sidebar.replaceChildren();

    // Para (decorativo)
    const paraG=el('div',{},el('div',{class:'facet-group__label'},'Para'),
      el('div',{style:'display:flex;flex-direction:column;gap:4px'},
        ...['Hombre','Mujer','Niños','Hogar','Accesorios'].map(p=>el('div',{class:'facet-item',onclick:(e)=>e.currentTarget.classList.toggle('active')},el('span',{class:'facet-checkbox'},''),el('span',{},p))),
      ),
    );
    sidebar.append(paraG,el('div',{class:'gallery-sidebar__divider'}));

    // Estilo (funcional)
    const esG=el('div',{},el('div',{class:'facet-group__label'},'Estilo'));
    STYLE_KEYS.forEach(key=>{
      const row=el('div',{class:`facet-item${S.styleKey===key?' active':''}`,
        onclick:()=>{
          S.styleKey=key;
          esG.querySelectorAll('.facet-item').forEach(r=>{r.classList.remove('active');const cb=r.querySelector('.facet-checkbox');if(cb)cb.textContent='';});
          row.classList.add('active');const cb=row.querySelector('.facet-checkbox');if(cb)cb.textContent='✓';
          render();
        }
      },el('span',{class:'facet-checkbox'},S.styleKey===key?'✓':''),el('span',{},key));
      esG.append(row);
    });
    sidebar.append(esG,el('div',{class:'gallery-sidebar__divider'}));

    // Artistas (funcional)
    const artists=Object.values(artMap);
    if(artists.length){
      const artG=el('div',{},el('div',{class:'facet-group__label'},'Artista'));
      artists.forEach(art=>{
        const on=S.artistId===art.id;
        const row=el('div',{class:`facet-item${on?' active':''}`,
          onclick:()=>{
            if(S.artistId!==art.id){
              S.artistId=art.id;
              artG.querySelectorAll('.facet-item').forEach(r=>{r.classList.remove('active');const cb=r.querySelector('.facet-checkbox');if(cb)cb.textContent='';});
              row.classList.add('active');const cb=row.querySelector('.facet-checkbox');if(cb)cb.textContent='✓';
            }else{S.artistId=null;row.classList.remove('active');const cb=row.querySelector('.facet-checkbox');if(cb)cb.textContent='';}
            render();
          }
        },el('span',{class:'facet-checkbox'},on?'✓':''),el('span',{},art.handle));
        artG.append(row);
      });
      sidebar.append(artG,el('div',{class:'gallery-sidebar__divider'}));
    }

    // Producto (funcional - filtro visual)
    const prG=el('div',{},el('div',{class:'facet-group__label'},'Sobre producto'));
    const prPills=el('div',{class:'facet-pills'});
    products.slice(0,5).forEach(p=>{
      const short=p.name.replace(' Unisex','').replace(' Premium','').replace(' Mágica 325 ml','').replace(' Fine Art','');
      const chip=el('span',{class:`facet-pill${S.productId===p.id?' active':''}`,style:'cursor:pointer',
        onclick:()=>{
          S.productId=S.productId===p.id?null:p.id;
          prPills.querySelectorAll('.facet-pill').forEach(c=>c.classList.remove('active'));
          if(S.productId)chip.classList.add('active');
          render();
        }
      },short);
      prPills.append(chip);
    });
    prG.append(prPills);
    sidebar.append(prG,el('div',{class:'gallery-sidebar__divider'}));

    // Color (decorativo)
    sidebar.append(el('div',{},
      el('div',{class:'facet-group__label'},'Color'),
      el('div',{style:'display:flex;flex-wrap:wrap;gap:8px'},
        ...COLORS.map(c=>el('span',{class:'facet-color-swatch',style:`background:${c}`,onclick:(e)=>e.target.classList.toggle('active')})),
      ),
    ));
  }

  function updateSidebar(sidebar,S) {
    // Actualizar el estado visual del sidebar cuando se cambian filtros desde pills
    sidebar.querySelectorAll('.facet-item').forEach(row=>{
      const label=row.querySelector('span:last-child')?.textContent;
      const shouldBeActive=label && STYLE_MAP[label]!==undefined && S.styleKey===label;
      if(shouldBeActive&&!row.classList.contains('active')){row.classList.add('active');const cb=row.querySelector('.facet-checkbox');if(cb)cb.textContent='✓';}
      else if(!shouldBeActive&&row.classList.contains('active')&&Object.keys(STYLE_MAP).includes(label)){row.classList.remove('active');const cb=row.querySelector('.facet-checkbox');if(cb)cb.textContent='';}
    });
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  window.Fluve.views.client.galeria = galeria;
})();
