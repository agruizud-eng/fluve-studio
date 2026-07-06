// views/client/artista.js — Perfil público de artista (#/artista/:handle)
(function () {
  const { el } = window.Fluve.dom;
  const DE = ['🌺','🌙','🏖️','🦕','⚡','🎨','🌊','🌵','✍️','💙','🔤','🎭'];
  const GRADS = [
    'linear-gradient(160deg,rgba(44,92,255,.3),rgba(43,217,228,.15))',
    'linear-gradient(160deg,rgba(255,61,139,.3),rgba(44,92,255,.15))',
    'linear-gradient(160deg,rgba(255,201,61,.3),rgba(63,203,126,.15))',
    'linear-gradient(160deg,rgba(63,203,126,.3),rgba(43,217,228,.15))',
  ];

  async function artista({ params }) {
    const handle = '@' + params.handle.replace(/^@/, '');
    let artist, designs, products;
    try {
      const artists = await window.Fluve.dao.artists.getAll();
      artist = artists.find(a => a.handle.toLowerCase() === handle.toLowerCase());
      if (!artist) {
        const users = await window.Fluve.dao.users.getAll();
        const user = users.find(u => u.handle?.toLowerCase() === handle.toLowerCase());
        if (user) artist = { id: user.id, name: user.name, handle: user.handle, tier: 'base', royaltyRate: 0.10, bio: '' };
      }
      [designs, products] = await Promise.all([
        window.Fluve.dao.designs.getAll(),
        window.Fluve.dao.products.getAll(),
      ]);
    } catch (err) {
      return window.Fluve.viewState('error', { message: err.message });
    }

    if (!artist) {
      return window.Fluve.viewState('not-found', { message: `No encontramos al artista "${handle}"` });
    }

    const artistDesigns = designs.filter(d => d.artistId === artist.id && d.status === 'approved');
    const basePrice = products[0]?.basePrice ?? 24.90;

    const wrap = el('div', { class:'fu artist-profile' });

    // Hero
    const tierColor = artist.tier === 'pro' ? 'var(--accent2)' : 'var(--mut)';
    wrap.append(
      el('div', { class:'artist-hero' },
        el('div', { class:'artist-avatar-big' }, artist.name.slice(0,1).toUpperCase()),
        el('div', {},
          el('div', { style:'display:flex;align-items:center;gap:10px;margin-bottom:6px' },
            el('h1', { style:"font:700 30px 'Space Grotesk';letter-spacing:-1px;margin:0" }, artist.name),
            el('span', { class:'artist-tier-badge', style:`background:${tierColor}18;color:${tierColor};border:1px solid ${tierColor}40` },
              '★', artist.tier.toUpperCase()),
          ),
          el('div', { style:"font:500 14px 'Inter';color:var(--accent2);margin-bottom:8px" }, artist.handle),
          artist.bio ? el('p', { style:"font:400 14px/1.6 'Inter';color:var(--mut);max-width:480px;margin:0 0 12px" }, artist.bio) : null,
          el('div', { style:'display:flex;gap:16px;align-items:center' },
            el('div', {},
              el('div', { style:"font:700 18px 'Space Grotesk'" }, String(artistDesigns.length)),
              el('div', { class:'mono-label' }, 'diseños publicados'),
            ),
            el('div', { style:'width:1px;height:30px;background:var(--line)' }),
            el('div', {},
              el('div', { style:"font:700 18px 'Space Grotesk'" }, Math.round(artist.royaltyRate * 100) + '%'),
              el('div', { class:'mono-label' }, 'regalía por venta'),
            ),
          ),
        ),
      ),
    );

    // Stats bar
    wrap.append(
      el('div', { style:'border:1px solid var(--line);border-radius:12px;padding:14px 20px;background:var(--ink2);margin-bottom:24px;display:flex;gap:4px;align-items:center' },
        el('span', { class:'mono-label' }, '🎨 Cada compra de un diseño de '+artist.handle+' le genera regalías automáticas.'),
        el('a', { href:'#/vende-tu-arte', class:'mono-label', style:'margin-left:auto;color:var(--accent2)' }, '¿Sos artista? →'),
      ),
    );

    // Designs grid
    if (!artistDesigns.length) {
      wrap.append(window.Fluve.viewState('empty', {
        title: 'Sin diseños publicados',
        message: 'Este artista todavía no tiene diseños en la galería.',
      }));
      return wrap;
    }

    wrap.append(
      el('h2', { style:"font:600 24px 'Space Grotesk';letter-spacing:-.6px;margin:0 0 16px" },
        'Diseños de ' + artist.handle),
      el('div', { style:'display:grid;grid-template-columns:repeat(4,1fr);gap:16px' },
        ...artistDesigns.map((d, i) => {
          const grad = GRADS[i % GRADS.length];
          return el('a', { href:`#/producto/${d.id}`, class:'design-card-g' },
            el('div', { class:'design-card-g__img', style:`background:${grad};font-size:60px` }, DE[i % DE.length]),
            el('div', { class:'design-card-g__overlay' }, el('span', { style:"font:500 10px 'Space Mono';color:var(--txt)" }, 'Personalizar →')),
            el('div', { class:'design-card-g__foot' },
              el('div', {},
                el('div', { style:"font:600 13px 'Space Grotesk'" }, d.title),
                el('div', { class:'mono-label' }, (d.tags ?? []).slice(0, 2).join(' · ')),
              ),
              el('span', { class:'mono-label', style:'color:var(--txt)' }, '$' + basePrice.toFixed(2).replace('.', ',')),
            ),
          );
        }),
      ),
    );

    return wrap;
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  window.Fluve.views.client.artista = artista;
})();
