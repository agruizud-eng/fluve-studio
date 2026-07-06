// app/router.js — router mínimo por location.hash (ARQUITECTURA §3). Namespace: window.Fluve.router
(function () {
  const { hasRole } = window.Fluve.session;

  const routes = [];
  let notFoundView = null;
  /** Se setea desde main.js: recibe (view, {params, query}) y decide layout + monta. */
  let onRender = null;

  /** Registra una ruta. pattern: "#/producto/:slug" (soporta segmentos ":opcional?"). */
  function route(pattern, handler, opts = {}) {
    routes.push({ pattern, handler, opts });
  }

  /** Registra la vista 404 (fallback). */
  function setNotFound(handler) {
    notFoundView = handler;
  }

  /** Define el callback de montaje que usa el shell (inyectado desde main.js). */
  function onRoute(fn) {
    onRender = fn;
  }

  function navigate(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function startRouter() {
    window.addEventListener('hashchange', render);
    render();
  }

  function render() {
    const { path, query } = parseHash(location.hash || '#/');

    for (const r of routes) {
      const params = match(r.pattern, path);
      if (!params) continue;

      if (r.opts.role && !hasRole(r.opts.role)) {
        // Rutas admin (staff/admin): redirigir al panel de config/demo, no al auth del cliente
        if (path.startsWith('/admin')) {
          navigate('#/admin/config');
        } else {
          // Rutas cliente protegidas (ej: /cuenta): redirigir al auth con return URL
          navigate(`#/auth?return=${encodeURIComponent(location.hash || '#/')}`);
        }
        return;
      }

      onRender?.(r.handler, { params, query, path });
      return;
    }

    onRender?.(notFoundView, { params: {}, query, path });
  }

  // ---- helpers internos ----

  function parseHash(hash) {
    const raw = hash.replace(/^#/, '') || '/';
    const [pathPart, queryPart] = raw.split('?');
    const path = pathPart.replace(/\/+$/, '') || '/';
    const query = Object.fromEntries(new URLSearchParams(queryPart || ''));
    return { path, query };
  }

  /** "/producto/:slug" vs "/producto/remera" → {slug:'remera'} · null si no matchea. */
  function match(pattern, path) {
    const patSegs = pattern.replace(/^#/, '').split('/').filter(Boolean);
    const pathSegs = path.split('/').filter(Boolean);

    const params = {};
    let pi = 0;
    for (let i = 0; i < patSegs.length; i++) {
      const seg = patSegs[i];
      const optional = seg.endsWith('?');
      const isParam = seg.startsWith(':');
      const name = isParam ? seg.slice(1).replace(/\?$/, '') : null;

      if (isParam) {
        const val = pathSegs[pi];
        if (val == null) {
          if (optional) continue;
          return null;
        }
        params[name] = decodeURIComponent(val);
        pi++;
      } else {
        if (pathSegs[pi] !== seg) return null;
        pi++;
      }
    }
    if (pi !== pathSegs.length) return null;
    return params;
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.router = { route, setNotFound, onRoute, navigate, startRouter };
})();
