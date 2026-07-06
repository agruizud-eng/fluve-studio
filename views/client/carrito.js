// views/client/carrito.js — Carrito con todas las interacciones funcionales.
(function () {
  const { el } = window.Fluve.dom;
  const PE = { remera:'👕', hoodie:'🧥', taza:'☕', tote:'👜', funda:'📱', cuadro:'🖼️' };

  async function carrito() {
    // Cargar datos frescos de la DB
    await window.Fluve.cart.loadCart();
    const { lines, coupon: savedCoupon } = window.Fluve.cart.store.get();
    const wrap = el('div',{class:'fu cart-layout'});
    wrap.append(el('h1',{style:"font:600 34px 'Space Grotesk';letter-spacing:-1px;margin:0 0 22px"},'Tu carrito'));

    if (!lines.length) {
      wrap.append(window.Fluve.viewState('empty',{
        title:'Tu carrito está vacío',
        message:'Explorá la galería y personalizá tu primer producto.',
        action: el('a',{href:'#/galeria',class:'btn btn--primary',style:'margin-top:6px'},'Explorar galería →'),
      }));
      return wrap;
    }

    // Estado del carrito
    let activeCoupon = null;

    // Intentar cargar el cupón guardado
    if (savedCoupon) {
      try {
        activeCoupon = await window.Fluve.dao.promos.get(savedCoupon);
      } catch {}
    }

    const gridEl = el('div',{class:'cart-grid'});
    wrap.append(gridEl);

    // Construir la vista del carrito (re-render local)
    function buildCart(currentLines, coupon) {
      const linesEl = el('div',{class:'cart-lines'});

      currentLines.forEach(line=>{
        const emoji = PE[line.productId]??'📦';
        const techLabel = line.config.techniqueId?.toUpperCase()??'';
        const configStr = [line.config.color, line.config.size, techLabel, line.config.side==='both'?'Ambos lados':''].filter(Boolean).join(' · ');

        // Qty controls
        const qtyDisplay = el('span',{class:'mono-label',style:'padding:0 10px;font-size:13px'},String(line.config.qty));
        const decBtn = el('button',{class:'btn btn--ghost',style:'min-height:30px;padding:0 10px;font-size:16px',type:'button',
          onclick:async()=>{
            await window.Fluve.cart.updateLineQty(line.lineId, line.config.qty-1);
            window.Fluve.router.navigate('#/carrito');
          }
        },'−');
        const incBtn = el('button',{class:'btn btn--ghost',style:'min-height:30px;padding:0 10px;font-size:16px',type:'button',
          onclick:async()=>{
            await window.Fluve.cart.updateLineQty(line.lineId, line.config.qty+1);
            window.Fluve.router.navigate('#/carrito');
          }
        },'+');

        linesEl.append(el('div',{class:'cart-line'},
          el('div',{class:'cart-line__thumb'},emoji),
          el('div',{class:'cart-line__info'},
            el('div',{class:'cart-line__title'},(line.productName??line.productId)+(line.config.designId?' · Diseño':'')),
            el('div',{class:'cart-line__meta'},configStr),
            el('div',{style:'display:flex;align-items:center;gap:14px;margin-top:6px'},
              el('div',{style:'display:flex;align-items:center'},decBtn,qtyDisplay,incBtn),
              el('span',{class:'cart-line__actions',onclick:async()=>{
                await window.Fluve.cart.removeLine(line.lineId);
                window.Fluve.toast('Línea eliminada','success');
                window.Fluve.router.navigate('#/carrito');
              }},'Quitar'),
              el('a',{href:`#/personalizar/${line.productId}${line.config.designId?'?design='+line.config.designId:''}`,class:'cart-line__actions'},'Editar'),
            ),
          ),
          el('div',{class:'cart-line__price'},
            el('div',{class:'cart-line__price-val'},'$'+line.lineTotal.toFixed(2).replace('.',',')),
            el('div',{class:'cart-line__qty',style:'color:var(--mut)'},line.unitPrice.toFixed(2)+'/u'),
          ),
        ));
      });

      // Cupón
      let couponInputEl;
      const couponInfo = coupon ? el('div',{style:'display:flex;align-items:center;gap:8px;font-size:12px;color:var(--green)'},'✓ Cupón "'+coupon.code+'" aplicado') : null;
      const couponRow = el('div',{class:'coupon-row'},
        el('span',{style:'font-size:15px'},'🎟'),
        couponInputEl = el('input',{class:'coupon-input',type:'text',placeholder:'Código de descuento',value:coupon?.code??''}),
        el('button',{class:'btn btn--ghost',style:'min-height:36px;padding:0 14px;font-size:13px',type:'button',
          onclick:async()=>{
            const code = couponInputEl.value.trim();
            if (!code) return;
            try {
              const promo = await window.Fluve.cart.applyCoupon(code);
              window.Fluve.toast(`Cupón "${promo.code}" aplicado (${promo.type==='percent'?promo.value+'%':promo.type==='freeship'?'envío gratis':'descuento'})`, 'success');
              window.Fluve.router.navigate('#/carrito');
            } catch(err) { window.Fluve.toast(err.message,'error'); }
          }
        },'Aplicar'),
      );

      // Summary
      const totals = window.Fluve.cart.calcTotals(currentLines, coupon, 4.90);
      const summaryCard = el('div',{class:'cart-summary-card'},
        el('div',{class:'mono-label',style:'margin-bottom:14px'},'Resumen del pedido'),
        couponInfo,
        el('div',{class:'cart-summary-rows'},
          summRow('Subtotal','$'+totals.subtotal.toFixed(2).replace('.',',')),
          totals.discount>0 ? summRow('Descuento','−$'+totals.discount.toFixed(2).replace('.',',')) : null,
          summRow('Envío express 24–48h', totals.shipping===0?'Gratis 🎉':'$'+totals.shipping.toFixed(2).replace('.',',')),
          el('div',{class:'mono-label',style:'margin-top:4px'},totals.shipping>0?'Gratis a partir de $50':''),
        ),
        el('div',{class:'cart-summary-divider'}),
        el('div',{class:'cart-summary-total'},
          el('span',{style:"font:600 15px 'Space Grotesk'"},'Total'),
          el('span',{style:"font:600 26px 'Space Grotesk';letter-spacing:-.5px"},'$'+totals.total.toFixed(2).replace('.',',')),
        ),
        el('a',{href:'#/checkout',class:'btn btn--primary',style:'display:flex;align-items:center;justify-content:center;margin-top:16px'},'Ir a pagar →'),
        el('div',{class:'mono-label',style:'text-align:center;margin-top:10px;color:var(--cyan)'},'⚡ Entrega estimada 24–48h'),
        el('div',{class:'mono-label',style:'text-align:center;margin-top:6px'},'Pago seguro · SSL · Devolución 30 días'),
      );

      gridEl.replaceChildren(
        el('div',{},linesEl,el('div',{style:'margin-top:12px'},couponRow)),
        summaryCard,
      );
    }

    buildCart(lines, activeCoupon);
    return wrap;
  }

  function summRow(label,val) {
    return el('div',{class:'cart-summary-row'},el('span',{},label),el('span',{},val));
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  window.Fluve.views.client.carrito = carrito;
})();
