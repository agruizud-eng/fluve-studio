// views/client/error.js — Errores 404/500/offline (Fase 4). Referencia: Auth+Error hi-fi Pantalla B.
(function () {
  const { el } = window.Fluve.dom;

  async function view404() {
    return buildError({
      code: '404',
      title: 'Esta página se fue a la imprenta',
      text: 'No encontramos lo que buscás. Puede que el enlace haya cambiado o el diseño ya no esté disponible.',
    });
  }

  async function view500() {
    return buildError({
      code: '500',
      title: '¡Algo salió mal de nuestro lado!',
      text: 'Estamos trabajando para solucionarlo. Probá de nuevo en un momento.',
    });
  }

  async function viewOffline() {
    return buildError({
      code: '📡',
      title: 'Sin conexión',
      text: 'Revisá tu conexión a internet e intentá de nuevo.',
    });
  }

  function buildError({ code, title, text }) {
    return el('div', { class:'fu error-view' },
      el('div', { class:'error-hero-card' },
        el('div', { style:'position:absolute;inset:0;background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:40px 40px;opacity:.4;mask-image:radial-gradient(circle at 50% 30%,#000,transparent 70%);pointer-events:none' }),
        el('div', { style:'position:relative' },
          el('div', { class:'error-code' }, code),
          el('h1', { style:"font:600 28px 'Space Grotesk';letter-spacing:-.8px;margin:12px 0 6px" }, title),
          el('p', { style:"font:400 14px 'Inter';color:var(--mut);max-width:360px;margin:0 auto 22px" }, text),
          el('div', { style:'display:flex;gap:10px;justify-content:center;margin-bottom:20px' },
            el('a', { href:'#/', class:'btn btn--primary', style:'padding:12px 22px' }, 'Ir al inicio'),
            el('a', { href:'#/galeria', class:'btn btn--ghost' }, 'Explorar galería'),
          ),
          el('div', { style:'max-width:360px;margin:0 auto;display:flex;align-items:center;gap:9px;border:1px solid var(--line2);border-radius:24px;padding:9px 15px;color:var(--mut)' },
            el('span', {}, '⌕'),
            el('span', { class:'mono-label' }, 'Buscar un diseño o producto…'),
          ),
        ),
        el('div', { class:'error-grid' },
          el('div', { class:'error-sub-card' },
            el('div', { style:"font:600 13px 'Space Grotesk';margin-bottom:5px" }, '⚠ Error del servidor (500)'),
            el('p', { class:'mono-label', style:'margin:0 0 10px;line-height:1.5' }, '"Algo salió mal de nuestro lado."'),
            el('button', { class:'btn btn--ghost', style:'font-size:12px;min-height:36px;padding:0 14px', type:'button',
              onclick: () => location.reload()
            }, 'Reintentar'),
          ),
          el('div', { class:'error-sub-card' },
            el('div', { style:"font:600 13px 'Space Grotesk';margin-bottom:5px" }, '📡 Sin conexión'),
            el('p', { class:'mono-label', style:'margin:0 0 10px;line-height:1.5' }, '"Revisá tu conexión e intentá de nuevo."'),
            el('button', { class:'btn btn--ghost', style:'font-size:12px;min-height:36px;padding:0 14px', type:'button',
              onclick: () => location.reload()
            }, 'Reintentar'),
          ),
        ),
      ),
    );
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  Object.assign(window.Fluve.views.client, { view404, view500, viewOffline });
})();
