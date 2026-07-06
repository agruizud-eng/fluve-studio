// views/client/checkout.js — Checkout stepper Datos→Envío→Pago (Fase 4). Referencia: Checkout+Tracking hi-fi Pantalla B.
(function () {
  const { el } = window.Fluve.dom;
  const PE = { remera:'👕', hoodie:'🧥', taza:'☕', tote:'👜', funda:'📱', cuadro:'🖼️' };

  async function checkout() {
    const { lines } = window.Fluve.cart.store.get();
    if (!lines.length) {
      window.Fluve.router.navigate('#/carrito');
      return el('div');
    }

    let step = 1; // 1=Datos, 2=Envío+Pago
    const user = window.Fluve.session.current();
    const totals = window.Fluve.cart.calcTotals(lines, null, 4.90);

    const form = {
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      name: user?.name ?? '',
      street: user?.addresses?.[0]?.line ?? '',
      city: user?.addresses?.[0]?.city ?? '',
      zip: user?.addresses?.[0]?.zip ?? '',
      shipping: 'express',
      payment: 'card',
    };

    const wrap = el('div', { class:'fu checkout-layout' });

    const stepperEl = el('div', { class:'checkout-stepper' });
    const stepBodies = el('div', { class:'checkout-section' });
    const grid = el('div', { class:'checkout-grid' },
      el('div', {}, stepperEl, stepBodies),
      buildOrderSummary(lines, totals),
    );
    wrap.append(grid);

    function updateStepper() {
      stepperEl.replaceChildren(
        stepLabel('① Datos', step >= 1, step > 1),
        el('span', { class:'checkout-step-sep' }, '———'),
        stepLabel('② Envío', step >= 2, step > 2),
        el('span', { class:'checkout-step-sep' }, '———'),
        stepLabel('③ Pago', step >= 3, step > 3),
      );
    }

    function stepLabel(txt, active, done) {
      return el('span', { class:`checkout-step-label ${done ? 'done' : active ? 'active' : ''}` }, txt);
    }

    function renderStep1() {
      stepBodies.replaceChildren();

      // ── Estado local del paso ────────────────────────────────────────────────
      let isGuest = !user; // si no hay sesión, default = invitado

      // ── Campos del formulario ────────────────────────────────────────────────
      const emailFld  = fld('email',  'Email',              'email', form.email,  v => form.email  = v);
      const phoneFld  = fld('phone',  'Teléfono',           'tel',   form.phone,  v => form.phone  = v, '150px');
      const nameFld   = fld('name',   'Nombre y apellidos', 'text',  form.name,   v => form.name   = v);
      const streetFld = fld('street', 'Calle y número',     'text',  form.street, v => form.street = v);
      const cityFld   = fld('city',   'Ciudad',             'text',  form.city,   v => form.city   = v, '1fr');
      const zipFld    = fld('zip',    'CP',                 'text',  form.zip,    v => form.zip    = v, '110px');

      // ── Sección de contacto (email + tel) ────────────────────────────────────
      const contactSec = el('div', {},
        el('h3', { class:'checkout-section-title' }, 'Contacto'),
        el('div', { class:'form-row' }, emailFld, phoneFld),
      );

      // ── Sección de dirección (se muestra solo en modo invitado/logueado) ─────
      const addrSec = el('div', {},
        el('h3', { class:'checkout-section-title' }, 'Dirección de envío'),
        el('div', { style:'display:flex;flex-direction:column;gap:10px' },
          nameFld, streetFld,
          el('div', { class:'form-row' }, cityFld, zipFld),
        ),
      );

      // ── Botón continuar ──────────────────────────────────────────────────────
      const nextBtn = el('button', { class:'btn btn--primary', type:'button', style:'align-self:flex-start' }, 'Continuar con el envío →');
      nextBtn.addEventListener('click', () => {
        const currentUser = window.Fluve.session.current();
        if (!isGuest && !currentUser) {
          window.Fluve.toast('Marcá "Comprar como invitado" o iniciá sesión para continuar', 'error');
          return;
        }
        let ok = true;
        if (!form.email.includes('@'))                  { ok = false; window.Fluve.toast('Ingresá un email válido', 'error'); }
        if (!form.name.trim() && !currentUser)          { ok = false; window.Fluve.toast('Ingresá tu nombre completo', 'error'); }
        if (!form.name.trim() && currentUser)             form.name = currentUser.name;
        if (!form.email.trim() && currentUser)            form.email = currentUser.email;
        if (ok) { step = 2; updateStepper(); renderStep2(); }
      });

      // ── Si hay sesión activa: mostrar badge de usuario ───────────────────────
      if (user) {
        const userBadge = el('div', { style:'border:1px solid var(--green);border-radius:12px;padding:10px 14px;background:rgba(63,203,126,.08);display:flex;align-items:center;gap:10px;margin:14px 0' },
          el('span', { style:'color:var(--green);font-size:18px' }, '✓'),
          el('div', {},
            el('div', { style:"font:600 13px 'Space Grotesk';color:var(--txt)" }, 'Comprando como ' + user.name),
            el('div', { class:'mono-label' }, user.email),
          ),
          el('button', { class:'btn btn--ghost', type:'button', style:'margin-left:auto;font-size:12px;min-height:34px',
            onclick: () => { window.Fluve.session.logout(); window.Fluve.router.navigate('#/checkout'); }
          }, 'Cambiar cuenta'),
        );
        stepBodies.append(contactSec, userBadge, addrSec, nextBtn);
        return;
      }

      // ── Sin sesión: toggle invitado / iniciar sesión ─────────────────────────
      const guestCheckbox = el('input', {
        type: 'checkbox',
        id: 'guest-check',
        style: 'width:16px;height:16px;cursor:pointer;flex:none;margin-top:2px',
      });
      guestCheckbox.checked = true; // default = invitado

      // Panel de login inline (aparece cuando se desmarca el checkbox)
      const loginPanel = el('div', { style:'display:none;margin-top:10px' });

      function buildLoginPanel() {
        let lEmail = form.email || '', lPass = '';
        loginPanel.replaceChildren(
          el('div', { style:'border:1px solid var(--line2);border-radius:14px;padding:18px;background:var(--ink3);display:flex;flex-direction:column;gap:10px' },
            el('div', { style:"font:600 14px 'Space Grotesk';margin-bottom:2px" }, 'Iniciar sesión'),
            el('p', { style:"font:400 12.5px 'Inter';color:var(--mut);margin:0" },
              'Ingresá tus credenciales para vincular el pedido a tu cuenta.'),
            el('input', { class:'fld', type:'email', placeholder:'Email', value:lEmail,
              oninput: e => lEmail = e.target.value }),
            el('input', { class:'fld', type:'password', placeholder:'Contraseña',
              oninput: e => lPass = e.target.value }),
            el('div', { style:'display:flex;gap:8px;flex-wrap:wrap' },
              el('button', { class:'btn btn--primary', type:'button', style:'flex:1;justify-content:center',
                onclick: async () => {
                  if (!lEmail || !lPass) { window.Fluve.toast('Completá email y contraseña','error'); return; }
                  try {
                    const all = await window.Fluve.dao.users.getAll();
                    const found = all.find(u => u.email.toLowerCase() === lEmail.toLowerCase());
                    if (!found || found.passwordHash !== lPass) throw new Error('Credenciales incorrectas');
                    await window.Fluve.session.login(found.id);
                    // Pre-llenar el formulario con datos del usuario
                    form.email  = found.email;
                    form.name   = found.name;
                    form.phone  = found.phone ?? '';
                    form.street = found.addresses?.[0]?.line ?? '';
                    form.city   = found.addresses?.[0]?.city ?? '';
                    form.zip    = found.addresses?.[0]?.zip ?? '';
                    window.Fluve.toast('¡Bienvenido, ' + found.name + '! Continuá con tu compra.', 'success');
                    renderStep1(); // re-render con badge de usuario logueado
                  } catch(err) { window.Fluve.toast(err.message, 'error'); }
                }
              }, 'Iniciar sesión'),
              el('a', { href:'#/auth?return=%23%2Fcheckout', class:'btn btn--ghost', style:'flex:1;justify-content:center' },
                'Crear cuenta →'),
            ),
            el('button', { class:'nav-fav', type:'button', style:"font:500 11.5px 'Inter';color:var(--mut);background:none;border:none;cursor:pointer;padding:0;margin-top:4px;text-align:left",
              onclick: () => { guestCheckbox.checked = true; onGuestToggle(); }
            }, '← Volver a comprar como invitado'),
          ),
        );
      }

      function onGuestToggle() {
        isGuest                  = guestCheckbox.checked;
        loginPanel.style.display = isGuest ? 'none' : 'block';
        addrSec.style.display    = isGuest ? '' : 'none';
        if (!isGuest) buildLoginPanel();
      }

      guestCheckbox.addEventListener('change', onGuestToggle);

      const guestCard = el('div', { style:'border:1px solid var(--line2);border-radius:14px;padding:14px;background:var(--ink2);margin:14px 0' },
        el('label', { style:'display:flex;align-items:flex-start;gap:10px;cursor:pointer', for:'guest-check' },
          guestCheckbox,
          el('div', {},
            el('div', { style:"font:600 13px 'Space Grotesk';color:var(--txt)" }, 'Comprar como invitado'),
            el('div', { style:"font:400 11.5px 'Inter';color:var(--mut);margin-top:3px;line-height:1.45" },
              'No necesitás crear una cuenta. Al finalizar el pedido te ofrecemos crear una para seguirlo desde Mi cuenta.'),
          ),
        ),
      );

      stepBodies.append(contactSec, guestCard, loginPanel, addrSec, nextBtn);
    }

    function renderStep2() {
      stepBodies.replaceChildren();

      // Shipping
      const shippingOpts = el('div', { style:'display:flex;flex-direction:column;gap:10px' });
      [
        { val:'express', label:'⚡ Express 24–48h', sub:'Mensajería local', price:'$4,90' },
        { val:'standard', label:'Estándar 3–5 días', sub:'Correo nacional', price:'Gratis', priceColor:'var(--green)' },
      ].forEach(({ val, label, sub, price, priceColor }) => {
        const opt = el('div', { class:`shipping-option${form.shipping === val ? ' active' : ''}` },
          el('div', {},
            el('div', { style:"font:600 13px 'Space Grotesk'" }, label),
            el('div', { class:'mono-label' }, sub),
          ),
          el('span', { style:`font:600 14px 'Space Grotesk';${priceColor ? 'color:' + priceColor : ''}` }, price),
        );
        opt.addEventListener('click', () => {
          form.shipping = val;
          shippingOpts.querySelectorAll('.shipping-option').forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
        });
        shippingOpts.append(opt);
      });

      // Payment
      const payTabs = el('div', { class:'payment-tabs' });
      const payFields = el('div', { style:'display:flex;flex-direction:column;gap:10px' });
      [['card','💳 Tarjeta'],['paypal','PayPal'],['transfer','Transferencia'],['mercadopago','MercadoPago']].forEach(([val,label]) => {
        const tab = el('button', { class:`payment-tab${form.payment===val?' active':''}`, type:'button' }, label);
        tab.addEventListener('click', () => {
          form.payment = val;
          payTabs.querySelectorAll('.payment-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          renderPayFields();
        });
        payTabs.append(tab);
      });

      function renderPayFields() {
        payFields.replaceChildren();
        if (form.payment === 'card') {
          payFields.append(
            el('input', { class:'fld', type:'text', placeholder:'Número de tarjeta' }),
            el('div', { class:'form-row' },
              el('input', { class:'fld', type:'text', placeholder:'MM / AA' }),
              el('input', { class:'fld', type:'text', placeholder:'CVC', style:'width:110px;flex:none' }),
            ),
          );
        } else {
          payFields.append(el('p', { style:"font:400 13px 'Inter';color:var(--mut)" }, `Serás redirigido a ${form.payment === 'paypal' ? 'PayPal' : form.payment === 'mercadopago' ? 'MercadoPago' : 'tu banco'} para completar el pago.`));
        }
      }
      renderPayFields();

      const payBtn = el('button', { class:'btn btn--primary', type:'button', style:'width:100%;justify-content:center;margin-top:8px' }, `Pagar $${totals.total.toFixed(2).replace('.',',')} →`);
      payBtn.addEventListener('click', () => handlePayment());

      stepBodies.append(
        el('div', {},
          el('h3', { class:'checkout-section-title' }, 'Método de envío'),
          shippingOpts,
        ),
        el('div', {},
          el('h3', { class:'checkout-section-title' }, 'Pago'),
          payTabs, payFields, payBtn,
          el('div', { class:'mono-label', style:'text-align:center;margin-top:10px' }, 'Al pagar aceptás los Términos'),
        ),
      );
    }

    async function handlePayment() {
      step = 3; updateStepper();
      stepBodies.replaceChildren(window.Fluve.viewState('loading', { rows: 2 }));

      // Simular "procesando pago" (600ms)
      await new Promise(r => setTimeout(r, 600));

      try {
        // Generar orden
        const orderId = 'FLV-' + (Math.floor(Math.random() * 9000) + 1000);
        const payId   = 'TX-' + (Math.floor(Math.random() * 90000) + 10000);
        const now = new Date().toISOString();
        const STEPS = ['recibido','produccion','qc','en_camino','entregado'];
        const order = {
          id: orderId,
          userId: window.Fluve.session.current()?.id ?? 'guest',
          lines: lines.map(l => ({ ...l })),
          contact: { name: form.name, email: form.email, phone: form.phone },
          shippingAddress: { line: form.street, city: form.city, zip: form.zip },
          shippingMethod: form.shipping,
          shippingCost: form.shipping === 'express' ? 4.90 : 0,
          subtotal: totals.subtotal,
          tax: 0,
          total: totals.total,
          paymentId: payId,
          status: 'recibido',
          supplierId: null,
          qcStatus: null,
          trackingSteps: STEPS.map((s, i) => ({ step: s, done: i === 0, at: i === 0 ? now : null })),
          createdAt: now,
        };
        const payment = {
          id: payId, orderId, method: form.payment,
          amount: totals.total, status: 'approved', createdAt: now, refundOf: null,
        };
        await window.Fluve.dao.orders.put(order);
        await window.Fluve.dao.payments.put(payment);
        await window.Fluve.cart.clearCart();
        await window.Fluve.dao.logActivity('order.created', 'orders', orderId);
        window.Fluve.router.navigate('#/pedido/' + orderId);
      } catch (err) {
        stepBodies.replaceChildren(window.Fluve.viewState('error', { message: 'No se pudo procesar el pago: ' + err.message }));
      }
    }

    updateStepper();
    renderStep1();
    return wrap;
  }

  function fld(id, label, type, value, onChange, width) {
    const input = el('input', { class:'fld', id, type, value, placeholder: label, style: width ? `flex:none;width:${width}` : '' });
    input.addEventListener('input', e => onChange(e.target.value));
    return el('div', { style:`display:flex;flex-direction:column;gap:6px;${width ? 'flex:none;width:'+width : 'flex:1'}` },
      el('label', { class:'mono-label', for: id }, label),
      input,
    );
  }

  function buildOrderSummary(lines, totals) {
    return el('div', { class:'cart-summary-card' },
      el('div', { class:'mono-label', style:'margin-bottom:14px' }, 'Tu pedido'),
      ...lines.map(l => el('div', { class:'order-mini-line' },
        el('div', { class:'order-mini-thumb' }, ({ remera:'👕', hoodie:'🧥', taza:'☕', tote:'👜', funda:'📱', cuadro:'🖼️' })[l.productId] ?? '📦'),
        el('div', { style:'flex:1' },
          el('div', { style:"font:600 12px 'Space Grotesk'" }, (l.productName ?? l.productId)),
          el('div', { class:'mono-label' }, (l.config.color ?? '') + ' · x' + l.config.qty),
        ),
        el('span', { class:'mono-label', style:'color:var(--txt)' }, '$' + l.lineTotal.toFixed(2).replace('.',',')),
      )),
      el('div', { class:'cart-summary-divider' }),
      el('div', { style:'display:flex;flex-direction:column;gap:7px;font:500 12.5px var(--font-body);color:var(--mut)' },
        el('div', { style:'display:flex;justify-content:space-between' }, el('span',{},'Subtotal'), el('span',{style:'color:var(--txt)'},'$' + totals.subtotal.toFixed(2).replace('.',','))),
        el('div', { style:'display:flex;justify-content:space-between' }, el('span',{},'Envío'), el('span',{style:'color:var(--txt)'},'$' + totals.shipping.toFixed(2).replace('.',','))),
      ),
      el('div', { style:'display:flex;justify-content:space-between;align-items:baseline;margin-top:12px' },
        el('span', { style:"font:600 14px 'Space Grotesk'" }, 'Total'),
        el('span', { style:"font:600 24px 'Space Grotesk'" }, '$' + totals.total.toFixed(2).replace('.',',')),
      ),
    );
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  window.Fluve.views.client.checkout = checkout;
})();
