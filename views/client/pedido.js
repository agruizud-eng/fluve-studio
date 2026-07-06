// views/client/pedido.js — Confirmación + tracking (Fase 4). Referencia: Checkout+Tracking hi-fi Pantalla C.
(function () {
  const { el } = window.Fluve.dom;

  const STEP_META = {
    recibido:   { label: 'Pedido recibido y pagado',           sub: '' },
    produccion: { label: 'En producción',                      sub: 'Imprenta aliada · en curso' },
    qc:         { label: 'Control de calidad + packaging',     sub: 'Acabados y caja Fluvë' },
    en_camino:  { label: 'En camino',                          sub: 'Mensajería local express' },
    entregado:  { label: 'Entregado',                          sub: '' },
  };
  const STEP_ORDER = ['recibido','produccion','qc','en_camino','entregado'];

  async function pedido({ params }) {
    const orderId = params.id;
    if (!orderId) { window.Fluve.router.navigate('#/cuenta'); return el('div'); }

    let order;
    try {
      order = await window.Fluve.dao.orders.get(orderId);
    } catch {}

    if (!order) return window.Fluve.viewState('not-found', { message: 'Pedido no encontrado.' });

    const wrap = el('div', { class:'fu tracking-wrap' });

    // Header: confirmation card
    const statusIdx = STEP_ORDER.indexOf(order.status);
    const delivered  = order.status === 'entregado';
    const cancelled  = order.status === 'cancelado';

    wrap.append(el('div', { class:'confirm-hero' },
      el('div', { class:'confirm-check' }, delivered ? '✓' : cancelled ? '✕' : '●'),
      el('h1', { style:"font:600 30px 'Space Grotesk';letter-spacing:-1px;margin:0 0 6px" },
        cancelled ? '¡Pedido cancelado!' : delivered ? '¡Pedido entregado!' : '¡Pedido confirmado!',
      ),
      el('p', { style:"font:400 14px 'Inter';color:var(--mut);margin:0 0 14px" },
        'Pedido ', el('b', { style:'color:var(--txt)' }, '#' + order.id), ' · ', order.contact?.email ?? '',
      ),
      !cancelled ? el('span', { class:'mono-label', style:'display:inline-flex;gap:7px;color:var(--cyan);background:rgba(43,217,228,.1);border:1px solid rgba(43,217,228,.3);border-radius:20px;padding:7px 14px' },
        '⚡ Entrega estimada: 24–48h',
      ) : null,
    ));

    // Tracking steps
    wrap.append(el('h3', { style:"font:600 18px 'Space Grotesk';margin:28px 0 16px" }, 'Seguimiento del pedido'));
    const stepsCard = el('div', { class:'card', style:'padding:22px 24px' });
    const trackSteps = el('div', { class:'tracking-steps' });

    STEP_ORDER.forEach((stepId, i) => {
      const meta     = STEP_META[stepId];
      const stepData = order.trackingSteps?.find(s => s.step === stepId);
      const done     = stepData?.done ?? false;
      const current  = !done && (i === statusIdx + 1 || (i === 0 && statusIdx < 0));
      const isLast   = i === STEP_ORDER.length - 1;

      const dot = el('div', { class:'tracking-step__dot ' + (done ? 'tracking-step__dot--done' : current ? 'tracking-step__dot--current' : 'tracking-step__dot--pending') },
        done ? '✓' : current ? '●' : '○',
      );

      const line = isLast ? null : el('div', { class:'tracking-step__line ' + (done ? 'tracking-step__line--done' : 'tracking-step__line--pending') });

      const content = el('div', { class:'tracking-step__content' },
        el('div', { class:'tracking-step__title' }, meta.label),
        meta.sub ? el('div', { class:'tracking-step__sub' }, meta.sub) : null,
        stepData?.at ? el('div', { class:'tracking-step__sub' }, new Date(stepData.at).toLocaleString('es-UY', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })) : null,
      );

      const row = el('div', { class:'tracking-step' + (!done && !current ? ' tracking-step--faded' : '') },
        el('div', { class:'tracking-step__dot-col' }, dot, line),
        content,
      );
      trackSteps.append(row);
    });
    stepsCard.append(trackSteps);
    wrap.append(stepsCard);

    // ── Oferta de crear cuenta (solo para pedidos de invitados) ──────────────
    const sessionUser = window.Fluve.session.current();
    if (order.userId === 'guest' && !sessionUser && order.contact?.email) {
      const guestEmail = order.contact.email;
      wrap.append(el('div', { style:'margin-top:20px;border:1px solid var(--accent);border-radius:16px;padding:22px;background:linear-gradient(160deg,rgba(44,92,255,.12),var(--ink2));text-align:center' },
        el('div', { style:'font-size:28px;margin-bottom:10px' }, '🎁'),
        el('h3', { style:"font:600 18px 'Space Grotesk';letter-spacing:-.4px;margin:0 0 8px;color:var(--txt)" },
          '¿Querés guardar tu pedido?'),
        el('p', { style:"font:400 13.5px/1.55 'Inter';color:var(--mut);max-width:360px;margin:0 auto 16px" },
          `Creá una cuenta con ${guestEmail} para seguir este y futuros pedidos desde Mi cuenta, y guardar tus favoritos y direcciones.`),
        el('a', {
          href: `#/auth?mode=reg&email=${encodeURIComponent(guestEmail)}&return=${encodeURIComponent('#/cuenta')}`,
          class: 'btn btn--primary',
        }, 'Crear cuenta gratis →'),
        el('div', { class:'mono-label', style:'margin-top:10px' },
          'Es gratis y toma menos de 1 minuto'),
      ));
    }

    // Actions
    wrap.append(el('div', { class:'tracking-actions' },
      el('a', { href:'#/cuenta', class:'btn btn--ghost tracking-action' }, 'Ir a Mi cuenta'),
      el('a', { href:'#/galeria', class:'btn btn--ghost tracking-action' }, 'Seguir comprando'),
      el('a', { href:'#/', class:'btn btn--primary tracking-action' }, 'Volver al inicio'),
    ));

    return wrap;
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  window.Fluve.views.client.pedido = pedido;
})();
