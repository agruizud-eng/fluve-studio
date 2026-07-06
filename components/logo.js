// components/logo.js — Sello CMYK + wordmark dos tonos (fiel a Home hi-fi).
// Namespace: window.Fluve.components.logo
(function () {
  const { el } = window.Fluve.dom;

  /**
   * @param {{ withWordmark?: boolean, size?: 'sm'|'md', href?: string }} opts
   */
  function logo({ withWordmark = true, size = 'md', href = '#/' } = {}) {
    const d = size === 'sm' ? { w:22, c:12, off:5 } : { w:26, c:14, off:6 };

    // 3 círculos CMYK (posicionamiento exacto del hi-fi)
    const mark = el('span', { class:'nav-logo__mark', style:`width:${d.w}px;height:${d.w}px` },
      el('span', { class:'nav-logo__c', style:`background:var(--cyan);left:0;top:${d.off}px` }),
      el('span', { class:'nav-logo__c', style:`background:var(--magenta);right:0;top:${d.off}px` }),
      el('span', { class:'nav-logo__c', style:`background:var(--yellow);left:${d.off}px;top:0` }),
    );

    // Wordmark: "Fluvë" negrita + " studio" muted regular
    const wordmark = withWordmark
      ? el('span', { class:'nav-logo__wordmark' },
          'Fluvë',
          el('span', { class:'nav-logo__sub' }, ' studio'),
        )
      : null;

    return el('a', { class:'nav-logo', href, 'aria-label':'Fluvë Studio — inicio' },
      mark,
      wordmark,
    );
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.components = window.Fluve.components || {};
  window.Fluve.components.logo = logo;
})();
