// views/admin/dashboard.js — Dashboard con KPIs reales de la DB (Fase 4 rev).
(function () {
  const { el } = window.Fluve.dom;

  const STATUS_COLORS = {
    recibido:'rgba(44,92,255,.15)',
    produccion:'rgba(255,201,61,.15)',
    qc:'rgba(43,217,228,.15)',
    en_camino:'rgba(255,61,139,.15)',
    entregado:'rgba(63,203,126,.15)',
    cancelado:'rgba(138,147,173,.12)',
  };
  const STATUS_TEXT = {
    recibido:  { color:'var(--accent2)', label:'Recibido' },
    produccion:{ color:'var(--yellow)',  label:'Producción' },
    qc:        { color:'var(--cyan)',    label:'QC+Pkg' },
    en_camino: { color:'var(--magenta)', label:'En camino' },
    entregado: { color:'var(--green)',   label:'Entregado' },
    cancelado: { color:'var(--mut)',     label:'Cancelado' },
  };

  async function adminDashboard() {
    const wrap = el('div', { class:'fu' });
    wrap.append(
      el('h2',{style:"font:600 26px 'Space Grotesk';letter-spacing:-.5px;margin:0 0 6px"},'Dashboard'),
      el('p',{style:"font:400 13px 'Inter';color:var(--mut)"},'Vista general de operaciones.'),
    );

    const metricsSlot = el('div',{style:'margin-top:20px'});
    wrap.append(metricsSlot);
    metricsSlot.append(window.Fluve.viewState('loading', {rows:2}));

    try {
      const [orders, products, designs, royalties] = await Promise.all([
        window.Fluve.dao.orders.getAll(),
        window.Fluve.dao.products.getAll(),
        window.Fluve.dao.designs.getAll(),
        window.Fluve.dao.royalties.getAll(),
      ]);

      const activeOrders = orders.filter(o => !['entregado','cancelado'].includes(o.status));
      const revenue = orders.filter(o=>o.status!=='cancelado').reduce((s,o)=>s+o.total,0);
      const pendingRoyalties = royalties.filter(r=>r.status==='pending').reduce((s,r)=>s+r.amount,0);
      const pendingDesigns  = designs.filter(d=>d.status==='pending').length;

      // KPI cards
      metricsSlot.replaceChildren(
        kpiGrid([
          { label:'Pedidos activos', value: activeOrders.length, sub: orders.length + ' total', color:'var(--accent2)' },
          { label:'Ingresos totales', value: '$'+revenue.toFixed(2), sub: 'pedidos pagados', color:'var(--green)' },
          { label:'Regalías pendientes', value: '$'+pendingRoyalties.toFixed(2), sub: royalties.filter(r=>r.status==='pending').length+' liquidaciones', color:'var(--yellow)' },
          { label:'Diseños a moderar', value: pendingDesigns, sub: designs.length+' diseños totales', color:'var(--magenta)' },
        ]),
        // Últimos pedidos
        el('h3',{style:"font:600 16px 'Space Grotesk';margin:28px 0 12px"},'Pedidos recientes'),
        buildOrdersTable(orders.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5)),
      );
    } catch (err) {
      metricsSlot.replaceChildren(window.Fluve.viewState('error',{message:err.message}));
    }
    return wrap;
  }

  function kpiGrid(kpis) {
    return el('div',{style:'display:grid;grid-template-columns:repeat(4,1fr);gap:14px'},
      ...kpis.map(k => el('div',{style:`border:1px solid var(--line);border-radius:16px;background:var(--ink2);padding:20px`},
        el('div',{style:`font:600 28px 'Space Grotesk';color:${k.color};letter-spacing:-1px`}, String(k.value)),
        el('div',{style:"font:600 13px 'Space Grotesk';color:var(--txt);margin:4px 0 2px"},k.label),
        el('div',{style:"font:500 11px 'Inter';color:var(--mut)"},k.sub),
      )),
    );
  }

  function buildOrdersTable(orders) {
    if (!orders.length) return window.Fluve.viewState('empty',{title:'Sin pedidos',message:'Cargá el seed.'});
    const head = el('thead',{},
      el('tr',{},
        ...['Pedido','Estado','Total','Producto','Fecha'].map(h =>
          el('th',{},h)
        ),
      ),
    );
    const tbody = el('tbody',{});
    orders.forEach(o => {
      const st = STATUS_TEXT[o.status] ?? {color:'var(--mut)',label:o.status};
      const line = o.lines?.[0];
      tbody.append(el('tr',{},
        el('td',{},el('a',{href:`#/pedido/${o.id}`,class:'mono-label',style:`color:var(--accent2)`},'#'+o.id)),
        el('td',{},el('span',{style:`font:700 9.5px 'Space Mono';text-transform:uppercase;letter-spacing:.5px;color:${st.color};background:${STATUS_COLORS[o.status]??'transparent'};padding:3px 8px;border-radius:20px`},st.label)),
        el('td',{class:'tbl__num'},'$'+o.total.toFixed(2).replace('.',',')),
        el('td',{style:'color:var(--mut);font-size:13px'},(line?.productName??line?.productId??'—')),
        el('td',{class:'tbl__muted'},new Date(o.createdAt).toLocaleDateString('es-UY')),
      ));
    });
    return el('div',{class:'tbl-wrap'},el('table',{class:'tbl'},head,tbody));
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.admin = window.Fluve.views.admin || {};
  window.Fluve.views.admin.dashboard = adminDashboard;
})();
