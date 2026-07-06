// views/admin/catalogo.js — A9 Productos(+C2 alta) · A10 Detalle(tabs) · A11 Técnicas(+A29) · A12 Diseños · A13/A42 Artistas(+A24) · A28 Compras(+A40) · A30 Inventario
(function () {
  const { el } = window.Fluve.dom;
  const A = () => window.Fluve.admin;

  // ── A9 PRODUCTOS LISTA ────────────────────────────────────────────────────────
  async function adminProductos() {
    const wrap = A().adminPageWrap('Productos',
      [el('span',{},'Catálogo'),el('b',{style:'color:var(--txt)'},'Productos')],
      el('a',{href:'#/admin/productos/nuevo',class:'btn btn--primary',style:'font-size:13px'},'+ Nuevo producto'),
    );
    try {
      const [products,purchases,settings] = await Promise.all([
        window.Fluve.dao.products.getAll(),
        window.Fluve.dao.purchases.getAll(),
        window.Fluve.dao.settings.get('pricing').catch(()=>null),
      ]);
      if(!products.length){ wrap.append(window.Fluve.viewState('empty',{title:'Sin productos',message:'Cargá el seed o usá "+ Nuevo producto" para empezar.'})); return wrap; }

      wrap.append(A().tableWrap(
        ['Producto','Categoría','Precio base','Costo WA','Margen','Técnicas','Estado',''],
        products.map(p=>{
          const pricing = window.Fluve.pricing;
          const base  = pricing ? (pricing.costoBaseProducto(p.id, purchases, settings?.costingMethod??'weighted') ?? 0) : 0;
          const neto  = p.basePrice / (1+(settings?.vat??0.22));
          const pct   = base>0 ? ((neto-base)/neto*100).toFixed(1)+'%' : '—';
          const mCol  = base>0 && (neto-base)/neto > (settings?.minMargin??0.25) ? 'var(--green)' : 'var(--magenta)';
          return el('tr',{},
            el('td',{},
              el('a',{href:`#/admin/productos/${p.id}`,style:'font:600 13px var(--font-display);color:var(--accent2);text-decoration:none'},p.name),
              el('div',{class:'mono-label'},p.slug)
            ),
            el('td',{class:'tbl__muted'},p.category),
            el('td',{class:'tbl__num'},A().moneyStr(p.basePrice)),
            el('td',{class:'tbl__num'},base>0?A().moneyStr(base):el('span',{style:'color:var(--yellow)'},'⚠ sin lotes')),
            el('td',{},base>0?el('span',{style:`color:${mCol};font:700 11px 'Space Mono'`},pct):'—'),
            el('td',{},el('div',{style:'display:flex;gap:3px;flex-wrap:wrap'},...(p.compatibleTechniques??[]).slice(0,3).map(t=>el('span',{class:'chip',style:'font-size:9.5px;padding:2px 6px'},t.toUpperCase())))),
            el('td',{},el('span',{class:`order-status-chip ${p.active?'status-entregado':'status-cancelado'}`},p.active?'Activo':'Borrador')),
            el('td',{},el('div',{style:'display:flex;gap:6px'},
              el('a',{href:`#/admin/productos/${p.id}`,class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px'},'Ver / Editar'),
              el('a',{href:'#/admin/precios',class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px'},'Precios'),
            )),
          );
        })
      ));
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
  }

  // ── C2 / A10 PRODUCTO NUEVO y EDITAR ──────────────────────────────────────────
  // Ruta: #/admin/productos/nuevo  → crear
  // Ruta: #/admin/productos/:id    → editar (si id !== 'nuevo')
  async function adminProductoDetalle({ params }) {
    const prodId = params.id;
    // Defensive: undefined, vacío, o 'nuevo' → modo alta de producto
    const isNew  = !prodId || prodId === 'nuevo';
    let product = null, techniques = [];
    try {
      [techniques] = await Promise.all([window.Fluve.dao.techniques.getAll()]);
      if (!isNew) product = await window.Fluve.dao.products.get(prodId);
    } catch(err){ const w=A().adminPageWrap('Producto',null,null); w.append(window.Fluve.viewState('error',{message:err.message})); return w; }
    if (!isNew && !product) { const w=A().adminPageWrap('Producto no encontrado',null,null); w.append(window.Fluve.viewState('not-found',{message:'No existe producto con ID: '+prodId})); return w; }

    const CATEGORIES = ['remera','hoodie','taza','tote','funda','cuadro','sticker','camiseta','sudadera'];
    const DEFAULT_SIZES = ['XS','S','M','L','XL','XXL'];
    const CAT_EMOJI = {remera:'👕',hoodie:'🧥',taza:'☕',tote:'👜',funda:'📱',cuadro:'🖼️',sticker:'🏷',camiseta:'👕',sudadera:'🧥'};

    // Estado editable
    const f = {
      id:       product?.id       ?? '',
      name:     product?.name     ?? '',
      category: product?.category ?? 'remera',
      slug:     product?.slug     ?? '',
      basePrice:product?.basePrice?? 0,
      colors:   [...(product?.colors ?? [])],
      sizes:    [...(product?.sizes  ?? [])],
      compatibleTechniques: [...(product?.compatibleTechniques ?? [])],
      defaultTechnique: product?.defaultTechnique ?? '',
      active:   product?.active  ?? true,
    };
    function autoSlug(name){ return name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''); }

    const wrap = A().adminPageWrap(
      isNew ? 'Nuevo producto' : 'Editar producto',
      [el('a',{href:'#/admin/productos'},'Productos'), el('b',{style:'color:var(--txt)'},isNew?'Nuevo':product.name)],
      null,
    );

    // ── Tabs ────────────────────────────────────────────────────────────────────
    let activeTab = 'info';
    const tabContent = el('div',{style:'margin-top:20px'});

    const tabBar = el('div',{style:'display:flex;gap:0;border-bottom:1.5px solid var(--line);margin-bottom:0'});
    const TABS = [['info','📋 Info general'],['variantes','🎨 Variantes'],['tecnicas','🖨 Técnicas'],['imagenes','🖼 Imágenes']];
    if(!isNew) TABS.push(['precios','💲 Motor de precios']);

    function renderTabs(){
      tabBar.replaceChildren();
      TABS.forEach(([id,label])=>{
        const tab=el('div',{style:`padding:9px 16px;cursor:pointer;font:600 12.5px 'Space Grotesk';border-bottom:2px solid ${activeTab===id?'var(--accent)':'transparent'};color:${activeTab===id?'var(--txt)':'var(--mut)'}`,
          onclick:()=>{activeTab=id;renderTabs();renderTabContent();}
        },label);
        tabBar.append(tab);
      });
    }
    renderTabs();
    wrap.append(tabBar,tabContent);

    // ── Info general ─────────────────────────────────────────────────────────────
    function fldRow(label,inp){ return el('div',{class:'field'},el('label',{class:'field__label'},label),inp); }
    function inp(type,val,cb,placeholder){return el('input',{class:'admin-fld',type,value:String(val),placeholder:placeholder??'',oninput:e=>cb(e.target.value)});}

    let nameInp, slugInp;

    function tabInfo(){
      nameInp = inp('text', f.name, v=>{ f.name=v; if(!f.slug||f.slug===autoSlug(f.name.slice(0,-1))) { f.slug=autoSlug(v); if(slugInp) slugInp.value=f.slug; } });
      slugInp = inp('text', f.slug, v=>f.slug=v,'producto-slug');

      const catSel=el('select',{class:'admin-fld',onchange:e=>f.category=e.target.value},
        ...CATEGORIES.map(c=>el('option',{value:c,selected:c===f.category?'true':null},(CAT_EMOJI[c]??'📦')+' '+c.charAt(0).toUpperCase()+c.slice(1)))
      );
      const priceInp=inp('number',f.basePrice,v=>f.basePrice=parseFloat(v)||0,'24.90');
      const activeToggle=el('label',{style:'display:flex;align-items:center;gap:10px;cursor:pointer'},
        el('input',{type:'checkbox',style:'width:18px;height:18px;cursor:pointer',oninput:e=>f.active=e.target.checked,checked:f.active?'true':null}),
        el('span',{style:"font:500 13px 'Inter'"},f.active?'Activo (visible en tienda)':'Borrador (oculto en tienda)'),
      );

      tabContent.replaceChildren(el('div',{style:'max-width:580px;display:flex;flex-direction:column;gap:14px'},
        el('div',{style:'display:grid;grid-template-columns:1fr 200px;gap:12px'},fldRow('Nombre del producto *',nameInp),fldRow('Categoría',catSel)),
        el('div',{style:'display:grid;grid-template-columns:1fr 160px;gap:12px'},fldRow('Slug (URL)',slugInp),fldRow('Precio base (PVP) *',priceInp)),
        fldRow('Estado',activeToggle),
        saveBtns(),
      ));
    }

    // ── Variantes (colores + tallas) ──────────────────────────────────────────────
    function tabVariantes(){
      const colorsSlot=el('div',{style:'display:flex;flex-direction:column;gap:8px'});
      const sizesRow=el('div',{style:'display:flex;flex-wrap:wrap;gap:8px'});

      function renderColors(){
        colorsSlot.replaceChildren(
          ...f.colors.map((c,i)=>{
            const nameI=el('input',{class:'admin-fld',type:'text',value:c.name,placeholder:'Negro',oninput:e=>f.colors[i].name=e.target.value,style:'flex:1;min-height:36px'});
            const hexI =el('input',{type:'color',value:c.hex,oninput:e=>f.colors[i].hex=e.target.value,style:'width:40px;height:36px;cursor:pointer;border-radius:8px;border:1px solid var(--line2)'});
            const del  =el('button',{class:'btn btn--danger',style:'min-height:36px;padding:0 10px;font-size:12px',type:'button',onclick:()=>{f.colors.splice(i,1);renderColors();}},  '✕');
            return el('div',{style:'display:flex;gap:8px;align-items:center'},hexI,nameI,del);
          }),
          el('button',{class:'btn btn--ghost',style:'font-size:12px;align-self:flex-start',type:'button',onclick:()=>{f.colors.push({name:'Nuevo color',hex:'#888888'});renderColors();}},  '+ Agregar color'),
        );
      }
      renderColors();

      function renderSizes(){
        sizesRow.replaceChildren(
          ...DEFAULT_SIZES.map(s=>{
            const on=f.sizes.includes(s);
            const chip=el('span',{class:`filter-pill${on?' active':''}`,style:'cursor:pointer',onclick:()=>{
              f.sizes=on?f.sizes.filter(x=>x!==s):[...f.sizes,s];renderSizes();
            }},s);
            return chip;
          }),
          el('span',{class:'mono-label',style:'display:flex;align-items:center;gap:4px'},
            el('input',{class:'admin-fld',type:'text',placeholder:'Agregar talla',style:'width:100px;min-height:30px',
              onkeydown:e=>{if(e.key==='Enter'&&e.target.value.trim()){f.sizes.push(e.target.value.trim().toUpperCase());e.target.value='';renderSizes();}}}),
          ),
        );
      }
      renderSizes();

      tabContent.replaceChildren(
        el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:20px'},
          el('div',{},el('div',{class:'mono-label',style:'margin-bottom:12px'},'Colores disponibles ('+f.colors.length+')'),colorsSlot),
          el('div',{},el('div',{class:'mono-label',style:'margin-bottom:12px'},'Tallas'),sizesRow),
        ),
        el('div',{style:'margin-top:16px'},saveBtns()),
      );
    }

    // ── Técnicas compatibles ──────────────────────────────────────────────────────
    function tabTecnicas(){
      const techGrid=el('div',{style:'display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px'});
      techniques.forEach(t=>{
        const on=f.compatibleTechniques.includes(t.id);
        const card=el('div',{style:`border:1px solid ${on?'var(--accent)':'var(--line2)'};border-radius:12px;padding:12px 14px;cursor:pointer;background:${on?'rgba(44,92,255,.08)':'var(--ink2)'};transition:all .12s`,
          onclick:()=>{
            f.compatibleTechniques=on?f.compatibleTechniques.filter(x=>x!==t.id):[...f.compatibleTechniques,t.id];
            if(!f.compatibleTechniques.includes(f.defaultTechnique)) f.defaultTechnique=f.compatibleTechniques[0]??'';
            tabTecnicas();
          }
        },
          el('div',{style:'display:flex;align-items:center;gap:8px;margin-bottom:4px'},
            el('input',{type:'checkbox',style:'pointer-events:none',checked:on?'true':null}),
            el('span',{style:"font:600 13px 'Space Grotesk'"},t.name),
            el('span',{class:'chip',style:'font-size:9.5px;padding:2px 6px'},t.id.toUpperCase()),
          ),
          el('div',{class:'mono-label'},'$'+t.rate+'/'+t.rateUnit+' · recargo: '+(t.surchargePerUnit>0?'+$'+t.surchargePerUnit:'sin recargo')),
        );
        techGrid.append(card);
      });

      const defSel=el('select',{class:'admin-fld',style:'max-width:280px',onchange:e=>f.defaultTechnique=e.target.value},
        el('option',{value:''},'— Sin predeterminada —'),
        ...f.compatibleTechniques.map(tid=>{const t=techniques.find(x=>x.id===tid);return t?el('option',{value:tid,selected:tid===f.defaultTechnique?'true':null},t.name):null;}).filter(Boolean),
      );

      tabContent.replaceChildren(
        techGrid,
        el('div',{class:'field'},el('label',{class:'field__label'},'Técnica predeterminada'),defSel),
        el('div',{style:'margin-top:14px'},saveBtns()),
      );
    }

    // ── Motor de precios ──────────────────────────────────────────────────────────
    function tabPrecios(){
      tabContent.replaceChildren(
        el('div',{style:'text-align:center;padding:30px'},
          el('div',{style:'font-size:32px;margin-bottom:12px'},'💲'),
          el('div',{style:"font:600 16px 'Space Grotesk';margin-bottom:8px"},'Motor de precios'),
          el('p',{style:'color:var(--mut);font-size:13px;margin-bottom:16px'},'El motor de precios calcula el PVP óptimo por técnica y tramo de volumen para todos los productos.'),
          el('a',{href:'#/admin/precios',class:'btn btn--primary'},'Abrir motor de precios →'),
        ),
      );
    }

    // ── Imágenes del producto ──────────────────────────────────────────────────────
    function tabImagenes(){
      const PE_EMOJI={remera:'👕',hoodie:'🧥',taza:'☕',tote:'👜',funda:'📱',cuadro:'🖼️'};

      function imageUploader(currentSrc,label,onLoad){
        const previewEl=el('div',{style:'width:180px;height:180px;border-radius:14px;border:1.5px solid var(--line2);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:80px;background:var(--ink3);flex:none'});
        if(currentSrc){previewEl.replaceChildren(el('img',{src:currentSrc,style:'width:100%;height:100%;object-fit:cover'}));}
        else previewEl.textContent=PE_EMOJI[f.id]??'📦';

        const fileInput=el('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/svg+xml',style:'display:none'});
        fileInput.addEventListener('change',()=>{
          const file=fileInput.files[0];
          if(!file)return;
          if(file.size>5*1024*1024){window.Fluve.toast('Archivo muy grande. Máximo 5 MB en el prototipo.','error');return;}
          const r=new FileReader();
          r.onload=e=>{previewEl.replaceChildren(el('img',{src:e.target.result,style:'width:100%;height:100%;object-fit:cover'}));onLoad(e.target.result,file.name);};
          r.readAsDataURL(file);
        });

        const uploadBtn=el('button',{class:'btn btn--ghost',style:'font-size:12px',type:'button',onclick:()=>fileInput.click()},'↑ Subir imagen');
        const urlInp=el('input',{class:'admin-fld',type:'url',placeholder:'https://cdn.../remera-negro.png',style:'font-size:11px',oninput:e=>{if(e.target.value){previewEl.replaceChildren(el('img',{src:e.target.value,style:'width:100%;height:100%;object-fit:cover'}));onLoad(e.target.value,null);}}});

        return el('div',{style:'display:flex;gap:16px;align-items:flex-start'},
          previewEl,
          el('div',{style:'flex:1;display:flex;flex-direction:column;gap:10px'},
            el('div',{style:"font:600 13px 'Space Grotesk'"},label),
            el('div',{class:'field'},el('label',{class:'field__label'},'Subir archivo (PNG/JPG/WEBP, máx 5 MB)'),uploadBtn,fileInput),
            el('div',{class:'field'},el('label',{class:'field__label'},'O pegar URL externa'),urlInp),
          ),
        );
      }

      tabContent.replaceChildren(
        el('div',{style:'display:flex;flex-direction:column;gap:20px'},
          el('div',{class:'card',style:'background:rgba(44,92,255,.06);border-color:rgba(44,92,255,.3)'},
            el('div',{style:"font:600 13px 'Space Grotesk';margin-bottom:6px"},'💡 Imagen del producto vs imagen del diseño'),
            el('p',{style:'font-size:12px;color:var(--mut);margin:0;line-height:1.6'},
              'La imagen del producto es la foto de la prenda EN BLANCO (remera negra sin estampar, taza blanca vacía, etc.). '+
              'El diseño del artista o del cliente se superpone visualmente sobre esta foto en el personalizador. '+
              'Son dos imágenes independientes. Resolución recomendada: 1000×1000 px, fondo blanco o transparente.'
            ),
          ),
          imageUploader(f.imageBase64||f.imageUrl,'Foto principal (prenda en blanco)',
            (src,fname)=>{ if(src.startsWith('data:')) f.imageBase64=src; else f.imageUrl=src; }
          ),
          f.colors?.length>1?el('div',{},
            el('div',{class:'mono-label',style:'margin-bottom:12px'},'Fotos por color (opcional — para preview en el personalizador)'),
            el('div',{style:'display:grid;grid-template-columns:repeat(3,1fr);gap:12px'},
              ...f.colors.slice(0,6).map((c,i)=>imageUploader(
                f.colorImages?.[c.name],'Color: '+c.name,
                (src)=>{ f.colorImages=f.colorImages??{}; f.colorImages[c.name]=src; }
              ))
            )
          ):null,
          el('div',{style:'margin-top:8px'},saveBtns()),
        ),
      );
    }

        function renderTabContent(){
      if(activeTab==='info')       tabInfo();
      else if(activeTab==='variantes') tabVariantes();
      else if(activeTab==='tecnicas')  tabTecnicas();
      else if(activeTab==='imagenes')  tabImagenes();
      else if(activeTab==='precios')   tabPrecios();
    }
    renderTabContent();

    // ── Guardar / Cancelar ────────────────────────────────────────────────────────
    function saveBtns(){
      return el('div',{style:'display:flex;gap:8px;margin-top:8px'},
        el('button',{class:'btn btn--primary',type:'button',onclick:async()=>{
          if(!f.name.trim()){ window.Fluve.toast('El nombre del producto es obligatorio','error'); return; }
          if(!f.slug.trim()) f.slug=autoSlug(f.name);
          if(!f.basePrice||f.basePrice<=0){ window.Fluve.toast('El precio base debe ser mayor a 0','error'); return; }
          const id = isNew ? f.slug+'-'+(Date.now().toString(36)) : prodId;
          const prod={...f, id, slug:f.slug, defaultTechnique:f.defaultTechnique||f.compatibleTechniques[0]||''};
          await window.Fluve.dao.products.put(prod);
          await window.Fluve.dao.logActivity(isNew?'product.create':'product.update','products',id,{after:{name:f.name,price:f.basePrice}});
          window.Fluve.toast((isNew?'Producto creado: ':'Producto actualizado: ')+f.name,'success');
          if(isNew) window.Fluve.router.navigate('#/admin/productos/'+id);
          else { const w=document.querySelector('[data-view-slot]'); if(w) { const node=await adminProductoDetalle({params:{id}}); window.Fluve.dom.mount(w,node); } }
        }},isNew?'Crear producto':'Guardar cambios'),
        el('a',{href:'#/admin/productos',class:'btn btn--ghost'},'Cancelar'),
        !isNew?el('button',{class:'btn btn--ghost',type:'button',onclick:async()=>{
          await window.Fluve.dao.products.put({...product,active:!product.active});
          await window.Fluve.dao.logActivity('product.toggle','products',prodId,{after:{active:!product.active}});
          window.Fluve.toast((product.active?'Producto en borrador: ':'Producto publicado: ')+product.name,'success');
          window.Fluve.router.navigate('#/admin/productos/'+prodId);
        }},product.active?'Poner en borrador':'Publicar'):null,
      );
    }

    return wrap;
  }

  // ── A11 TÉCNICAS ──────────────────────────────────────────────────────────────
  async function adminTecnicas() {
    const wrap = A().adminPageWrap('Técnicas de impresión',
      [el('span',{},'Catálogo'),el('b',{style:'color:var(--txt)'},'Técnicas')], null
    );
    try {
      const techniques = await window.Fluve.dao.techniques.getAll();
      if(!techniques.length){ wrap.append(window.Fluve.viewState('empty',{title:'Sin técnicas'})); return wrap; }
      const MODEL_LABELS = {area:'Por área ($/cm²)',fixed:'Precio fijo',screens:'Por pantallas',stitches:'Por puntadas'};
      wrap.append(A().tableWrap(
        ['Técnica','Modelo de costo','Rate','Mín. qty','Recargo/ud.','Ideal para','Estado',''],
        techniques.map(t=>el('tr',{},
          el('td',{},el('div',{style:"font:600 13px 'Space Grotesk'"},t.name),el('div',{class:'mono-label'},t.id.toUpperCase())),
          el('td',{class:'tbl__muted'},MODEL_LABELS[t.costModel]??t.costModel),
          el('td',{class:'tbl__num'},'$'+t.rate+'/'+t.rateUnit),
          el('td',{class:'tbl__num'},String(t.minQty??1)+' ud.'),
          el('td',{class:'tbl__num'},t.surchargePerUnit>0?'+$'+t.surchargePerUnit:'—'),
          el('td',{class:'tbl__muted',style:'font-size:11px'},t.idealFor??'—'),
          el('td',{},el('span',{class:`order-status-chip ${t.active?'status-entregado':'status-cancelado'}`},t.active?'Activa':'Inactiva')),
          el('td',{},el('a',{href:`#/admin/tecnicas/${t.id}/costo`,class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px'},'Ver costo')),
        ))
      ));
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
  }

  // ── A29 TÉCNICA MODELO DE COSTO ───────────────────────────────────────────────
  async function adminTecnicaCosto({ params }) {
    const techId = params.id;
    const wrap = A().adminPageWrap('Modelo de costo · '+techId.toUpperCase(),
      [el('span',{},'Catálogo'),el('a',{href:'#/admin/tecnicas'},'Técnicas'),el('b',{style:'color:var(--txt)'},techId.toUpperCase())], null
    );
    try {
      const [tech, purchases, inventory] = await Promise.all([
        window.Fluve.dao.techniques.get(techId),
        window.Fluve.dao.purchases.getAll(),
        window.Fluve.dao.inventory.getAll().catch(()=>[]),
      ]);
      if(!tech){ wrap.append(window.Fluve.viewState('not-found',{message:'Técnica no encontrada: '+techId})); return wrap; }

      const MODEL_LABELS = {area:'Por área ($/cm²)',fixed:'Precio fijo',screens:'Por pantallas',stitches:'Por puntadas'};
      const areaPurchases = purchases.filter(p=>p.type==='material'&&p.materialId===techId);
      const inv = inventory.find(i=>i.material===techId||i.materialId===techId);

      wrap.append(
        el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px'},
          el('div',{class:'card'},
            el('div',{class:'mono-label',style:'margin-bottom:12px'},'Parámetros de la técnica'),
            el('div',{style:'display:flex;flex-direction:column;gap:8px'},
              infoRow('Nombre', tech.name),
              infoRow('Modelo', MODEL_LABELS[tech.costModel]??tech.costModel),
              infoRow('Rate', '$'+tech.rate+' / '+tech.rateUnit),
              infoRow('Recargo por unidad', tech.surchargePerUnit>0?'+$'+tech.surchargePerUnit:'Sin recargo'),
              infoRow('Cantidad mínima', String(tech.minQty??1)+' unidades'),
              infoRow('Estado', tech.active?'✅ Activa':'❌ Inactiva'),
            ),
          ),
          el('div',{class:'card'},
            el('div',{class:'mono-label',style:'margin-bottom:12px'},'Inventario de material'),
            inv ? el('div',{style:'display:flex;flex-direction:column;gap:8px'},
              infoRow('Stock disponible', (inv.stockArea??0).toLocaleString()+' cm²'),
              infoRow('Costo WA vigente', '$'+(inv.avgCostPerCm2??0).toFixed(6)+'/cm²'),
              infoRow('Lotes registrados', String(inv.lots?.length??0)),
            ) : el('div',{class:'mono-label',style:'color:var(--yellow)'},'⚠ Sin inventario registrado. Cargá lotes en A28/A40.'),
          ),
        ),
        areaPurchases.length ? el('div',{class:'card'},
          el('div',{class:'mono-label',style:'margin-bottom:12px'},'Historial de lotes para esta técnica'),
          A().tableWrap(['Fecha','Área','Costo/cm²','Total'],
            areaPurchases.map(p=>el('tr',{},
              el('td',{class:'tbl__muted'},p.date?new Date(p.date).toLocaleDateString('es-UY'):'—'),
              el('td',{class:'tbl__num'},(p.areaCm2??0).toLocaleString()+' cm²'),
              el('td',{class:'tbl__num'},'$'+(p.costPerCm2??0).toFixed(6)),
              el('td',{class:'tbl__num'},A().moneyStr((p.areaCm2??0)*(p.costPerCm2??0))),
            ))
          )
        ) : el('div',{class:'mono-label',style:'color:var(--mut)'},'Sin lotes de material registrados para esta técnica.'),
        el('div',{style:'margin-top:14px;display:flex;gap:8px'},
          el('a',{href:'#/admin/precios',class:'btn btn--ghost',style:'font-size:12px'},'Ver motor de precios →'),
          el('a',{href:'#/admin/compras/nuevo',class:'btn btn--ghost',style:'font-size:12px'},'+ Registrar lote →'),
        ),
      );
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
    function infoRow(label,val){ return el('div',{style:'display:flex;justify-content:space-between'},el('span',{class:'mono-label'},label),el('span',{style:"font:500 13px 'Inter';color:var(--txt)"},val)); }
  }

  // ── A12 DISEÑOS MODERACIÓN — con preview visual y checklist ─────────────────
  async function adminDisenos({ query }) {
    const filterStatus = query.status || 'pending';
    let activeFilter = filterStatus;
    const wrap = A().adminPageWrap('Moderación de diseños',
      [el('span',{},'Catálogo'),el('b',{style:'color:var(--txt)'},'Diseños')],
      el('a',{href:'#/admin/disenos/nuevo',class:'btn btn--primary',style:'font-size:13px'},'+ Nuevo diseño propio'),
    );

    const GRADS = [
      'linear-gradient(160deg,rgba(44,92,255,.4),rgba(43,217,228,.2))',
      'linear-gradient(160deg,rgba(255,61,139,.4),rgba(44,92,255,.2))',
      'linear-gradient(160deg,rgba(255,201,61,.4),rgba(63,203,126,.2))',
      'linear-gradient(160deg,rgba(63,203,126,.4),rgba(43,217,228,.2))',
    ];
    const DE = ['🌺','🌙','🏖️','🦕','⚡','🎨','🌊','🌵','✍️','💙','🔤','🎭'];

    const listSlot    = el('div',{style:'flex:1'});
    const previewSlot = el('div',{style:'width:320px;flex:none;display:flex;flex-direction:column;gap:12px'});
    const layout      = el('div',{style:'display:flex;gap:16px;align-items:flex-start'});
    layout.append(listSlot, previewSlot);
    wrap.append(layout);

    let allDesigns = [], artists = [], selectedDesign = null;
    try {
      [allDesigns, artists] = await Promise.all([
        window.Fluve.dao.designs.getAll(),
        window.Fluve.dao.artists.getAll(),
      ]);
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); return wrap; }
    const artMap = Object.fromEntries(artists.map(a=>[a.id,a]));

    // ── Panel de preview + checklist ────────────────────────────────────────────
    function renderPreview(d) {
      if (!d) {
        previewSlot.replaceChildren(
          el('div',{style:'border:1px dashed var(--line2);border-radius:14px;padding:24px;text-align:center;color:var(--mut)'},
            el('div',{style:'font-size:32px;margin-bottom:10px'},'👈'),
            el('div',{class:'mono-label'},'Seleccioná un diseño para verlo aquí'),
          ),
        );
        return;
      }
      const art  = artMap[d.artistId];
      const idx  = allDesigns.indexOf(d);
      const grad = GRADS[idx % GRADS.length];

      // Render del diseño (del editor o placeholder visual)
      let designVisual;
      if (d.editorData) {
        // Intentar renderizar los elementos del editor
        try {
          const data = JSON.parse(d.editorData);
          const canvas = el('div',{style:`width:100%;aspect-ratio:1;background:${data.color||grad};border-radius:12px;position:relative;overflow:hidden`});
          // Fondo del producto
          canvas.append(el('div',{style:'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:120px;opacity:.1'},(A().PE[data.product]??'👕')));
          // Elementos del diseño
          (data.elements||[]).forEach(elem=>{
            if(elem.type==='text'){
              const txt=el('div',{style:`position:absolute;left:${(elem.x/340*100)}%;top:${(elem.y/340*100)}%;color:${elem.color||'#fff'};font:${elem.fontSize||20}px '${elem.fontFamily||'Space Grotesk'}';max-width:80%;word-break:break-word;pointer-events:none`},elem.text);
              canvas.append(txt);
            } else if(elem.type==='image'&&elem.src){
              const img=el('img',{src:elem.src,style:`position:absolute;left:${(elem.x/340*100)}%;top:${(elem.y/340*100)}%;width:${(elem.w/340*100)}%;pointer-events:none`});
              canvas.append(img);
            }
          });
          designVisual = canvas;
        } catch {
          designVisual = el('div',{style:`width:100%;aspect-ratio:1;background:${grad};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:80px`},DE[idx%DE.length]);
        }
      } else if (d.imageUrl || d.imageBase64) {
        designVisual = el('img',{src:d.imageUrl||d.imageBase64,style:'width:100%;aspect-ratio:1;object-fit:contain;border-radius:12px;border:1px solid var(--line2)'});
      } else {
        designVisual = el('div',{style:`width:100%;aspect-ratio:1;background:${grad};border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px`},
          el('div',{style:'font-size:80px'},DE[idx%DE.length]),
          el('div',{class:'mono-label',style:'color:rgba(255,255,255,.6);font-size:10px'},'Vista previa no disponible — diseño sin archivo'),
        );
      }

      // Checklist de aprobación
      const CHECKLIST = [
        { id:'resolution',  label:'Resolución suficiente para impresión (mín. 300 DPI o diseño generado en el sistema)',           required:true },
        { id:'copyright',   label:'Sin marcas registradas, logos de terceros ni personajes con copyright (Nike, Disney, etc.)',     required:true },
        { id:'content',     label:'Contenido apropiado para todos los públicos (sin violencia, adulto sin marcar, discriminación)', required:true },
        { id:'originality', label:'El artista declaró ser el autor o titular de los derechos',                                     required:true },
        { id:'printable',   label:'El diseño es técnicamente imprimible (colores no demasiado tenues, área imprimible suficiente)',required:false },
        { id:'commercial',  label:'Tiene potencial comercial en la plataforma',                                                    required:false },
      ];
      const checks = {};
      CHECKLIST.forEach(c=>checks[c.id]=false);

      const checkboxEls = {};
      const checklistEl = el('div',{style:'display:flex;flex-direction:column;gap:8px'});
      CHECKLIST.forEach(c=>{
        const inp = el('input',{type:'checkbox',style:'width:15px;height:15px;flex:none;margin-top:2px;cursor:pointer;accent-color:var(--green)'});
        inp.addEventListener('change',()=>{checks[c.id]=inp.checked;updateBtns();});
        checkboxEls[c.id] = inp;
        checklistEl.append(el('label',{style:'display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:12px;line-height:1.45;color:var(--txt)'},
          inp,
          el('span',{},c.required?el('span',{style:'color:var(--magenta)'},'* '):null, c.label),
        ));
      });

      const approveBtn = el('button',{class:'btn btn--primary',style:'width:100%;justify-content:center',type:'button'},  '✓ Aprobar diseño');
      const rejectBtn  = el('button',{class:'btn btn--danger',style:'width:100%;justify-content:center',type:'button'},   '✕ Rechazar diseño');
      const btns       = el('div',{style:'display:flex;flex-direction:column;gap:8px'});

      function updateBtns(){
        const requiredOk = CHECKLIST.filter(c=>c.required).every(c=>checks[c.id]);
        approveBtn.disabled = !requiredOk;
        approveBtn.style.opacity = requiredOk ? '1' : '0.4';
        approveBtn.title = requiredOk ? '' : 'Marcá todos los campos obligatorios (*) para aprobar';
      }
      updateBtns();

      approveBtn.addEventListener('click',async()=>{
        await window.Fluve.dao.designs.put({...d,status:'approved',approvedAt:new Date().toISOString()});
        await window.Fluve.dao.logActivity('design.approve','designs',d.id,{before:{status:d.status},after:{status:'approved'}});
        window.Fluve.toast('"'+d.title+'" aprobado y publicado en la galería','success');
        selectedDesign=null; renderPreview(null); render();
      });

      rejectBtn.addEventListener('click',async()=>{
        const reason = window.prompt('Motivo del rechazo (se notifica al artista):','');
        if (reason===null) return; // canceló
        const msg = reason.trim() || 'El diseño no cumple con los estándares de la plataforma.';
        await window.Fluve.dao.designs.put({...d,status:'rejected',rejectedReason:msg,rejectedAt:new Date().toISOString()});
        await window.Fluve.dao.logActivity('design.reject','designs',d.id,{before:{status:d.status},after:{status:'rejected',reason:msg}});
        window.Fluve.toast('"'+d.title+'" rechazado. Motivo registrado.','success');
        selectedDesign=null; renderPreview(null); render();
      });

      if (d.status==='pending') btns.append(approveBtn,rejectBtn);
      else {
        btns.append(el('div',{style:`border:1px solid ${d.status==='approved'?'var(--green)':'var(--magenta)'};border-radius:10px;padding:10px;text-align:center;font:500 12px 'Inter';color:${d.status==='approved'?'var(--green)':'var(--magenta)'}`},
          d.status==='approved'?'✓ Ya aprobado':'✕ Ya rechazado'+(d.rejectedReason?' · "'+d.rejectedReason.slice(0,60)+'"':''),
        ));
      }

      previewSlot.replaceChildren(
        el('div',{class:'card',style:'padding:14px'},
          el('div',{style:"font:700 13px 'Space Grotesk';margin-bottom:3px"},d.title),
          el('div',{class:'mono-label',style:'margin-bottom:10px'},art?.handle??'—'),
          designVisual,
          el('div',{style:'margin-top:10px;display:flex;flex-wrap:wrap;gap:4px'},...(d.tags??[]).map(t=>el('span',{class:'chip',style:'font-size:9.5px;padding:2px 6px'},t))),
          el('div',{class:'mono-label',style:'margin-top:8px'},'Creado: '+new Date(d.createdAt).toLocaleDateString('es-UY')),
        ),
        el('div',{class:'card',style:'padding:14px'},
          el('div',{class:'mono-label',style:'margin-bottom:10px'},'Checklist de moderación'),
          el('div',{class:'mono-label',style:'color:var(--mut);font-size:10px;margin-bottom:8px'},'* Campos obligatorios para aprobar'),
          checklistEl,
          el('div',{style:'margin-top:14px'},btns),
        ),
      );
    }
    renderPreview(null);

    // ── Lista de diseños ────────────────────────────────────────────────────────
    function render(){
      const filt = allDesigns.filter(d=>d.status===activeFilter);
      listSlot.replaceChildren(
        el('div',{style:'display:flex;gap:8px;margin-bottom:14px'},
          ...[['pending','Pendientes'],['approved','Aprobados'],['rejected','Rechazados']].map(([s,label])=>
            el('span',{class:`filter-pill${activeFilter===s?' active':''}`,style:'cursor:pointer',onclick:()=>{activeFilter=s;selectedDesign=null;renderPreview(null);render();}},
              label+' ('+allDesigns.filter(d=>d.status===s).length+')'
            )
          ),
        ),
        filt.length ? A().tableWrap(
          ['','Diseño','Artista','Tags','Fecha','Estado',''],
          filt.map((d,i)=>{
            const art = artMap[d.artistId];
            const STATUS_COLORS={pending:'status-produccion',approved:'status-entregado',rejected:'status-cancelado'};
            const isSelected = selectedDesign?.id === d.id;
            const row = el('tr',{style:isSelected?'background:rgba(44,92,255,.08);':'',onclick:()=>{selectedDesign=d;renderPreview(d);render();}},
              el('td',{},el('div',{style:`width:36px;height:36px;border-radius:8px;background:${GRADS[i%GRADS.length]};display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer`},DE[i%DE.length])),
              el('td',{},el('div',{style:"font:600 13px 'Space Grotesk';cursor:pointer;color:"+(isSelected?'var(--accent2)':'var(--txt)')},d.title),el('div',{class:'mono-label'},'ID: '+d.id)),
              el('td',{},el('div',{style:"font:600 12px 'Space Grotesk'"},art?.handle??'—'),el('div',{class:'mono-label'},art?.tier??'')),
              el('td',{},el('div',{style:'display:flex;gap:4px;flex-wrap:wrap'},...(d.tags??[]).slice(0,3).map(t=>el('span',{class:'chip',style:'font-size:9.5px;padding:2px 6px'},t)))),
              el('td',{class:'tbl__muted'},new Date(d.createdAt).toLocaleDateString('es-UY')),
              el('td',{},el('span',{class:`order-status-chip ${STATUS_COLORS[d.status]??''}`},d.status==='pending'?'Pendiente':d.status==='approved'?'Aprobado':'Rechazado')),
              el('td',{},el('a',{href:`#/admin/disenos/${d.id}`,class:'btn btn--ghost',style:'font-size:11px;min-height:28px;padding:0 8px',onclick:e=>e.stopPropagation()},'Editar')),
            );
            return row;
          })
        ):window.Fluve.viewState('empty',{title:'Sin diseños '+activeFilter,message:'No hay diseños en este estado.'}),
      );
    }
    render();
    return wrap;
  }

  // ── A13 ARTISTAS ──────────────────────────────────────────────────────────────
  async function adminArtistas() {
    const wrap = A().adminPageWrap('Artistas',
      [el('span',{},'Catálogo'),el('b',{style:'color:var(--txt)'},'Artistas')], null
    );
    try {
      const [artists,designs,royalties]=await Promise.all([window.Fluve.dao.artists.getAll(),window.Fluve.dao.designs.getAll(),window.Fluve.dao.royalties.getAll()]);
      if(!artists.length){wrap.append(window.Fluve.viewState('empty',{title:'Sin artistas'}));return wrap;}
      const designMap={},royMap={};
      designs.forEach(d=>{designMap[d.artistId]=(designMap[d.artistId]??0)+1;});
      royalties.filter(r=>r.status==='pending').forEach(r=>{royMap[r.artistId]=(royMap[r.artistId]??0)+r.amount;});
      wrap.append(A().tableWrap(
        ['Artista','Tier','Diseños','Regalías pendientes','Acciones'],
        artists.map(a=>el('tr',{},
          el('td',{},el('div',{style:"font:600 13px 'Space Grotesk'"},a.name),el('div',{class:'mono-label'},a.handle)),
          el('td',{},el('span',{class:`order-status-chip ${a.tier==='pro'?'status-en_camino':'status-recibido'}`},a.tier.toUpperCase())),
          el('td',{class:'tbl__num'},String(designMap[a.id]??0)),
          el('td',{class:'tbl__num',style:royMap[a.id]>0?'color:var(--yellow)':''},royMap[a.id]>0?A().moneyStr(royMap[a.id]):'$0,00'),
          el('td',{},el('div',{style:'display:flex;gap:6px'},
            el('a',{href:`#/admin/artistas/${a.id}`,class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px'},'Ver ficha'),
            royMap[a.id]>0?el('button',{class:'btn btn--primary',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:async()=>{
              const ok=await window.Fluve.confirm({title:'Liquidar regalías',message:`Marcar como pagadas ${A().moneyStr(royMap[a.id])} de regalías a ${a.handle}.`,confirmLabel:'Liquidar'});
              if(!ok)return;
              const pending=royalties.filter(r=>r.artistId===a.id&&r.status==='pending');
              for(const r of pending){await window.Fluve.dao.royalties.put({...r,status:'paid',paidAt:new Date().toISOString()});}
              await window.Fluve.dao.logActivity('royalty.paid','royalties',a.id,{after:{amount:royMap[a.id],count:pending.length}});
              window.Fluve.toast('Regalías liquidadas a '+a.handle,'success');
              window.Fluve.router.navigate('#/admin/artistas');
            }},'💰 Liquidar'):null,
          )),
        ))
      ));
    }catch(err){wrap.append(window.Fluve.viewState('error',{message:err.message}));}
    return wrap;
  }

  // ── A42 ARTISTA DETALLE ───────────────────────────────────────────────────────
  async function adminArtistaDetalle({ params }) {
    const artistId = params.id;
    const wrap = A().adminPageWrap('Detalle de artista',
      [el('span',{},'Catálogo'),el('a',{href:'#/admin/artistas'},'Artistas'),el('b',{style:'color:var(--txt)'},'Detalle')], null
    );
    try {
      const [artist,designs,royalties]=await Promise.all([
        window.Fluve.dao.artists.get(artistId),
        window.Fluve.dao.designs.byArtist(artistId),
        window.Fluve.dao.royalties.byArtist(artistId),
      ]);
      if(!artist){wrap.append(window.Fluve.viewState('not-found',{message:'Artista no encontrado'}));return wrap;}
      const published=designs.filter(d=>d.status==='approved');
      const pendingRoy=royalties.filter(r=>r.status==='pending').reduce((s,r)=>s+r.amount,0);
      const paidRoy=royalties.filter(r=>r.status==='paid').reduce((s,r)=>s+r.amount,0);
      wrap.append(el('div',{style:'display:grid;grid-template-columns:260px 1fr;gap:20px'},
        el('div',{class:'card'},
          el('div',{style:'text-align:center;padding:10px 0'},
            el('div',{style:'font-size:48px;margin-bottom:8px'},'👤'),
            el('div',{style:"font:700 18px 'Space Grotesk'"},artist.name),
            el('div',{class:'mono-label'},artist.handle),
            el('div',{style:'margin-top:8px'},el('span',{class:`order-status-chip ${artist.tier==='pro'?'status-en_camino':'status-recibido'}`},artist.tier.toUpperCase())),
          ),
          el('div',{style:'margin-top:16px;display:flex;flex-direction:column;gap:8px'},
            ...[['Regalía',Math.round(artist.royaltyRate*100)+'%'],['Diseños publicados',String(published.length)],['Pendiente de cobro',A().moneyStr(pendingRoy)],['Total pagado',A().moneyStr(paidRoy)]].map(([label,val])=>
              el('div',{},el('div',{class:'mono-label'},label),el('div',{style:"font:600 14px 'Space Grotesk';color:var(--txt)"},val))
            ),
          ),
        ),
        el('div',{},
          el('h3',{style:"font:600 16px 'Space Grotesk';margin:0 0 12px"},'Diseños ('+designs.length+')'),
          designs.length?A().tableWrap(['Diseño','Estado','Tags'],[...designs].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(d=>el('tr',{},el('td',{},d.title),el('td',{},el('span',{class:`order-status-chip ${d.status==='approved'?'status-entregado':d.status==='pending'?'status-produccion':'status-cancelado'}`},d.status==='approved'?'Publicado':d.status==='pending'?'Pendiente':'Rechazado')),el('td',{class:'tbl__muted'},(d.tags??[]).join(', '))))):el('div',{class:'mono-label',style:'color:var(--mut)'},'Sin diseños todavía.'),
        ),
      ));
    }catch(err){wrap.append(window.Fluve.viewState('error',{message:err.message}));}
    return wrap;
  }

  // ── A24 REGALÍAS DEL DISEÑO ───────────────────────────────────────────────────
  async function adminRegalias() {
    const wrap = A().adminPageWrap('Regalías por diseño',
      [el('span',{},'Catálogo'),el('b',{style:'color:var(--txt)'},'Regalías')], null
    );
    try {
      const [royalties,artists,designs]=await Promise.all([window.Fluve.dao.royalties.getAll(),window.Fluve.dao.artists.getAll(),window.Fluve.dao.designs.getAll()]);
      const artMap=Object.fromEntries(artists.map(a=>[a.id,a]));
      const desMap=Object.fromEntries(designs.map(d=>[d.id,d]));
      const sorted=[...royalties].sort((a,b)=>b.createdAt?.localeCompare(a.createdAt??'')?? 0);
      const totalPending=royalties.filter(r=>r.status==='pending').reduce((s,r)=>s+r.amount,0);
      const totalPaid   =royalties.filter(r=>r.status==='paid').reduce((s,r)=>s+r.amount,0);
      wrap.append(
        el('div',{style:'display:flex;gap:12px;margin-bottom:20px'},
          A().kpi(A().moneyStr(totalPending),'Regalías pendientes','a liquidar','var(--yellow)','#/admin/artistas'),
          A().kpi(A().moneyStr(totalPaid),'Regalías liquidadas','histórico total','var(--green)'),
          A().kpi(String(royalties.filter(r=>r.status==='pending').length),'Liquidaciones pendientes','por artista','var(--accent2)'),
        ),
        sorted.length?A().tableWrap(
          ['ID','Artista','Diseño','Monto','Estado','Pedido','Fecha'],
          sorted.map(r=>{
            const art=artMap[r.artistId], des=desMap[r.designId];
            const STATUS={pending:'status-produccion',paid:'status-entregado'};
            return el('tr',{},
              el('td',{class:'mono-label'},r.id),
              el('td',{},art?.handle??'—'),
              el('td',{},des?.title??r.designId),
              el('td',{class:'tbl__num',style:r.status==='pending'?'color:var(--yellow)':''},A().moneyStr(r.amount)),
              el('td',{},el('span',{class:`order-status-chip ${STATUS[r.status]??''}`},r.status==='pending'?'Pendiente':'Liquidado')),
              el('td',{},r.orderId?el('a',{href:`#/admin/pedidos/${r.orderId}`,class:'mono-label',style:'color:var(--accent2)'},'#'+r.orderId):'—'),
              el('td',{class:'tbl__muted'},r.paidAt?new Date(r.paidAt).toLocaleDateString('es-UY'):r.createdAt?new Date(r.createdAt).toLocaleDateString('es-UY'):'—'),
            );
          })
        ):window.Fluve.viewState('empty',{title:'Sin regalías registradas'}),
      );
    }catch(err){wrap.append(window.Fluve.viewState('error',{message:err.message}));}
    return wrap;
  }

  // ── A28 COMPRAS / LOTES ────────────────────────────────────────────────────────
  async function adminCompras() {
    const wrap = A().adminPageWrap('Compras / Lotes',
      [el('span',{},'Catálogo'),el('b',{style:'color:var(--txt)'},'Compras')],
      el('a',{href:'#/admin/compras/nuevo',class:'btn btn--primary',style:'font-size:13px'},'+ Registrar compra'),
    );
    try {
      const [purchases,products,suppliers]=await Promise.all([window.Fluve.dao.purchases.getAll(),window.Fluve.dao.products.getAll(),window.Fluve.dao.suppliers.getAll()]);
      const prodMap=Object.fromEntries(products.map(p=>[p.id,p]));
      const supMap=Object.fromEntries(suppliers.map(s=>[s.id,s]));
      const sorted=[...purchases].sort((a,b)=>b.date?.localeCompare(a.date??'')?? 0);
      if(!sorted.length){wrap.append(window.Fluve.viewState('empty',{title:'Sin compras registradas',action:el('a',{href:'#/admin/compras/nuevo',class:'btn btn--primary',style:'margin-top:6px'},'+ Registrar primera compra')}));return wrap;}
      wrap.append(A().tableWrap(['Lote','Tipo','Producto/Material','Proveedor','Cant.','Costo unit.','Total','Fecha'],
        sorted.map(p=>el('tr',{},
          el('td',{class:'mono-label'},'#'+p.id),
          el('td',{},el('span',{class:`order-status-chip ${p.type==='product'?'status-recibido':'status-qc'}`},p.type==='product'?'Producto':'Material')),
          el('td',{style:"font:600 12px 'Space Grotesk'"},prodMap[p.productId]?.name??p.materialId??'—'),
          el('td',{class:'tbl__muted'},supMap[p.supplierId]?.name??'—'),
          el('td',{class:'tbl__num'},p.type==='product'?String(p.qty)+' u.':(p.areaCm2??0).toLocaleString()+' cm²'),
          el('td',{class:'tbl__num'},p.type==='product'?A().moneyStr(p.unitCost):'$'+(p.costPerCm2?.toFixed(5)??'—')+'/cm²'),
          el('td',{class:'tbl__num'},p.type==='product'?A().moneyStr(p.qty*p.unitCost):A().moneyStr(p.unitCost??0)),
          el('td',{class:'tbl__muted'},p.date?new Date(p.date).toLocaleDateString('es-UY'):'—'),
        ))
      ));
    }catch(err){wrap.append(window.Fluve.viewState('error',{message:err.message}));}
    return wrap;
  }

  // ── A40 REGISTRAR COMPRA (LOTE) ───────────────────────────────────────────────
  async function adminRegistrarCompra() {
    const wrap = A().adminPageWrap('Registrar compra / Lote',
      [el('span',{},'Catálogo'),el('a',{href:'#/admin/compras'},'Compras'),el('b',{style:'color:var(--txt)'},'Nuevo lote')], null
    );
    let products=[], suppliers=[], techniques=[];
    try{[products,suppliers,techniques]=await Promise.all([window.Fluve.dao.products.getAll(),window.Fluve.dao.suppliers.getAll(),window.Fluve.dao.techniques.getAll()]);}catch(err){wrap.append(window.Fluve.viewState('error',{message:err.message}));return wrap;}

    const f={type:'product',productId:products[0]?.id??'',materialId:'dtf',supplierId:suppliers[0]?.id??'',qty:100,unitCost:0,areaCm2:0,costPerCm2:0,date:new Date().toISOString().slice(0,10)};
    const configSlot=el('div',{style:'display:flex;flex-direction:column;gap:12px'});

    function fld(label,inp){return el('div',{class:'field'},el('label',{class:'field__label'},label),inp);}
    function renderConfig(){
      configSlot.replaceChildren();
      if(f.type==='product'){
        configSlot.append(
          fld('Producto',el('select',{class:'admin-fld',onchange:e=>f.productId=e.target.value},...products.map(p=>el('option',{value:p.id,selected:p.id===f.productId?'true':null},p.name)))),
          el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:12px'},
            fld('Cantidad (unidades)',el('input',{class:'admin-fld',type:'number',value:String(f.qty),oninput:e=>f.qty=parseInt(e.target.value)||0})),
            fld('Costo por unidad ($)',el('input',{class:'admin-fld',type:'number',step:'0.01',value:String(f.unitCost),oninput:e=>f.unitCost=parseFloat(e.target.value)||0})),
          ),
        );
      } else {
        configSlot.append(
          fld('Técnica / Material',el('select',{class:'admin-fld',onchange:e=>f.materialId=e.target.value},...techniques.map(t=>el('option',{value:t.id,selected:t.id===f.materialId?'true':null},t.name+' ('+t.id.toUpperCase()+')')))),
          el('p',{class:'mono-label',style:'color:var(--mut)'},'Para rollos DTF: ingresá el área total del rollo. El sistema calcula el $/cm² automáticamente.'),
          el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:12px'},
            fld('Área total (cm²)',el('input',{class:'admin-fld',type:'number',value:String(f.areaCm2),oninput:e=>f.areaCm2=parseFloat(e.target.value)||0,placeholder:'ej: 9000000 (90m×100cm)'})),
            fld('Precio total pagado ($)',el('input',{class:'admin-fld',type:'number',step:'0.01',oninput:e=>{f.unitCost=parseFloat(e.target.value)||0;if(f.areaCm2>0)f.costPerCm2=f.unitCost/f.areaCm2;}})),
          ),
        );
      }
    }
    renderConfig();

    wrap.append(el('div',{style:'max-width:580px;display:flex;flex-direction:column;gap:14px'},
      fld('Tipo de insumo',el('select',{class:'admin-fld',onchange:e=>{f.type=e.target.value;renderConfig();}},
        el('option',{value:'product',selected:'true'},'Producto terminado (por unidad)'),
        el('option',{value:'material'},'Material consumible (por área / rollo)'),
      )),
      configSlot,
      fld('Proveedor',el('select',{class:'admin-fld',onchange:e=>f.supplierId=e.target.value},el('option',{value:''},'— Sin proveedor —'),...suppliers.map(s=>el('option',{value:s.id},s.name)))),
      fld('Fecha de compra',el('input',{class:'admin-fld',type:'date',value:f.date,oninput:e=>f.date=e.target.value})),
      el('div',{style:'display:flex;gap:8px'},
        el('button',{class:'btn btn--primary',type:'button',onclick:async()=>{
          if(f.type==='product'&&(!f.productId||!f.qty||!f.unitCost)){window.Fluve.toast('Completá producto, cantidad y costo','error');return;}
          if(f.type==='material'&&(!f.materialId||!f.areaCm2||!f.unitCost)){window.Fluve.toast('Completá material, área y precio','error');return;}
          const id='LOT-'+Date.now().toString(36).toUpperCase();
          const lot={...f,id,costPerCm2:f.type==='material'&&f.areaCm2>0?f.unitCost/f.areaCm2:undefined};
          await window.Fluve.dao.purchases.put(lot);
          await window.Fluve.dao.logActivity('purchase.create','purchases',id,{after:{type:f.type,cost:f.unitCost}});
          // Recalcular inventario si es material
          if(f.type==='material'){
            try{await window.Fluve.dao.recalcularInventario?.();}catch{}
          }
          window.Fluve.toast('Lote #'+id+' registrado correctamente','success');
          window.Fluve.router.navigate('#/admin/compras');
        }},'Registrar lote'),
        el('a',{href:'#/admin/compras',class:'btn btn--ghost'},'Cancelar'),
      ),
    ));
    return wrap;
  }

  // ── A30 INVENTARIO ────────────────────────────────────────────────────────────
  async function adminInventario() {
    const wrap = A().adminPageWrap('Inventario por área',
      [el('span',{},'Catálogo'),el('b',{style:'color:var(--txt)'},'Inventario')], null
    );
    try {
      const inventory=await window.Fluve.dao.inventory.getAll();
      if(!inventory.length){wrap.append(window.Fluve.viewState('empty',{title:'Sin inventario de materiales',action:el('a',{href:'#/admin/compras/nuevo',class:'btn btn--primary',style:'margin-top:6px'},'+ Registrar primer lote')}));return wrap;}
      wrap.append(
        el('p',{class:'mono-label',style:'margin-bottom:14px'},'Materiales consumibles (rollos DTF, vinilo, etc.) con promedio ponderado por lote.'),
        A().tableWrap(['Material','Stock área','Costo WA/cm²','Lotes',''],
          inventory.map(inv=>el('tr',{},
            el('td',{},el('div',{style:"font:600 13px 'Space Grotesk'"},inv.material),el('div',{class:'mono-label'},inv.unit)),
            el('td',{class:'tbl__num'},(inv.stockArea??0).toLocaleString()+' cm²'),
            el('td',{class:'tbl__num'},'$'+(inv.avgCostPerCm2??0).toFixed(6)+'/cm²'),
            el('td',{class:'tbl__num'},String(inv.lots?.length??0)+' lotes'),
            el('td',{},el('div',{style:'display:flex;flex-direction:column;gap:4px'},
              ...(inv.lots??[]).map(lot=>el('div',{class:'mono-label'},'#'+lot.purchaseId+' · '+lot.areaCm2.toLocaleString()+'cm² · $'+lot.costPerCm2.toFixed(5))),
            )),
          ))
        ),
      );
    }catch(err){wrap.append(window.Fluve.viewState('error',{message:err.message}));}
    return wrap;
  }

  // ── DISEÑO DETALLE (#/admin/disenos/:id) ─────────────────────────────────────
  async function adminDisenoDetalle({ params }) {
    const designId = parseInt(params.id) || params.id;
    const isNew    = params.id === 'nuevo' || !designId;

    let design=null, artists=[], products=[];
    try {
      [artists, products] = await Promise.all([
        window.Fluve.dao.artists.getAll(),
        window.Fluve.dao.products.getAll(),
      ]);
      if (!isNew) design = await window.Fluve.dao.designs.get(designId);
    } catch(err) {
      const w=A().adminPageWrap('Diseño',null,null);
      w.append(window.Fluve.viewState('error',{message:err.message}));
      return w;
    }
    if (!isNew && !design) {
      const w=A().adminPageWrap('Diseño no encontrado',null,null);
      w.append(window.Fluve.viewState('not-found',{message:'No existe el diseño: '+designId}));
      return w;
    }

    const artMap = Object.fromEntries(artists.map(a=>[a.id,a]));
    const GRADS  = ['linear-gradient(160deg,rgba(44,92,255,.4),rgba(43,217,228,.2))','linear-gradient(160deg,rgba(255,61,139,.4),rgba(44,92,255,.2))','linear-gradient(160deg,rgba(255,201,61,.4),rgba(63,203,126,.2))'];
    const DE     = ['🌺','🌙','🏖️','🦕','⚡','🎨','🌊','🌵','✍️','💙'];

    // Estado editable
    const f = {
      title:    design?.title    ?? '',
      tags:     [...(design?.tags    ?? [])],
      artistId: design?.artistId  ?? null,
      isOwn:    design?.isOwn    ?? !design?.artistId,
      status:   design?.status   ?? 'pending',
      imageBase64: design?.imageBase64 ?? null,
      imageUrl:    design?.imageUrl    ?? null,
      editorData:  design?.editorData  ?? null,
      description: design?.description ?? '',
    };
    let newTagInput = '';
    const tagsSlot = el('div',{style:'display:flex;flex-wrap:wrap;gap:6px'});
    function renderTags(){
      tagsSlot.replaceChildren(
        ...f.tags.map(t=>el('span',{class:'chip',style:'cursor:pointer;display:flex;align-items:center;gap:4px'},
          t,el('span',{style:'color:var(--magenta);font-size:10px',onclick:()=>{f.tags=f.tags.filter(x=>x!==t);renderTags();}},'✕')
        )),
        el('input',{class:'admin-fld',type:'text',placeholder:'Añadir tag…',style:'width:110px;min-height:28px;font-size:11px',
          onkeydown:e=>{if((e.key==='Enter'||e.key===',')&&e.target.value.trim()){f.tags.push(e.target.value.trim().toLowerCase());e.target.value='';renderTags();}},
        }),
      );
    }
    renderTags();

    // Preview
    const previewEl = el('div',{style:'width:200px;height:200px;border-radius:14px;border:1.5px solid var(--line2);overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--ink3);flex:none'});
    function updatePreview(){
      if(f.imageBase64||f.imageUrl){
        previewEl.replaceChildren(el('img',{src:f.imageBase64||f.imageUrl,style:'width:100%;height:100%;object-fit:contain'}));
      } else if(f.editorData){
        previewEl.replaceChildren(el('div',{style:`width:100%;height:100%;${GRADS[0]};display:flex;align-items:center;justify-content:center;font-size:80px`},DE[0]));
      } else {
        previewEl.replaceChildren(el('div',{style:'font-size:70px;opacity:.4'},isNew?'📤':'🎨'));
      }
    }
    updatePreview();

    const fileInput=el('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/svg+xml',style:'display:none'});
    fileInput.addEventListener('change',()=>{
      const file=fileInput.files[0];
      if(!file)return;
      if(file.size>5*1024*1024){window.Fluve.toast('Archivo muy grande (máx 5 MB en prototipo)','error');return;}
      const r=new FileReader();
      r.onload=e=>{f.imageBase64=e.target.result;f.imageUrl=null;updatePreview();window.Fluve.toast('Imagen cargada correctamente','success');};
      r.readAsDataURL(file);
    });

    const wrap = A().adminPageWrap(
      isNew ? 'Nuevo diseño' : (design.title || 'Detalle de diseño'),
      [el('a',{href:'#/admin/disenos'},'Diseños'),el('b',{style:'color:var(--txt)'},isNew?'Nuevo':design.title)],
      null,
    );

    wrap.append(el('div',{style:'display:grid;grid-template-columns:220px 1fr;gap:20px'},
      // Preview + upload
      el('div',{style:'display:flex;flex-direction:column;gap:10px'},
        previewEl,
        el('div',{class:'mono-label',style:'text-align:center;margin-top:2px'},'Archivo del diseño'),
        el('button',{class:'btn btn--ghost',style:'font-size:12px;width:100%;justify-content:center',type:'button',onclick:()=>fileInput.click()},'↑ Subir imagen'),
        fileInput,
        el('input',{class:'admin-fld',type:'url',placeholder:'URL externa de imagen',style:'font-size:11px',
          oninput:e=>{f.imageUrl=e.target.value;f.imageBase64=null;if(e.target.value)updatePreview();}
        }),
        el('div',{class:'mono-label',style:'font-size:10px;text-align:center;color:var(--mut)'},'PNG/JPG/SVG transparente ·\nmín 2000×2000px · 300 DPI'),
      ),
      // Formulario
      el('div',{style:'display:flex;flex-direction:column;gap:14px'},
        // Propietario del diseño
        el('div',{class:'card',style:'padding:12px'},
          el('div',{class:'mono-label',style:'margin-bottom:10px'},'Propietario del diseño'),
          el('div',{style:'display:flex;gap:8px;flex-wrap:wrap'},
            el('label',{style:'display:flex;align-items:center;gap:6px;cursor:pointer'},
              el('input',{type:'radio',name:'owner',value:'fluve',checked:f.isOwn?'true':null,
                onclick:()=>{f.isOwn=true;f.artistId=null;}}),
              el('div',{},el('div',{style:"font:600 12.5px 'Space Grotesk'"},'🏢 Fluvë Studio'),el('div',{class:'mono-label'},'Colección propia de la plataforma · sin regalías')),
            ),
            el('label',{style:'display:flex;align-items:center;gap:6px;cursor:pointer'},
              el('input',{type:'radio',name:'owner',value:'artist',checked:!f.isOwn?'true':null,
                onclick:()=>{f.isOwn=false;}}),
              el('div',{},el('div',{style:"font:600 12.5px 'Space Grotesk'"},'✍️ De un artista'),el('div',{class:'mono-label'},'Genera regalías automáticas al artista')),
            ),
          ),
          !f.isOwn?el('div',{style:'margin-top:8px'},
            el('label',{class:'field__label'},'Artista'),
            el('select',{class:'admin-fld',onchange:e=>f.artistId=e.target.value||null},
              el('option',{value:''},'— Sin asignar —'),
              ...artists.map(a=>el('option',{value:a.id,selected:a.id===f.artistId?'true':null},a.handle+' · '+a.name)),
            ),
          ):null,
        ),
        el('div',{class:'field'},el('label',{class:'field__label'},'Título del diseño *'),el('input',{class:'admin-fld',type:'text',value:f.title,placeholder:'Ej: Atardecer Montevideo',oninput:e=>f.title=e.target.value})),
        el('div',{class:'field'},el('label',{class:'field__label'},'Descripción'),el('textarea',{class:'admin-fld',style:'min-height:60px;resize:vertical',placeholder:'Descripción del diseño para el catálogo…',oninput:e=>f.description=e.target.value},f.description||'')),
        el('div',{class:'field'},el('label',{class:'field__label'},'Tags (Enter para añadir)'),tagsSlot),
        el('div',{class:'field'},
          el('label',{class:'field__label'},'Estado'),
          el('select',{class:'admin-fld',style:'max-width:200px',onchange:e=>f.status=e.target.value},
            el('option',{value:'pending',selected:f.status==='pending'?'true':null},'Pendiente de revisión'),
            el('option',{value:'approved',selected:f.status==='approved'?'true':null},'Publicado en galería'),
            el('option',{value:'rejected',selected:f.status==='rejected'?'true':null},'Rechazado'),
          ),
        ),
        el('div',{style:'display:flex;gap:8px'},
          el('button',{class:'btn btn--primary',type:'button',onclick:async()=>{
            if(!f.title.trim()){window.Fluve.toast('El título es obligatorio','error');return;}
            if(!f.imageBase64&&!f.imageUrl&&!f.editorData){window.Fluve.toast('Cargá al menos una imagen para el diseño','error');return;}
            const id = isNew ? Date.now() : designId;
            const newDesign={
              id, title:f.title, tags:f.tags, artistId:f.artistId,
              isOwn:f.isOwn, owner:f.isOwn?'fluve-studio':undefined,
              status:f.status, description:f.description,
              imageBase64:f.imageBase64, imageUrl:f.imageUrl,
              editorData:f.editorData,
              createdAt:design?.createdAt??new Date().toISOString(),
              updatedAt:new Date().toISOString(),
            };
            await window.Fluve.dao.designs.put(newDesign);
            await window.Fluve.dao.logActivity(isNew?'design.create':'design.update','designs',String(id),{after:{title:f.title,isOwn:f.isOwn,status:f.status}});
            window.Fluve.toast((isNew?'Diseño creado: ':'Diseño actualizado: ')+f.title,'success');
            window.Fluve.router.navigate('#/admin/disenos');
          }},isNew?'Crear diseño':'Guardar cambios'),
          el('a',{href:'#/admin/disenos',class:'btn btn--ghost'},'Cancelar'),
        ),
      ),
    ));
    return wrap;
  }

  // ── Export ────────────────────────────────────────────────────────────────────
  window.Fluve=window.Fluve||{};
  window.Fluve.views=window.Fluve.views||{};
  window.Fluve.views.admin=window.Fluve.views.admin||{};
  Object.assign(window.Fluve.views.admin,{
    productos:      adminProductos,
    productoDetalle:adminProductoDetalle,
    tecnicas:       adminTecnicas,
    tecnicaCosto:   adminTecnicaCosto,
    disenos:        adminDisenos,
    disenoDetalle:  adminDisenoDetalle,
    artistas:       adminArtistas,
    artistaDetalle: adminArtistaDetalle,
    regalias:       adminRegalias,
    compras:        adminCompras,
    registrarCompra:adminRegistrarCompra,
    inventario:     adminInventario,
  });
})();
