// app/util/viewState.js — estados de vista compartidos: loading/empty/error (F3/G4). Namespace: window.Fluve.viewState
(function () {
  const { el } = window.Fluve.dom;

  /**
   * @param {'loading'|'empty'|'error'|'not-found'} kind
   * @param {{ title?: string, message?: string, action?: HTMLElement }} opts
   */
  function viewState(kind, opts = {}) {
    if (kind === 'loading') return skeletonBlock(opts);

    const defaults = {
      empty:       { title: 'Nada por acá todavía', message: 'Cuando haya contenido, aparecerá en esta sección.' },
      error:       { title: 'Algo salió mal', message: 'No pudimos completar la acción. Probá de nuevo en un momento.' },
      'not-found': { title: 'No encontramos esta página', message: 'Revisá el enlace o volvé al inicio.' },
    }[kind] || {};

    const title = opts.title ?? defaults.title ?? '';
    const message = opts.message ?? defaults.message ?? '';

    return el('div', { class: 'view-state', role: kind === 'error' ? 'alert' : undefined },
      el('div', { class: 'view-state__title' }, title),
      el('p', {}, message),
      opts.action ?? null,
    );
  }

  function skeletonBlock({ rows = 3 } = {}) {
    const wrap = el('div', { class: 'view-state', 'aria-busy': 'true', 'aria-label': 'Cargando' });
    for (let i = 0; i < rows; i++) {
      wrap.append(el('div', { class: 'skeleton', style: { width: '100%', height: '54px', marginBottom: '10px' } }));
    }
    return wrap;
  }

  window.Fluve.viewState = viewState;
})();
