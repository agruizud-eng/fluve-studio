// views/client/confianza.js — páginas de confianza (6i): FAQ, Cómo funciona, Envíos, Devoluciones
(function () {
  const { el } = window.Fluve.dom;

  async function faq() {
    const slot = document.querySelector('[data-view-slot]');
    if (slot) { slot.style.padding = '0'; slot.style.maxWidth = 'none'; }
    const wrap = el('div', { class:'fu trust-page' });

    // Leer FAQs del CMS settings o usar defaults
    let faqItems;
    try {
      const cms = await window.Fluve.dao.settings.get('cms');
      faqItems = cms?.faqItems?.length ? cms.faqItems : defaultFAQ();
    } catch { faqItems = defaultFAQ(); }

    wrap.append(
      el('div', { class:'mono-label', style:'margin-bottom:12px' },
        el('a', { href:'#/', style:'color:var(--mut)' }, 'Inicio'), ' › Preguntas frecuentes'),
      el('h1', {}, 'Preguntas frecuentes'),
      el('p', {}, 'Todo lo que necesitás saber sobre Fluvë Studio, tus pedidos y el proceso de impresión.'),
      ...faqItems.map((item, i) => {
        const ans = el('div', { style:'display:none;padding:12px 0;font:400 14px/1.65 var(--font-body);color:var(--mut)' }, item.a);
        const q = el('div', { style:'display:flex;justify-content:space-between;align-items:center;cursor:pointer;padding:14px 0',
          onclick: () => {
            const open = ans.style.display !== 'none';
            ans.style.display = open ? 'none' : 'block';
            toggle.textContent = open ? '▾' : '▲';
          }
        },
          el('span', { style:"font:600 15px 'Space Grotesk'" }, item.q),
          el('span', { style:'color:var(--mut)' }, '▾'),
        );
        const toggle = q.querySelector('span:last-child');
        return el('div', { style:'border-bottom:1px solid var(--line)' }, q, ans);
      }),
      el('div', { style:'margin-top:32px;border:1px solid var(--line2);border-radius:14px;padding:20px;background:var(--ink2);text-align:center' },
        el('div', { style:"font:600 16px 'Space Grotesk';margin-bottom:8px" }, '¿No encontrás lo que buscás?'),
        el('div', { class:'mono-label', style:'margin-bottom:14px' }, 'El equipo de soporte te responde en menos de 24h.'),
        el('div', { style:'display:flex;gap:10px;justify-content:center' },
          el('a', { href:'#/cuenta/soporte', class:'btn btn--primary' }, 'Abrir ticket'),
          el('a', { href:'https://wa.me/59899000000', target:'_blank', class:'btn btn--ghost' }, '💬 WhatsApp'),
        ),
      ),
    );
    return wrap;
  }

  async function comoFunciona() {
    const slot = document.querySelector('[data-view-slot]');
    if (slot) { slot.style.padding = '0'; slot.style.maxWidth = 'none'; }
    const wrap = el('div', { class:'fu trust-page' });
    wrap.append(
      el('div', { class:'mono-label', style:'margin-bottom:12px' }, el('a', { href:'#/', style:'color:var(--mut)' }, 'Inicio'), ' › Cómo funciona'),
      el('h1', {}, 'Cómo funciona Fluvë Studio'),
      el('p', {}, 'En 4 pasos simples, de la idea a tu puerta en 24–48 horas.'),
      el('div', { class:'trust-page-steps' },
        stepCard('01', 'var(--accent2)', 'Elegí o creá tu diseño', 'Navegá la galería de artistas o subí tu propio archivo. También podés crear un diseño desde cero con nuestro editor online.'),
        stepCard('02', 'var(--cyan)', 'Personalizá el producto', 'Elegí el producto (remera, hoodie, taza y más), el color, la talla y la técnica de impresión. El precio se actualiza en tiempo real.'),
        stepCard('03', 'var(--magenta)', 'Control de calidad Fluvë', 'Producimos con nuestras imprentas aliadas y realizamos un control de calidad estricto antes de empaquetar con nuestra identidad de marca.'),
        stepCard('04', 'var(--yellow)', 'Recibís en 24–48h', 'Entrega express con logística local. Seguí tu pedido en tiempo real desde Mi cuenta.'),
      ),
      el('h2', {}, 'Técnicas de impresión disponibles'),
      el('div', { style:'display:flex;flex-direction:column;gap:10px' },
        ...techRows([
          ['DTF (Direct to Film)', 'Colores vibrantes, alta durabilidad, ideal para diseños complejos. Sin mínimos.'],
          ['Sublimación', 'Para prendas 100% poliéster. Colores que no se desvanecen. Ideal para full-color.'],
          ['Serigrafía', 'Hasta 4 tintas. Ideal para pedidos grandes y diseños planos. Mínimo 12 unidades.'],
          ['Bordado', 'Textura premium. Ideal para logos en gorras, camisas y hoodies.'],
          ['DTF UV', 'Resistente al agua y al exterior. Para superficies rígidas.'],
        ]),
      ),
    );
    return wrap;
  }

  async function envios() {
    const slot = document.querySelector('[data-view-slot]');
    if (slot) { slot.style.padding = '0'; slot.style.maxWidth = 'none'; }
    const wrap = el('div', { class:'fu trust-page' });
    wrap.append(
      el('div', { class:'mono-label', style:'margin-bottom:12px' }, el('a', { href:'#/', style:'color:var(--mut)' }, 'Inicio'), ' › Envíos'),
      el('h1', {}, 'Envíos y entregas'),
      el('p', {}, 'Entregamos en todo Uruguay con logística local de confianza.'),
      infoCard('⚡ Express 24–48h', '$4,90 · Incluído en la mayoría de los pedidos · Gratis en pedidos sobre $50 UYU.'),
      infoCard('🚚 Estándar 3–5 días hábiles', 'Gratis para todos los pedidos. Sin prisa, sin costo.'),
      el('h2', {}, 'Zonas de cobertura'),
      el('div', { style:'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0' },
        ...['Montevideo (D+1)', 'Canelones (D+1)', 'Maldonado (D+2)', 'Colonia (D+2)', 'Paysandú (D+2)', 'Interior (D+3)'].map(z=>
          el('div',{style:'border:1px solid var(--line);border-radius:10px;padding:10px 14px;background:var(--ink2);font:500 12.5px var(--font-body)'},z)
        ),
      ),
      el('h2', {}, 'Seguimiento del pedido'),
      el('p', {}, 'Desde Mi cuenta → Mis pedidos podés ver el estado de tu pedido en tiempo real: Recibido → En producción → QC y packaging → En camino → Entregado.'),
      infoCard('📞 Contacto urgente', 'WhatsApp: +598 99 000 000 · Email: hola@fluvestudio.uy · Respuesta en menos de 2 horas en horario comercial.'),
    );
    return wrap;
  }

  async function devoluciones() {
    const slot = document.querySelector('[data-view-slot]');
    if (slot) { slot.style.padding = '0'; slot.style.maxWidth = 'none'; }
    const wrap = el('div', { class:'fu trust-page' });
    wrap.append(
      el('div', { class:'mono-label', style:'margin-bottom:12px' }, el('a', { href:'#/', style:'color:var(--mut)' }, 'Inicio'), ' › Devoluciones'),
      el('h1', {}, 'Devoluciones y cambios'),
      el('p', {}, 'Garantizamos tu satisfacción. Si algo no está bien, lo arreglamos.'),
      el('div', { style:'border:1px solid var(--green);border-radius:14px;padding:18px;background:rgba(63,203,126,.08);margin:16px 0' },
        el('div', { style:"font:700 15px 'Space Grotesk';color:var(--green);margin-bottom:6px" }, '✓ Política de Satisfacción Garantizada'),
        el('p', { style:"font:400 13.5px/1.55 'Inter';color:var(--txt);margin:0" }, 'Si tu pedido tiene defectos de impresión, color incorrecto o daños de envío, lo reimprimimos o reembolsamos sin costo extra. Solo necesitamos una foto del problema.'),
      ),
      el('h2', {}, 'Casos cubiertos'),
      el('div', { style:'display:flex;flex-direction:column;gap:8px;margin:12px 0' },
        ...['Defecto de impresión (color, bordes, calidad)','Producto dañado en el envío','Producto incorrecto (modelo o talla diferente a lo pedido)','Diseño impreso con error nuestro'].map(i=>
          el('div',{style:'display:flex;align-items:center;gap:8px;font:500 13px var(--font-body)'},el('span',{style:'color:var(--green)'},'✓'),i)
        ),
      ),
      el('h2', {}, 'Casos NO cubiertos'),
      el('div', { style:'display:flex;flex-direction:column;gap:8px;margin:12px 0' },
        ...['Arrepentimiento de compra (es un producto personalizado)','Error en el diseño subido por el cliente (tip: revisá el proof antes de aprobar)','Diferencia de color pantalla vs impresión (normal en impresión digital)'].map(i=>
          el('div',{style:'display:flex;align-items:center;gap:8px;font:500 13px var(--font-body)'},el('span',{style:'color:var(--magenta)'},'✕'),i)
        ),
      ),
      el('h2', {}, 'Cómo reclamar'),
      el('p', {}, 'Abrí un ticket desde Mi cuenta → Soporte, seleccioná el pedido y adjuntá una foto del problema. Respondemos en menos de 24h con la solución.'),
      el('a', { href:'#/cuenta/soporte', class:'btn btn--primary', style:'margin-top:8px' }, 'Abrir reclamación →'),
    );
    return wrap;
  }

  // Helpers
  function stepCard(num, color, title, text) {
    return el('div', { class:'trust-page-step' },
      el('div', { style:`font:700 32px 'Space Grotesk';color:${color};margin-bottom:8px` }, num),
      el('div', { style:"font:600 16px 'Space Grotesk';margin-bottom:6px" }, title),
      el('div', { style:"font:400 13px/1.6 'Inter';color:var(--mut)" }, text),
    );
  }
  function techRows(items) {
    return items.map(([name, desc]) => el('div', { style:'border:1px solid var(--line);border-radius:10px;padding:12px 16px;background:var(--ink2);display:flex;gap:12px' },
      el('div', { style:'flex:1' },
        el('div', { style:"font:600 13.5px 'Space Grotesk'" }, name),
        el('div', { class:'mono-label', style:'margin-top:3px' }, desc),
      ),
    ));
  }
  function infoCard(title, text) {
    return el('div', { style:'border:1px solid var(--line2);border-radius:12px;padding:14px 16px;background:var(--ink2);margin:10px 0' },
      el('div', { style:"font:600 14px 'Space Grotesk';margin-bottom:4px" }, title),
      el('div', { class:'mono-label', style:'line-height:1.5' }, text),
    );
  }

  function defaultFAQ() {
    return [
      { q: '¿Cuánto tarda en llegar mi pedido?', a: 'Producimos en 12–24h y entregamos en 24–48h (express) o 3–5 días hábiles (estándar). Podés elegir el método en el checkout.' },
      { q: '¿Puedo usar mi propio diseño?', a: 'Sí. En el personalizador podés subir tu propio archivo (PNG, PDF o SVG en alta resolución, mínimo 300 DPI) o crear uno desde el Editor de diseño.' },
      { q: '¿Cuál técnica de impresión me recomendás?', a: 'Para diseños a color con muchos detalles, DTF es la mejor opción. Para prendas de poliéster, sublimación. Para logos simples en grandes cantidades, serigrafía. El personalizador te guía.' },
      { q: '¿Cómo hago para vender mis diseños?', a: 'Creá tu cuenta, completá el formulario en "Vende tu arte" y enviá tu solicitud. El equipo lo revisa en 48–72h.' },
      { q: '¿Qué pasa si el producto llega dañado?', a: 'Abrí un ticket en Mi cuenta → Soporte con una foto del problema. Lo reimprimimos o te reembolsamos sin costo.' },
      { q: '¿Cuáles son los métodos de pago?', a: 'Aceptamos tarjetas de débito y crédito, MercadoPago y transferencia bancaria. El pago es seguro con cifrado SSL.' },
    ];
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  Object.assign(window.Fluve.views.client, { faq, comoFunciona, envios, devoluciones });
})();
