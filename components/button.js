// components/button.js — Namespace: window.Fluve.components.button
(function () {
  const { el } = window.Fluve.dom;

  /**
   * @param {{label: string, variant?: 'primary'|'ghost'|'danger', onClick?: Function, type?: string, disabled?: boolean, attrs?: object}} props
   */
  function button({ label, variant = 'primary', onClick, type = 'button', disabled = false, attrs = {} }) {
    return el('button', {
      class: `btn btn--${variant}`,
      type,
      disabled: disabled || null,
      onClick,
      ...attrs,
    }, label);
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.components = window.Fluve.components || {};
  window.Fluve.components.button = button;
})();
