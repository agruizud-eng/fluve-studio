// app/main.js — Bootstrap Fase 6: todas las rutas cliente + admin completas.
// Auditoría: cada ruta definida en Backend.dc.html tiene su handler aquí.
(function () {
  const { route, setNotFound, onRoute, startRouter } = window.Fluve.router;
  const { paintShell } = window.Fluve.shell;
  const { mount } = window.Fluve.dom;

  const C = window.Fluve.views.client;
  const A = window.Fluve.views.admin;

  async function init() {
    try { await window.Fluve.db.openDB(); } catch {}
    try {
      if (await window.Fluve.dao.products.count() === 0) {
        await window.Fluve.seed.reseed();
      }
    } catch {}
    try { await window.Fluve.session.loadSession(); } catch {}
    try { await window.Fluve.cart.loadCart(); } catch {}

    // ── Rutas cliente ──────────────────────────────────────────────────────────
    route('#/',                      C.home);
    route('#/galeria',               C.galeria);
    route('#/producto/:slug',        C.producto);
    route('#/personalizar/:slug?',   C.personalizar);
    route('#/carrito',               C.carrito);
    route('#/checkout',              C.checkout);
    route('#/pedido/:id',            C.pedido);
    route('#/cuenta/:seccion?',      C.cuenta,   { role: 'customer' });
    route('#/auth',                  C.auth);
    route('#/404',                   C.view404);
    route('#/500',                   C.view500);
    route('#/offline',               C.viewOffline);
    route('#/artista/:handle',       C.artista);
    route('#/vende-tu-arte',         C.vendeTuArte);
    route('#/cotizacion',            C.cotizacion);
    route('#/empresas',              C.cotizacion);
    route('#/faq',                   C.faq);
    route('#/como-funciona',         C.comoFunciona);
    route('#/envios',                C.envios);
    route('#/devoluciones',          C.devoluciones);
    route('#/terminos',              C.terminos);
    route('#/privacidad',            C.privacidad);
    route('#/editor',                C.editor);

    // ── Rutas admin — Operación ────────────────────────────────────────────────
    // A1  Dashboard
    route('#/admin',                 A.dashboard,         { role:'staff' });
    // A2  Pedidos lista
    route('#/admin/pedidos',         A.pedidos,           { role:'staff' });
    // A3  Pedido detalle  (NOTA: /:id debe ir ANTES de /nuevo para no capturar 'nuevo' como id)
    route('#/admin/pedidos/nuevo',   A.pedidoNuevo,       { role:'staff' });  // A39
    route('#/admin/pedidos/:id',     A.pedidoDetalle,     { role:'staff' });  // A3
    // A4  Producción kanban
    route('#/admin/produccion',      A.produccion,        { role:'staff' });
    // A5  Proveedores lista
    route('#/admin/proveedores',     A.proveedores,       { role:'staff' });
    // A37 Proveedor nuevo/editar
    route('#/admin/proveedores/nuevo',     A.proveedorNuevo,  { role:'staff' });
    route('#/admin/proveedores/:id/editar',A.proveedorNuevo,  { role:'staff' });
    // A36 Proveedor detalle
    route('#/admin/proveedores/:id', A.proveedorDetalle,  { role:'staff' });
    // A35 Calidad
    route('#/admin/calidad',         A.calidad,           { role:'staff' });
    // A7  Packaging
    route('#/admin/packaging',       A.packaging,         { role:'staff' });
    // A8  Envíos
    route('#/admin/envios',          A.envios,            { role:'staff' });

    // ── Rutas admin — Catálogo ─────────────────────────────────────────────────
    // A9  Productos lista
    route('#/admin/productos',       A.productos,         { role:'staff' });
    // A10 Producto detalle/editar + C2 nuevo producto
    // /nuevo se captura por /:id → params.id === 'nuevo' → isNew = true
    route('#/admin/productos/:id/precios', A.productoPrecio,    { role:'staff' });      // redirect a precios
    route('#/admin/productos/:id',         A.productoDetalle,   { role:'staff' });      // A10 + C2 nuevo
    // A23/A27 Motor de precios
    route('#/admin/precios',         A.pricing,           { role:'staff' });
    // A11 Técnicas
    route('#/admin/tecnicas',        A.tecnicas,          { role:'staff' });
    route('#/admin/tecnicas/:id/costo', A.tecnicaCosto,   { role:'staff' });      // redirect
    // A12 Diseños moderación
    // A12 Diseños moderación + detalle + nuevo diseño propio
    route('#/admin/disenos/nuevo',   A.disenoDetalle,     { role:'staff' });      // nuevo diseño de la plataforma
    route('#/admin/disenos/:id',     A.disenoDetalle,     { role:'staff' });      // detalle/editar diseño
    route('#/admin/disenos',         A.disenos,           { role:'staff' });
    // A13 Artistas + A42 detalle
    route('#/admin/artistas',        A.artistas,          { role:'staff' });
    route('#/admin/artistas/:id',    A.artistaDetalle,    { role:'staff' });
    // A28 Compras/lotes + A40 registro lote
    route('#/admin/compras/nuevo',   A.registrarCompra,   { role:'staff' });      // A40 nueva
    route('#/admin/compras',         A.compras,           { role:'staff' });
    // A24 Regalías por diseño
    route('#/admin/regalias',        A.regalias,          { role:'staff' });      // A24
    // A30 Inventario + A consumibles
    route('#/admin/inventario',      A.inventario,        { role:'staff' });
    route('#/admin/consumibles/:id', A.consumibleDetalle, { role:'staff' });      // redirect

    // ── Rutas admin — Comercial ────────────────────────────────────────────────
    // A14 Clientes + A41 detalle
    route('#/admin/clientes',        A.clientes,          { role:'staff' });
    route('#/admin/clientes/:id',    A.clienteDetalle,    { role:'staff' });
    // A15 Cotizaciones B2B
    route('#/admin/cotizaciones',    A.cotizaciones,      { role:'staff' });
    // A16 Pagos
    route('#/admin/pagos',           A.pagos,             { role:'staff' });
    // A17 Promos
    route('#/admin/promos',          A.promos,            { role:'staff' });

    // ── Rutas admin — Sistema ──────────────────────────────────────────────────
    // A18 Soporte + A43 ticket detalle
    route('#/admin/soporte',         A.soporte,           { role:'staff' });
    route('#/admin/soporte/:id',     A.ticketDetalle,     { role:'staff' });
    // A19 Reportes + A32 equilibrio
    route('#/admin/reportes',        A.reportes,          { role:'staff' });
    route('#/admin/reportes/equilibrio', A.equilibrio,    { role:'staff' });
    // A20 Contenido/CMS
    route('#/admin/contenido',       A.cms,               { role:'staff' });
    // A21 Ajustes + sub-rutas (redirects)
    route('#/admin/ajustes',         A.ajustes,           { role:'staff' });
    route('#/admin/ajustes/costeo',  A.ajustesCosteo,     { role:'staff' });
    route('#/admin/ajustes/precios', A.ajustesPrecios,    { role:'staff' });
    route('#/admin/ajustes/regalias',A.ajustesRegalias,   { role:'staff' });
    // A22 Equipo
    route('#/admin/equipo',          A.equipo,            { role:'staff' });
    // A44 Actividad
    route('#/admin/actividad',       A.actividad,         { role:'staff' });
    // Config/seed — accesible sin role (punto de entrada demo)
    route('#/admin/config',          A.config);

    setNotFound(C.view404);

    onRoute(async (viewFn, ctx) => {
      const slot = paintShell(ctx.path);
      const node = await viewFn(ctx);
      mount(slot, node);
      window.scrollTo(0, 0);
    });

    startRouter();
  }

  init();
})();
// PARCHE FASE 7 — Las rutas nuevas se inyectan aquí por compatibilidad
// (no se puede re-declarar init dentro de la IIFE existente)
