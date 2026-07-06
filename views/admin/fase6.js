// views/admin/fase6.js — A15 Cotizaciones B2B · A19 Reportes · A20 Contenido/CMS · Sub-rutas redirect
(function () {
  const { el } = window.Fluve.dom;
  const A = () => window.Fluve.admin;

  // ── A15 COTIZACIONES B2B ───────────────────────────────────────────────────────
  async function adminCotizaciones() {
    const wrap = A().adminPageWrap('Cotizaciones B2B',
      [el('span',{},'Comercial'),el('b',{style:'color:var(--txt)'},'Cotizaciones')],
      el('button',{class:'btn btn--primary',style:'font-size:13px',type:'button',
        onclick:()=>window.Fluve.toast('Nueva cotización — formulario disponible próximamente','default')
      },'+ Nueva cotización'),
    );

    // Para el prototipo, mostramos cotizaciones simuladas basadas en users B2B
    try {
      const users = await window.Fluve.dao.users.getAll();
      const orders= await window.Fluve.dao.orders.getAll();

      // Simular un pipeline de cotizaciones B2B a partir de los datos existentes
      const quotes = [
        { id:'COT-001', client:'Empresa XYZ', email:'compras@xyz.uy', product:'100 Remeras DTF', amount:2490, status:'nueva',   createdAt: new Date(Date.now()-2*86400000).toISOString() },
        { id:'COT-002', client:'Marca ABC',   email:'marketing@abc.uy', product:'50 Hoodies bordado',amount:2245,status:'cotizada',createdAt: new Date(Date.now()-5*86400000).toISOString() },
        { id:'COT-003', client:'Startup UY',  email:'ceo@startup.uy', product:'200 Tote bags DTF', amount:2980, status:'aprobada',createdAt: new Date(Date.now()-8*86400000).toISOString() },
        { id:'COT-004', client:'Retail SA',   email:'merch@retail.uy', product:'30 Tazas sublimación', amount:357,status:'cancelada',createdAt:new Date(Date.now()-15*86400000).toISOString() },
      ];

      const STATUS_COT = { nueva:'status-recibido', cotizada:'status-produccion', aprobada:'status-entregado', cancelada:'status-cancelado' };
      const STATUS_LBL = { nueva:'Nueva', cotizada:'Cotizada', aprobada:'Aprobada', cancelada:'Cancelada' };

      let statusFilter = 'all';
      const tableSlot = el('div');
      wrap.append(tableSlot);

      function render() {
        const filt = statusFilter==='all' ? quotes : quotes.filter(q=>q.status===statusFilter);
        tableSlot.replaceChildren(
          el('div',{style:'display:flex;gap:8px;margin-bottom:14px'},
            ...[['all','Todas'],['nueva','Nuevas'],['cotizada','Cotizadas'],['aprobada','Aprobadas']].map(([s,label])=>
              el('span',{class:`filter-pill${statusFilter===s?' active':''}`,style:'cursor:pointer',onclick:()=>{statusFilter=s;render();}},label)
            ),
          ),
          A().tableWrap(
            ['ID','Cliente','Producto solicitado','Monto','Estado','Acciones'],
            filt.map(q=>el('tr',{},
              el('td',{class:'mono-label'},q.id),
              el('td',{},el('div',{style:"font:600 12.5px 'Space Grotesk'"},q.client),el('div',{class:'mono-label'},q.email)),
              el('td',{class:'tbl__muted'},q.product),
              el('td',{class:'tbl__num'},A().moneyStr(q.amount)),
              el('td',{},el('span',{class:`order-status-chip ${STATUS_COT[q.status]??''}`},STATUS_LBL[q.status]??q.status)),
              el('td',{},el('div',{style:'display:flex;gap:6px'},
                q.status==='cotizada'?el('button',{class:'btn btn--primary',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:async()=>{
                  const ok=await window.Fluve.confirm({title:'Aprobar cotización',message:`Convertir "${q.id}" en pedido de producción.`,confirmLabel:'Aprobar y crear pedido'});
                  if(!ok)return;
                  window.Fluve.toast('Cotización aprobada → pedido creado (simulado)','success');
                }},'Aprobar → Pedido'):null,
                q.status==='nueva'?el('button',{class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:()=>window.Fluve.toast('Editar cotización — disponible próximamente','default')},'Cotizar'):null,
              )),
            ))
          ),
        );
      }
      render();
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
  }

  // ── A19 REPORTES ───────────────────────────────────────────────────────────────
  async function adminReportes() {
    const wrap = A().adminPageWrap('Reportes y analítica',
      [el('span',{},'Sistema'),el('b',{style:'color:var(--txt)'},'Reportes')], null
    );

    wrap.append(window.Fluve.viewState('loading',{rows:3}));

    try {
      const [orders, payments, products] = await Promise.all([
        window.Fluve.dao.orders.getAll(),
        window.Fluve.dao.payments.getAll(),
        window.Fluve.dao.products.getAll(),
      ]);

      const delivered  = orders.filter(o=>o.status==='entregado');
      const revenue    = payments.filter(p=>p.status==='approved').reduce((s,p)=>s+p.amount,0);
      const avgTicket  = delivered.length ? (revenue/delivered.length).toFixed(2) : 0;
      const slaOk      = delivered.filter(o=>{
        const hrs=(new Date().getTime()-new Date(o.createdAt).getTime())/3600000;
        return hrs<=48;
      }).length;
      const slaPct     = delivered.length ? Math.round(slaOk/delivered.length*100) : 100;

      // Ventas por producto
      const byProduct = {};
      orders.filter(o=>o.status!=='cancelado').forEach(o=>{
        (o.lines??[]).forEach(l=>{ byProduct[l.productId]=(byProduct[l.productId]??0)+l.lineTotal; });
      });
      const topProducts = products.map(p=>({...p,revenue:byProduct[p.id]??0})).sort((a,b)=>b.revenue-a.revenue).slice(0,5);
      const maxRevenue  = Math.max(...topProducts.map(p=>p.revenue),1);

      // Ventas por mes (últimos 6 meses)
      const byMonth = {};
      orders.filter(o=>o.status!=='cancelado').forEach(o=>{
        const month=o.createdAt?.slice(0,7)??'—';
        byMonth[month]=(byMonth[month]??0)+o.total;
      });
      const months = Object.keys(byMonth).sort().slice(-6);
      const maxMonth = Math.max(...months.map(m=>byMonth[m]),1);

      function bar(pct,color,label,val){
        return el('div',{style:'display:flex;flex-direction:column;align-items:center;gap:4px;min-width:52px'},
          el('div',{style:`width:100%;height:${Math.max(4,Math.round(pct*100))}px;background:${color};border-radius:4px 4px 0 0;transition:height .3s`}),
          el('div',{class:'mono-label',style:'font-size:9px;text-align:center'},label),
          el('div',{class:'mono-label',style:'font-size:9px;color:var(--txt)'},A().moneyStr(val)),
        );
      }

      wrap.replaceChildren(
        el('h2',{style:"font:600 26px 'Space Grotesk';letter-spacing:-.5px;margin:0 0 20px"},'Reportes y analítica'),

        // KPIs
        el('div',{class:'kpi-grid',style:'margin-bottom:24px'},
          A().kpi(A().moneyStr(revenue),'Ingresos totales','pedidos pagados','var(--green)','#/admin/pagos'),
          A().kpi(delivered.length,'Pedidos entregados',orders.length+' pedidos totales','var(--accent2)','#/admin/pedidos'),
          A().kpi('$'+avgTicket.replace('.',','),'Ticket promedio','por pedido entregado','var(--cyan)'),
          A().kpi(slaPct+'%','SLA 24–48h',slaOk+' de '+delivered.length+' a tiempo',slaPct>=90?'var(--green)':'var(--yellow)'),
        ),

        // Chart ventas por mes
        el('div',{class:'card',style:'margin-bottom:20px'},
          el('div',{class:'mono-label',style:'margin-bottom:14px'},'Ventas por mes (últimos 6 meses)'),
          months.length ? el('div',{style:'display:flex;gap:12px;align-items:flex-end;height:120px;padding:0 8px'},
            ...months.map(m=>bar(byMonth[m]/maxMonth,'var(--accent)',m.slice(5),byMonth[m]))
          ) : el('div',{class:'mono-label',style:'color:var(--mut)'},'Sin datos de ventas mensuales todavía.'),
        ),

        // Top productos
        el('div',{class:'card',style:'margin-bottom:20px'},
          el('div',{class:'mono-label',style:'margin-bottom:14px'},'Top productos por ingresos'),
          el('div',{style:'display:flex;flex-direction:column;gap:10px'},
            ...topProducts.filter(p=>p.revenue>0).map(p=>el('div',{style:'display:flex;align-items:center;gap:12px'},
              el('span',{style:'font-size:20px'},(A().PE[p.id]??'📦')),
              el('div',{style:'flex:1'},
                el('div',{style:'display:flex;justify-content:space-between;margin-bottom:4px'},
                  el('span',{style:"font:600 13px 'Space Grotesk'"},p.name),
                  el('span',{class:'mono-label'},A().moneyStr(p.revenue)),
                ),
                el('div',{style:`height:6px;background:var(--ink3);border-radius:3px`},
                  el('div',{style:`height:100%;width:${Math.round(p.revenue/maxRevenue*100)}%;background:var(--accent);border-radius:3px`})
                ),
              ),
            )),
            topProducts.every(p=>p.revenue===0)?el('div',{class:'mono-label',style:'color:var(--mut)'},'Sin ventas registradas. Completá algunos pedidos.'):null,
          ),
        ),

        // Link a punto de equilibrio
        el('div',{class:'card'},
          el('div',{style:'display:flex;align-items:center;justify-content:space-between'},
            el('div',{},
              el('div',{style:"font:600 14px 'Space Grotesk'"},'Punto de equilibrio'),
              el('div',{class:'mono-label',style:'margin-top:2px'},'Costos fijos vs. contribución marginal'),
            ),
            el('a',{href:'#/admin/reportes/equilibrio',class:'btn btn--ghost',style:'font-size:12px'},'Ver análisis →'),
          ),
        ),
      );
    } catch(err){ wrap.replaceChildren(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
  }

  // ── A32 PUNTO DE EQUILIBRIO ───────────────────────────────────────────────────
  async function adminEquilibrio() {
    const wrap = A().adminPageWrap('Punto de equilibrio',
      [el('span',{},'Sistema'),el('a',{href:'#/admin/reportes'},'Reportes'),el('b',{style:'color:var(--txt)'},'Equilibrio')], null
    );
    try {
      const [orders, settings] = await Promise.all([
        window.Fluve.dao.orders.getAll(),
        window.Fluve.dao.settings.get('pricing').catch(()=>null),
      ]);

      const delivered = orders.filter(o=>o.status==='entregado');
      const revenue   = delivered.reduce((s,o)=>s+o.total,0);
      // Costos fijos simulados (del settings o defaults)
      const fixedCosts = settings?.fixedCosts ?? { alquiler:15000, staff:45000, marketing:8000, servicios:3000 };
      const totalFixed = Object.values(fixedCosts).reduce((s,v)=>s+v,0);
      const avgMargin  = settings?.targetMargin ?? 0.38;
      const breakeven  = avgMargin>0 ? totalFixed/avgMargin : 0;
      const coverage   = revenue/breakeven*100;
      const covColor   = coverage>=100?'var(--green)':coverage>=70?'var(--yellow)':'var(--magenta)';

      wrap.append(
        el('div',{class:'kpi-grid',style:'margin-bottom:24px'},
          A().kpi(A().moneyStr(totalFixed),'Costos fijos/mes','suma de costos operativos','var(--magenta)'),
          A().kpi(Math.round(avgMargin*100)+'%','Margen promedio target','sobre precio de venta','var(--accent2)'),
          A().kpi(A().moneyStr(breakeven),'Punto de equilibrio','facturación mínima mensual','var(--yellow)'),
          A().kpi(Math.round(coverage)+'%','Cobertura actual',A().moneyStr(revenue)+' ingresos totales',covColor),
        ),
        el('div',{class:'card'},
          el('div',{class:'mono-label',style:'margin-bottom:12px'},'Desglose de costos fijos'),
          A().tableWrap(['Concepto','Monto mensual'],
            Object.entries(fixedCosts).map(([k,v])=>el('tr',{},
              el('td',{style:"font:500 13px 'Inter';text-transform:capitalize"},k.replace('_',' ')),
              el('td',{class:'tbl__num'},A().moneyStr(v)),
            ))
          ),
          el('div',{style:'display:flex;justify-content:space-between;padding:10px 10px 0;border-top:1px solid var(--line);margin-top:8px'},
            el('span',{style:"font:600 13px 'Space Grotesk'"},'Total'),
            el('span',{style:"font:700 16px 'Space Grotesk'"},A().moneyStr(totalFixed)),
          ),
        ),
        el('div',{class:'mono-label',style:'margin-top:14px'},
          'Para ajustar los costos fijos, editá los parámetros en ',
          el('a',{href:'#/admin/ajustes',style:'color:var(--accent2)'},'Ajustes del sistema'),'.'),
      );
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
  }

  // ── A20 CONTENIDO / CMS ────────────────────────────────────────────────────────
  async function adminContenido() {
    const wrap = A().adminPageWrap('Contenido / CMS',
      [el('span',{},'Sistema'),el('b',{style:'color:var(--txt)'},'Contenido')], null
    );

    let cmsSettings;
    try { cmsSettings = await window.Fluve.dao.settings.get('cms') ?? { promoBar:'', heroTitle:'', faqItems:[] }; }
    catch { cmsSettings = { promoBar:'', heroTitle:'', faqItems:[] }; }

    let s = { ...cmsSettings };

    wrap.append(
      el('div',{style:'max-width:700px;display:flex;flex-direction:column;gap:20px'},
        // Promo bar
        el('div',{class:'card'},
          el('div',{style:"font:600 14px 'Space Grotesk';margin-bottom:10px"},'Barra de promoción (Home)'),
          el('div',{class:'mono-label',style:'margin-bottom:6px'},'Texto de la barra superior visible en la portada'),
          el('input',{class:'admin-fld',type:'text',value:s.promoBar||'🚀 Entrega express 24–48h · Primera compra con 10% OFF → WELCOME10',
            oninput:e=>s.promoBar=e.target.value,
            style:'width:100%',
          }),
          el('div',{class:'mono-label',style:'margin-top:6px'},'Vista previa:'),
          el('div',{style:'display:flex;align-items:center;justify-content:center;gap:8px;padding:7px 16px;background:var(--ink3);border-radius:8px;margin-top:4px;font:700 11px var(--font-mono);letter-spacing:.5px;color:var(--mut)'},
            s.promoBar||'🚀 Entrega express 24–48h'),
        ),

        // Hero title
        el('div',{class:'card'},
          el('div',{style:"font:600 14px 'Space Grotesk';margin-bottom:10px"},'Título del Hero (Home)'),
          el('textarea',{class:'admin-fld',style:'width:100%;min-height:70px',
            oninput:e=>s.heroTitle=e.target.value,
          },s.heroTitle||'Imprimimos tus ideas.\nPotenciamos tu marca.'),
        ),

        // FAQ
        el('div',{class:'card'},
          el('div',{style:"font:600 14px 'Space Grotesk';margin-bottom:10px"},'Preguntas frecuentes (FAQ)'),
          el('div',{class:'mono-label',style:'margin-bottom:8px'},'Aparecen en la página de Cómo funciona / FAQ del cliente.'),
          ...(s.faqItems??[]).map((item,i)=>el('div',{style:'border:1px solid var(--line2);border-radius:10px;padding:12px;display:flex;gap:10px;margin-bottom:8px'},
            el('div',{style:'flex:1;display:flex;flex-direction:column;gap:6px'},
              el('input',{class:'admin-fld',type:'text',value:item.q,placeholder:'Pregunta…',oninput:e=>{s.faqItems[i].q=e.target.value;}}),
              el('textarea',{class:'admin-fld',style:'min-height:50px',oninput:e=>{s.faqItems[i].a=e.target.value;}},item.a),
            ),
            el('button',{class:'btn btn--danger',style:'align-self:flex-start;font-size:11px',type:'button',onclick:()=>{s.faqItems.splice(i,1);window.Fluve.router.navigate('#/admin/contenido');}},  '✕'),
          )),
          el('button',{class:'btn btn--ghost',style:'font-size:12px;width:100%;justify-content:center',type:'button',onclick:()=>{s.faqItems=(s.faqItems??[]).concat({q:'Nueva pregunta',a:'Respuesta…'});window.Fluve.router.navigate('#/admin/contenido');}},'+ Añadir pregunta'),
        ),

        // Guardar
        el('button',{class:'btn btn--primary',type:'button',onclick:async()=>{
          await window.Fluve.dao.settings.put({...s,key:'cms'});
          await window.Fluve.dao.logActivity('cms.update','settings','cms',{after:{promoBar:s.promoBar}});
          window.Fluve.toast('Contenido guardado. Los cambios se verán en el próximo reload del frontend.','success');
        }},'Guardar cambios'),
      ),
    );
    return wrap;
  }

  // ── REDIRECTS para sub-rutas (patrones definidos en Backend.dc.html) ───────────
  function makeRedirect(href) {
    return async () => { window.Fluve.router.navigate(href); return el('div'); };
  }

  const adminAjustesCosteo   = makeRedirect('#/admin/ajustes');
  const adminAjustesPrecios  = makeRedirect('#/admin/precios');
  const adminAjustesRegalias = makeRedirect('#/admin/artistas');
  const adminConsumiblesId   = makeRedirect('#/admin/inventario');
  const adminProdPrecios     = makeRedirect('#/admin/precios');
  const adminTecnicaCosto    = makeRedirect('#/admin/precios');

  // ── Export ────────────────────────────────────────────────────────────────────
  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.admin = window.Fluve.views.admin || {};
  Object.assign(window.Fluve.views.admin, {
    cotizaciones:       adminCotizaciones,
    reportes:           adminReportes,
    equilibrio:         adminEquilibrio,
    cms:                adminContenido,
    // redirects sub-rutas
    ajustesCosteo:      adminAjustesCosteo,
    ajustesPrecios:     adminAjustesPrecios,
    ajustesRegalias:    adminAjustesRegalias,
    consumibleDetalle:  adminConsumiblesId,
    productoPrecio:     adminProdPrecios,
    // tecnicaCosto NO se exporta aquí — el handler real está en catalogo.js
  });
})();
