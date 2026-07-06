// app/util/dom.js — helpers de construcción de DOM sin framework (ARQUITECTURA §4)
// Script clásico (sin import/export) para funcionar bajo file:// sin servidor. Namespace: window.Fluve.dom
(function () {
  window.Fluve = window.Fluve || {};

  /**
   * Crea un nodo DOM.
   * props: 'class' → className · 'style' (objeto) → Object.assign · 'onXxx' (función) → addEventListener
   *        cualquier otra prop no-nula → setAttribute
   * children: strings, nodos, o arrays anidados (se aplanan). null/undefined se ignoran.
   */
  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null) continue;
      if (k === 'class') node.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') node.innerHTML = v; // uso explícito y consciente, evitar con datos de usuario
      else node.setAttribute(k, v);
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      node.append(c?.nodeType ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  /** Vacía un contenedor y monta un nodo (o varios) dentro. */
  function mount(container, node) {
    container.replaceChildren();
    if (Array.isArray(node)) container.append(...node.filter(Boolean));
    else if (node) container.append(node);
    return container;
  }

  /** Store observable mínimo para estado reactivo transversal (carrito, sesión, idioma). */
  function createStore(initial) {
    let state = initial;
    const subs = new Set();
    return {
      get: () => state,
      set: (patch) => { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; subs.forEach(f => f(state)); },
      subscribe: (f) => { subs.add(f); return () => subs.delete(f); },
    };
  }

  window.Fluve.dom = { el, mount, createStore };
})();
