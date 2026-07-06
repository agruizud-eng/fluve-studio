// components/card.js — Namespace: window.Fluve.components.card
(function () {
  const { el } = window.Fluve.dom;

  /** @param {{elevated?: boolean, attrs?: object}} props */
  function card({ elevated = false, attrs = {} } = {}, ...children) {
    return el('div', { class: `card${elevated ? ' card--elevated' : ''}`, ...attrs }, ...children);
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.components = window.Fluve.components || {};
  window.Fluve.components.card = card;
})();
