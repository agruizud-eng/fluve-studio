// views/admin/sistema.js — A22 Equipo · A44 Actividad · A21 Ajustes
(function () {
  const { el } = window.Fluve.dom;
  const A = () => window.Fluve.admin;

  // ── A22 EQUIPO Y ROLES ────────────────────────────────────────────────────────
  async function adminEquipo() {
    const wrap = A().adminPageWrap('Equipo y roles',
      [el('span',{},'Sistema'),el('b',{style:'color:var(--txt)'},'Equipo')], null
    );

    const ROLE_LABELS  = { admin:'Admin', staff:'Staff', customer:'Customer' };
    const ROLE_COLORS  = { admin:'status-en_camino', staff:'status-qc', customer:'status-recibido' };

    try {
      const users = await window.Fluve.dao.users.getAll();
      const staff = users.filter(u=>u.role!=='customer');
      const customers = users.filter(u=>u.role==='customer');

      wrap.append(
        el('div',{class:'kpi-grid',style:'grid-template-columns:repeat(3,1fr);margin-bottom:20px'},
          el('div',{class:'kpi-card'},el('div',{class:'kpi-card__val'},String(users.filter(u=>u.role==='admin').length)),el('div',{class:'kpi-card__label'},'Administradores')),
          el('div',{class:'kpi-card'},el('div',{class:'kpi-card__val'},String(staff.filter(u=>u.role==='staff').length)),el('div',{class:'kpi-card__label'},'Staff')),
          el('div',{class:'kpi-card'},el('div',{class:'kpi-card__val'},String(customers.length)),el('div',{class:'kpi-card__label'},'Clientes registrados')),
        ),
        el('h3',{style:"font:600 16px 'Space Grotesk';margin:0 0 12px"},'Personal del equipo'),
        staff.length ? A().tableWrap(
          ['Usuario','Email','Rol','Creado',''],
          staff.map(u=>el('tr',{},
            el('td',{},el('div',{style:"font:600 13px 'Space Grotesk'"},u.name),el('div',{class:'mono-label'},'#'+u.id.slice(-8))),
            el('td',{class:'tbl__muted'},u.email),
            el('td',{},el('span',{class:`order-status-chip ${ROLE_COLORS[u.role]??''}`},ROLE_LABELS[u.role]??u.role)),
            el('td',{class:'tbl__muted'},u.createdAt?new Date(u.createdAt).toLocaleDateString('es-UY'):'—'),
            el('td',{},
              window.Fluve.session.current()?.id===u.id
                ? el('span',{class:'mono-label',style:'color:var(--green)'},'← sesión activa')
                : el('button',{class:'btn btn--ghost',style:'font-size:11px;min-height:30px;padding:0 10px',type:'button',onclick:()=>{
                    window.Fluve.session.loginAs(u);
                    window.Fluve.toast('Sesión cambiada a '+u.name,'success');
                    window.Fluve.router.navigate('#/admin');
                  }},'Iniciar como'),
            ),
          ))
        ) : el('div',{class:'mono-label'},'Sin staff registrado.'),
        el('div',{style:'margin-top:16px;border-top:1px solid var(--line);padding-top:14px'},
          el('p',{class:'mono-label'},'Para gestionar roles avanzados (RBAC) y clientes, accedé a la Config general.'),
          el('a',{href:'#/admin/config',class:'btn btn--ghost',style:'font-size:12px;margin-top:8px'},'Ir a Configuración'),
        ),
      );
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); }
    return wrap;
  }

  // ── A44 REGISTRO DE ACTIVIDAD ─────────────────────────────────────────────────
  async function adminActividad({ query }) {
    const searchQ   = query.q || '';
    const entityQ   = query.entity || '';
    const wrap = A().adminPageWrap('Registro de actividad (Audit Log)',
      [el('span',{},'Sistema'),el('b',{style:'color:var(--txt)'},'Actividad')], null
    );

    let activities = [], users = [];
    try {
      [activities, users] = await Promise.all([
        window.Fluve.dao.activity.getAll(),
        window.Fluve.dao.users.getAll(),
      ]);
    } catch(err){ wrap.append(window.Fluve.viewState('error',{message:err.message})); return wrap; }

    const userMap  = Object.fromEntries(users.map(u=>[u.id,u]));
    const sorted   = [...activities].sort((a,b)=>(b.at||'').localeCompare(a.at||''));
    const entities = [...new Set(sorted.map(a=>a.entity))].filter(Boolean);

    let searchVal = searchQ, entityFilter = entityQ;
    const tableSlot = el('div');
    wrap.append(tableSlot);

    function render(){
      const filt = sorted.filter(a=>{
        if(entityFilter && a.entity!==entityFilter) return false;
        if(searchVal){const q=searchVal.toLowerCase(); if(!a.action?.toLowerCase().includes(q)&&!a.entityId?.toLowerCase().includes(q)&&!a.userId?.toLowerCase().includes(q)) return false;}
        return true;
      });
      tableSlot.replaceChildren(
        el('div',{style:'display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center'},
          el('input',{class:'admin-fld',type:'search',placeholder:'Buscar acción, ID…',value:searchVal,style:'max-width:240px;min-height:36px',oninput:e=>{searchVal=e.target.value;render();}}),
          el('select',{class:'admin-fld',style:'max-width:160px;min-height:36px',onchange:e=>{entityFilter=e.target.value;render();}},
            el('option',{value:''},'Todas las entidades'),
            ...entities.map(e=>el('option',{value:e,selected:entityFilter===e?'true':null},e)),
          ),
          el('span',{class:'mono-label'},filt.length+' eventos'),
          el('button',{class:'btn btn--ghost',style:'font-size:12px',type:'button',onclick:async()=>{
            const all=await window.Fluve.dao.activity.getAll();
            const csv='at,userId,action,entity,entityId\n'+all.map(a=>`${a.at??''},${a.userId??''},${a.action??''},${a.entity??''},${a.entityId??''}`).join('\n');
            const blob=new Blob([csv],{type:'text/csv'});
            const url=URL.createObjectURL(blob);
            const link=document.createElement('a'); link.href=url; link.download='fluve-actividad-'+new Date().toISOString().slice(0,10)+'.csv'; link.click(); URL.revokeObjectURL(url);
            window.Fluve.toast('CSV exportado','success');
          }},'⬇ Exportar CSV'),
        ),
        filt.length ? el('div',{class:'card',style:'padding:0'},
          el('div',{class:'timeline',style:'padding:16px'},
            ...filt.slice(0,50).map((a,i,arr)=>{
              const u = userMap[a.userId];
              const isLast = i===arr.length-1;
              const ACTION_ICONS={'order.status_change':'📦','order.cancel':'✕','design.approve':'✓','design.reject':'✕','royalty.paid':'💰','seed.reseed':'🔄','ticket.reply':'💬','payment.refund':'↩','promo.create':'🎟️'};
              const icon = ACTION_ICONS[a.action] ?? '⋯';
              return el('div',{class:'timeline-item'},
                el('div',{class:'timeline-dot-col'},
                  el('div',{class:'timeline-dot timeline-dot--action'},icon),
                  !isLast?el('div',{class:'timeline-line'}):null,
                ),
                el('div',{class:'timeline-content'},
                  el('div',{class:'timeline-content__head'},a.action??'—'),
                  el('div',{class:'timeline-content__sub'},
                    (u?.name??a.userId??'sistema')+' · '+a.entity+' #'+a.entityId+' · '+
                    (a.at?new Date(a.at).toLocaleString('es-UY',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—')
                  ),
                  a.before||a.after?el('div',{class:'mono-label',style:'margin-top:4px;font-size:9px;color:var(--mut)'},
                    (a.before?'antes: '+JSON.stringify(a.before):'')+(a.after?' → después: '+JSON.stringify(a.after):'')
                  ):null,
                ),
              );
            }),
          ),
          filt.length>50?el('div',{class:'mono-label',style:'text-align:center;padding:12px'},`Mostrando 50 de ${filt.length} eventos`):null,
        ) : window.Fluve.viewState('empty',{title:'Sin actividad registrada',message:'Las acciones sensibles del sistema aparecerán acá.'}),
      );
    }
    render();
    return wrap;
  }

  // ── A21 AJUSTES / CONFIGURACIÓN ───────────────────────────────────────────────
  async function adminAjustes() {
    const wrap = A().adminPageWrap('Ajustes del sistema',
      [el('span',{},'Sistema'),el('b',{style:'color:var(--txt)'},'Ajustes')], null
    );

    let settings;
    try { settings = await window.Fluve.dao.settings.get('pricing'); }
    catch { settings = null; }

    if(!settings){ wrap.append(window.Fluve.viewState('empty',{title:'Sin configuración',message:'Cargá el seed para inicializar la configuración.'})); return wrap; }

    let s = { ...settings };

    wrap.append(
      el('div',{style:'display:grid;grid-template-columns:1fr 1fr;gap:20px'},
        // Márgenes y precios
        el('div',{class:'card'},
          el('h3',{style:"font:600 15px 'Space Grotesk';margin:0 0 14px"},'Motor de precios'),
          el('div',{class:'admin-form'},
            fld('Target margen global','number',String(s.targetMargin),v=>s.targetMargin=parseFloat(v)||0,'ej: 0.38 (38%)'),
            fld('Margen mínimo','number',String(s.minMargin),v=>s.minMargin=parseFloat(v)||0,'ej: 0.25 (25%)'),
            fld('IVA (decimal)','number',String(s.vat),v=>s.vat=parseFloat(v)||0,'ej: 0.22 (22%)'),
            fld('Comisión pasarela','number',String(s.gatewayFee),v=>s.gatewayFee=parseFloat(v)||0,'ej: 0.03 (3%)'),
            fld('Método de costeo','text',s.costingMethod,v=>s.costingMethod=v,'weighted | fifo'),
          ),
        ),
        // Envíos
        el('div',{class:'card'},
          el('h3',{style:"font:600 15px 'Space Grotesk';margin:0 0 14px"},'Envíos'),
          el('div',{class:'admin-form'},
            fld('Costo express','number',String(s.shipping?.expressCost??4.90),v=>{ s.shipping=s.shipping??{}; s.shipping.expressCost=parseFloat(v)||0; },'ej: 4.90'),
            fld('Envío gratis desde','number',String(s.shipping?.freeFrom??50),v=>{ s.shipping=s.shipping??{}; s.shipping.freeFrom=parseFloat(v)||0; },'ej: 50'),
          ),
          el('h3',{style:"font:600 15px 'Space Grotesk';margin:20px 0 14px"},'Regalías por tier'),
          el('div',{class:'admin-form'},
            fld('Tier Base (%)','number',String((s.royaltyTiers?.base??0.10)*100),v=>{ s.royaltyTiers=s.royaltyTiers??{}; s.royaltyTiers.base=(parseFloat(v)||0)/100; },'ej: 10 → 10%'),
            fld('Tier Pro (%)','number',String((s.royaltyTiers?.pro??0.20)*100),v=>{ s.royaltyTiers=s.royaltyTiers??{}; s.royaltyTiers.pro=(parseFloat(v)||0)/100; },'ej: 20 → 20%'),
          ),
        ),
      ),
      el('div',{style:'margin-top:20px'},
        el('button',{class:'btn btn--primary',type:'button',onclick:async()=>{
          const ok=await window.Fluve.confirm({title:'Guardar ajustes',message:'Los cambios afectarán el motor de precios y los cálculos de la plataforma.',confirmLabel:'Guardar'});
          if(!ok)return;
          await window.Fluve.dao.settings.put({...s,key:'pricing'});
          await window.Fluve.dao.logActivity('settings.update','settings','pricing',{after:{targetMargin:s.targetMargin}});
          window.Fluve.toast('Ajustes guardados correctamente','success');
        }},'Guardar cambios'),
        el('a',{href:'#/admin/precios',class:'btn btn--ghost',style:'margin-left:8px'},'Ver impacto en precios →'),
        el('a',{href:'#/admin/config',class:'btn btn--ghost',style:'margin-left:8px'},'Config seed / DB →'),
      ),
    );
    return wrap;

    function fld(label,type,value,onChange,hint){
      const inp=el('input',{class:'admin-fld',type,value,oninput:e=>onChange(e.target.value)});
      return el('div',{class:'field'},
        el('label',{class:'mono-label'},label),
        inp,
        hint?el('div',{class:'field__error',style:'color:var(--mut);margin-top:2px'},hint):null,
      );
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────────
  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.admin = window.Fluve.views.admin || {};
  Object.assign(window.Fluve.views.admin, {
    equipo:    adminEquipo,
    actividad: adminActividad,
    ajustes:   adminAjustes,
  });
})();
