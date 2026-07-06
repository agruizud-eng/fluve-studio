// components/chip.js — Namespace: window.Fluve.components.chip
(function () {
  const { el } = window.Fluve.dom;

  /** @param {{label: string, active?: boolean, onClick?: Function}} props */
  function chip({ label, active = false, onClick } = {}) {
    const tag = onClick ? 'button' : 'span';
    return el(tag, {
      class: `chip${active ? ' chip--active' : ''}`,
      type: onClick ? 'button' : null,
      onClick,
      'aria-pressed': onClick ? String(active) : null,
    }, label);
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.components = window.Fluve.components || {};
  window.Fluve.components.chip = chip;
})();
