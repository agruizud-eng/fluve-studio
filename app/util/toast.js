// app/util/toast.js — feedback de acciones (F2/G7). Namespace: window.Fluve.toast
(function () {
  const { el } = window.Fluve.dom;
  const DURATION_MS = 3400;

  /**
   * Muestra un toast en #toast-root.
   * @param {string} message
   * @param {'default'|'success'|'error'} type
   */
  function toast(message, type = 'default') {
    const root = document.getElementById('toast-root');
    if (!root) return;

    const variantClass = type === 'success' ? 'toast--success' : type === 'error' ? 'toast--error' : '';
    const node = el('div', { class: `toast ${variantClass}`.trim(), role: 'status', 'aria-live': 'polite' },
      el('span', { class: 'toast__dot' }),
      el('span', { class: 'toast__msg' }, message),
    );

    root.append(node);
    const remove = () => node.remove();
    const timer = setTimeout(remove, DURATION_MS);
    node.addEventListener('click', () => { clearTimeout(timer); remove(); });
  }

  window.Fluve.toast = toast;
})();
