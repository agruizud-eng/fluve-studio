// app/util/confirm.js — diálogo de confirmación modal Promise-based. Namespace: window.Fluve.confirm
(function () {
  const { el, mount } = window.Fluve.dom;

  /**
   * Muestra un modal de confirmación y devuelve una Promesa<boolean>.
   * @param {{ title: string, message: string, confirmLabel?: string, cancelLabel?: string, danger?: boolean }} opts
   * @returns {Promise<boolean>}
   */
  function confirmDialog({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
    return new Promise((resolve) => {
      const root = document.getElementById('modal-root');
      let resolved = false;

      function close(val) {
        if (resolved) return;
        resolved = true;
        overlay.remove();
        resolve(val);
      }

      const confirmBtn = el('button', {
        class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`,
        type: 'button',
        onClick: () => close(true),
      }, confirmLabel);

      const cancelBtn = el('button', {
        class: 'btn btn--ghost',
        type: 'button',
        onClick: () => close(false),
      }, cancelLabel);

      const modal = el('div', {
        class: 'modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'confirm-title',
      },
        el('h3', { class: 'modal__title', id: 'confirm-title' }, title),
        el('p', { class: 'modal__body' }, message),
        el('div', { class: 'modal__actions' }, cancelBtn, confirmBtn),
      );

      const overlay = el('div', {
        class: 'modal-overlay',
        onClick: (e) => { if (e.target === overlay) close(false); },
      }, modal);

      // ESC para cerrar
      const onKey = (e) => {
        if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(false); }
      };
      document.addEventListener('keydown', onKey);

      root.append(overlay);
      // foco en confirmar para accesibilidad (F8)
      requestAnimationFrame(() => confirmBtn.focus());
    });
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.confirm = confirmDialog;
})();
