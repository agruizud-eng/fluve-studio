// app/session.js — sesión real con IndexedDB + cache en memoria (ARQUITECTURA §5).
// Namespace: window.Fluve.session
// FASE 2: loadSession() lee de DB; current() y hasRole() son síncronos (cache en memoria).
// localStorage envuelto en try/catch (bajo file:// Chrome lo permite, Firefox no).
(function () {
  const SESSION_KEY = 'fluve_session';
  const ORDER = { guest: 0, customer: 1, staff: 2, admin: 3 };

  let _user = null; // cache en memoria — cargada en loadSession() al arrancar

  // Intenta leer/escribir en localStorage; devuelve null si no está disponible
  function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* opaque origin */ } }
  function lsRemove(k) { try { localStorage.removeItem(k); } catch { /* opaque origin */ } }

  /** Carga la sesión desde DB en el arranque. Llamar desde main.js antes de startRouter(). */
  async function loadSession() {
    try {
      const id = lsGet(SESSION_KEY);
      if (!id) { _user = null; return; }
      _user = (await window.Fluve.dao.users.get(id)) ?? null;
    } catch {
      _user = null;
    }
  }

  /** Usuario en memoria (sync). null = guest. */
  function current() { return _user; }

  /** Comprueba si el usuario tiene al menos el rol `min` (sync). */
  function hasRole(min) {
    return (ORDER[_user?.role ?? 'guest'] ?? 0) >= (ORDER[min] ?? 0);
  }

  /** Login normal: busca al usuario en DB y cachea. */
  async function login(userId) {
    const user = await window.Fluve.dao.users.get(userId);
    if (!user) throw new Error('Usuario no encontrado');
    _user = user;
    lsSet(SESSION_KEY, userId);
    return user;
  }

  /** Login inmediato por objeto (usado desde el panel de config para "iniciar como"). */
  function loginAs(userObj) {
    _user = userObj;
    lsSet(SESSION_KEY, userObj.id);
  }

  function logout() {
    _user = null;
    lsRemove(SESSION_KEY);
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.session = { loadSession, current, hasRole, login, loginAs, logout };
})();
