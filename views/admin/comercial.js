// views/admin/comercial.js — A14/A41 Clientes · A16 Pagos · A17 Promos · A18/A43 Soporte
(function () {
  const { el } = window.Fluve.dom;
  const A = () => window.Fluve.admin;

  // ── A14 CLIENTES CRM ───────────────────────────────────────────────────────────
  async function adminClientes({ query }) {
    const searchQ = query.q || '';
    const wrap = A().adminPageWrap('Clientes',
      [el('span',{},'Comercial'),el('b',{style:'color:var(--txt)'},'Clientes')], null
    );
    const tableSlot = el('div');
    wrap.append(tableSlot);

    let users = [], orders = [];
    try {
      [users, orders] = await Promise.all([
        window.Fluve.dao.users.getAll(),
        window.Fluve.dao.orders.getAll(),
      ]);
    } catch(err){ tableSlot.replaceChildren(window.Fluve.viewState('error',{message:err.message})); return wrap; }

    const clients = users.filter(u=>u.role==='customer');
    const ordersByUser = {};
    orders.forEach(o=>{ if(!ordersByUser[o.userId]) ordersByUser[o.userId]=[]; ordersByUser[o.userId].push(o); });

    let searchVal = searchQ;
    function filtered(){ return clients.filter(u=>!searchVal||u.name?.toLowerCase().includes(searchVal.toLowerCase())||u.email?.toLowerCase().includes(searchVal.toLowerCase())); }

    function render(){
      const filt = filtered();
      tableSlot.replaceChildren(
        el('div',{style:'display:flex;gap:12px;margin-bottom:14px;align-items:center'},
          el('input',{class:'admin-fld',type:'search',placeholder:'Buscar cliente, email…',value:searchVal,style:'max-width:280px;min-height:36px',oninput:(e)=>{searchVal=e.target.value;render();}}),
          el('span',{class:'mono-label'},filt.length+' clientes'),
        ),
        filt.length ? A().tableWrap(
          ['Cliente','Email','Pedidos','Gasto total','Registrado',''],
          filt.map(u=>{
            const uOrders = ordersByUser[u.id]??[];
            const gasto = uOrders.filter(o=>o.status!=='cancelado').reduce((s,o)=>s+o.total,0);
            return el('tr',{},
              el('td',{},el('div',{style:"font:600 13px 'Space Grotesk'"},u.name),el('div',{class:'mono-label'},u.phone??'')),
              el('td',{class:'tbl__muted'},u.email),
              el('td',{class:'tbl__num'},String(uOrders.length)),
              el('td',{class:'tbl__num'},A().moneyStr(gasto)),
              el('td',{class:'tbl__muted'},u.createdAt?new Date(u.createdAt).toLocaleDateString('es-UY'):'—'),
              el('td',{},el('a',{href:`#/admin/clientes/${u.id}`,class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px'},'Ver')),
            );
          })
        ) : window.Fluve.viewState('empty',{title:'Sin clientes',message:'No hay resultados para esa búsqueda.'}),
      );
    }
    render();
    return wrap;
  }

  // ── A41 CLIENTE DETALLE ────────────────────────────────────────────────────────
  async function adminClienteDetalle({ params }) {
    const userId = params.id;
    const wrap = A().adminPageWrap('Detalle de cliente',
      [el('span',{},'Comercial'),el('a',{href:'#/admin/clientes'},'Clientes'),el('b',{style:'color:var(--txt)'},'Detalle')], null
    );
    try {
      const [user, orders, tickets] = await Promise.all([
        window.Fluve.dao.users.get(userId),
        window.Fluve.dao.orders.byUser(userId),
        window.Fluve.dao.tickets.byUser(userId),
      ]);
      if(!user){ wrap.append(window.Fluve.viewState('not-found',{message:'Cliente no encontrado'})); return wrap; }
      const gasto = orders.filter(o=>o.status!=='cancelado').reduce((s,o)=>s+o.total,0);

      wrap.append(
        el('div',{style:'display:grid;grid-template-columns:260px 1fr;gap:20px'},
          // Info
          el('div',{class:'card'},
            el('div',{style:"font:700 16px 'Space Grotesk';margin-bottom:14px"},user.name),
            ...[['Email',user.email],['Teléfono',user.phone??'—'],['Rol',user.role],['Creado',user.createdAt?new Date(user.createdAt).toLocaleDateString('es-UY'):'—'],['Pedidos totales',orders.length],['Gasto total',A().moneyStr(gasto)]].map(([label,val])=>
              el('div',{style:'margin-bottom:8px'},el('div',{class:'mono-label'},label),el('div',{style:"font:500 13px 'Inter';color:var(--txt)"},String(val)))
            ),
            user.addresses?.length ? el('div',{style:'margin-top:14px;border-top:1px solid var(--line);padding-top:12px'},
              el('div',{class:'mono-label',style:'margin-bottom:6px'},'Direcciones'),
              ...user.addresses.map(a=>el('div',{style:"font:500 11.5px 'Inter';color:var(--mut);margin-bottom:4px"},a.label+': '+a.line+', '+a.city))
            ) : null,
            el('div',{style:'margin-top:14px;border-top:1px solid var(--line);padding-top:12px'},
              el('a',{href:`#/admin/pedidos/nuevo`,class:'btn btn--primary',style:'font-size:12px;width:100%;justify-content:center'},'+ Nuevo pedido'),
            ),
          ),
          // Pedidos
          el('div',{},
            el('h3',{style:"font:600 16px 'Space Grotesk';margin:0 0 12px"},'Pedidos ('+orders.length+')'),
            orders.length ? A().tableWrap(['Pedido','Estado','Total','Fecha'],
              [...orders].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(o=>el('tr',{},
                el('td',{},el('a',{href:`#/admin/pedidos/${o.id}`,class:'mono-label',style:'color:var(--accent2)'},'#'+o.id)),
                el('td',{},A().statusBadge(o.status)),
                el('td',{class:'tbl__num'},A().moneyStr(o.total)),
                el('td',{class:'tbl__muted'},new Date(o.createdAt).toLocaleDateString('es-UY')),
              ))
            ) : el('div',{class:'mono-label',style:'color:var(--mut)'},'Sin pedidos.'),
          ),
        ),
      );
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
  }

  // ── A16 PAGOS ─────────────────────────────────────────────────────────────────
  async function adminPagos() {
    const wrap = A().adminPageWrap('Pagos y facturación',
      [el('span',{},'Comercial'),el('b',{style:'color:var(--txt)'},'Pagos')], null
    );
    try {
      const payments = await window.Fluve.dao.payments.getAll();
      const sorted   = [...payments].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));

      const total = payments.filter(p=>p.status==='approved').reduce((s,p)=>s+p.amount,0);
      const refunded = payments.filter(p=>p.status==='refunded').reduce((s,p)=>s+p.amount,0);

      wrap.append(
        el('div',{style:'display:flex;gap:12px;margin-bottom:20px'},
          el('div',{class:'kpi-card'},el('div',{class:'kpi-card__val',style:'color:var(--green)'},A().moneyStr(total)),el('div',{class:'kpi-card__label'},'Ingresos totales')),
          el('div',{class:'kpi-card'},el('div',{class:'kpi-card__val',style:'color:var(--magenta)'},A().moneyStr(refunded)),el('div',{class:'kpi-card__label'},'Reembolsado')),
          el('div',{class:'kpi-card'},el('div',{class:'kpi-card__val'},String(payments.length)),el('div',{class:'kpi-card__label'},'Transacciones')),
        ),
        A().tableWrap(
          ['ID Tx','Pedido','Método','Monto','Estado','Fecha',''],
          sorted.map(p=>{
            const STATUS_PAY={approved:'status-entregado',refunded:'status-cancelado',pending:'status-produccion',failed:'status-cancelado'};
            return el('tr',{},
              el('td',{class:'mono-label'},p.id),
              el('td',{},el('a',{href:`#/admin/pedidos/${p.orderId}`,class:'mono-label',style:'color:var(--accent2)'},'#'+p.orderId)),
              el('td',{class:'tbl__muted'},p.method?.toUpperCase()??'—'),
              el('td',{class:'tbl__num'},A().moneyStr(p.amount)),
              el('td',{},el('span',{class:`order-status-chip ${STATUS_PAY[p.status]??''}`},p.status==='approved'?'Aprobado':p.status==='refunded'?'Reembolsado':p.status==='pending'?'Pendiente':'Error')),
              el('td',{class:'tbl__muted'},new Date(p.createdAt).toLocaleDateString('es-UY')),
              el('td',{},p.status==='approved'?el('button',{class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:async()=>{
                const ok=await window.Fluve.confirm({title:'Reembolsar pago',message:`Reembolsar ${A().moneyStr(p.amount)} de la transacción ${p.id}. Esta acción queda en el registro.`,confirmLabel:'Reembolsar',danger:true});
                if(!ok)return;
                await window.Fluve.dao.payments.put({...p,status:'refunded'});
                await window.Fluve.dao.orders.get(p.orderId).then(o=>{if(o)window.Fluve.dao.orders.put({...o,status:'cancelado'});});
                await window.Fluve.dao.logActivity('payment.refund','payments',p.id,{before:{status:'approved'},after:{status:'refunded'}});
                window.Fluve.toast('Reembolso registrado','success');
                window.Fluve.router.navigate('#/admin/pagos');
              }},'↩ Reembolsar'):null),
            );
          })
        ),
      );
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
  }

  // ── A17 PROMOS Y CUPONES ───────────────────────────────────────────────────────
  async function adminPromos() {
    const wrap = A().adminPageWrap('Promociones y cupones',
      [el('span',{},'Comercial'),el('b',{style:'color:var(--txt)'},'Promos')], null
    );
    const tableSlot = el('div');
    wrap.append(tableSlot);

    async function loadAndRender(){
      tableSlot.replaceChildren(window.Fluve.viewState('loading',{rows:2}));
      try {
        const promos = await window.Fluve.dao.promos.getAll();
        tableSlot.replaceChildren(
          el('div',{style:'display:flex;gap:8px;margin-bottom:14px'},
            el('button',{class:'btn btn--primary',style:'font-size:13px',type:'button',onclick:()=>showPromoModal(null,loadAndRender)},'+ Nuevo cupón'),
          ),
          promos.length ? A().tableWrap(
            ['Código','Tipo','Valor','Mín. subtotal','Vigencia','Estado',''],
            promos.map(p=>el('tr',{},
              el('td',{class:'mono-label',style:'color:var(--txt);font-size:13px'},p.code),
              el('td',{},el('span',{class:`promo-type-badge ${p.type==='percent'?'promo-type-percent':p.type==='freeship'?'promo-type-freeship':''}`},p.type==='percent'?'%':p.type==='freeship'?'ENVÍO':p.type.toUpperCase())),
              el('td',{class:'tbl__num'},p.type==='percent'?p.value+'%':p.type==='freeship'?'Gratis':'$'+p.value),
              el('td',{class:'tbl__num'},p.minSubtotal>0?'$'+p.minSubtotal:'Sin mínimo'),
              el('td',{class:'tbl__muted'},p.expiresAt?new Date(p.expiresAt).toLocaleDateString('es-UY'):'Sin vencimiento'),
              el('td',{},el('span',{class:p.active?'promo-active':'promo-inactive'},p.active?'● Activo':'○ Inactivo')),
              el('td',{},el('div',{style:'display:flex;gap:6px'},
                el('button',{class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:async()=>{
                  await window.Fluve.dao.promos.put({...p,active:!p.active});
                  await window.Fluve.dao.logActivity('promo.toggle','promos',p.code,{after:{active:!p.active}});
                  window.Fluve.toast(p.active?'Cupón desactivado':'Cupón activado','success');
                  loadAndRender();
                }},p.active?'Pausar':'Activar'),
                el('button',{class:'btn btn--danger',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:async()=>{
                  const ok=await window.Fluve.confirm({title:'Eliminar cupón',message:`El cupón "${p.code}" se eliminará permanentemente.`,confirmLabel:'Eliminar',danger:true});
                  if(!ok)return;
                  await window.Fluve.dao.promos.delete(p.code);
                  await window.Fluve.dao.logActivity('promo.delete','promos',p.code);
                  window.Fluve.toast('Cupón "'+p.code+'" eliminado','success');
                  loadAndRender();
                }},'Eliminar'),
              )),
            ))
          ) : window.Fluve.viewState('empty',{title:'Sin cupones',message:'Creá el primer cupón de descuento.'}),
        );
      } catch(err){ tableSlot.replaceChildren(window.Fluve.viewState('error',{message:err.message})); }
    }

    function showPromoModal(existing,onSuccess){
      const modalRoot=document.getElementById('modal-root');
      let code=existing?.code??'',type=existing?.type??'percent',value=existing?.value??10,minSub=existing?.minSubtotal??0;
      const modal=el('div',{class:'modal-overlay',onclick:(e)=>{if(e.target===modal){modal.remove();}}},
        el('div',{class:'modal',style:'max-width:420px'},
          el('h3',{class:'modal__title'},existing?'Editar cupón':'Nuevo cupón'),
          el('div',{class:'admin-form'},
            el('div',{class:'field'},el('label',{class:'field__label'},'Código'),el('input',{class:'admin-fld',type:'text',placeholder:'WELCOME10',value:code,oninput:e=>code=e.target.value.toUpperCase()})),
            el('div',{class:'field'},el('label',{class:'field__label'},'Tipo'),el('select',{class:'admin-fld',onchange:e=>type=e.target.value},el('option',{value:'percent'},'Porcentaje'),el('option',{value:'freeship'},'Envío gratis'),el('option',{value:'fixed'},'Monto fijo'))),
            el('div',{class:'field'},el('label',{class:'field__label'},'Valor (% o $)'),el('input',{class:'admin-fld',type:'number',value:value,oninput:e=>value=parseFloat(e.target.value)||0})),
            el('div',{class:'field'},el('label',{class:'field__label'},'Subtotal mínimo'),el('input',{class:'admin-fld',type:'number',value:minSub,oninput:e=>minSub=parseFloat(e.target.value)||0})),
          ),
          el('div',{class:'modal__actions'},
            el('button',{class:'btn btn--ghost',type:'button',onclick:()=>modal.remove()},'Cancelar'),
            el('button',{class:'btn btn--primary',type:'button',onclick:async()=>{
              if(!code.trim()){window.Fluve.toast('Ingresá un código','error');return;}
              const promo={code:code.trim().toUpperCase(),type,value,minSubtotal:minSub,active:true,expiresAt:new Date(Date.now()+30*86400000).toISOString()};
              await window.Fluve.dao.promos.put(promo);
              await window.Fluve.dao.logActivity('promo.create','promos',promo.code,{after:promo});
              window.Fluve.toast('Cupón "'+promo.code+'" creado','success');
              modal.remove(); onSuccess();
            }},'Guardar'),
          ),
        ),
      );
      modalRoot.append(modal);
    }

    loadAndRender();
    return wrap;
  }

  // ── A18 SOPORTE / TICKETS LIST ────────────────────────────────────────────────
  async function adminSoporte({ query }) {
    const filterStatus = query.status || 'open';
    let activeFilter = filterStatus;
    const wrap = A().adminPageWrap('Soporte / Tickets',
      [el('span',{},'Sistema'),el('b',{style:'color:var(--txt)'},'Soporte')], null
    );
    const tableSlot = el('div');
    wrap.append(tableSlot);

    let allTickets = [], users = [];
    try {
      [allTickets, users] = await Promise.all([
        window.Fluve.dao.tickets.getAll(),
        window.Fluve.dao.users.getAll(),
      ]);
    } catch(err){ tableSlot.replaceChildren(window.Fluve.viewState('error',{message:err.message})); return wrap; }
    const userMap = Object.fromEntries(users.map(u=>[u.id,u]));

    function render(){
      const filt = activeFilter==='all' ? allTickets : allTickets.filter(t=>t.status===activeFilter);
      tableSlot.replaceChildren(
        el('div',{style:'display:flex;gap:8px;margin-bottom:14px'},
          ...[['open','Abiertos'],['pending','Pendientes'],['closed','Cerrados'],['all','Todos']].map(([s,label])=>
            el('span',{class:`filter-pill${activeFilter===s?' active':''}`,style:'cursor:pointer',onclick:()=>{activeFilter=s;render();}},
              label+' ('+allTickets.filter(t=>s==='all'||t.status===s).length+')'
            )
          ),
        ),
        filt.length ? A().tableWrap(
          ['Ticket','Asunto','Cliente','Pedido','Estado',''],
          filt.map(t=>{
            const u=userMap[t.userId];
            const STATUS_T={open:'status-en_camino',pending:'status-produccion',closed:'status-entregado'};
            return el('tr',{},
              el('td',{class:'mono-label'},t.id),
              el('td',{style:"font:600 12.5px 'Space Grotesk'"},t.subject),
              el('td',{},el('div',{style:"font:500 12px 'Inter'"},u?.name??'—'),el('div',{class:'mono-label'},u?.email??'')),
              el('td',{},t.orderId?el('a',{href:`#/admin/pedidos/${t.orderId}`,class:'mono-label',style:'color:var(--accent2)'},'#'+t.orderId):'—'),
              el('td',{},el('span',{class:`order-status-chip ${STATUS_T[t.status]??''}`},t.status==='open'?'Abierto':t.status==='pending'?'Pendiente':'Cerrado')),
              el('td',{},el('a',{href:`#/admin/soporte/${t.id}`,class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px'},'Ver')),
            );
          })
        ) : window.Fluve.viewState('empty',{title:'Sin tickets en este estado'}),
      );
    }
    render();
    return wrap;
  }

  // ── A43 TICKET DETALLE ────────────────────────────────────────────────────────
  async function adminTicketDetalle({ params }) {
    const ticketId = params.id;
    const wrap = A().adminPageWrap('Detalle de ticket',
      [el('span',{},'Sistema'),el('a',{href:'#/admin/soporte'},'Soporte'),el('b',{style:'color:var(--txt)'},ticketId)], null
    );

    let ticket, user;
    try {
      ticket = await window.Fluve.dao.tickets.get(ticketId);
      if(!ticket){ wrap.append(window.Fluve.viewState('not-found',{message:'Ticket no encontrado'})); return wrap; }
      user = await window.Fluve.dao.users.get(ticket.userId);
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); return wrap; }

    const messagesEl = el('div',{class:'ticket-thread'});

    function renderMessages(){
      messagesEl.replaceChildren(...(ticket.messages??[]).map(m=>el('div',{class:`ticket-msg ${m.from.startsWith('user')||m.from===ticket.userId?'ticket-msg--client':'ticket-msg--staff'}`},
        el('div',{class:'ticket-msg__meta'},(m.from===ticket.userId?'🙍 '+user?.name:' 👤 Staff')+' · '+new Date(m.at).toLocaleString('es-UY')),
        m.text,
      )));
    }

    let replyText = '';
    const replyInput = el('textarea',{class:'admin-fld',style:'resize:vertical;min-height:80px',placeholder:'Escribí tu respuesta...',oninput:e=>replyText=e.target.value});

    const replyBtn = el('button',{class:'btn btn--primary',type:'button',style:'align-self:flex-start',onclick:async()=>{
      if(!replyText.trim()){window.Fluve.toast('Escribí un mensaje','error');return;}
      const msg={from:'user-staff',text:replyText.trim(),at:new Date().toISOString()};
      ticket.messages=(ticket.messages??[]).concat(msg);
      await window.Fluve.dao.tickets.put({...ticket});
      await window.Fluve.dao.logActivity('ticket.reply','tickets',ticketId,{after:{msg:replyText.trim().slice(0,50)}});
      replyInput.value=''; replyText='';
      renderMessages();
      window.Fluve.toast('Respuesta enviada al cliente','success');
    }},'Enviar respuesta');

    const closeBtn = el('button',{class:'btn btn--ghost',type:'button',onclick:async()=>{
      await window.Fluve.dao.tickets.put({...ticket,status:'closed'});
      await window.Fluve.dao.logActivity('ticket.close','tickets',ticketId);
      window.Fluve.toast('Ticket cerrado','success');
      ticket.status='closed';
    }},'✓ Cerrar ticket');

    renderMessages();

    wrap.append(
      el('div',{style:'display:grid;grid-template-columns:1fr 280px;gap:16px'},
        el('div',{},
          el('div',{class:'card',style:'margin-bottom:14px'},
            el('div',{style:"font:700 15px 'Space Grotesk';margin-bottom:4px"},ticket.subject),
            el('div',{class:'mono-label'},'#'+ticket.id+(ticket.orderId?' · Pedido #'+ticket.orderId:'')),
          ),
          el('div',{class:'card',style:'display:flex;flex-direction:column;gap:10px'},
            messagesEl,
            el('div',{style:'border-top:1px solid var(--line);padding-top:12px;display:flex;flex-direction:column;gap:8px'},
              replyInput,
              el('div',{style:'display:flex;gap:8px'},replyBtn,closeBtn),
            ),
          ),
        ),
        el('div',{class:'card',style:'height:fit-content'},
          el('div',{class:'mono-label',style:'margin-bottom:10px'},'Cliente'),
          el('div',{style:"font:600 13px 'Space Grotesk'"},user?.name??'Invitado'),
          el('div',{class:'mono-label',style:'margin-top:2px'},user?.email??'—'),
          ticket.orderId ? el('div',{style:'margin-top:12px;border-top:1px solid var(--line);padding-top:10px'},
            el('a',{href:`#/admin/pedidos/${ticket.orderId}`,class:'btn btn--ghost',style:'font-size:12px;width:100%;justify-content:center'},'Ver pedido #'+ticket.orderId)
          ) : null,
          el('div',{style:'margin-top:12px;border-top:1px solid var(--line);padding-top:10px'},
            el('a',{href:'#/admin/pagos',class:'btn btn--ghost',style:'font-size:12px;width:100%;justify-content:center'},'↩ Escalar a reembolso'),
          ),
        ),
      ),
    );
    return wrap;
  }

  // ── Export ────────────────────────────────────────────────────────────────────
  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.admin = window.Fluve.views.admin || {};
  Object.assign(window.Fluve.views.admin, {
    clientes:      adminClientes,
    clienteDetalle:adminClienteDetalle,
    pagos:         adminPagos,
    promos:        adminPromos,
    soporte:       adminSoporte,
    ticketDetalle: adminTicketDetalle,
  });
})();
