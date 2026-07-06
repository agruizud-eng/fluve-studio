// views/client/vende.js — Landing "Vende tu arte" (6k) + solicitud artista
(function () {
  const { el } = window.Fluve.dom;

  async function vendeTuArte() {
    const slot = document.querySelector('[data-view-slot]');
    if (slot) { slot.style.padding = '0'; slot.style.maxWidth = 'none'; }

    const user = window.Fluve.session.current();
    const wrap = el('div', { class:'fu' });

    // Hero
    wrap.append(
      el('section', { class:'vende-hero' },
        el('div', { style:'font:700 11px var(--font-mono);letter-spacing:1.5px;text-transform:uppercase;color:var(--accent2);margin-bottom:14px' }, '🎨 Programa de artistas'),
        el('h1', { style:"font:600 54px/1.02 'Space Grotesk';letter-spacing:-2px;margin:0 0 16px" },
          'Convertí tu arte en ', el('span', { style:'color:var(--cyan)' }, 'ingresos reales.')),
        el('p', { style:"font:400 18px/1.6 'Inter';color:var(--mut);max-width:560px;margin:0 auto 30px" },
          'Subí tus diseños, aplicalos a decenas de productos y cobrá regalías automáticas cada vez que alguien compra. Sin stock, sin envíos, sin complicaciones.'),
        el('div', { style:'display:flex;gap:12px;justify-content:center;flex-wrap:wrap' },
          el('a', { href:'#artista-form', class:'btn btn--primary', style:'padding:14px 28px;font-size:16px' }, 'Quiero ser artista →'),
          el('a', { href:'#/galeria', class:'btn btn--ghost', style:'padding:14px 24px;font-size:15px' }, 'Ver galería'),
        ),
      ),
    );

    // Features grid
    const features = [
      { icon:'🚀', title:'Sin inversión inicial', desc:'Publicar tus diseños es 100% gratis. Nosotros ponemos la producción, el packaging y el envío.' },
      { icon:'💰', title:'Regalías automáticas', desc:'Cobrás un porcentaje de cada venta. Los artistas Base ganan 10%; los artistas Pro, 20%.' },
      { icon:'🎨', title:'Tu diseño en 10+ productos', desc:'Una sola vez: subís el diseño y lo aplicamos a remeras, hoodies, tazas, tote bags, fundas y más.' },
      { icon:'📊', title:'Dashboard de ventas', desc:'En "Mi cuenta → Mis diseños" ves tus ventas, diseños activos y el saldo pendiente de cobro.' },
      { icon:'🏷', title:'Vos fijás el precio', desc:'Elegís qué margen querés sobre el precio base. A mayor precio, más regalías por venta.' },
      { icon:'⭐', title:'Subite de nivel', desc:'Publicá 5+ diseños aprobados y convertite en artista Pro para mayor porcentaje y beneficios.' },
    ];
    wrap.append(
      el('section', { class:'vende-features' },
        ...features.map(f => el('div', { class:'vende-feature' },
          el('div', { style:'font-size:32px;margin-bottom:10px' }, f.icon),
          el('div', { style:"font:600 16px 'Space Grotesk';margin-bottom:6px" }, f.title),
          el('div', { style:"font:400 13.5px/1.55 'Inter';color:var(--mut)" }, f.desc),
        )),
      ),
    );

    // Tiers table
    wrap.append(
      el('section', { style:'max-width:800px;margin:0 auto;padding:20px 40px 60px' },
        el('h2', { style:"font:600 32px 'Space Grotesk';letter-spacing:-1px;text-align:center;margin:0 0 24px" }, 'Niveles de artista'),
        el('div', { style:'display:grid;grid-template-columns:1fr 1fr;gap:16px' },
          tierCard('Base', 'Empezás aquí', ['Regalía del 10%','Diseños ilimitados','Dashboard de ventas','Moderación en 48h'], 'var(--mut)', false),
          tierCard('Pro', '5+ diseños aprobados', ['Regalía del 20%','Badge Pro en tu perfil','Prioridad en galería','Colaboraciones exclusivas'], 'var(--accent2)', true),
        ),
      ),
    );

    // Application form
    const isArtist = user ? (await window.Fluve.dao.artists.getAll().catch(()=>[])).some(a => a.userId === user.id) : false;
    const formSection = el('section', { id:'artista-form', style:'max-width:600px;margin:0 auto;padding:20px 40px 80px' });

    if (isArtist) {
      formSection.append(
        el('div', { style:'border:1px solid var(--green);border-radius:16px;padding:22px;background:rgba(63,203,126,.08);text-align:center' },
          el('div', { style:'font-size:32px;margin-bottom:8px' }, '✓'),
          el('div', { style:"font:700 16px 'Space Grotesk'" }, 'Ya sos artista de Fluvë Studio'),
          el('a', { href:'#/cuenta/disenos', class:'btn btn--primary', style:'margin-top:14px' }, 'Ver mis diseños →'),
        ),
      );
    } else if (!user) {
      formSection.append(
        el('h2', { style:"font:600 24px 'Space Grotesk';letter-spacing:-.6px;margin:0 0 16px" }, '¿Querés ser artista?'),
        el('p', { style:"font:400 14px/1.55 'Inter';color:var(--mut);margin:0 0 18px" }, 'Primero creá tu cuenta gratuita, y después podrás solicitar unirte al programa de artistas.'),
        el('a', { href:'#/auth?mode=reg&return=%23%2Fvende-tu-arte', class:'btn btn--primary', style:'font-size:15px' }, 'Crear cuenta gratis →'),
      );
    } else {
      let f = { instagram: '', portfolio: '', bio: '', style: '' };
      formSection.append(
        el('h2', { style:"font:600 24px 'Space Grotesk';letter-spacing:-.6px;margin:0 0 6px" }, 'Solicitar acceso al programa'),
        el('p', { style:"font:400 14px/1.55 'Inter';color:var(--mut);margin:0 0 18px" }, 'Completá el formulario y el equipo de Fluvë revisará tu solicitud en 48–72 horas.'),
        el('div', { class:'card', style:'display:flex;flex-direction:column;gap:14px' },
          fieldPair('Instagram / Red social', 'text', '@tuusuario', v => f.instagram = v),
          fieldPair('Portfolio o web', 'url', 'https://...', v => f.portfolio = v),
          el('div', { class:'field' },
            el('label', { class:'field__label' }, 'Estilo o temática'),
            el('input', { class:'fld', type:'text', placeholder:'Ej: Ilustración, tipografía, streetwear…', oninput: e => f.style = e.target.value }),
          ),
          el('div', { class:'field' },
            el('label', { class:'field__label' }, 'Contanos sobre tu arte (100–300 palabras)'),
            el('textarea', { class:'fld', style:'min-height:100px;resize:vertical', placeholder:'¿Qué tipo de arte hacés? ¿Cuál es tu estilo?', oninput: e => f.bio = e.target.value }),
          ),
          el('button', { class:'btn btn--primary', style:'width:100%;justify-content:center', type:'button',
            onclick: async () => {
              if (!f.bio || f.bio.length < 50) { window.Fluve.toast('Contanos un poco más sobre tu arte (mínimo 50 caracteres)', 'error'); return; }
              // Create artist record with pending status
              const artistId = 'artist-' + Date.now().toString(36);
              const artist = {
                id: artistId, userId: user.id,
                handle: '@' + user.name.split(' ')[0].toLowerCase().replace(/\s/g, ''),
                name: user.name, tier: 'base',
                royaltyRate: 0.10, status: 'pending',
                bio: f.bio, instagram: f.instagram, portfolio: f.portfolio,
                createdAt: new Date().toISOString(),
              };
              await window.Fluve.dao.artists.put(artist);
              await window.Fluve.dao.logActivity('artist.apply', 'artists', artistId, { after: { userId: user.id } });
              window.Fluve.toast('¡Solicitud enviada! Te avisamos en 48–72h por email.', 'success');
              window.Fluve.router.navigate('#/cuenta/disenos');
            }
          }, 'Enviar solicitud →'),
        ),
      );
    }
    wrap.append(formSection);
    return wrap;
  }

  function tierCard(title, sub, items, color, highlight) {
    return el('div', { style:`border:${highlight?`2px solid ${color}`:'1px solid var(--line)'};border-radius:18px;padding:22px;background:${highlight?`rgba(44,92,255,.08)`:'var(--ink2)'};` },
      el('div', { style:`font:700 20px 'Space Grotesk';color:${color};margin-bottom:4px` }, title),
      el('div', { class:'mono-label', style:'margin-bottom:14px' }, sub),
      el('div', { style:'display:flex;flex-direction:column;gap:8px' },
        ...items.map(item => el('div', { style:"display:flex;align-items:center;gap:8px;font:500 13px 'Inter'" },
          el('span', { style:`color:${color}` }, '✓'),
          el('span', { style:'color:var(--txt)' }, item),
        )),
      ),
    );
  }

  function fieldPair(label, type, placeholder, cb) {
    return el('div', { class:'field' },
      el('label', { class:'field__label' }, label),
      el('input', { class:'fld', type, placeholder, oninput: e => cb(e.target.value) }),
    );
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  window.Fluve.views.client.vendeTuArte = vendeTuArte;
})();
