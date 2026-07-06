// views/admin/operacion.js — A1 Dashboard · A2 Pedidos · A3 Detalle · A4 Producción · A5/A36 Proveedores · A35/A6 Calidad · A7 Packaging · A8 Envíos
// Shared admin helpers + todas las vistas de operación. Namespace: window.Fluve.views.admin.*
(function () {
  const { el } = window.Fluve.dom;

  // ── Helpers compartidos (exportados a window.Fluve.admin) ──────────────────
  const STATUS_LABELS  = { recibido:'Recibido', produccion:'En producción', qc:'QC+Pkg', en_camino:'En camino', entregado:'Entregado', cancelado:'Cancelado' };
  const STATUS_CLS     = { recibido:'status-recibido', produccion:'status-produccion', qc:'status-qc', en_camino:'status-en_camino', entregado:'status-entregado', cancelado:'status-cancelado' };
  const PE             = { remera:'👕', hoodie:'🧥', taza:'☕', tote:'👜', funda:'📱', cuadro:'🖼️' };
  const ORDER_FLOW     = ['recibido','produccion','qc','en_camino','entregado'];

  function statusBadge(status){ return el('span',{class:`order-status-chip ${STATUS_CLS[status]??''}`},STATUS_LABELS[status]??status); }
  function moneyStr(n){ return '$'+(Number(n??0)).toFixed(2).replace('.',','); }
  function dateStr(s){ return s?new Date(s).toLocaleDateString('es-UY',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'; }

  function adminPageWrap(title, crumbParts, primaryBtn, ...content){
    return el('div',{class:'fu'},
      el('div',{style:'display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px'},
        el('div',{},
          crumbParts?.length ? el('div',{class:'admin-crumb',style:'margin-bottom:6px'},...crumbParts.flatMap((p,i)=>i===0?[p]:[el('span',{},'›'),p])) : null,
          el('h2',{style:"font:600 26px 'Space Grotesk';letter-spacing:-.5px;margin:0"},title),
        ),
        primaryBtn??null,
      ),
      ...content,
    );
  }

  function tableWrap(head, rows){
    return el('div',{class:'tbl-wrap'},
      el('table',{class:'tbl'},
        el('thead',{},el('tr',{},...head.map(h=>el('th',{},h)))),
        el('tbody',{},...rows),
      ),
    );
  }

  function kpi(value,label,sub,color,href){
    const card=el('div',{class:'kpi-card',style:color?`border-color:${color}30`:''});
    card.append(
      el('div',{class:'kpi-card__val',style:`color:${color||'var(--txt)'}`},String(value)),
      el('div',{class:'kpi-card__label'},label),
      sub?el('div',{class:'kpi-card__sub',style:`color:${color||'var(--mut)'}`},sub):null,
    );
    if(href) card.addEventListener('click',()=>window.Fluve.router.navigate(href));
    return card;
  }

  function alertItem(dot,label,count,href){
    const a=el('a',{href:href,class:'alert-item'},
      el('span',{class:'alert-item__dot',style:`background:${dot}`}),
      el('span',{class:'alert-item__label'},label),
      el('span',{class:'alert-item__count'},String(count)),
    );
    return a;
  }

  // ── A1 DASHBOARD ─────────────────────────────────────────────────────────────
  async function adminDashboard() {
    const wrap = adminPageWrap('Dashboard',null,null);
    const grid = el('div',{style:'display:flex;flex-direction:column;gap:20px'});
    wrap.append(grid);
    grid.append(window.Fluve.viewState('loading',{rows:3}));

    try {
      const [orders, products, designs, royalties, payments] = await Promise.all([
        window.Fluve.dao.orders.getAll(),
        window.Fluve.dao.products.getAll(),
        window.Fluve.dao.designs.getAll(),
        window.Fluve.dao.royalties.getAll(),
        window.Fluve.dao.payments.getAll(),
      ]);

      const activeOrders  = orders.filter(o=>!['entregado','cancelado'].includes(o.status));
      const inProd        = orders.filter(o=>['produccion','qc'].includes(o.status));
      const noSupplier    = activeOrders.filter(o=>!o.supplierId);
      const qcPending     = orders.filter(o=>o.status==='qc');
      const revenue       = payments.filter(p=>p.status==='approved').reduce((s,p)=>s+p.amount,0);
      const pendingRoy    = royalties.filter(r=>r.status==='pending').reduce((s,r)=>s+r.amount,0);
      const pendingDesign = designs.filter(d=>d.status==='pending').length;

      grid.replaceChildren(
        // KPIs
        el('div',{class:'kpi-grid'},
          kpi(activeOrders.length,'Pedidos activos',inProd.length+' en producción','var(--accent2)','#/admin/pedidos'),
          kpi(moneyStr(revenue),'Ingresos','pedidos pagados','var(--green)','#/admin/pagos'),
          kpi(moneyStr(pendingRoy),'Regalías pendientes',royalties.filter(r=>r.status==='pending').length+' liquidaciones','var(--yellow)','#/admin/artistas'),
          kpi(pendingDesign,'Diseños a moderar',designs.length+' en total','var(--magenta)','#/admin/disenos'),
        ),

        // Alertas operativas
        el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:16px'},
          el('div',{class:'card'},
            el('div',{class:'mono-label',style:'margin-bottom:12px'},'⚠ Alertas operativas'),
            el('div',{class:'alert-list'},
              noSupplier.length ? alertItem('var(--magenta)','Pedidos sin proveedor',noSupplier.length,'#/admin/pedidos?filter=sin-proveedor') : null,
              qcPending.length  ? alertItem('var(--yellow)','QC pendiente',qcPending.length,'#/admin/calidad') : null,
              pendingDesign     ? alertItem('var(--cyan)','Diseños por moderar',pendingDesign,'#/admin/disenos') : null,
              (!noSupplier.length && !qcPending.length && !pendingDesign) ? el('div',{class:'mono-label',style:'color:var(--green)'},'✓ Sin alertas activas') : null,
            ),
          ),
          el('div',{class:'card'},
            el('div',{class:'mono-label',style:'margin-bottom:12px'},'📦 Pedidos recientes'),
            el('div',{style:'display:flex;flex-direction:column;gap:6px'},
              ...orders.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5).map(o=>
                el('a',{href:`#/admin/pedidos/${o.id}`,style:'display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-radius:8px;background:var(--ink3);text-decoration:none;transition:background .12s'},
                  el('span',{style:"font:600 11px 'Space Mono';color:var(--accent2)"},'#'+o.id),
                  statusBadge(o.status),
                  el('span',{style:"font:500 11px 'Inter';color:var(--mut)"},moneyStr(o.total)),
                )
              ),
            ),
          ),
        ),
      );
    } catch(err){
      grid.replaceChildren(window.Fluve.viewState('error',{message:err.message}));
    }
    return wrap;
  }

  // ── A2 PEDIDOS LIST ───────────────────────────────────────────────────────────
  async function adminPedidos({ query }) {
    const filterStatus = query.filter || query.status || '';
    const searchQ      = query.q || '';

    const wrap = adminPageWrap(
      'Pedidos',
      [el('span',{},'Operación'), el('b',{style:'color:var(--txt)'},'Pedidos')],
      el('a',{href:'#/admin/pedidos/nuevo',class:'btn btn--primary',style:'font-size:13px'},'+ Nuevo pedido'),
    );

    // Filtros de estado
    const STATUS_FILTERS = [['todos','Todos'],['recibido','Recibido'],['produccion','Producción'],['qc','QC'],['en_camino','En camino'],['entregado','Entregado'],['cancelado','Cancelado']];
    let activeFilter = filterStatus || 'todos';
    let activeSearch = searchQ;
    const tableSlot  = el('div');
    wrap.append(tableSlot);
    tableSlot.append(window.Fluve.viewState('loading',{rows:3}));

    let allOrders = [], suppliers = [];
    try {
      [allOrders, suppliers] = await Promise.all([
        window.Fluve.dao.orders.getAll(),
        window.Fluve.dao.suppliers.getAll(),
      ]);
    } catch(err){ tableSlot.replaceChildren(window.Fluve.viewState('error',{message:err.message})); return wrap; }

    const supMap = Object.fromEntries(suppliers.map(s=>[s.id,s]));

    function filtered(){
      return allOrders.filter(o=>{
        if(activeFilter==='sin-proveedor') return !o.supplierId;
        if(activeFilter&&activeFilter!=='todos'&&o.status!==activeFilter) return false;
        if(activeSearch){const q=activeSearch.toLowerCase(); if(!o.id.toLowerCase().includes(q)&&!o.contact?.email?.toLowerCase().includes(q)&&!o.contact?.name?.toLowerCase().includes(q)) return false;}
        return true;
      }).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    }

    function render(){
      const filt = filtered();
      tableSlot.replaceChildren(
        // Filtro pills + búsqueda
        el('div',{style:'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center'},
          ...STATUS_FILTERS.map(([val,label])=>
            el('span',{class:`filter-pill${activeFilter===val?' active':''}`,style:'cursor:pointer',onclick:()=>{activeFilter=val;render();}},label)
          ),
          el('input',{class:'admin-fld',type:'search',placeholder:'Buscar pedido, email, cliente…',value:activeSearch,style:'margin-left:auto;width:220px;min-height:36px',
            oninput:(e)=>{activeSearch=e.target.value;render();}
          }),
        ),
        el('div',{class:'mono-label',style:'margin-bottom:8px'},`${filt.length} pedidos${activeSearch?' · "'+activeSearch+'"':''}`),
        filt.length ? tableWrap(
          ['','Pedido','Cliente','Estado','Proveedor','Total','Fecha',''],
          filt.map(o=>{
            const line=o.lines?.[0];
            const sla = (Date.now()-new Date(o.createdAt).getTime())>172800000&&o.status!=='entregado'&&o.status!=='cancelado';
            return el('tr',{},
              el('td',{},el('input',{type:'checkbox'})),
              el('td',{},el('a',{href:`#/admin/pedidos/${o.id}`,class:'mono-label',style:'color:var(--accent2)'},'#'+o.id),sla?el('span',{class:'sla-risk',style:'margin-left:6px;font-size:10px'},'⚠SLA'):null),
              el('td',{style:"font:500 12px 'Inter'"},o.contact?.name??'Invitado',el('br'),el('span',{class:'mono-label'},o.contact?.email??'')),
              el('td',{},statusBadge(o.status)),
              el('td',{class:'tbl__muted'},supMap[o.supplierId]?.name??el('span',{style:'color:var(--magenta)'},'Sin asignar')),
              el('td',{class:'tbl__num'},moneyStr(o.total)),
              el('td',{class:'tbl__muted'},new Date(o.createdAt).toLocaleDateString('es-UY')),
              el('td',{},el('a',{href:`#/admin/pedidos/${o.id}`,class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px'},'Ver')),
            );
          })
        ) : window.Fluve.viewState('empty',{title:'No hay pedidos',message:'No coinciden con el filtro actual.'}),
      );
    }
    render();
    return wrap;
  }

  // ── A3 PEDIDO DETALLE ─────────────────────────────────────────────────────────
  async function adminPedidoDetalle({ params }) {
    const orderId = params.id;
    let order, suppliers, users;
    try {
      [order, suppliers, users] = await Promise.all([
        window.Fluve.dao.orders.get(orderId),
        window.Fluve.dao.suppliers.getAll(),
        window.Fluve.dao.users.getAll(),
      ]);
    } catch(err){ return window.Fluve.viewState('error',{message:err.message}); }
    if(!order) return window.Fluve.viewState('not-found',{message:'Pedido no encontrado: #'+orderId});

    const supMap = Object.fromEntries(suppliers.map(s=>[s.id,s]));

    const wrap = adminPageWrap(
      '#'+order.id,
      [el('a',{href:'#/admin/pedidos'},'Pedidos'),el('b',{style:'color:var(--txt)'},'#'+order.id)],
      el('div',{style:'display:flex;gap:8px'},
        el('button',{class:'btn btn--ghost',style:'font-size:12px',type:'button',onclick:()=>window.print()},'🖨 Imprimir'),
        el('button',{class:'btn btn--ghost',style:'font-size:12px',type:'button',onclick:()=>window.Fluve.toast('Orden enviada al proveedor (simulado)','success')},'📤 Enviar orden'),
      ),
    );

    // Flujo visual
    const currentStepIdx = ORDER_FLOW.indexOf(order.status);
    const flowEl = el('div',{class:'order-flow',style:'margin-bottom:16px'});
    ORDER_FLOW.forEach((step,i)=>{
      const done=i<currentStepIdx, active=i===currentStepIdx;
      flowEl.append(
        el('div',{class:'order-flow-step'},
          el('div',{class:`order-flow-step__dot ${done?'order-flow-step__dot--done':active?'order-flow-step__dot--active':'order-flow-step__dot--pending'}`},done?'✓':active?'●':'○'),
          el('span',{class:'mono-label',style:active?'color:var(--txt)':''},STATUS_LABELS[step]??step),
        ),
        i<ORDER_FLOW.length-1?el('span',{class:'order-flow-sep',style:'color:var(--line2)'},'————'):null,
      );
    });
    wrap.append(flowEl);

    // Grid: info izq + acciones der
    const grid = el('div',{class:'order-detail-grid'});
    wrap.append(grid);

    // Info del pedido
    const leftCol = el('div',{style:'display:flex;flex-direction:column;gap:14px'});
    // Líneas
    leftCol.append(el('div',{class:'card'},
      el('div',{class:'mono-label',style:'margin-bottom:10px'},'Líneas del pedido'),
      el('div',{style:'display:flex;flex-direction:column;gap:8px'},
        ...order.lines.map(l=>el('div',{style:'display:flex;align-items:center;gap:12px;padding:8px;border-radius:9px;background:var(--ink3)'},
          el('span',{style:'font-size:24px'},(PE[l.productId]??'📦')),
          el('div',{style:'flex:1'},
            el('div',{style:"font:600 13px 'Space Grotesk'"},(l.productName??l.productId)),
            el('div',{class:'mono-label'},[l.config.color,l.config.size,l.config.techniqueId?.toUpperCase(),l.config.side==='both'?'Ambos lados':''].filter(Boolean).join(' · ')),
            el('div',{class:'mono-label'},'x'+l.config.qty+' ud.'),
          ),
          el('span',{style:"font:600 13px 'Space Grotesk'"},moneyStr(l.lineTotal)),
        ))
      ),
      el('div',{style:'display:flex;justify-content:space-between;padding:10px 8px 0;border-top:1px solid var(--line);margin-top:8px'},
        el('span',{class:'mono-label'},'TOTAL'),
        el('span',{style:"font:700 16px 'Space Grotesk'"},moneyStr(order.total)),
      ),
    ));
    // Contacto
    leftCol.append(el('div',{class:'card'},
      el('div',{class:'mono-label',style:'margin-bottom:8px'},'Contacto + envío'),
      el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:8px;font:400 12.5px var(--font-body);color:var(--mut)'},
        el('div',{},el('div',{class:'mono-label',style:'margin-bottom:3px'},'NOMBRE'),order.contact?.name??'—'),
        el('div',{},el('div',{class:'mono-label',style:'margin-bottom:3px'},'EMAIL'),order.contact?.email??'—'),
        el('div',{},el('div',{class:'mono-label',style:'margin-bottom:3px'},'TELÉFONO'),order.contact?.phone??'—'),
        el('div',{},el('div',{class:'mono-label',style:'margin-bottom:3px'},'DIRECCIÓN'),order.shippingAddress?.line??'—'),
      ),
    ));
    grid.append(leftCol);

    // Panel derecho: acciones del flujo
    const rightCol = el('div',{style:'display:flex;flex-direction:column;gap:10px'});
    // Proveedor
    const supSel = el('select',{class:'admin-fld',style:'width:100%'},
      el('option',{value:''},'Sin asignar'),
      ...suppliers.map(s=>el('option',{value:s.id,selected:s.id===order.supplierId?'true':null},s.name)),
    );
    const asignBtn=el('button',{class:'btn btn--primary',style:'width:100%;justify-content:center',type:'button',onclick:async()=>{
      try{
        const sid=supSel.value||null;
        await window.Fluve.dao.orders.put({...order,supplierId:sid});
        await window.Fluve.dao.logActivity('order.assign_supplier','orders',orderId,{before:{supplierId:order.supplierId},after:{supplierId:sid}});
        window.Fluve.toast(sid?'Proveedor asignado':'Proveedor removido','success');
        window.Fluve.router.navigate('#/admin/pedidos/'+orderId);
      }catch(e){window.Fluve.toast(e.message,'error');}
    }},'Guardar proveedor');

    rightCol.append(el('div',{class:'card'},
      el('div',{class:'mono-label',style:'margin-bottom:10px'},'Proveedor asignado'),
      supSel, el('div',{style:'margin-top:8px'},asignBtn),
    ));

    // Avanzar flujo
    const nextStatus = ORDER_FLOW[Math.min(currentStepIdx+1,ORDER_FLOW.length-1)];
    if(order.status!=='entregado'&&order.status!=='cancelado'){
      const advBtn=el('button',{class:'btn btn--primary',style:'width:100%;justify-content:center',type:'button',onclick:async()=>{
        const ok=await window.Fluve.confirm({title:'Avanzar estado',message:`Cambiar de "${STATUS_LABELS[order.status]}" a "${STATUS_LABELS[nextStatus]}". Esta acción queda en el registro.`,confirmLabel:'Confirmar'});
        if(!ok)return;
        const now=new Date().toISOString();
        const updatedSteps=(order.trackingSteps||[]).map(s=>s.step===nextStatus?{...s,done:true,at:now}:s);
        await window.Fluve.dao.orders.put({...order,status:nextStatus,trackingSteps:updatedSteps});
        await window.Fluve.dao.logActivity('order.status_change','orders',orderId,{before:{status:order.status},after:{status:nextStatus}});
        window.Fluve.toast('Estado actualizado: '+STATUS_LABELS[nextStatus],'success');
        window.Fluve.router.navigate('#/admin/pedidos/'+orderId);
      }},`→ Marcar: ${STATUS_LABELS[nextStatus]}`);
      rightCol.append(el('div',{class:'card'},el('div',{class:'mono-label',style:'margin-bottom:8px'},'Avanzar flujo'),advBtn));
    }

    // Cancelar
    if(!['entregado','cancelado'].includes(order.status)){
      const cancelBtn=el('button',{class:'btn btn--danger',style:'width:100%;justify-content:center',type:'button',onclick:async()=>{
        const ok=await window.Fluve.confirm({title:'Cancelar pedido',message:'Esta acción no se puede deshacer. El stock no se restaura automáticamente.',confirmLabel:'Cancelar pedido',danger:true});
        if(!ok)return;
        await window.Fluve.dao.orders.put({...order,status:'cancelado'});
        await window.Fluve.dao.logActivity('order.cancel','orders',orderId,{before:{status:order.status},after:{status:'cancelado'}});
        window.Fluve.toast('Pedido cancelado','success');
        window.Fluve.router.navigate('#/admin/pedidos');
      }},'✕ Cancelar pedido');
      rightCol.append(el('div',{class:'card'},cancelBtn));
    }

    grid.append(rightCol);
    return wrap;
  }

  // ── A4 PRODUCCIÓN (Kanban) ────────────────────────────────────────────────────
  async function adminProduccion() {
    const wrap = adminPageWrap('Producción',
      [el('span',{},'Operación'),el('b',{style:'color:var(--txt)'},'Producción')], null
    );
    wrap.append(window.Fluve.viewState('loading',{rows:3}));
    try {
      const [orders, suppliers] = await Promise.all([
        window.Fluve.dao.orders.getAll(),
        window.Fluve.dao.suppliers.getAll(),
      ]);
      const supMap = Object.fromEntries(suppliers.map(s=>[s.id,s]));
      const active = orders.filter(o=>!['entregado','cancelado'].includes(o.status));
      const COLS=[
        {status:'recibido', label:'Sin asignar', color:'var(--mut)', next:'produccion', nextLabel:'→ Asignar y producir'},
        {status:'produccion', label:'En producción', color:'var(--yellow)', next:'qc', nextLabel:'→ Recibir / QC'},
        {status:'qc', label:'Control de calidad', color:'var(--cyan)', next:'en_camino', nextLabel:'→ Despachar'},
        {status:'en_camino', label:'Enviados', color:'var(--accent2)', next:'entregado', nextLabel:'→ Confirmar entrega'},
      ];
      wrap.replaceChildren(
        el('h2',{style:"font:600 26px 'Space Grotesk';letter-spacing:-.5px;margin:0 0 18px"},'Producción'),
        el('div',{class:'kanban-board'},
          ...COLS.map(col=>{
            const colOrders = active.filter(o=>o.status===col.status);
            return el('div',{class:'kanban-col'},
              el('div',{class:'kanban-col__header'},
                el('span',{class:'kanban-col__title',style:`color:${col.color}`},col.label),
                el('span',{class:'kanban-col__count'},String(colOrders.length)),
              ),
              ...colOrders.map(o=>el('div',{class:'kanban-card'},
                el('div',{class:'kanban-card__id'},'#'+o.id),
                el('div',{class:'kanban-card__title'},(o.lines?.[0]?.productName??o.lines?.[0]?.productId??'Pedido')),
                el('div',{class:'kanban-card__meta'},supMap[o.supplierId]?.name??'Sin proveedor'),
                el('div',{class:'kanban-card__meta'},moneyStr(o.total)),
                el('button',{class:'btn btn--ghost kanban-card__action',style:'font-size:11px;min-height:30px',type:'button',
                  onclick:()=>window.Fluve.router.navigate('#/admin/pedidos/'+o.id)
                },'Ver detalle'),
              )),
              !colOrders.length?el('div',{class:'mono-label',style:'text-align:center;padding:20px 0'},'Sin pedidos'):null,
            );
          })
        ),
      );
    } catch(err){ wrap.replaceChildren(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
  }

  // ── A5 PROVEEDORES LIST ───────────────────────────────────────────────────────
  async function adminProveedores() {
    const wrap = adminPageWrap('Proveedores',
      [el('span',{},'Operación'),el('b',{style:'color:var(--txt)'},'Proveedores')],
      el('button',{class:'btn btn--primary',style:'font-size:13px',type:'button',onclick:()=>window.Fluve.toast('Alta de proveedor — disponible con formulario C2','default')},'+ Nuevo proveedor'),
    );
    try {
      const suppliers = await window.Fluve.dao.suppliers.getAll();
      const orders    = await window.Fluve.dao.orders.getAll();
      const countMap  = {};
      orders.filter(o=>o.supplierId).forEach(o=>countMap[o.supplierId]=(countMap[o.supplierId]??0)+1);
      if(!suppliers.length){ wrap.append(window.Fluve.viewState('empty',{title:'Sin proveedores',message:'Cargá el seed para ver proveedores de ejemplo.'})); return wrap; }
      wrap.append(tableWrap(
        ['Proveedor','Técnicas','Rating','Pedidos','Estado',''],
        suppliers.map(s=>el('tr',{},
          el('td',{},el('div',{style:"font:600 13px 'Space Grotesk'"},s.name),el('div',{class:'mono-label'},s.zones?.join(', ')??'')),
          el('td',{},el('div',{style:'display:flex;gap:4px;flex-wrap:wrap'},...(s.techniques??[]).map(t=>el('span',{class:'chip',style:'font-size:10px;padding:2px 7px'},t.toUpperCase())))),
          el('td',{class:'tbl__num'},s.rating?'★ '+s.rating:'—'),
          el('td',{class:'tbl__num'},String(countMap[s.id]??0)),
          el('td',{},el('span',{class:`order-status-chip ${s.active?'status-entregado':'status-cancelado'}`},s.active?'Activo':'Inactivo')),
          el('td',{},el('a',{href:`#/admin/proveedores/${s.id}`,class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px'},'Ver')),
        ))
      ));
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
  }

  // ── A35 CALIDAD ───────────────────────────────────────────────────────────────
  async function adminCalidad() {
    const wrap = adminPageWrap('Control de calidad',
      [el('span',{},'Operación'),el('b',{style:'color:var(--txt)'},'Calidad')], null
    );
    try {
      const orders = (await window.Fluve.dao.orders.getAll()).filter(o=>o.status==='qc');
      if(!orders.length){ wrap.append(window.Fluve.viewState('empty',{title:'Sin pedidos en QC',message:'No hay pedidos esperando control de calidad.'})); return wrap; }
      wrap.append(tableWrap(
        ['Pedido','Producto','Proveedor','En QC desde','Acción'],
        orders.map(o=>{
          const qcStep=o.trackingSteps?.find(s=>s.step==='qc');
          return el('tr',{},
            el('td',{},el('a',{href:`#/admin/pedidos/${o.id}`,class:'mono-label',style:'color:var(--accent2)'},'#'+o.id)),
            el('td',{},(PE[o.lines?.[0]?.productId]??'📦')+' '+(o.lines?.[0]?.productName??'—')),
            el('td',{class:'tbl__muted'},o.supplierId??'—'),
            el('td',{class:'tbl__muted'},qcStep?.at?new Date(qcStep.at).toLocaleDateString('es-UY'):'—'),
            el('td',{},el('div',{style:'display:flex;gap:6px'},
              el('button',{class:'btn btn--primary',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:async()=>{
                const now=new Date().toISOString();
                const updSteps=(o.trackingSteps||[]).map(s=>s.step==='en_camino'?{...s,done:true,at:now}:s);
                await window.Fluve.dao.orders.put({...o,status:'en_camino',qcStatus:'passed',trackingSteps:updSteps});
                await window.Fluve.dao.logActivity('order.qc_pass','orders',o.id);
                window.Fluve.toast('QC aprobado — pedido a envíos','success');
                window.Fluve.router.navigate('#/admin/calidad');
              }},'✓ Aprobar'),
              el('button',{class:'btn btn--danger',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:async()=>{
                const ok=await window.Fluve.confirm({title:'Rechazar QC',message:'El pedido vuelve a producción. Se registrará la incidencia.',confirmLabel:'Rechazar',danger:true});
                if(!ok)return;
                await window.Fluve.dao.orders.put({...o,status:'produccion',qcStatus:'failed'});
                await window.Fluve.dao.logActivity('order.qc_fail','orders',o.id);
                window.Fluve.toast('QC rechazado — vuelve a producción','error');
                window.Fluve.router.navigate('#/admin/calidad');
              }},'✕ Rechazar'),
            )),
          );
        })
      ));
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
  }

  // ── A7 PACKAGING ─────────────────────────────────────────────────────────────
  async function adminPackaging() {
    const wrap = adminPageWrap('Packaging', [el('span',{},'Operación'),el('b',{style:'color:var(--txt)'},'Packaging')], null);
    try {
      const orders = (await window.Fluve.dao.orders.getAll()).filter(o=>o.status==='en_camino'||o.qcStatus==='passed');
      if(!orders.length){ wrap.append(window.Fluve.viewState('empty',{title:'Sin pedidos en packaging',message:'No hay pedidos para empaquetar en este momento.'})); return wrap; }
      wrap.append(el('p',{class:'mono-label',style:'margin-bottom:14px'},'Checklist: aplicar acabados Fluvë · caja de marca · tarjeta personalizada · sticker de cierre'),
        tableWrap(['Pedido','Producto','Estado',''],orders.map(o=>el('tr',{},
          el('td',{},el('a',{href:`#/admin/pedidos/${o.id}`,class:'mono-label',style:'color:var(--accent2)'},'#'+o.id)),
          el('td',{},(PE[o.lines?.[0]?.productId]??'📦')+' '+(o.lines?.[0]?.productName??'—')),
          el('td',{},statusBadge(o.status)),
          el('td',{},el('button',{class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:()=>window.Fluve.router.navigate('#/admin/pedidos/'+o.id)},'Ver detalle')),
        )))
      );
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
  }

  // ── A8 ENVÍOS ─────────────────────────────────────────────────────────────────
  async function adminEnvios() {
    const wrap = adminPageWrap('Envíos', [el('span',{},'Operación'),el('b',{style:'color:var(--txt)'},'Envíos')], null);
    try {
      const orders = (await window.Fluve.dao.orders.getAll()).filter(o=>o.status==='en_camino');
      if(!orders.length){ wrap.append(window.Fluve.viewState('empty',{title:'Sin pedidos en tránsito',message:'No hay pedidos en camino en este momento.'})); return wrap; }
      const now = Date.now();
      wrap.append(tableWrap(
        ['Pedido','Destinatario','Método','Tiempo en camino','SLA',''],
        orders.map(o=>{
          const hoursElapsed = Math.floor((now-new Date(o.createdAt).getTime())/3600000);
          const slaOk = hoursElapsed < 48;
          return el('tr',{},
            el('td',{},el('a',{href:`#/admin/pedidos/${o.id}`,class:'mono-label',style:'color:var(--accent2)'},'#'+o.id)),
            el('td',{},o.contact?.name??'—',el('br'),el('span',{class:'mono-label'},o.shippingAddress?.city??'')),
            el('td',{class:'tbl__muted'},o.shippingMethod==='express'?'⚡ Express':'Estándar'),
            el('td',{class:'tbl__num'},hoursElapsed+'h'),
            el('td',{},el('span',{class:slaOk?'sla-ok':'sla-risk'},slaOk?'✓ OK':'⚠ Riesgo SLA')),
            el('td',{},el('button',{class:'btn btn--primary',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:async()=>{
              const now2=new Date().toISOString();
              const updSteps=(o.trackingSteps||[]).map(s=>s.step==='entregado'?{...s,done:true,at:now2}:s);
              await window.Fluve.dao.orders.put({...o,status:'entregado',trackingSteps:updSteps});
              await window.Fluve.dao.logActivity('order.delivered','orders',o.id);
              window.Fluve.toast('Pedido #'+o.id+' marcado como entregado','success');
              window.Fluve.router.navigate('#/admin/envios');
            }},'✓ Entregado')),
          );
        })
      ));
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
  }

  // ── A36 PROVEEDOR DETALLE ─────────────────────────────────────────────────────
  async function adminProveedorDetalle({ params }) {
    const supId = params.id;
    let supplier, orders;
    try {
      [supplier, orders] = await Promise.all([
        window.Fluve.dao.suppliers.get(supId),
        window.Fluve.dao.orders.getAll(),
      ]);
    } catch(err) {
      const w2 = adminPageWrap('Proveedor',null,null);
      w2.append(window.Fluve.viewState('error',{message:err.message}));
      return w2;
    }
    if (!supplier) {
      const w2 = adminPageWrap('Proveedor no encontrado',null,null);
      w2.append(window.Fluve.viewState('not-found',{message:'No existe proveedor con ID: '+supId}));
      return w2;
    }
    const supOrders      = orders.filter(o => o.supplierId === supId);
    const activeOrders   = supOrders.filter(o => ['produccion','qc'].includes(o.status));
    const processedOrders= supOrders.filter(o => ['en_camino','entregado','cancelado'].includes(o.status));

    // Calcular calificación
    const onTimeOk  = processedOrders.filter(o => o.status !== 'cancelado').length;
    const onTimePct = processedOrders.length ? Math.round(onTimeOk / processedOrders.length * 100) : 100;
    const qcOk      = processedOrders.filter(o => o.qcStatus !== 'failed').length;
    const qcPct     = processedOrders.length ? Math.round(qcOk / processedOrders.length * 100) : 100;
    const rating    = ((onTimePct + qcPct) / 200 * 5).toFixed(1);
    const loadPct   = supplier.maxCapacity ? Math.round(activeOrders.length / supplier.maxCapacity * 100) : 0;
    const loadColor = loadPct >= 90 ? 'var(--magenta)' : loadPct >= 70 ? 'var(--yellow)' : 'var(--green)';

    function progressBar(pct, color='var(--green)') {
      return el('div',{style:'height:7px;background:var(--ink3);border-radius:5px;overflow:hidden;margin-top:4px'},
        el('div',{style:`height:100%;width:${pct}%;background:${color};border-radius:5px;transition:width .4s`})
      );
    }

    let activeTab = 'proceso';
    const tableSlot = el('div');
    function renderTable() {
      const rows = activeTab==='proceso' ? activeOrders : processedOrders;
      tableSlot.replaceChildren(
        rows.length ? tableWrap(
          ['Pedido','Producto','Técnica','Enviado','Estado'],
          rows.map(o => el('tr',{},
            el('td',{},el('a',{href:`#/admin/pedidos/${o.id}`,class:'mono-label',style:'color:var(--accent2)'},'#'+o.id)),
            el('td',{},(PE[o.lines?.[0]?.productId]??'📦')+' '+(o.lines?.[0]?.productName??'—')),
            el('td',{class:'tbl__muted'},(o.lines?.[0]?.config?.techniqueId??'—').toUpperCase()),
            el('td',{class:'tbl__muted'},new Date(o.createdAt).toLocaleDateString('es-UY')),
            el('td',{},statusBadge(o.status)),
          ))
        ) : window.Fluve.viewState('empty',{title:'Sin órdenes en este estado'}),
      );
    }

    const wrap = adminPageWrap(
      supplier.name,
      [el('a',{href:'#/admin/proveedores'},'Proveedores'),el('b',{style:'color:var(--txt)'},supplier.name)],
      el('div',{style:'display:flex;gap:8px;align-items:center'},
        el('span',{class:`order-status-chip ${supplier.active?'status-entregado':'status-cancelado'}`},supplier.active?'Activo':'Inactivo'),
        el('a',{href:`#/admin/proveedores/${supId}/editar`,class:'btn btn--ghost',style:'font-size:12px'},'✎ Editar'),
        el('button',{class:'btn btn--ghost',style:'font-size:12px',type:'button',onclick:async()=>{
          const ok=await window.Fluve.confirm({title:supplier.active?'Inhabilitar proveedor':'Habilitar proveedor',message:supplier.active?'El proveedor dejará de recibir nuevas órdenes.':'El proveedor volverá a estar disponible.',confirmLabel:supplier.active?'Inhabilitar':'Habilitar'});
          if(!ok)return;
          await window.Fluve.dao.suppliers.put({...supplier,active:!supplier.active});
          await window.Fluve.dao.logActivity(supplier.active?'supplier.disable':'supplier.enable','suppliers',supId);
          window.Fluve.toast((supplier.active?'Proveedor inhabilitado: ':'Proveedor habilitado: ')+supplier.name,'success');
          window.Fluve.router.navigate('#/admin/proveedores/'+supId);
        }},supplier.active?'⦸ Inhabilitar':'✓ Habilitar'),
        activeOrders.length===0?el('button',{class:'btn btn--danger',style:'font-size:12px',type:'button',onclick:async()=>{
          const ok=await window.Fluve.confirm({title:'Eliminar proveedor',message:'Esta acción es permanente y no se puede deshacer.',confirmLabel:'Eliminar',danger:true});
          if(!ok)return;
          await window.Fluve.dao.suppliers.delete(supId);
          await window.Fluve.dao.logActivity('supplier.delete','suppliers',supId);
          window.Fluve.toast('Proveedor eliminado','success');
          window.Fluve.router.navigate('#/admin/proveedores');
        }},'🗑 Eliminar'):el('span',{class:'mono-label',style:'color:var(--mut)'},'(tiene órdenes activas)'),
      ),
    );

    // 3 cards
    wrap.append(el('div',{style:'display:grid;grid-template-columns:1.2fr 1fr .8fr;gap:14px;margin-bottom:20px'},
      // Datos
      el('div',{class:'card'},
        el('div',{class:'mono-label',style:'margin-bottom:8px'},'Datos del proveedor'),
        el('div',{style:"font:700 14px 'Space Grotesk'"},supplier.name),
        el('div',{class:'mono-label',style:'margin-top:2px'},supplier.city+', Uruguay'),
        el('div',{class:'mono-label',style:'margin-top:2px'},supplier.email??'—'),
        el('div',{class:'mono-label',style:'margin-top:2px'},supplier.phone??'—'),
        el('div',{class:'mono-label',style:'margin:12px 0 6px'},'Técnicas que produce'),
        el('div',{style:'display:flex;flex-wrap:wrap;gap:4px'},
          ...(supplier.techniques??[]).map(t=>el('span',{class:'chip',style:'font-size:10px;padding:2px 7px'},t.toUpperCase()))
        ),
        el('div',{style:'display:flex;justify-content:space-between;margin-top:10px;font-size:12px;color:var(--mut)'},
          el('span',{},'Tiempo de producción'),el('b',{style:'color:var(--txt)'},supplier.leadTime??'—'),
        ),
        el('div',{style:'display:flex;justify-content:space-between;font-size:12px;color:var(--mut)'},
          el('span',{},'Capacidad máxima'),el('b',{style:'color:var(--txt)'},(supplier.maxCapacity??'—')+' órdenes'),
        ),
      ),
      // Calificación
      el('div',{class:'card'},
        el('div',{class:'mono-label',style:'margin-bottom:8px'},`Calificación · ${rating} ★`),
        el('div',{style:'display:flex;flex-direction:column;gap:10px'},
          el('div',{},
            el('div',{style:'display:flex;justify-content:space-between;font-size:12px'},el('span',{},'Entregas a tiempo'),el('b',{},onTimePct+'%')),
            progressBar(onTimePct),
          ),
          el('div',{},
            el('div',{style:'display:flex;justify-content:space-between;font-size:12px'},el('span',{},'Aprobación QC'),el('b',{},qcPct+'%')),
            progressBar(qcPct),
          ),
          el('div',{},
            el('div',{style:'display:flex;justify-content:space-between;font-size:12px'},el('span',{},'Base de cálculo'),el('span',{class:'mono-label'},processedOrders.length+' órdenes')),
          ),
        ),
        el('div',{class:'mono-label',style:'margin-top:10px;font-size:9.5px'},
          'Cálculo automático · se actualiza en cada QC (A6) y entrega (A8).'),
      ),
      // Carga actual
      el('div',{class:'card'},
        el('div',{class:'mono-label',style:'margin-bottom:6px'},'Carga actual'),
        el('div',{style:`font:700 28px 'Space Grotesk';color:${loadColor}`},`${activeOrders.length}/${supplier.maxCapacity??'∞'}`),
        progressBar(loadPct,loadColor),
        el('div',{class:'mono-label',style:'margin-top:6px'},loadPct+'% ocupado'),
        processedOrders.length?el('div',{class:'mono-label',style:'margin-top:10px'},processedOrders.length+' órdenes procesadas en total'):null,
      ),
    ));

    // Tabs
    const tabs = el('div',{style:'display:flex;gap:0;border-bottom:1.5px solid var(--line);margin-bottom:14px'});
    [['proceso',`En proceso · ${activeOrders.length}`],['procesadas',`Procesadas · ${processedOrders.length}`]].forEach(([id,label])=>{
      const tab=el('div',{style:`padding:9px 16px;cursor:pointer;font:600 12.5px 'Space Grotesk';border-bottom:2px solid ${activeTab===id?'var(--accent)':'transparent'};color:${activeTab===id?'var(--txt)':'var(--mut)'}`,
        onclick:()=>{activeTab=id;tabs.querySelectorAll('div').forEach((t,i)=>{t.style.borderBottomColor=['proceso','procesadas'][i]===id?'var(--accent)':'transparent';t.style.color=['proceso','procesadas'][i]===id?'var(--txt)':'var(--mut)';});renderTable();}
      },label);
      tabs.append(tab);
    });
    wrap.append(tabs,tableSlot);
    renderTable();
    return wrap;
  }

  // ── A37 PROVEEDOR NUEVO/EDITAR ────────────────────────────────────────────────
  async function adminProveedorNuevo({ params }) {
    const editId   = params.id; // si viene con id = editar; si no = nuevo
    let existing   = null;
    const TECHS    = ['dtf','dtg','subl','seri','bord','gran','vinilo'];
    const TECH_LAB = { dtf:'DTF', dtg:'DTG', subl:'Sublimación', seri:'Serigrafía', bord:'Bordado', gran:'Gran formato', vinilo:'Vinilo textil' };

    if (editId) {
      try { existing = await window.Fluve.dao.suppliers.get(editId); } catch {}
    }

    const isEdit = !!existing;
    const f = {
      name: existing?.name ?? '',
      city: existing?.city ?? '',
      email: existing?.email ?? '',
      phone: existing?.phone ?? '',
      maxCapacity: existing?.maxCapacity ?? 24,
      leadTime: existing?.leadTime ?? '12–24h',
      techniques: existing?.techniques ?? [],
      active: existing?.active ?? true,
    };

    const wrap = adminPageWrap(
      isEdit ? 'Editar proveedor' : 'Nuevo proveedor',
      [el('a',{href:'#/admin/proveedores'},'Proveedores'),el('b',{style:'color:var(--txt)'},isEdit?existing.name:'Nuevo')], null
    );

    const techPills = el('div',{style:'display:flex;gap:6px;flex-wrap:wrap'});
    function rebuildTechs(){
      techPills.replaceChildren(
        ...TECHS.map(t=>{
          const on=f.techniques.includes(t);
          return el('span',{class:`filter-pill${on?' active':''}`,style:'cursor:pointer',
            onclick:()=>{f.techniques=on?f.techniques.filter(x=>x!==t):[...f.techniques,t];rebuildTechs();}
          },TECH_LAB[t]);
        })
      );
    }
    rebuildTechs();

    function row2(a,b){ return el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:12px'},a,b); }
    function fld(label,type,val,cb,placeholder=''){
      const inp=el('input',{class:'admin-fld',type,value:val,placeholder,oninput:e=>cb(e.target.value)});
      return el('div',{class:'field'},el('label',{class:'field__label'},label),inp);
    }

    wrap.append(el('div',{style:'max-width:600px;display:flex;flex-direction:column;gap:14px'},
      fld('Nombre *','text',f.name,v=>f.name=v,'Ej: Imprenta Sur'),
      row2(fld('Ciudad','text',f.city,v=>f.city=v,'Montevideo'),fld('Teléfono/WhatsApp','tel',f.phone,v=>f.phone=v)),
      row2(fld('Email *','email',f.email,v=>f.email=v,'contacto@imprentasur.uy'),fld('Capacidad máx. (órdenes)','number',String(f.maxCapacity),v=>f.maxCapacity=parseInt(v)||0)),
      fld('Tiempo de producción','text',f.leadTime,v=>f.leadTime=v,'ej: 12–24h'),
      el('div',{class:'field'},el('label',{class:'field__label'},'Técnicas que produce *'),techPills),
      el('div',{style:'display:flex;gap:10px;padding-top:8px'},
        el('button',{class:'btn btn--primary',type:'button',onclick:async()=>{
          if(!f.name.trim()){ window.Fluve.toast('El nombre es obligatorio','error'); return; }
          if(!f.email.trim()){ window.Fluve.toast('El email es obligatorio','error'); return; }
          if(!f.techniques.length){ window.Fluve.toast('Seleccioná al menos una técnica','error'); return; }
          const id = isEdit ? editId : 'sup-'+Date.now().toString(36);
          const sup = { id, ...f };
          await window.Fluve.dao.suppliers.put(sup);
          await window.Fluve.dao.logActivity(isEdit?'supplier.update':'supplier.create','suppliers',id,{after:{name:f.name}});
          window.Fluve.toast((isEdit?'Proveedor actualizado: ':'Proveedor creado: ')+f.name,'success');
          window.Fluve.router.navigate('#/admin/proveedores/'+id);
        }},isEdit?'Guardar cambios':'Crear proveedor'),
        el('a',{href:isEdit?`#/admin/proveedores/${editId}`:'#/admin/proveedores',class:'btn btn--ghost'},'Cancelar'),
      ),
    ));
    return wrap;
  }

  // ── A39 PEDIDO NUEVO ──────────────────────────────────────────────────────────
  async function adminPedidoNuevo() {
    const wrap = adminPageWrap('Nuevo pedido',
      [el('a',{href:'#/admin/pedidos'},'Pedidos'),el('b',{style:'color:var(--txt)'},'Nuevo')], null
    );

    let products, techniques, users;
    try {
      [products,techniques,users] = await Promise.all([
        window.Fluve.dao.products.getAll(),
        window.Fluve.dao.techniques.getAll(),
        window.Fluve.dao.users.getAll(),
      ]);
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); return wrap; }

    const clients = users.filter(u=>u.role==='customer'||u.role==='staff');
    const form = { userId:'guest', contactName:'', contactEmail:'', contactPhone:'', street:'', city:'', payment:'transfer', lines:[] };

    const linesSlot = el('div',{style:'display:flex;flex-direction:column;gap:8px'});
    function updateLines(){
      linesSlot.replaceChildren(
        ...form.lines.map((l,i)=>el('div',{style:'display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line2);border-radius:10px;background:var(--ink3)'},
          el('span',{style:'font-size:20px'},(PE[l.productId]??'📦')),
          el('div',{style:'flex:1'},
            el('div',{style:"font:600 13px 'Space Grotesk'"}, (products.find(p=>p.id===l.productId)?.name??l.productId)),
            el('div',{class:'mono-label'},[l.techniqueId?.toUpperCase(),l.color,l.size,'x'+l.qty].filter(Boolean).join(' · ')),
          ),
          el('span',{style:"font:600 13px 'Space Grotesk'"},moneyStr(l.unitPrice*l.qty)),
          el('button',{class:'btn btn--ghost',style:'font-size:11px;min-height:28px;padding:0 8px',type:'button',onclick:()=>{form.lines.splice(i,1);updateLines();}},  '✕'),
        )),
        form.lines.length===0?el('div',{class:'mono-label',style:'color:var(--mut)'},'Sin ítems. Añadí un producto.'):null,
      );
    }

    function addItem(){
      const p=products[0]; const t=techniques[0];
      if(!p||!t) return;
      const price=window.Fluve.pricing.precioPersonalizador({qty:1,side:'front',techniqueId:t.id,productBasePrice:p.basePrice},techniques);
      form.lines.push({productId:p.id,techniqueId:t.id,color:p.colors?.[0]?.name??'Negro',size:p.sizes?.[0]??'M',qty:1,unitPrice:price.porUnidad});
      updateLines();
    }

    function row2(a,b){ return el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:12px'},a,b); }
    function fld(label,type,val,cb){
      const inp=el('input',{class:'admin-fld',type,value:val,oninput:e=>cb(e.target.value)});
      return el('div',{class:'field'},el('label',{class:'field__label'},label),inp);
    }

    wrap.append(el('div',{style:'display:grid;grid-template-columns:1fr 380px;gap:20px'},
      // Formulario
      el('div',{style:'display:flex;flex-direction:column;gap:16px'},
        el('div',{class:'card'},
          el('div',{class:'mono-label',style:'margin-bottom:12px'},'Cliente'),
          el('select',{class:'admin-fld',style:'width:100%;margin-bottom:8px',
            onchange:e=>{
              form.userId=e.target.value;
              const u=clients.find(c=>c.id===e.target.value);
              if(u){form.contactName=u.name;form.contactEmail=u.email;form.contactPhone=u.phone??'';}
            }
          },
            el('option',{value:'guest'},'— Invitado / nuevo cliente —'),
            ...clients.map(u=>el('option',{value:u.id},u.name+' ('+u.email+')')),
          ),
          row2(fld('Nombre *','text',form.contactName,v=>form.contactName=v),fld('Email *','email',form.contactEmail,v=>form.contactEmail=v)),
          fld('Teléfono','tel',form.contactPhone,v=>form.contactPhone=v),
        ),
        el('div',{class:'card'},
          el('div',{class:'mono-label',style:'margin-bottom:12px'},'Dirección de envío'),
          fld('Calle y número','text','',v=>form.street=v),
          row2(fld('Ciudad','text','',v=>form.city=v),fld('CP','text','',()=>{})),
        ),
        el('div',{class:'card'},
          el('div',{style:'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px'},
            el('div',{class:'mono-label'},'Ítems del pedido'),
            el('button',{class:'btn btn--ghost',style:'font-size:12px',type:'button',onclick:addItem},'+ Añadir ítem'),
          ),
          linesSlot,
        ),
      ),
      // Resumen + crear
      el('div',{class:'card',style:'height:fit-content;position:sticky;top:60px'},
        el('div',{class:'mono-label',style:'margin-bottom:12px'},'Método de pago'),
        el('select',{class:'admin-fld',style:'width:100%;margin-bottom:14px',onchange:e=>form.payment=e.target.value},
          el('option',{value:'transfer'},'Transferencia bancaria'),
          el('option',{value:'card'},'Tarjeta (POS)'),
          el('option',{value:'cash'},'Efectivo'),
          el('option',{value:'mercadopago'},'MercadoPago'),
        ),
        el('div',{class:'cart-summary-divider'}),
        el('button',{class:'btn btn--primary',style:'width:100%;justify-content:center;margin-top:14px',type:'button',onclick:async()=>{
          if(!form.contactName.trim()||!form.contactEmail.includes('@')){window.Fluve.toast('Completá nombre y email del cliente','error');return;}
          if(!form.lines.length){window.Fluve.toast('Agregá al menos un ítem','error');return;}
          const orderId='FLV-'+Math.floor(Math.random()*9000+1000);
          const payId='TX-'+Math.floor(Math.random()*90000+10000);
          const now=new Date().toISOString();
          const subtotal=form.lines.reduce((s,l)=>s+l.unitPrice*l.qty,0);
          const order={id:orderId,userId:form.userId,lines:form.lines.map(l=>({...l,lineTotal:l.unitPrice*l.qty})),contact:{name:form.contactName,email:form.contactEmail,phone:form.contactPhone},shippingAddress:{line:form.street,city:form.city},shippingMethod:'express',shippingCost:4.90,subtotal,tax:0,total:subtotal+4.90,paymentId:payId,status:'recibido',supplierId:null,qcStatus:null,trackingSteps:ORDER_FLOW.map((s,i)=>({step:s,done:i===0,at:i===0?now:null})),createdAt:now};
          const pay={id:payId,orderId,method:form.payment,amount:order.total,status:'approved',createdAt:now,refundOf:null};
          await window.Fluve.dao.orders.put(order);
          await window.Fluve.dao.payments.put(pay);
          await window.Fluve.dao.logActivity('order.manual_create','orders',orderId,{after:{total:order.total,lines:form.lines.length}});
          window.Fluve.toast('Pedido #'+orderId+' creado','success');
          window.Fluve.router.navigate('#/admin/pedidos/'+orderId);
        }},'Crear pedido'),
      ),
    ));
    updateLines();
    return wrap;
  }

  // ── Export ────────────────────────────────────────────────────────────────────
  window.Fluve = window.Fluve || {};
  window.Fluve.admin = { statusBadge, moneyStr, dateStr, tableWrap, adminPageWrap, kpi, STATUS_LABELS, STATUS_CLS, PE, ORDER_FLOW };
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.admin = window.Fluve.views.admin || {};
  Object.assign(window.Fluve.views.admin, {
    dashboard:       adminDashboard,
    pedidos:         adminPedidos,
    pedidoDetalle:   adminPedidoDetalle,
    pedidoNuevo:     adminPedidoNuevo,
    produccion:      adminProduccion,
    proveedores:     adminProveedores,
    proveedorDetalle:adminProveedorDetalle,
    proveedorNuevo:  adminProveedorNuevo,
    calidad:         adminCalidad,
    packaging:       adminPackaging,
    envios:          adminEnvios,
  });
})();
