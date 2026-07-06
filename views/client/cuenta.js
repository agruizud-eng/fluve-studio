// views/client/cuenta.js — Mi cuenta completa (Fase 7): secciones 5a–5j.
(function () {
  const { el } = window.Fluve.dom;
  const DE = ['🌺','🌙','🏖️','🦕','⚡','🎨','🌊','🌵','✍️','💙','🔤','🎭'];
  const PE = { remera:'👕', hoodie:'🧥', taza:'☕', tote:'👜', funda:'📱', cuadro:'🖼️' };
  const STATUS_LABELS = { recibido:'Recibido', produccion:'En producción', qc:'QC+Packaging', en_camino:'En camino', entregado:'Entregado', cancelado:'Cancelado' };
  const STATUS_CLS    = { recibido:'status-recibido', produccion:'status-produccion', qc:'status-qc', en_camino:'status-en_camino', entregado:'status-entregado', cancelado:'status-cancelado' };

  const SECTIONS = [
    { id:'resumen',     icon:'🏠', label:'Resumen' },
    { id:'pedidos',     icon:'📦', label:'Mis pedidos' },
    { id:'disenos',     icon:'🎨', label:'Mis diseños' },
    { id:'favoritos',   icon:'♡',  label:'Favoritos' },
    { id:'perfil',      icon:'👤', label:'Perfil' },
    { id:'seguridad',   icon:'🔒', label:'Seguridad' },
    { id:'direcciones', icon:'📍', label:'Direcciones' },
    { id:'facturacion', icon:'🧾', label:'Facturación' },
    { id:'pagos',       icon:'💳', label:'Pagos' },
    { id:'soporte',     icon:'💬', label:'Soporte' },
  ];

  async function cuenta({ params }) {
    const user = window.Fluve.session.current();
    const section = params.seccion ?? 'resumen';
    const wrap = el('div',{class:'fu account-view'});
    wrap.append(
      el('div',{style:'display:flex;align-items:center;justify-content:space-between;margin-bottom:22px'},
        el('div',{},
          el('h1',{style:"font:600 28px 'Space Grotesk';letter-spacing:-.8px;margin:0"},'Mi cuenta'),
          user?el('div',{class:'mono-label',style:'margin-top:4px'},user.name+' · '+user.email):null,
        ),
        el('button',{class:'btn btn--ghost',style:'font-size:13px',type:'button',
          onclick:()=>{window.Fluve.session.logout();window.Fluve.toast('Sesión cerrada','success');window.Fluve.router.navigate('#/');}
        },'⎋ Cerrar sesión'),
      ),
    );
    const layout = el('div',{class:'account-layout'});
    wrap.append(layout);
    const nav=el('nav',{class:'account-nav'});
    SECTIONS.forEach(s=>nav.append(el('a',{href:`#/cuenta/${s.id}`,class:`account-nav__item${section===s.id?' active':''}`,onclick:()=>window.scrollTo(0,0)},s.icon+' '+s.label)));
    layout.append(nav);
    const content=el('div',{});
    layout.append(content);
    content.append(window.Fluve.viewState('loading',{rows:3}));
    try {
      const map={resumen:render5a,pedidos:render5e,disenos:render5i,favoritos:render5g,perfil:render5b,seguridad:render5c,direcciones:render5j,facturacion:render5d,pagos:render5f,soporte:render5h};
      await (map[section]||render5a)(user,content);
    } catch(err){content.replaceChildren(window.Fluve.viewState('error',{message:err.message}));}
    return wrap;
  }

  // ── 5a RESUMEN ────────────────────────────────────────────────────────────────
  async function render5a(user,c){
    const [orders,favs,designs]=await Promise.all([
      window.Fluve.dao.orders.byUser(user?.id??''),
      window.Fluve.dao.favorites.byUser(user?.id??'').catch(()=>[]),
      window.Fluve.dao.designs.getAll(),
    ]);
    const myDesigns=designs.filter(d=>d.artistId===user?.id||d.userId===user?.id);
    const lastOrder=orders.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
    c.replaceChildren(
      el('h3',{style:"font:600 18px 'Space Grotesk';margin:0 0 14px"},'Bienvenido, '+(user?.name?.split(' ')[0]??'')+'! 👋'),
      el('div',{class:'cuenta-resumen-grid'},
        statCard(orders.length,'Pedidos',orders.filter(o=>!['entregado','cancelado'].includes(o.status)).length+' activos','var(--accent2)'),
        statCard(favs.length,'Favoritos','♡ guardados','var(--magenta)'),
        statCard(myDesigns.length,'Diseños',myDesigns.filter(d=>d.status==='approved').length+' publicados','var(--cyan)'),
      ),
      lastOrder?el('div',{class:'card',style:'margin-bottom:16px'},
        el('div',{class:'mono-label',style:'margin-bottom:10px'},'Último pedido'),
        el('a',{href:`#/pedido/${lastOrder.id}`,style:'display:flex;align-items:center;gap:12px;text-decoration:none'},
          el('div',{style:'width:44px;height:44px;border-radius:10px;background:var(--ink3);display:flex;align-items:center;justify-content:center;font-size:20px;flex:none'},(PE[lastOrder.lines?.[0]?.productId]??'📦')),
          el('div',{style:'flex:1'},
            el('div',{style:"font:600 13px 'Space Grotesk'"}, '#'+lastOrder.id),
            el('div',{class:'mono-label'},new Date(lastOrder.createdAt).toLocaleDateString('es-UY')),
          ),
          el('span',{class:`order-status-chip ${STATUS_CLS[lastOrder.status]??''}`},STATUS_LABELS[lastOrder.status]??lastOrder.status),
          el('span',{style:"font:600 14px 'Space Grotesk'"},'$'+lastOrder.total.toFixed(2).replace('.',',')),
        ),
      ):null,
      el('div',{class:'quick-actions'},
        el('a',{href:'#/cuenta/pedidos',class:'btn btn--ghost',style:'font-size:13px'},'Ver pedidos'),
        el('a',{href:'#/galeria',class:'btn btn--ghost',style:'font-size:13px'},'Explorar galería'),
        el('a',{href:'#/vende-tu-arte',class:'btn btn--ghost',style:'font-size:13px'},'Vende tu arte'),
        el('a',{href:'#/editor',class:'btn btn--primary',style:'font-size:13px'},'Crear diseño →'),
      ),
    );
  }
  function statCard(val,label,sub,color){return el('div',{class:'cuenta-stat-card'},el('div',{class:'cuenta-stat-num',style:`color:${color}`},String(val)),el('div',{style:"font:600 13px 'Space Grotesk'"},label),el('div',{class:'cuenta-stat-label'},sub));}

  // ── 5b PERFIL ─────────────────────────────────────────────────────────────────
  async function render5b(user,c){
    let f={name:user?.name??'',phone:user?.phone??''};
    const nameInp=el('input',{class:'fld',type:'text',value:f.name,oninput:e=>f.name=e.target.value});
    const phoneInp=el('input',{class:'fld',type:'tel',value:f.phone,oninput:e=>f.phone=e.target.value});
    c.replaceChildren(
      el('h3',{style:"font:600 18px 'Space Grotesk';margin:0 0 16px"},'Datos personales'),
      el('div',{style:'max-width:500px;display:flex;flex-direction:column;gap:14px'},
        el('div',{style:'text-align:center;padding:20px 0'},
          el('div',{style:'width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 8px'},'😊'),
          el('button',{class:'btn btn--ghost',style:'font-size:12px',type:'button',onclick:()=>window.Fluve.toast('Upload de avatar — disponible próximamente','default')},'Cambiar foto'),
        ),
        fld('Nombre completo',nameInp),
        el('div',{class:'field'},el('label',{class:'field__label'},'Email'),el('div',{style:"font:500 13px 'Inter';color:var(--mut)"},user?.email??'—'),el('div',{class:'mono-label'},'Para cambiar el email se enviará un enlace de verificación.')),
        fld('Teléfono',phoneInp),
        el('button',{class:'btn btn--primary',style:'align-self:flex-start',type:'button',onclick:async()=>{
          if(!f.name.trim()){window.Fluve.toast('El nombre es obligatorio','error');return;}
          await window.Fluve.dao.users.put({...user,name:f.name,phone:f.phone});
          window.Fluve.toast('Perfil actualizado','success');
        }},'Guardar cambios'),
      ),
    );
  }

  // ── 5c SEGURIDAD ──────────────────────────────────────────────────────────────
  async function render5c(user,c){
    let f={current:'',newPass:'',confirm:''};
    c.replaceChildren(
      el('h3',{style:"font:600 18px 'Space Grotesk';margin:0 0 16px"},'Seguridad'),
      el('div',{style:'max-width:500px;display:flex;flex-direction:column;gap:14px'},
        el('div',{class:'card'},
          el('div',{style:"font:600 14px 'Space Grotesk';margin-bottom:12px"},'Cambiar contraseña'),
          fld('Contraseña actual',el('input',{class:'fld',type:'password',placeholder:'Contraseña actual',oninput:e=>f.current=e.target.value})),
          fld('Nueva contraseña',el('input',{class:'fld',type:'password',placeholder:'Mínimo 8 caracteres',oninput:e=>f.newPass=e.target.value})),
          fld('Confirmar nueva',el('input',{class:'fld',type:'password',placeholder:'Repetir nueva contraseña',oninput:e=>f.confirm=e.target.value})),
          el('button',{class:'btn btn--primary',style:'margin-top:4px',type:'button',onclick:async()=>{
            if(f.current!==user?.passwordHash){window.Fluve.toast('Contraseña actual incorrecta','error');return;}
            if(f.newPass.length<8){window.Fluve.toast('La contraseña nueva debe tener al menos 8 caracteres','error');return;}
            if(f.newPass!==f.confirm){window.Fluve.toast('Las contraseñas no coinciden','error');return;}
            await window.Fluve.dao.users.put({...user,passwordHash:f.newPass});
            window.Fluve.toast('Contraseña actualizada correctamente','success');
          }},'Cambiar contraseña'),
        ),
        el('div',{class:'card'},
          el('div',{style:'display:flex;justify-content:space-between;align-items:center'},
            el('div',{},el('div',{style:"font:600 14px 'Space Grotesk'"},'Autenticación 2FA'),el('div',{class:'mono-label'},'Capa adicional de seguridad (próximamente)')),
            el('span',{class:'order-status-chip status-cancelado'},'Inactivo'),
          ),
        ),
        el('div',{class:'card'},
          el('div',{style:"font:600 14px 'Space Grotesk';margin-bottom:8px"},'Sesiones activas'),
          el('div',{style:'display:flex;align-items:center;gap:10px'},
            el('span',{style:'font-size:20px'},'🖥'),
            el('div',{style:'flex:1'},el('div',{style:"font:500 12.5px 'Inter'"},'Esta sesión'),el('div',{class:'mono-label'},'Ahora · Chrome · Uruguay')),
            el('span',{class:'order-status-chip status-entregado'},'Activa'),
          ),
        ),
      ),
    );
  }

  // ── 5d FACTURACIÓN ────────────────────────────────────────────────────────────
  async function render5d(user,c){
    const entities=user?.taxEntities??[];
    const addForm=el('div',{style:'display:none;flex-direction:column;gap:10px;margin-top:12px;padding:14px;border:1px solid var(--accent);border-radius:12px'});
    let nf={label:'',taxId:'',name:'',type:'individual'};
    addForm.append(
      el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:10px'},
        fld('Etiqueta (ej: "Mi empresa")',el('input',{class:'fld',type:'text',placeholder:'Mi empresa',oninput:e=>nf.label=e.target.value})),
        fld('RUT / CI',el('input',{class:'fld',type:'text',placeholder:'21234567-8',oninput:e=>nf.taxId=e.target.value})),
      ),
      fld('Nombre o razón social',el('input',{class:'fld',type:'text',oninput:e=>nf.name=e.target.value})),
      el('div',{style:'display:flex;gap:8px'},
        el('button',{class:'btn btn--primary',style:'font-size:12px',type:'button',onclick:async()=>{
          if(!nf.label||!nf.taxId){window.Fluve.toast('Completá todos los campos','error');return;}
          const updated={...user,taxEntities:[...(user.taxEntities??[]),{...nf,id:'te-'+Date.now().toString(36),default:!entities.length}]};
          await window.Fluve.dao.users.put(updated); window.Fluve.toast('Entidad fiscal agregada','success'); window.Fluve.router.navigate('#/cuenta/facturacion');
        }},'Guardar'),
        el('button',{class:'btn btn--ghost',style:'font-size:12px',type:'button',onclick:()=>addForm.style.display='none'},'Cancelar'),
      ),
    );
    c.replaceChildren(
      el('h3',{style:"font:600 18px 'Space Grotesk';margin:0 0 16px"},'Datos de facturación'),
      entities.length?el('div',{style:'display:flex;flex-direction:column;gap:10px;margin-bottom:14px'},
        ...entities.map(e=>el('div',{class:`address-card${e.default?' address-card--default':''}`},
          el('div',{style:'display:flex;align-items:center;gap:8px;margin-bottom:4px'},
            el('span',{style:"font:700 13px 'Space Grotesk'"},e.label),
            e.default?el('span',{class:'address-default-badge'},'Predeterminada'):null,
          ),
          el('div',{class:'mono-label'},e.name),
          el('div',{class:'mono-label'},'RUT/CI: '+e.taxId),
          el('div',{class:'address-actions'},
            !e.default?el('button',{class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:async()=>{
              const upd={...user,taxEntities:entities.map(x=>({...x,default:x.id===e.id}))};
              await window.Fluve.dao.users.put(upd); window.Fluve.toast('Predeterminada actualizada','success'); window.Fluve.router.navigate('#/cuenta/facturacion');
            }},'Predeterminar'):null,
          ),
        ))
      ):el('div',{class:'mono-label',style:'color:var(--mut);margin-bottom:14px'},'No tenés entidades fiscales guardadas.'),
      el('button',{class:'btn btn--ghost',style:'font-size:13px',type:'button',onclick:()=>addForm.style.display='flex'},'+ Agregar entidad fiscal'),
      addForm,
    );
  }

  // ── 5e PEDIDOS ────────────────────────────────────────────────────────────────
  async function render5e(user,c){
    const orders=user?await window.Fluve.dao.orders.byUser(user.id):[];
    let statusFilter='todos';
    const tableSlot=el('div');
    function render(){
      const filt=statusFilter==='todos'?orders:orders.filter(o=>o.status===statusFilter);
      const sorted=[...filt].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
      tableSlot.replaceChildren(
        el('div',{style:'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px'},
          ...['todos','recibido','produccion','en_camino','entregado','cancelado'].map(s=>
            el('span',{class:`filter-pill${statusFilter===s?' active':''}`,style:'cursor:pointer',onclick:()=>{statusFilter=s;render();}},s==='todos'?'Todos':(STATUS_LABELS[s]??s))
          ),
        ),
        sorted.length?el('div',{style:'display:flex;flex-direction:column;gap:10px'},
          ...sorted.map(o=>{
            const line=o.lines?.[0];
            return el('div',{class:'account-order-card',style:'cursor:default'},
              el('a',{href:`#/pedido/${o.id}`,class:'account-order-thumb'},PE[line?.productId]??'📦'),
              el('div',{class:'account-order-info'},
                el('div',{class:'account-order-id'},'#'+o.id),
                el('div',{class:'account-order-title'},(line?.productName??'Pedido')),
                el('div',{class:'account-order-meta'},new Date(o.createdAt).toLocaleDateString('es-UY')+' · $'+o.total.toFixed(2).replace('.',',')),
              ),
              el('span',{class:`order-status-chip ${STATUS_CLS[o.status]??''}`},STATUS_LABELS[o.status]??o.status),
              el('div',{style:'display:flex;gap:6px'},
                el('a',{href:`#/pedido/${o.id}`,class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px'},'Seguir'),
                o.status==='entregado'?el('button',{class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:async()=>{
                  for(const l of o.lines??[]) await window.Fluve.cart.addLine({...l,lineTotal:l.unitPrice*l.config.qty});
                  window.Fluve.toast('Pedido añadido al carrito','success');
                  window.Fluve.router.navigate('#/carrito');
                }},'Repetir'):null,
              ),
            );
          })
        ):window.Fluve.viewState('empty',{title:'Sin pedidos en este estado'}),
      );
    }
    c.replaceChildren(el('h3',{style:"font:600 18px 'Space Grotesk';margin:0 0 16px"},'Mis pedidos'),tableSlot);
    render();
  }

  // ── 5f PAGOS ──────────────────────────────────────────────────────────────────
  async function render5f(user,c){
    const payments=user?(await window.Fluve.dao.payments.getAll()).filter(p=>{
      return (window.Fluve.dao.orders.byUser(user.id).then(os=>os.map(o=>o.id).includes(p.orderId))),true;
    }):[];
    const allPayments=user?await window.Fluve.dao.payments.getAll().then(ps=>ps.filter(async p=>{const os=await window.Fluve.dao.orders.byUser(user.id);return os.some(o=>o.id===p.orderId);})):[];
    const orders=user?await window.Fluve.dao.orders.byUser(user.id):[];
    const orderIds=new Set(orders.map(o=>o.id));
    const allPays=await window.Fluve.dao.payments.getAll();
    const myPays=allPays.filter(p=>orderIds.has(p.orderId)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    const STATUS_PAY={approved:'status-entregado',refunded:'status-cancelado',pending:'status-produccion'};
    c.replaceChildren(
      el('h3',{style:"font:600 18px 'Space Grotesk';margin:0 0 16px"},'Pagos y facturas'),
      myPays.length?el('div',{style:'display:flex;flex-direction:column;gap:10px'},
        ...myPays.map(p=>el('div',{style:'display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--ink2)'},
          el('div',{style:'flex:1'},
            el('div',{style:"font:600 13px 'Space Grotesk'"},'#'+p.orderId),
            el('div',{class:'mono-label'},new Date(p.createdAt).toLocaleDateString('es-UY')+' · '+p.method?.toUpperCase()),
          ),
          el('span',{class:`order-status-chip ${STATUS_PAY[p.status]??''}`},p.status==='approved'?'Pagado':p.status==='refunded'?'Reembolsado':'Pendiente'),
          el('div',{style:"font:700 15px 'Space Grotesk'"},'$'+p.amount.toFixed(2).replace('.',',')),
          el('button',{class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:()=>window.Fluve.toast('Descarga de factura PDF — disponible próximamente','default')},'📄 Factura'),
        ))
      ):window.Fluve.viewState('empty',{title:'Sin pagos',message:'Aquí verás tus transacciones.'}),
    );
  }

  // ── 5g FAVORITOS ──────────────────────────────────────────────────────────────
  async function render5g(user,c){
    const favs=user?await window.Fluve.dao.favorites.byUser(user.id).catch(()=>[]):[];
    const designs=favs.length?await window.Fluve.dao.designs.getAll():[];
    const favDesigns=designs.filter(d=>favs.some(f=>f.designId===d.id));
    c.replaceChildren(
      el('h3',{style:"font:600 18px 'Space Grotesk';margin:0 0 16px"},'Favoritos ('+favDesigns.length+')'),
      favDesigns.length?el('div',{class:'fav-grid'},
        ...favDesigns.map((d,i)=>{
          const card=el('div',{class:'fav-card'});
          card.append(
            el('div',{class:'fav-card__img',style:`background:linear-gradient(160deg,rgba(44,92,255,.25),rgba(43,217,228,.15))`},DE[i%DE.length]),
            el('div',{style:'padding:10px 12px'},
              el('div',{style:"font:600 13px 'Space Grotesk'"},d.title),
              el('a',{href:`#/personalizar/remera?design=${d.id}`,class:'mono-label',style:'color:var(--accent2)'},'Personalizar →'),
            ),
            el('div',{class:'fav-card__remove',onclick:async()=>{
              const fav=favs.find(f=>f.designId===d.id);
              if(fav){await window.Fluve.dao.favorites.delete(fav.id).catch(()=>null);}
              window.Fluve.toast('Eliminado de favoritos','success');
              window.Fluve.router.navigate('#/cuenta/favoritos');
            }},'✕'),
          );
          return card;
        })
      ):window.Fluve.viewState('empty',{
        title:'Sin favoritos todavía',
        message:'Usá el ♡ para guardar tus diseños preferidos.',
        action:el('a',{href:'#/galeria',class:'btn btn--ghost',style:'margin-top:6px'},'Explorar galería'),
      }),
    );
  }

  // ── 5h SOPORTE ────────────────────────────────────────────────────────────────
  async function render5h(user,c){
    const tickets=user?await window.Fluve.dao.tickets.byUser(user.id).catch(()=>[]):[];
    let showNew=false;
    let nf={subject:'',message:'',orderId:'',type:'consulta'};
    const ticketList=el('div',{style:'display:flex;flex-direction:column;gap:10px'});
    const orders=user?await window.Fluve.dao.orders.byUser(user.id):[];

    function renderList(){
      ticketList.replaceChildren(
        ...tickets.map(t=>el('div',{class:'card'},
          el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px'},
            el('div',{style:"font:600 13px 'Space Grotesk'"},t.subject),
            el('span',{class:`order-status-chip ${t.status==='open'?'status-recibido':t.status==='closed'?'status-entregado':'status-produccion'}`},t.status==='open'?'Abierto':t.status==='closed'?'Cerrado':'Pendiente'),
          ),
          t.messages?.length?el('div',{style:"font:400 12px 'Inter';color:var(--mut);padding:6px 8px;background:var(--ink3);border-radius:8px;margin-bottom:8px"},t.messages[t.messages.length-1].text.slice(0,120)+'…'):null,
          el('div',{class:'mono-label'},'#'+t.id+(t.orderId?' · Pedido #'+t.orderId:'')),
        )),
        !tickets.length?window.Fluve.viewState('empty',{title:'Sin tickets',message:'No tenés consultas abiertas.'}):null,
      );
    }
    renderList();

    const newForm=el('div',{class:'card',style:`display:${showNew?'flex':'none'};flex-direction:column;gap:10px;margin-top:14px`},
      el('div',{style:"font:600 14px 'Space Grotesk';margin-bottom:2px"},'Nueva consulta'),
      el('select',{class:'fld',onchange:e=>nf.orderId=e.target.value},
        el('option',{value:''},'Sin pedido vinculado'),
        ...orders.map(o=>el('option',{value:o.id},'Pedido #'+o.id)),
      ),
      el('input',{class:'fld',type:'text',placeholder:'Asunto de tu consulta',oninput:e=>nf.subject=e.target.value}),
      el('textarea',{class:'fld',style:'min-height:80px;resize:vertical',placeholder:'Describí tu consulta...',oninput:e=>nf.message=e.target.value}),
      el('div',{style:'display:flex;gap:8px'},
        el('button',{class:'btn btn--primary',type:'button',onclick:async()=>{
          if(!nf.subject||!nf.message){window.Fluve.toast('Completá asunto y mensaje','error');return;}
          const ticketId='T-'+Date.now().toString(36).toUpperCase();
          const ticket={id:ticketId,userId:user.id,orderId:nf.orderId||null,subject:nf.subject,type:nf.type,status:'open',messages:[{from:user.id,text:nf.message,at:new Date().toISOString()}],createdAt:new Date().toISOString()};
          await window.Fluve.dao.tickets.put(ticket);
          await window.Fluve.dao.logActivity('ticket.create','tickets',ticketId,{after:{subject:nf.subject}});
          window.Fluve.toast('Ticket enviado. Te responderemos en 24–48h.','success');
          window.Fluve.router.navigate('#/cuenta/soporte');
        }},'Enviar consulta'),
        el('button',{class:'btn btn--ghost',type:'button',onclick:()=>{newForm.style.display='none';showNew=false;}},'Cancelar'),
      ),
    );

    c.replaceChildren(
      el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px'},
        el('h3',{style:"font:600 18px 'Space Grotesk';margin:0"},'Soporte y ayuda'),
        el('button',{class:'btn btn--primary',style:'font-size:13px',type:'button',onclick:()=>{showNew=!showNew;newForm.style.display=showNew?'flex':'none';}},'+ Nueva consulta'),
      ),
      ticketList,newForm,
    );
  }

  // ── 5i MIS DISEÑOS ────────────────────────────────────────────────────────────
  async function render5i(user,c){
    const designs=user?await window.Fluve.dao.designs.getAll().then(ds=>ds.filter(d=>d.artistId===user.id||d.userId===user.id)):[];
    const STATUS_DS={pending:'status-produccion',approved:'status-entregado',rejected:'status-cancelado'};
    const STATUS_LB={pending:'Pendiente',approved:'Publicado',rejected:'Rechazado'};
    c.replaceChildren(
      el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px'},
        el('h3',{style:"font:600 18px 'Space Grotesk';margin:0"},'Mis diseños ('+designs.length+')'),
        el('div',{style:'display:flex;gap:8px'},
          el('a',{href:'#/editor',class:'btn btn--primary',style:'font-size:13px'},'+ Crear diseño'),
          el('button',{class:'btn btn--ghost',style:'font-size:13px',type:'button',onclick:()=>window.Fluve.toast('Upload de diseño — usá el Editor de diseño','default')},'↑ Subir archivo'),
        ),
      ),
      designs.length?el('div',{class:'disenos-grid'},
        ...designs.map((d,i)=>el('div',{class:'diseno-card'},
          el('div',{class:'diseno-card__img',style:`background:linear-gradient(160deg,rgba(44,92,255,.25),rgba(43,217,228,.15))`},DE[i%DE.length]),
          el('div',{class:'diseno-card__foot'},
            el('div',{style:"font:600 12.5px 'Space Grotesk';margin-bottom:4px"},d.title),
            el('div',{style:'display:flex;justify-content:space-between;align-items:center'},
              el('span',{class:`order-status-chip ${STATUS_DS[d.status]??''}`},STATUS_LB[d.status]??d.status),
              el('div',{style:'display:flex;gap:4px'},
                el('a',{href:`#/personalizar/remera?design=${d.id}`,class:'mono-label',style:'color:var(--accent2);font-size:10px'},'Usar'),
                d.status==='rejected'?el('button',{class:'mono-label',style:'color:var(--yellow);font-size:10px;background:none;border:none;cursor:pointer',type:'button',onclick:async()=>{
                  await window.Fluve.dao.designs.put({...d,status:'pending'});
                  window.Fluve.toast('Diseño enviado a revisión','success');
                  window.Fluve.router.navigate('#/cuenta/disenos');
                }},'Reenviar'):null,
              ),
            ),
          ),
        ))
      ):window.Fluve.viewState('empty',{title:'Sin diseños todavía',message:'Creá tu primer diseño o subí un archivo.',action:el('a',{href:'#/editor',class:'btn btn--primary',style:'margin-top:6px'},'Crear diseño →')}),
    );
  }

  // ── 5j DIRECCIONES ────────────────────────────────────────────────────────────
  async function render5j(user,c){
    const addrs=user?.addresses??[];
    const addForm=el('div',{style:'display:none;flex-direction:column;gap:10px;margin-top:14px;padding:14px;border:1px solid var(--accent);border-radius:12px'});
    let nf={label:'Casa',name:user?.name??'',street:'',city:'',zip:'',phone:''};
    addForm.append(
      el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:10px'},
        fld('Etiqueta',el('input',{class:'fld',type:'text',value:nf.label,oninput:e=>nf.label=e.target.value})),
        fld('Nombre destinatario',el('input',{class:'fld',type:'text',value:nf.name,oninput:e=>nf.name=e.target.value})),
      ),
      fld('Calle y número',el('input',{class:'fld',type:'text',oninput:e=>nf.street=e.target.value})),
      el('div',{style:'display:grid;grid-template-columns:1fr 120px;gap:10px'},
        fld('Ciudad',el('input',{class:'fld',type:'text',oninput:e=>nf.city=e.target.value})),
        fld('CP',el('input',{class:'fld',type:'text',oninput:e=>nf.zip=e.target.value})),
      ),
      fld('Teléfono',el('input',{class:'fld',type:'tel',oninput:e=>nf.phone=e.target.value})),
      el('div',{style:'display:flex;gap:8px'},
        el('button',{class:'btn btn--primary',style:'font-size:12px',type:'button',onclick:async()=>{
          if(!nf.street||!nf.city){window.Fluve.toast('Completá calle y ciudad','error');return;}
          const addr={...nf,id:'addr-'+Date.now().toString(36),default:!addrs.length};
          const upd={...user,addresses:[...(user.addresses??[]),addr]};
          await window.Fluve.dao.users.put(upd); window.Fluve.toast('Dirección guardada','success'); window.Fluve.router.navigate('#/cuenta/direcciones');
        }},'Guardar dirección'),
        el('button',{class:'btn btn--ghost',style:'font-size:12px',type:'button',onclick:()=>addForm.style.display='none'},'Cancelar'),
      ),
    );
    c.replaceChildren(
      el('div',{style:'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px'},
        el('h3',{style:"font:600 18px 'Space Grotesk';margin:0"},'Mis direcciones'),
        el('button',{class:'btn btn--ghost',style:'font-size:13px',type:'button',onclick:()=>addForm.style.display='flex'},'+ Agregar dirección'),
      ),
      addrs.length?el('div',{style:'display:flex;flex-direction:column;gap:10px'},
        ...addrs.map(a=>el('div',{class:`address-card${a.default?' address-card--default':''}`},
          el('div',{style:'display:flex;align-items:center;gap:8px;margin-bottom:6px'},
            el('span',{style:"font:700 13px 'Space Grotesk'"},a.label),
            a.default?el('span',{class:'address-default-badge'},'Predeterminada'):null,
          ),
          el('div',{style:"font:500 12.5px 'Inter'"},a.name),
          el('div',{class:'mono-label'},a.street),
          el('div',{class:'mono-label'},a.city+(a.zip?' · CP '+a.zip:'')),
          a.phone?el('div',{class:'mono-label'},a.phone):null,
          el('div',{class:'address-actions'},
            !a.default?el('button',{class:'btn btn--ghost',style:'font-size:11px;min-height:28px;padding:0 10px',type:'button',onclick:async()=>{
              const upd={...user,addresses:addrs.map(x=>({...x,default:x.id===a.id}))};
              await window.Fluve.dao.users.put(upd); window.Fluve.toast('Dirección predeterminada actualizada','success'); window.Fluve.router.navigate('#/cuenta/direcciones');
            }},'Predeterminar'):null,
            el('button',{class:'btn btn--ghost',style:'font-size:11px;min-height:28px;padding:0 10px;color:var(--magenta)',type:'button',onclick:async()=>{
              const ok=await window.Fluve.confirm({title:'Eliminar dirección',message:'¿Estás seguro?',confirmLabel:'Eliminar',danger:true});
              if(!ok)return;
              const upd={...user,addresses:addrs.filter(x=>x.id!==a.id)};
              await window.Fluve.dao.users.put(upd); window.Fluve.toast('Dirección eliminada','success'); window.Fluve.router.navigate('#/cuenta/direcciones');
            }},'Eliminar'),
          ),
        ))
      ):window.Fluve.viewState('empty',{title:'Sin direcciones guardadas',message:'Agregá una dirección para agilizar tus compras.'}),
      addForm,
    );
  }

  // Shared helper
  function fld(label,input){ return el('div',{class:'field'},el('label',{class:'field__label'},label),input); }

  window.Fluve=window.Fluve||{};
  window.Fluve.views=window.Fluve.views||{};
  window.Fluve.views.client=window.Fluve.views.client||{};
  window.Fluve.views.client.cuenta=cuenta;
})();
