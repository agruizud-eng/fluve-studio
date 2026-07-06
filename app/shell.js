// app/shell.js — Shell con rail completo Fase 5 + nav cliente + mega panel + footer universal.
(function () {
  const { el, mount } = window.Fluve.dom;
  const { getLang, setLang } = window.Fluve.i18n;
  const { logo } = window.Fluve.components;

  // ── Mega panel y helpers de búsqueda (cliente) ────────────────────────────
  let _megaPanel = null, _megaTimer = null;
  let _designsCache = null;
  const DE = ['🌺','🌙','🏖️','🦕','⚡','🎨','🌊','🌵','✍️','💙','🔤','🎭'];

  async function getDesigns() {
    if (_designsCache) return _designsCache;
    try {
      const [d, a] = await Promise.all([window.Fluve.dao.designs.getAll(), window.Fluve.dao.artists.getAll()]);
      const am = Object.fromEntries(a.map(x=>[x.id,x]));
      _designsCache = d.filter(x=>x.status==='approved').map(x=>({...x,artist:am[x.artistId]}));
    } catch { _designsCache = []; }
    return _designsCache;
  }

  function buildMegaPanel() {
    if (_megaPanel) { _megaPanel.classList.remove('open'); return _megaPanel; }
    _megaPanel = el('div',{class:'nav-mega'});
    return _megaPanel;
  }

  function buildSearch() {
    let open=false, debounce;
    const ph = el('span',{class:'nav-search-placeholder'},'Buscar diseños…');
    const icon = el('span',{class:'nav-search-icon'},'⌕');
    const input = el('input',{class:'nav-search-input',type:'text',placeholder:'Buscar diseños…','aria-label':'Buscar'});
    const toggle = el('div',{class:'nav-search-toggle'},ph,icon);
    const results= el('div',{class:'nav-search-results'});
    const wrap   = el('div',{class:'nav-search-wrap'},toggle,results);
    function expand(){ if(open) return; open=true; toggle.classList.add('expanded'); toggle.append(input); setTimeout(()=>input.focus(),50); }
    function collapse(){ open=false; toggle.classList.remove('expanded'); input.value=''; results.classList.remove('visible'); results.replaceChildren(); if(toggle.contains(input)) toggle.removeChild(input); }
    async function search(q){
      results.replaceChildren(); if(!q||q.length<2){results.classList.remove('visible');return;}
      const dd=await getDesigns(); const ql=q.toLowerCase();
      const m=dd.filter(d=>d.title.toLowerCase().includes(ql)||d.tags?.some(t=>t.toLowerCase().includes(ql))||d.artist?.handle?.toLowerCase().includes(ql)).slice(0,5);
      if(!m.length){results.append(el('div',{class:'search-no-results'},'Sin resultados para "'+q+'"'));results.classList.add('visible');return;}
      m.forEach((d,i)=>{
        const item=el('a',{href:`#/producto/${d.id}`,class:'search-result-item'},
          el('span',{class:'search-result-img'},DE[i%DE.length]),
          el('div',{},el('div',{class:'search-result-title'},d.title),el('div',{class:'search-result-sub'},(d.artist?.handle??''))),
        );
        item.addEventListener('click',()=>collapse()); results.append(item);
      });
      results.append(el('a',{href:`#/galeria?q=${encodeURIComponent(q)}`,class:'search-result-all',onclick:()=>collapse()},'Ver todos los resultados →'));
      results.classList.add('visible');
    }
    toggle.addEventListener('click',expand);
    input.addEventListener('input',(e)=>{clearTimeout(debounce);debounce=setTimeout(()=>search(e.target.value.trim()),280);});
    input.addEventListener('keydown',(e)=>{if(e.key==='Enter'){const q=input.value.trim();if(q)window.Fluve.router.navigate(`#/galeria?q=${encodeURIComponent(q)}`);collapse();}if(e.key==='Escape')collapse();});
    document.addEventListener('click',(e)=>{if(!wrap.contains(e.target))collapse();});
    return wrap;
  }

  // ── Mega menu content builders ────────────────────────────────────────────
  const MEGA_DATA = {
    Artistas:{ cols:'mega-cols--art', build:megaArtistas },
    Temas:{ cols:'mega-cols--4p', build:megaTemas },
    Ropa:{ cols:'mega-cols--4p', build:megaRopa },
    Headwear:{ cols:'mega-cols--2p', build:megaHeadwear },
    Accesorios:{ cols:'mega-cols--4p', build:megaAccesorios },
    'Arte de la pared':{ cols:'mega-cols--3p', build:megaArte },
    Decoración:{ cols:'mega-cols--3p', build:megaDecor },
  };
  const CAT_LIST = Object.keys(MEGA_DATA);

  function m(t,h,isNew){ return el('a',{href:h||'#/galeria',class:'mega-link'},t,isNew?el('span',{class:'mega-new'},'NEW'):null); }
  function mcol(title,...rows){ return el('div',{class:'mega-col'},el('div',{class:'mega-col-title'},title),...rows); }
  function mpromo(icon,title,sub,cta,href,bg){ return el('a',{href:href||'#/galeria',class:'mega-promo',style:bg?`background:${bg}`:''},el('span',{class:'mega-promo__icon'},icon),el('span',{class:'mega-promo__title'},title),el('span',{class:'mega-promo__sub'},sub),cta?el('span',{class:'mega-promo__cta'},cta):null); }

  function megaArtistas(){
    const A=[{handle:'@kookylove',name:'Koky Love',e:'🎨'},{handle:'@studiofolk',name:'Studio Folk',e:'🌿'},{handle:'@lettering.uy',name:'Lettering UY',e:'✍️'}];
    const ac=(t,arr)=>el('div',{class:'mega-col'},el('div',{class:'mega-col-title'},t),el('div',{class:'mega-artist-grid'},...arr.map(a=>el('a',{href:'#/galeria',class:'mega-artist-item'},el('span',{class:'mega-artist-avatar'},a.e),el('div',{},el('div',{class:'mega-artist-name'},a.name),el('div',{class:'mega-artist-handle'},a.handle))))));
    return [ac('Nuevos artistas',A),ac('Actualizados',[...A].reverse()),ac('Populares',A),mpromo('🎨','Vende tu arte','Publicá tus diseños y cobrá regalías.','Empieza →','#/auth')];
  }
  function megaTemas(){ return [mcol('Temas',m('Animales'),m('Humor'),m('Naturaleza'),m('Espacio'),m('Música'),m('Comida')),mcol('Estilos',m('Abstracto'),m('Tipografía'),m('Ilustración'),m('Cómics'),m('Tattoo'),m('Minimalista')),mcol('Desafíos',m('Tendencias'),m('Criaturas'),m('Icónicos'),m('Mascotas'),m('Botanico')),mcol('Causas',m('Arte comunitario'),m('Medio ambiente'),m('Identidad')),mpromo('🎭','Explorar galería','Miles de diseños de artistas independientes.','Ver todos →','#/galeria')]; }
  function megaRopa(){ return [mcol('Hombre',m('Remeras','#/personalizar/remera'),m('Hoodies','#/personalizar/hoodie'),m('Tote Bags','#/personalizar/tote')),mcol('Mujer',m('Remeras','#/personalizar/remera'),m('Hoodies','#/personalizar/hoodie')),mcol('Unisex',m('Remera Unisex','#/personalizar/remera',true),m('Hoodie Premium','#/personalizar/hoodie',true)),mcol('Niños & Bebés',m('Próximamente…','#/galeria')),mpromo('👕','Shop Ropa','Diseños de artistas sobre prendas premium.','Personalizar →','#/personalizar/remera')]; }
  function megaHeadwear(){ return [mcol('Gorras impresas',m('Trucker Hats','#/galeria',true),m('Gorras baseball','#/galeria',true)),mcol('Gorras bordadas',m('Snapback','#/galeria'),m('Dad Hats','#/galeria'),m('Beanies','#/galeria')),mpromo('🧢','Headwear','Próximamente en Fluvë Studio.'),mpromo('🎩','Diseños exclusivos','Artistas locales en cada pieza.','','','background:linear-gradient(160deg,rgba(255,61,139,.3),var(--ink3))')]; }
  function megaAccesorios(){ return [mcol('Bolsos',m('Tote Bag','#/personalizar/tote'),m('Bolsas Zip','#/galeria'),m('Mochilas','#/galeria')),mcol('Drinkware',m('Taza Mágica','#/personalizar/taza'),m('Latte Mugs','#/galeria')),mcol('Lifestyle',m('Funda Smartphone','#/personalizar/funda'),m('Stickers','#/galeria')),mcol('Oficina',m('Cuadernos','#/galeria'),m('Imanes','#/galeria')),mpromo('🎒','Shop Accesorios','Arte exclusivo en cada accesorio.','Ver todo →','#/galeria')]; }
  function megaArte(){ return [mcol('Formatos',m('Cuadro Fine Art','#/personalizar/cuadro'),m('Láminas A4–A0','#/personalizar/cuadro'),m('Pósters','#/galeria')),mcol('Por material',m('Fine Art 300g','#/personalizar/cuadro'),m('Canvas','#/galeria')),mcol('Enmarcado',m('Sin marco','#/galeria'),m('Marco negro','#/galeria')),mpromo('🖼️','Cuadros Fine Art','Impresión calibrada sobre papel 300g.','Personalizar →','#/personalizar/cuadro','background:linear-gradient(160deg,rgba(255,201,61,.3),var(--ink3))')]; }
  function megaDecor(){ return [mcol('Cocina',m('Taza Mágica','#/personalizar/taza'),m('Vasos','#/galeria')),mcol('Hogar',m('Almohadas','#/galeria'),m('Toallas','#/galeria')),mcol('Textil',m('Mantas','#/galeria')),mpromo('🏠','Decoración del hogar','Tu hogar con el arte que amás.','','','background:linear-gradient(160deg,rgba(63,203,126,.3),var(--ink3))')]; }

  function openMega(cat,row2){
    clearTimeout(_megaTimer); if(!MEGA_DATA[cat]||!_megaPanel) return;
    row2.querySelectorAll('.nav-cat-item').forEach(i=>i.classList.toggle('mega-active',i.dataset.cat===cat));
    _megaPanel.replaceChildren(el('div',{class:'mega-inner'},el('div',{class:`mega-cols ${MEGA_DATA[cat].cols}`},...MEGA_DATA[cat].build())));
    _megaPanel.classList.add('open');
  }
  function closeMega(row2,now){
    const hide=()=>{ _megaPanel?.classList.remove('open'); row2?.querySelectorAll('.nav-cat-item').forEach(i=>i.classList.remove('mega-active')); };
    if(now){clearTimeout(_megaTimer);hide();}else _megaTimer=setTimeout(hide,180);
  }

  // ── Mobile drawer ─────────────────────────────────────────────────────────
  function buildMobileNav(user,lang){
    const overlay=el('div',{class:'nav-mob-overlay'}), drawer=el('div',{class:'nav-mob-drawer'});
    function open(){overlay.classList.add('on');drawer.classList.add('open');}
    function close(){overlay.classList.remove('on');drawer.classList.remove('open');}
    overlay.addEventListener('click',close);
    const closeBtn=el('button',{class:'mob-close',type:'button',onclick:close},'✕');
    const mLinks=[['Productos','productos'],['Galería','galeria'],['Cómo funciona','como'],['Empresas','empresas']].map(([label,sec])=>{
      const a=el('a',{href:'#/',class:'mob-link'},label);
      a.addEventListener('click',(e)=>{close();if(location.hash==='#/'||location.hash==='#'){e.preventDefault();setTimeout(()=>document.getElementById(sec)?.scrollIntoView({behavior:'smooth'}),100);}});
      return a;
    });
    drawer.append(closeBtn,...mLinks,el('a',{href:'#/',class:'mob-link accent',onclick:close},'Vende tu arte'),el('div',{class:'mob-sep'}),el('div',{class:'mob-cats-label'},'Explorar'),...CAT_LIST.map(cat=>el('a',{href:'#/galeria',class:'mob-link',onclick:close},cat)),el('div',{class:'mob-sep'}),user?el('a',{href:'#/cuenta',class:'mob-link',onclick:close},'Mi cuenta ('+user.name+')'):el('a',{href:'#/auth',class:'mob-link',onclick:close},'Iniciar sesión / Únete'),el('div',{class:'mob-sep'}),el('span',{class:'mob-link',onclick:()=>{setLang(lang==='es'?'en':'es');location.reload();}},'🌐 ES · EN'));
    const ham=el('button',{class:'nav-hamburger',type:'button','aria-label':'Menú',onclick:open},'☰');
    return {ham,drawer,overlay};
  }

  // ── Footer extendido ──────────────────────────────────────────────────────
  function buildExtFooter(){
    function col(label,links){
      return el('div',{},
        el('div',{class:'footer-ext-col-label'},label),
        el('div',{class:'footer-ext-links'},
          ...links.map(([t,h,ext])=>el('a',{href:h,target:ext?'_blank':null,
            style:'padding:4px 0;font-size:13px;display:block;color:var(--mut);text-decoration:none;transition:color .12s',
            onmouseover:e=>e.target.style.color='var(--txt)',
            onmouseout:e=>e.target.style.color='var(--mut)',
          },t)),
        ),
      );
    }
    return el('footer',{class:'site-footer-ext'},
      el('div',{class:'footer-ext-grid'},
        // Marca + newsletter + social
        el('div',{},
          el('a',{href:'#/',class:'nav-logo',style:'margin-bottom:14px;display:inline-flex'},
            el('span',{class:'nav-logo__mark',style:'width:22px;height:22px'},
              el('span',{class:'nav-logo__c',style:'width:12px;height:12px;background:var(--cyan);left:0;top:4px'}),
              el('span',{class:'nav-logo__c',style:'width:12px;height:12px;background:var(--magenta);right:0;top:4px'}),
              el('span',{class:'nav-logo__c',style:'width:12px;height:12px;background:var(--yellow);left:4px;top:0'}),
            ),
            el('span',{class:'nav-logo__wordmark',style:'font-size:18px'},'Fluvë',el('span',{class:'nav-logo__sub'},' studio')),
          ),
          el('p',{class:'footer-ext-brand-desc'},'Impresión personalizada de alta gama en Uruguay. Tu visión, acabado premium, entrega express 24–48h.'),
          el('div',{style:'display:flex;gap:6px;margin:12px 0'},
            el('input',{type:'email',placeholder:'Tu email para novedades',style:'flex:1;min-height:34px;padding:0 10px;border-radius:9px;border:1px solid var(--line2);background:var(--ink3);color:var(--txt);font:400 12px var(--font-body)'}),
            el('button',{class:'btn btn--primary',style:'min-height:34px;padding:0 12px;font-size:12px',type:'button',
              onclick:(e)=>{const i=e.target.previousElementSibling;if(!i.value.includes('@'))return;window.Fluve.toast('¡Suscripto!','success');i.value='';}
            },'OK'),
          ),
          el('div',{style:'display:flex;gap:8px'},
            ...[ ['ig','Instagram','https://instagram.com/fluvestudio'],['in','LinkedIn','https://linkedin.com/company/fluvestudio'],['wa','WhatsApp','https://wa.me/59899000000'] ]
              .map(([abbr,label,href])=>el('a',{href,target:'_blank','aria-label':label,
                style:'width:30px;height:30px;border-radius:8px;border:1px solid var(--line2);display:flex;align-items:center;justify-content:center;color:var(--mut);font:700 9px var(--font-mono);text-decoration:none;transition:all .12s',
                onmouseover:e=>{e.currentTarget.style.borderColor='var(--accent2)';e.currentTarget.style.color='var(--txt)';},
                onmouseout:e=>{e.currentTarget.style.borderColor='var(--line2)';e.currentTarget.style.color='var(--mut)';},
              },abbr.toUpperCase())),
          ),
        ),
        // Productos
        col('Productos',[
          ['Remeras impresas',          '#/personalizar/remera'],
          ['Hoodies y buzos',           '#/personalizar/hoodie'],
          ['Tazas personalizadas',      '#/personalizar/taza'],
          ['Tote bags',                 '#/personalizar/tote'],
          ['Fundas para celular',       '#/personalizar/funda'],
          ['Cuadros Fine Art',          '#/personalizar/cuadro'],
          ['Ver toda la galería',       '#/galeria'],
        ]),
        // Para vos (artistas + empresas)
        col('Para vos',[
          ['Vende tu arte',             '#/vende-tu-arte'],
          ['Programa de artistas',      '#/vende-tu-arte'],
          ['Cotización para empresas',  '#/cotizacion'],
          ['Pedidos mayoristas',        '#/cotizacion'],
          ['Crear diseño online',       '#/editor'],
        ]),
        // Ayuda — todos los links van a páginas reales
        col('Ayuda',[
          ['Cómo funciona',             '#/como-funciona'],
          ['Envíos y entregas',         '#/envios'],
          ['Devoluciones y cambios',    '#/devoluciones'],
          ['Preguntas frecuentes',      '#/faq'],
          ['Soporte por WhatsApp',      'https://wa.me/59899000000', true],
          ['Mi cuenta',                 '#/cuenta'],
        ]),
      ),
      // Bottom bar
      el('div',{class:'footer-ext-bottom'},
        el('span',{},`© ${new Date().getFullYear()} Fluvë Studio S.R.L. · Montevideo, Uruguay`),
        el('div',{class:'footer-ext-legal'},
          ...[ ['Términos de uso','#/terminos'],['Política de privacidad','#/privacidad'],['Cookies','#/faq'] ]
            .map(([t,h])=>el('a',{href:h,style:'color:var(--mut);text-decoration:none;font:400 11px var(--font-body);transition:color .12s',onmouseover:e=>e.target.style.color='var(--txt)',onmouseout:e=>e.target.style.color='var(--mut)'},t)),
        ),
      ),
    );
  }

  // ── paintShell ────────────────────────────────────────────────────────────
  function paintShell(path){
    const root=document.getElementById('app');
    const shellNode = path.startsWith('/admin') ? adminShell(path) : clientShell(path);
    mount(root,shellNode);
    return shellNode.querySelector('[data-view-slot]');
  }

  function clientShell(path){
    const user=window.Fluve.session.current(), count=window.Fluve.cart?.store?.get()?.count??0, isHome=path==='/', lang=getLang();
    const searchWrap=buildSearch(), {ham,drawer,overlay}=buildMobileNav(user,lang), megaPanel=buildMegaPanel();
    const row1=el('div',{class:'nav-row1'},
      logo(),
      el('div',{class:'nav-links'},hLink('Productos','productos','#/galeria'),hLink('Galería','galeria','#/galeria'),hLink('Cómo funciona','como','#/como-funciona'),el('a',{href:'#/cotizacion'},'Empresas'),hLinkA('Vende tu arte'),(user?.role==='staff'||user?.role==='admin')?el('a',{href:'#/admin',class:'accent'},'Panel'):null),
      el('div',{class:'nav-actions'},
        el('span',{class:'nav-lang',onclick:()=>{setLang(lang==='es'?'en':'es');location.reload();}},lang==='es'?['ES · ',el('span',{class:'nav-lang__active'},'EN')]:[el('span',{class:'nav-lang__active'},'ES'),' · EN']),
        searchWrap,
        el('a',{class:'nav-cart',href:'#/carrito','aria-label':'Carrito'},'🛒',el('span',{class:'nav-cart__badge',id:'cart-count','data-zero':count===0?'true':'false'},String(count))),
        el('a',{class:'nav-fav',href:user?'#/cuenta/favoritos':'#/auth','aria-label':'Favoritos'},'♡'),
        user?userArea(user):el('a',{class:'nav-join',href:'#/auth'},'Únete'),ham,
      ),
    );
    const row2=el('div',{class:'nav-row2'});
    CAT_LIST.forEach(cat=>{const item=el('span',{class:'nav-cat-item','data-cat':cat},cat);item.addEventListener('mouseenter',()=>openMega(cat,row2));item.addEventListener('mouseleave',()=>closeMega(row2,false));row2.append(item);});
    megaPanel.addEventListener('mouseenter',()=>clearTimeout(_megaTimer));megaPanel.addEventListener('mouseleave',()=>closeMega(row2,false));
    document.addEventListener('click',(e)=>{if(!e.target.closest('.site-header'))closeMega(row2,true);},{capture:false});
    const header=el('header',{class:'site-header'},row1,row2,megaPanel);
    const main=el('main',{class:'site-main','data-view-slot':true});
    const promoBar=isHome?el('div',{class:'promo-bar'},'🚀 Entrega express 24–48h · Primera compra con 10% OFF → WELCOME10'):null;
    const shell=el('div',{class:'client-shell'}); if(promoBar)shell.append(promoBar); shell.append(header,overlay,drawer,main); shell.append(buildExtFooter()); shell.append(el('a',{class:'wa-float',href:'https://wa.me/59899000000',target:'_blank','aria-label':'WhatsApp'},'💬')); return shell;
  }

  // Nav: en home→scroll a sección; fuera del home→navega a la ruta real
  function hLink(label,sec,route){
    const href=route||'#/';
    const a=el('a',{href},label);
    a.addEventListener('click',(e)=>{
      const onHome=location.hash==='#/'||location.hash==='#';
      if(onHome&&sec){ e.preventDefault(); document.getElementById(sec)?.scrollIntoView({behavior:'smooth'}); }
      // si no está en home: el href maneja la navegación normalmente
    });
    return a;
  }
  function hLinkA(label){
    // "Vende tu arte": siempre va a su propia landing
    return el('a',{href:'#/vende-tu-arte',class:'accent'},label);
  }
  function userArea(user){
    let dropOpen = false;

    const dropdown = el('div',{class:'user-dropdown'});
    dropdown.append(
      // Header con info del usuario
      el('div',{class:'user-dd-header'},
        el('div',{class:'nav-user__avatar',style:'width:36px;height:36px;font-size:16px;flex:none'},user.name.slice(0,1).toUpperCase()),
        el('div',{},
          el('div',{class:'user-dd-name'},user.name),
          el('div',{class:'user-dd-email'},user.email??user.role),
        ),
      ),
      // Sección: cuenta
      ...[
        ['#/cuenta',           '🏠','Resumen'],
        ['#/cuenta/pedidos',   '📦','Mis pedidos'],
        ['#/cuenta/disenos',   '🎨','Mis diseños'],
        ['#/cuenta/favoritos', '♡','Favoritos'],
      ].map(([href,icon,label])=>{
        const a=el('a',{href,class:'user-dd-item'},el('span',{class:'user-dd-icon'},icon),label);
        a.addEventListener('click',()=>closeDropdown());
        return a;
      }),
      el('div',{class:'user-dd-sep'}),
      // Staff panel
      (user.role==='staff'||user.role==='admin')
        ? (()=>{ const a=el('a',{href:'#/admin',class:'user-dd-item'},el('span',{class:'user-dd-icon'},'⚙'),`Panel admin (${user.role})`); a.addEventListener('click',()=>closeDropdown()); return a; })()
        : null,
      // Cerrar sesión
      el('button',{class:'user-dd-item user-dd-danger',type:'button',onclick:()=>{
        closeDropdown();
        window.Fluve.session.logout();
        window.Fluve.cart.loadCart();
        location.hash='#/';
      }},el('span',{class:'user-dd-icon'},'⎋'),'Cerrar sesión'),
    );

    const toggle = el('div',{class:'nav-user',role:'button','aria-label':'Mi cuenta','aria-expanded':'false'},
      el('div',{class:'nav-user__avatar'},user.name.slice(0,1).toUpperCase()),
      el('span',{class:'nav-user__name'},user.name.split(' ')[0]),
      el('span',{class:'nav-user__caret'},'▾'),
    );

    function openDropdown(){
      dropOpen=true;
      toggle.classList.add('open');
      toggle.setAttribute('aria-expanded','true');
      dropdown.classList.add('open');
    }
    function closeDropdown(){
      dropOpen=false;
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded','false');
      dropdown.classList.remove('open');
    }

    toggle.addEventListener('click',(e)=>{
      e.stopPropagation();
      dropOpen ? closeDropdown() : openDropdown();
    });
    document.addEventListener('click',()=>{ if(dropOpen) closeDropdown(); });

    return el('div',{style:'position:relative'},toggle,dropdown);
  }

  // ── Admin shell — FASE 5: rail completo con 4 grupos ─────────────────────
  function adminShell(path){
    const user=window.Fluve.session.current();

    // Navegación completa (A1–A44 + ya existentes)
    const NAV=[
      { label:'🧭 Operación', items:[
        { href:'#/admin',             icon:'📊', label:'Dashboard' },
        { href:'#/admin/pedidos',     icon:'📦', label:'Pedidos' },
        { href:'#/admin/produccion',  icon:'🏭', label:'Producción' },
        { href:'#/admin/proveedores', icon:'🤝', label:'Proveedores' },
        { href:'#/admin/calidad',     icon:'✅', label:'Calidad' },
        { href:'#/admin/packaging',   icon:'🎁', label:'Packaging' },
        { href:'#/admin/envios',      icon:'🚚', label:'Envíos' },
      ]},
      { label:'👕 Catálogo', items:[
        { href:'#/admin/productos',   icon:'👗', label:'Productos' },
        { href:'#/admin/precios',     icon:'💲', label:'Precios' },
        { href:'#/admin/tecnicas',    icon:'🖨️', label:'Técnicas' },
        { href:'#/admin/disenos',     icon:'🎨', label:'Diseños' },
        { href:'#/admin/artistas',    icon:'✍️', label:'Artistas' },
        { href:'#/admin/compras',     icon:'🛒', label:'Compras' },
        { href:'#/admin/inventario',  icon:'📦', label:'Inventario' },
      ]},
      { label:'💼 Comercial', items:[
        { href:'#/admin/clientes',     icon:'👥', label:'Clientes' },
        { href:'#/admin/cotizaciones', icon:'💼', label:'Cotizaciones B2B' },
        { href:'#/admin/pagos',        icon:'💳', label:'Pagos' },
        { href:'#/admin/promos',       icon:'🎟️', label:'Promos' },
      ]},
      { label:'⚙ Sistema', items:[
        { href:'#/admin/soporte',      icon:'💬', label:'Soporte' },
        { href:'#/admin/reportes',     icon:'📊', label:'Reportes' },
        { href:'#/admin/contenido',    icon:'📝', label:'Contenido' },
        { href:'#/admin/equipo',       icon:'👤', label:'Equipo' },
        { href:'#/admin/actividad',    icon:'📋', label:'Actividad' },
        { href:'#/admin/ajustes',      icon:'⚙️', label:'Ajustes' },
        { href:'#/admin/config',       icon:'🔧', label:'Config / Seed' },
      ]},
    ];

    const rail=el('aside',{class:'admin-rail'});
    rail.append(el('div',{class:'admin-rail__brand'},logo({withWordmark:true,size:'sm'})));
    NAV.forEach(group=>{
      const grpEl=el('div',{class:'admin-rail__group'});
      grpEl.append(el('div',{class:'admin-rail__group-label'},group.label));
      group.items.forEach(item=>{
        const isActive = path===item.href.replace('#','') || (item.href!=='#/admin' && path.startsWith(item.href.replace('#','')));
        grpEl.append(el('a',{href:item.href,'aria-current':isActive?'page':null},el('span',{class:'ri-icon'},item.icon),item.label));
      });
      rail.append(grpEl);
    });

    // Contar alertas (pedidos sin proveedor, etc.)
    const alertBadge=el('span',{class:'admin-notif__badge',style:'display:none'},'');

    // G7 — Panel de notificaciones real
    let _notifOpen=false;
    const notifPanel=el('div',{class:'notif-panel'});

    async function loadNotifData(){
      notifPanel.replaceChildren(el('div',{class:'notif-header'},'Alertas operativas'));
      try {
        const [orders,designs,tickets]=await Promise.all([
          window.Fluve.dao.orders.getAll(),
          window.Fluve.dao.designs.getAll(),
          window.Fluve.dao.tickets.getAll(),
        ]);
        const noSup    = orders.filter(o=>!['entregado','cancelado'].includes(o.status)&&!o.supplierId);
        const qcPend   = orders.filter(o=>o.status==='qc');
        const penDes   = designs.filter(d=>d.status==='pending');
        const openTkts = tickets.filter(t=>t.status==='open');
        const sla      = orders.filter(o=>{const h=(Date.now()-new Date(o.createdAt).getTime())/3600000;return h>24&&!['entregado','cancelado'].includes(o.status);});
        const total = noSup.length+qcPend.length+penDes.length+openTkts.length+sla.length;
        if(total>0){alertBadge.style.display='flex';alertBadge.textContent=String(total);}
        else alertBadge.style.display='none';
        if(!total){notifPanel.append(el('a',{href:'#/admin',class:'notif-item'},el('span',{class:'notif-item__icon'},'✓'),el('div',{},el('div',{class:'notif-item__text'},'Sin alertas activas'),el('div',{class:'notif-item__sub'},'Operación al día'))));return;}
        const mkItem=(icon,text,sub,href)=>{
          const a=el('a',{href,class:'notif-item'},el('span',{class:'notif-item__icon'},icon),el('div',{},el('div',{class:'notif-item__text'},text),el('div',{class:'notif-item__sub'},sub)));
          a.addEventListener('click',()=>{_notifOpen=false;notifPanel.classList.remove('open');});
          return a;
        };
        if(sla.length)     notifPanel.append(mkItem('⚠',sla.length+' pedido(s) en riesgo SLA','+24h sin despachar','#/admin/envios'));
        if(noSup.length)   notifPanel.append(mkItem('🔴',noSup.length+' pedido(s) sin proveedor','Asignar para producir','#/admin/pedidos'));
        if(qcPend.length)  notifPanel.append(mkItem('🟡',qcPend.length+' pedido(s) en QC','Revisión pendiente','#/admin/calidad'));
        if(penDes.length)  notifPanel.append(mkItem('🔵',penDes.length+' diseño(s) a moderar','Pendientes de aprobación','#/admin/disenos'));
        if(openTkts.length)notifPanel.append(mkItem('💬',openTkts.length+' ticket(s) abierto(s)','Consultas de clientes','#/admin/soporte'));
        notifPanel.append(el('div',{class:'user-dd-sep'}));
        const actLink=el('a',{href:'#/admin/actividad',class:'notif-item'},el('span',{class:'notif-item__icon'},'📋'),el('span',{class:'notif-item__text'},'Ver registro de actividad →'));
        actLink.addEventListener('click',()=>{_notifOpen=false;notifPanel.classList.remove('open');});
        notifPanel.append(actLink);
      } catch(err){
        notifPanel.append(el('div',{class:'notif-item'},el('span',{class:'notif-item__text'},'Error: '+err.message)));
      }
    }

    // Cargar count inicial del badge
    if(window.Fluve.db.getDB()){
      Promise.all([window.Fluve.dao.orders.getAll().catch(()=>[]),window.Fluve.dao.designs.getAll().catch(()=>[]),window.Fluve.dao.tickets.getAll().catch(()=>[])]).then(([orders,designs,tickets])=>{
        const n=orders.filter(o=>!['entregado','cancelado'].includes(o.status)&&!o.supplierId).length+designs.filter(d=>d.status==='pending').length+tickets.filter(t=>t.status==='open').length+orders.filter(o=>o.status==='qc').length;
        if(n>0){alertBadge.style.display='flex';alertBadge.textContent=String(n);}
      }).catch(()=>{});
    }

    const bellBtn=el('div',{class:'admin-notif',style:'position:relative'},alertBadge,'🔔',notifPanel);
    bellBtn.addEventListener('click',(e)=>{
      e.stopPropagation();
      _notifOpen=!_notifOpen;
      notifPanel.classList.toggle('open',_notifOpen);
      if(_notifOpen) loadNotifData();
    });
    document.addEventListener('click',()=>{if(_notifOpen){_notifOpen=false;notifPanel.classList.remove('open');}});

    const topbar=el('div',{class:'admin-topbar'},
      el('div',{class:'admin-topbar-search'},el('span',{},'⌕'),el('input',{type:'text',placeholder:'Buscar en el panel…',onkeydown:(e)=>{if(e.key==='Enter'){const q=e.target.value.trim();if(q) window.Fluve.router.navigate(`#/admin/pedidos?q=${encodeURIComponent(q)}`);}}}) ),
      el('div',{style:'display:flex;gap:8px;align-items:center;margin-left:auto'},
        bellBtn,
        user?el('div',{style:'display:flex;align-items:center;gap:8px'},el('span',{class:'mono-label'},user.name+' · '+user.role),el('a',{href:'#/',class:'btn btn--ghost',style:'font-size:12px;min-height:32px;padding:0 12px'},'← Inicio')):null,
      ),
    );

    const main=el('div',{class:'admin-main'},topbar,el('div',{class:'admin-content','data-view-slot':true}));
    return el('div',{class:'admin-shell'},rail,main);
  }

  window.Fluve=window.Fluve||{};
  window.Fluve.shell={paintShell};
})();
