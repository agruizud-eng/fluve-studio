// views/admin/config.js — panel de configuración/seed (checkpoint Fase 2). Namespace: window.Fluve.views.admin.config
(function () {
  const { el }    = window.Fluve.dom;
  const toast     = window.Fluve.toast;
  const confirm   = window.Fluve.confirm;
  const { button, card } = window.Fluve.components;
  const { money } = window.Fluve.i18n;

  async function adminConfig() {
    const wrap = el('div', { class: 'fu' });

    // ── Banner de acceso (para usuarios sin sesión de staff) ──────────────────
    const currentUser = window.Fluve.session.current();
    const isStaff = window.Fluve.session.hasRole('staff');

    if (!isStaff) {
      wrap.append(
        el('div', { style:'border:2px solid var(--accent);border-radius:16px;padding:20px 22px;background:rgba(44,92,255,.1);margin-bottom:22px;display:flex;align-items:center;gap:16px' },
          el('span', { style:'font-size:32px;flex:none' }, '🔑'),
          el('div', {},
            el('div', { style:"font:700 15px 'Space Grotesk';color:var(--txt);margin-bottom:4px" }, 'Acceso al panel de administración'),
            el('div', { style:"font:400 13px 'Inter';color:var(--mut);line-height:1.5" }, 'Para acceder al panel completo, iniciá sesión como staff o admin usando el botón "Entrar como" en la sección de abajo.'),
          ),
        ),
      );
    } else {
      wrap.append(
        el('div', { style:'border:1px solid var(--green);border-radius:12px;padding:12px 16px;background:rgba(63,203,126,.08);margin-bottom:18px;display:flex;align-items:center;gap:10px' },
          el('span', { style:'color:var(--green)' }, '✓'),
          el('span', { style:"font:500 13px 'Inter';color:var(--txt)" }, 'Sesión activa como '),
          el('b', {}, currentUser?.name),
          el('span', { class:'order-status-chip status-qc', style:'margin-left:8px' }, currentUser?.role?.toUpperCase()),
          el('a', { href:'#/admin', style:'margin-left:auto;font:600 13px var(--font-display);color:var(--accent2);text-decoration:none' }, '→ Ir al Dashboard'),
        ),
      );
    }

    // Título
    wrap.append(
      el('h2', {}, 'Configuración del sistema'),
      el('p', { style: { marginTop: '6px' } },
        'Panel de prototipo: sesión de prueba (Login As), seed de datos y herramientas de base de datos.'),
    );

    // Sección 1: estado de la DB
    wrap.append(sectionHd('Estado de la base de datos'));
    const metricsSlot = el('div');
    wrap.append(metricsSlot);
    loadMetrics(metricsSlot); // async, no bloqueante

    // Sección 2: "iniciar sesión como"
    wrap.append(sectionHd('Sesión de prueba (login as)'));
    const sessionSlot = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });
    wrap.append(sessionSlot);
    loadUsers(sessionSlot); // async, no bloqueante

    // Sección 3: herramientas de datos
    wrap.append(sectionHd('Herramientas de datos'));
    wrap.append(dataTools());

    return wrap;
  }

  // ── Sección: métricas ────────────────────────────────────────────────────────
  async function loadMetrics(slot) {
    const { viewState } = window.Fluve;
    slot.append(viewState('loading', { rows: 2 }));

    try {
      const dao = window.Fluve.dao;

      // Info del schema
      const schema   = await dao.settings.get('schema') ?? {};
      const lastSeed = schema.lastSeed ? new Date(schema.lastSeed).toLocaleString('es-UY') : '—';

      // Contar todos los stores en paralelo
      const names = window.Fluve.seed.STORE_ORDER;
      const counts = await Promise.all(names.map(n => dao[n].count()));

      slot.replaceChildren();
      slot.append(
        el('p', { class: 'mono-label', style: { marginBottom: '10px' } },
          `Esquema v${schema.version ?? 1} · Último seed: ${lastSeed}`),
        el('div', { class: 'metrics-grid' },
          ...names.map((name, i) =>
            el('div', { class: 'metric-cell' },
              el('span', { class: 'metric-cell__name' }, name),
              el('span', { class: 'metric-cell__count' }, String(counts[i])),
            )
          )
        ),
      );
    } catch (err) {
      slot.replaceChildren(window.Fluve.viewState('error',
        { message: 'No se pudieron cargar los conteos: ' + err.message }));
    }
  }

  // ── Sección: login as ────────────────────────────────────────────────────────
  async function loadUsers(slot) {
    slot.append(window.Fluve.viewState('loading', { rows: 1 }));
    try {
      const users = await window.Fluve.dao.users.getAll();
      slot.replaceChildren();

      if (!users.length) {
        slot.append(window.Fluve.viewState('empty',
          { title: 'No hay usuarios', message: 'Recargá el seed para crear los usuarios de prueba.' }));
        return;
      }

      const current = window.Fluve.session.current();

      for (const user of users) {
        const isMe = current?.id === user.id;
        const roleClass = `user-card__role--${user.role}`;

        const card = el('div', { class: 'user-card' },
          el('div', { class: 'user-card__info' },
            el('span', { class: 'user-card__name' }, user.name + (isMe ? ' ← sesión activa' : '')),
            el('span', { class: 'user-card__meta' }, user.email + ' · pass: ' + user.passwordHash),
          ),
          el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
            el('span', { class: `user-card__role ${roleClass}` }, user.role),
            isMe
              ? button({ label: 'Cerrar sesión', variant: 'ghost', onClick: () => { window.Fluve.session.logout(); location.hash = '#/'; } })
              : button({ label: 'Entrar como', variant: 'ghost', onClick: () => loginAs(user) }),
          ),
        );
        slot.append(card);
      }
    } catch (err) {
      slot.replaceChildren(window.Fluve.viewState('error',
        { message: 'No se pudieron cargar los usuarios: ' + err.message }));
    }
  }

  function loginAs(user) {
    window.Fluve.session.loginAs(user);
    toast(`Sesión iniciada como ${user.name} (${user.role})`, 'success');
    // Si es staff/admin, ir al dashboard admin; si es customer, al inicio
    const dest = (user.role === 'staff' || user.role === 'admin') ? '#/admin' : '#/';
    setTimeout(() => { location.hash = dest; }, 500);
  }

  // ── Sección: herramientas de datos ───────────────────────────────────────────
  function dataTools() {
    const fileInput = el('input', {
      type: 'file', accept: '.json',
      style: { display: 'none' },
      onchange: (e) => handleImport(e.target.files[0]),
    });

    const tools = el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '10px' } },
      fileInput,
      button({
        label: 'Recargar seed',
        variant: 'primary',
        onClick: async () => {
          const ok = await confirm({
            title: 'Recargar datos semilla',
            message: 'Se sobreescribirán TODOS los datos con el seed original. Esta acción no se puede deshacer.',
            confirmLabel: 'Recargar', danger: true,
          });
          if (!ok) return;
          try {
            await window.Fluve.seed.reseed();
            toast('Seed cargado correctamente', 'success');
            location.reload();
          } catch (err) {
            toast('Error al cargar el seed: ' + err.message, 'error');
          }
        },
      }),
      button({
        label: 'Vaciar base',
        variant: 'danger',
        onClick: async () => {
          const ok = await confirm({
            title: 'Vaciar la base de datos',
            message: 'Se eliminarán TODOS los registros de todos los stores. Quedarás sin datos.',
            confirmLabel: 'Vaciar', danger: true,
          });
          if (!ok) return;
          try {
            await window.Fluve.seed.wipe();
            toast('Base de datos vaciada', 'success');
            location.reload();
          } catch (err) {
            toast('Error al vaciar: ' + err.message, 'error');
          }
        },
      }),
      button({
        label: 'Exportar JSON',
        variant: 'ghost',
        onClick: async () => {
          try {
            await window.Fluve.seed.exportJSON();
            toast('JSON exportado', 'success');
          } catch (err) {
            toast('Error al exportar: ' + err.message, 'error');
          }
        },
      }),
      button({
        label: 'Importar JSON',
        variant: 'ghost',
        onClick: () => fileInput.click(),
      }),
    );
    return tools;
  }

  async function handleImport(file) {
    if (!file) return;
    const ok = await confirm({
      title: 'Importar base de datos',
      message: `Se reemplazarán todos los datos con el contenido de "${file.name}". Esta acción no se puede deshacer.`,
      confirmLabel: 'Importar', danger: true,
    });
    if (!ok) return;
    try {
      await window.Fluve.seed.importJSON(file);
      toast('Base importada correctamente', 'success');
      location.reload();
    } catch (err) {
      toast('Error al importar: ' + err.message, 'error');
    }
  }

  // ── Primitivo de layout ───────────────────────────────────────────────────────
  function sectionHd(title) {
    return el('div', { class: 'section-hd' },
      el('span', { class: 'section-hd__title' }, title),
    );
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.admin = window.Fluve.views.admin || {};
  window.Fluve.views.admin.config = adminConfig;
})();
