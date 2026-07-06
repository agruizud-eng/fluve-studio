// views/client/cotizacion.js — Cotización B2B / Empresas (6c)
(function () {
  const { el } = window.Fluve.dom;

  async function cotizacion() {
    const slot = document.querySelector('[data-view-slot]');
    if (slot) { slot.style.padding = '0'; slot.style.maxWidth = 'none'; }
    const wrap = el('div', { class:'fu' });

    // Header
    wrap.append(el('div', { style:'max-width:1100px;margin:0 auto;padding:32px 32px 0' },
      el('div', { class:'mono-label', style:'margin-bottom:8px' }, el('a',{href:'#/',style:'color:var(--mut)'},'Inicio'),' › Empresas'),
      el('h1', { style:"font:600 38px/1.02 'Space Grotesk';letter-spacing:-1.2px;margin:0 0 8px" }, 'Pedidos empresariales'),
      el('p', { style:"font:400 16px/1.6 'Inter';color:var(--mut);margin:0 0 28px" }, 'Merch de marca, uniformes y regalos corporativos con precios por volumen y atención dedicada.'),
    ));

    // Layout: form + benefits
    const layout = el('div', { class:'cotizacion-layout' });
    wrap.append(layout);

    const f = {
      empresa:'', contacto:'', email:'', whatsapp:'',
      producto:'', cantidad:'', tecnica:'', fecha:'', notas:'',
    };

    function inp(label, key, type='text', placeholder='') {
      const input = el('input', { class:'fld', type, placeholder: placeholder||label, oninput: e => f[key] = e.target.value });
      return el('div', { class:'field' }, el('label', { class:'field__label' }, label), input);
    }

    layout.append(
      // Form
      el('div', { class:'card', style:'display:flex;flex-direction:column;gap:14px' },
        el('h3', { style:"font:600 17px 'Space Grotesk';margin:0 0 4px" }, 'Solicitá tu presupuesto'),
        el('div', { style:'display:grid;grid-template-columns:1fr 1fr;gap:12px' },
          inp('Empresa','empresa'),
          inp('Nombre de contacto','contacto'),
          inp('Email','email','email','contacto@empresa.com'),
          inp('WhatsApp','whatsapp','tel','+598 09 XXX XXXX'),
          inp('Producto (ej. remera, hoodie)','producto'),
          inp('Cantidad estimada','cantidad','number','50'),
          inp('Técnica (si sabés)','tecnica','text','DTF, bordado…'),
          inp('Fecha límite','fecha','date'),
        ),
        el('div', { class:'field' },
          el('label', { class:'field__label' }, 'Notas adicionales / Brief'),
          el('textarea', { class:'fld', style:'min-height:80px;resize:vertical', placeholder:'Colores de marca, archivos, requisitos especiales…', oninput: e => f.notas = e.target.value }),
        ),
        el('div', { style:'border:1px dashed var(--line2);border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px;color:var(--mut)' },
          el('span', { style:'font-size:20px' }, '↑'),
          el('div', {},
            el('div', { style:"font:600 13px 'Space Grotesk'" }, 'Adjuntá tu logo / brief'),
            el('div', { class:'mono-label' }, 'PNG, PDF, SVG — hasta 20 MB'),
          ),
          el('button', { class:'btn btn--ghost', style:'margin-left:auto;font-size:12px', type:'button',
            onclick: () => window.Fluve.toast('Upload de archivos — disponible en la versión final', 'default')
          }, 'Seleccionar'),
        ),
        el('button', { class:'btn btn--primary', style:'width:100%;justify-content:center', type:'button',
          onclick: async () => {
            if (!f.empresa || !f.email || !f.producto) {
              window.Fluve.toast('Completá empresa, email y producto como mínimo', 'error');
              return;
            }
            const quoteId = 'COT-' + Date.now().toString(36).toUpperCase();
            const quote = { id:quoteId, type:'b2b', status:'nueva', ...f, createdAt:new Date().toISOString() };
            await window.Fluve.dao.settings.put({ key:'quote-'+quoteId, ...quote }).catch(() => null);
            await window.Fluve.dao.logActivity('quote.create', 'quotes', quoteId, { after: { empresa: f.empresa, producto: f.producto } });
            window.Fluve.toast('¡Cotización enviada! Te contactamos en 2–4 horas hábiles.', 'success');
            window.Fluve.router.navigate('#/');
          }
        }, 'Enviar solicitud →'),
      ),
      // Benefits
      el('div', { style:'display:flex;flex-direction:column;gap:14px' },
        benefitCard('📉', 'Precios por volumen', 'Cuanto más pedís, menor el precio unitario. Descuentos desde 10 unidades.'),
        benefitCard('🎁', 'Packaging de tu marca', 'Unboxing con tu identidad. Personalización de embalaje disponible.'),
        benefitCard('🔁', 'Reposición recurrente', 'Configurá pedidos periódicos automáticos para mantener stock.'),
        benefitCard('👤', 'Ejecutivo asignado', 'Un punto de contacto dedicado para seguir tu pedido.'),
        benefitCard('🧾', 'Factura empresa', 'Emitimos factura a nombre de tu empresa con RUT.'),
        el('div', { style:'border:1px solid var(--line2);border-radius:12px;padding:14px 16px;background:var(--ink2)' },
          el('div', { class:'mono-label', style:'margin-bottom:6px' }, 'Respuesta rápida'),
          el('div', { style:"font:400 12.5px 'Inter';color:var(--mut)" }, 'Respondemos en 2–4 horas hábiles. Para urgencias: '),
          el('a', { href:'https://wa.me/59899000000', target:'_blank', style:'color:var(--green);font-size:12.5px' }, '💬 Escribinos por WhatsApp'),
        ),
      ),
    );
    return wrap;
  }

  function benefitCard(icon, title, text) {
    return el('div', { style:'border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:var(--ink2);display:flex;gap:12px' },
      el('span', { style:'font-size:22px;flex:none;margin-top:2px' }, icon),
      el('div', {},
        el('div', { style:"font:600 13.5px 'Space Grotesk';margin-bottom:3px" }, title),
        el('div', { style:"font:400 12.5px 'Inter';color:var(--mut)" }, text),
      ),
    );
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  window.Fluve.views.client.cotizacion = cotizacion;
})();
