// views/client/auth.js — Login / Registro / Recuperar. Fiel a Frontend.dc.html §9a.
(function () {
  const { el } = window.Fluve.dom;

  async function auth({ query }) {
    const slot = document.querySelector('[data-view-slot]');
    if (slot) { slot.style.padding = '0'; slot.style.maxWidth = 'none'; }

    // centrado vertical con padding generoso
    const wrap = el('div', { class:'fu', style:'min-height:70vh;display:flex;align-items:center;justify-content:center;padding:32px' });
    const card = el('div', { class:'auth-card' }, buildBrand(), buildFormSide(query));
    wrap.append(card);
    return wrap;
  }

  // ── Panel izquierdo: marca ─────────────────────────────────────────────────
  function buildBrand() {
    return el('div', { class:'auth-brand' },
      el('div', { class:'auth-brand__bg' }),
      el('div', { class:'auth-brand__orb' }),
      el('div', { class:'auth-brand__content' },
        // Logo
        el('div', { style:'display:flex;align-items:center;gap:10px;margin-bottom:22px' },
          el('span', { html:'<svg viewBox="0 0 30 30" width="26" height="26" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" fill="var(--cyan)"/><circle cx="18" cy="12" r="9" fill="var(--magenta)"/><circle cx="15" cy="18" r="9" fill="var(--yellow)"/></svg>' }),
          el('span', { style:"font:600 20px 'Space Grotesk'" }, 'Fluvë', el('span',{style:'color:var(--mut);font-weight:400'},' studio')),
        ),
        el('h2', { class:'auth-brand__h2' }, 'Tu cuenta, tus diseños, tus pedidos.'),
        el('div', { class:'auth-brand__features' },
          ...['Seguí tus pedidos en tiempo real','Guardá favoritos y direcciones','Repetí compras en un clic','Publicá y vendé tu arte'].map(t => el('span',{},`✓ ${t}`)),
        ),
        // Imagen placeholder (unboxing)
        el('div', { style:'margin-top:20px;border-radius:12px;overflow:hidden;border:1px solid var(--line2);height:110px;background:linear-gradient(160deg,var(--ink3),var(--ink2));display:flex;align-items:center;justify-content:center;font-size:52px' }, '📦'),
      ),
    );
  }

  // ── Panel derecho: formulario ──────────────────────────────────────────────
  function buildFormSide(query) {
    const returnHref = query.return ? decodeURIComponent(query.return) : '#/';
    const preEmail   = query.email  ? decodeURIComponent(query.email)  : '';
    let mode = (query.mode === 'reg') ? 'reg' : 'login'; // pre-seleccionar tab según URL

    const formBody = el('div', { style:'display:flex;flex-direction:column;gap:9px' });
    const tabs     = el('div', { class:'auth-tabs' });

    function setTab(m) {
      mode = m;
      // Actualizar tabs
      tabs.querySelectorAll('.auth-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.mode === m);
      });
      renderFormBody();
    }

    // 2 tabs: Iniciar sesión | Crear cuenta (se auto-selecciona si viene ?mode=reg)
    ['login','reg'].forEach(m => {
      const tab = el('button', { class:`auth-tab${m===mode?' active':''}`, type:'button', 'data-mode': m },
        m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'
      );
      tab.addEventListener('click', () => setTab(m));
      tabs.append(tab);
    });

    function renderFormBody() {
      formBody.replaceChildren();
      if (mode === 'rec') renderRecover();
      else if (mode === 'reg') renderRegister();
      else renderLogin();
    }

    // ── Login ──────────────────────────────────────────────────────────────
    function renderLogin() {
      let emailVal = '', passVal = '';
      const recoverLink = el('a', {
        href:'javascript:void(0)', style:"font:500 10.5px 'Inter';color:var(--mut);text-decoration:underline;cursor:pointer"
      }, '¿Olvidaste tu contraseña?');
      recoverLink.addEventListener('click', () => { mode='rec'; renderFormBody(); });

      formBody.append(
        afld('email','Email','email','tu@email.com', v=>emailVal=v),
        el('div', { style:'display:flex;flex-direction:column;gap:6px' },
          el('div', { style:'display:flex;justify-content:space-between;align-items:center' },
            el('span', { class:'mono-label' }, 'Contraseña'),
            recoverLink,
          ),
          el('input', { class:'fld', type:'password', placeholder:'••••••••',
            oninput: e => passVal = e.target.value
          }),
        ),
        el('button', { class:'btn btn--primary', type:'button', style:'justify-content:center;margin-top:4px',
          onclick: async () => {
            if (!emailVal || !passVal) { window.Fluve.toast('Completá todos los campos','error'); return; }
            try {
              const users = await window.Fluve.dao.users.getAll();
              const user  = users.find(u => u.email.toLowerCase() === emailVal.toLowerCase());
              if (!user || user.passwordHash !== passVal) throw new Error('Email o contraseña incorrectos');
              // F6: capturar carrito de invitado antes de hacer login
              const guestLines = window.Fluve.cart.store.get().lines ?? [];
              await window.Fluve.session.login(user.id);
              await window.Fluve.cart.loadCart();
              // F6: fusionar carrito invitado con el del usuario
              for (const gl of guestLines) {
                await window.Fluve.cart.addLine(gl).catch(() => null);
              }
              window.Fluve.toast(`¡Bienvenido, ${user.name}!${guestLines.length ? ' Tu carrito fue conservado.' : ''}`, 'success');
              window.Fluve.router.navigate(returnHref);
            } catch (err) { window.Fluve.toast(err.message,'error'); }
          }
        }, 'Entrar →'),
        divider(),
        el('div', { class:'social-btns' },
          socBtn('Google'),
          socBtn('Apple'),
        ),
        el('p', { style:"font:400 10px 'Inter';color:var(--mut);text-align:center;margin:8px 0 0" },
          'Al continuar aceptás los Términos y la Política de privacidad.'),
      );
    }

    // ── Registro ────────────────────────────────────────────────────────────
    function renderRegister() {
      let fName='', lName='', emailVal=preEmail, passVal=''; // pre-llenar con email de URL si viene
      // Pre-llenar nombre si hay email de checkout (puede estar vacío)
      formBody.append(
        // Banner informativo si viene del flujo de invitado
        preEmail ? el('div', { style:'border:1px solid var(--accent);border-radius:10px;padding:10px 13px;background:rgba(44,92,255,.1);font-size:12.5px;color:var(--txt);margin-bottom:4px' },
          '✓ Usaremos ', el('b',{},preEmail), ' como email de tu cuenta — ya lo tenemos del checkout.'
        ) : null,
        el('div', { class:'form-row' },
          afld('rf','Nombre','text','',v=>fName=v,'50%'),
          afld('rl','Apellido','text','',v=>lName=v,'50%'),
        ),
        afld('re','Email','email', preEmail, v=>emailVal=v),
        el('div', { style:'display:flex;flex-direction:column;gap:6px' },
          el('span', { class:'mono-label' }, 'Contraseña'),
          el('input', { class:'fld', type:'password', placeholder:'Mínimo 8 caracteres',
            oninput: e => passVal = e.target.value
          }),
        ),
        // Checkbox de términos — input real, requerido, con links funcionales
        el('label', { style:'display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-top:4px' },
          el('input', {
            type:'checkbox', id:'terms-check',
            style:'width:16px;height:16px;margin-top:2px;cursor:pointer;flex:none;accent-color:var(--accent)',
          }),
          el('span', { style:"font:400 12px 'Inter';color:var(--mut);line-height:1.5" },
            'Acepto los ',
            el('a', { href:'#/terminos', target:'_blank',
              style:'color:var(--accent2);text-decoration:underline',
              onclick: e => e.stopPropagation(),
            }, 'Términos de uso'),
            ' y la ',
            el('a', { href:'#/privacidad', target:'_blank',
              style:'color:var(--accent2);text-decoration:underline',
              onclick: e => e.stopPropagation(),
            }, 'Política de privacidad'),
            ' de Fluvë Studio.',
          ),
        ),
        el('button', { class:'btn btn--primary', type:'button', style:'justify-content:center;margin-top:4px',
          onclick: async () => {
            if (!fName||!emailVal||passVal.length<8) { window.Fluve.toast('Completá nombre, email y contraseña (≥8 caracteres)','error'); return; }
            const termsCheck = document.getElementById('terms-check');
            if (!termsCheck?.checked) { window.Fluve.toast('Debés aceptar los Términos y la Política de privacidad para crear tu cuenta','error'); return; }
            try {
              const existing = await window.Fluve.dao.users.query('email',emailVal.toLowerCase());
              if (existing.length) throw new Error('Ya existe una cuenta con ese email');
              const newUser = {
                id:'user-'+Date.now().toString(36),
                email:emailVal.toLowerCase(), name:`${fName} ${lName}`,
                role:'customer', passwordHash:passVal,
                phone:null, addresses:[], taxId:null, provider:'email',
                createdAt:new Date().toISOString(),
              };
              await window.Fluve.dao.users.put(newUser);
              await window.Fluve.session.login(newUser.id);
              window.Fluve.toast(`¡Cuenta creada! Bienvenido, ${newUser.name}`, 'success');
              window.Fluve.router.navigate(returnHref);
            } catch (err) { window.Fluve.toast(err.message,'error'); }
          }
        }, 'Crear cuenta →'),
        el('p', { style:"font:400 10px 'Inter';color:var(--mut);text-align:center;margin:8px 0 0" },
          'Te enviaremos un email de verificación.'),
      );
    }

    // ── Recuperar contraseña ────────────────────────────────────────────────
    function renderRecover() {
      let emailVal = '';
      formBody.append(
        el('p', { style:"font:400 13px/1.55 'Inter';color:var(--mut);margin:0" },
          'Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.'),
        afld('rv','Email','email','',v=>emailVal=v),
        el('button', { class:'btn btn--primary', type:'button', style:'justify-content:center',
          onclick: () => {
            if (!emailVal) { window.Fluve.toast('Ingresá tu email','error'); return; }
            window.Fluve.toast(`Enlace enviado a ${emailVal}`, 'success');
            setTab('login');
          }
        }, 'Enviar enlace →'),
        el('button', { class:'nav-fav', type:'button', style:"font:500 12px 'Inter';color:var(--mut);text-align:center;margin-top:6px;background:none;border:none;cursor:pointer",
          onclick: () => setTab('login')
        }, '← Volver a iniciar sesión'),
      );
    }

    renderFormBody();
    return el('div', { class:'auth-form-side' }, tabs, formBody);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function afld(id, label, type, placeholder, onChange, width) {
    const inp = el('input', { class:'fld', id, type, placeholder: placeholder||label,
      style: width ? `width:100%` : '',
      oninput: e => onChange(e.target.value)
    });
    const wrapper = el('div', { style:`display:flex;flex-direction:column;gap:6px;${width?'flex:1':''}` },
      el('label', { class:'mono-label', for:id }, label),
      inp,
    );
    return wrapper;
  }

  function divider() {
    return el('div', { class:'auth-divider' },
      el('span', { class:'auth-divider-line' }),
      el('span', { class:'auth-divider-label' }, 'o continuá con'),
      el('span', { class:'auth-divider-line' }),
    );
  }

  function socBtn(label) {
    return el('button', { class:'social-btn', type:'button',
      onclick: () => window.Fluve.toast(`Login con ${label} — pendiente`, 'default')
    }, label);
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  window.Fluve.views.client.auth = auth;
})();
