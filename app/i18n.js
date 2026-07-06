// app/i18n.js — diccionario ES/EN + t() + formato de moneda/fecha (F5). Namespace: window.Fluve.i18n
// Fase 1: diccionario mínimo (shell + vistas dummy). Se completa en Fase 6 (pulido).
//
// Nota de robustez: localStorage bajo file:// es "comportamiento no especificado" por el
// estándar (MDN). Chrome lo permite; Firefox lo bloquea por diseño. Se envuelve en try/catch
// para degradar con gracia (queda en 'es' por sesión) en vez de romper toda la app.
(function () {
  const DICT = {
    es: {
      'nav.home': 'Inicio',
      'nav.gallery': 'Galería',
      'nav.account': 'Mi cuenta',
      'nav.admin': 'Admin',
      'nav.cart': 'Carrito',
      'footer.rights': '© {year} Fluvë Studio',
      'footer.terms': 'Términos',
      'footer.privacy': 'Privacidad',
      'footer.cookies.text': 'Usamos cookies para mejorar tu experiencia.',
      'footer.cookies.accept': 'Aceptar',
      'admin.rail.dashboard': 'Dashboard',
      'admin.brand.sub': 'Panel de operaciones',
      'common.back_home': 'Volver al inicio',
    },
    en: {
      'nav.home': 'Home',
      'nav.gallery': 'Gallery',
      'nav.account': 'My account',
      'nav.admin': 'Admin',
      'nav.cart': 'Cart',
      'footer.rights': '© {year} Fluvë Studio',
      'footer.terms': 'Terms',
      'footer.privacy': 'Privacy',
      'footer.cookies.text': 'We use cookies to improve your experience.',
      'footer.cookies.accept': 'Accept',
      'admin.rail.dashboard': 'Dashboard',
      'admin.brand.sub': 'Operations panel',
      'common.back_home': 'Back to home',
    },
  };

  const LANG_KEY = 'fluve_lang';
  let memLang = 'es'; // fallback en memoria si localStorage no está disponible (F5 sigue funcionando esa sesión)

  function getLang() {
    try { return localStorage.getItem(LANG_KEY) || memLang; }
    catch { return memLang; }
  }

  function setLang(lang) {
    memLang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* opaque origin: se mantiene solo en memoria */ }
  }

  /** t('clave', {var: valor}) — interpola {var} dentro del string. */
  function t(key, vars = {}) {
    const lang = getLang();
    let str = DICT[lang]?.[key] ?? DICT.es[key] ?? key;
    for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, v);
    return str;
  }

  function money(n) {
    const num = Number(n ?? 0);
    return '$' + num.toLocaleString(getLang() === 'en' ? 'en-US' : 'es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function date(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString(getLang() === 'en' ? 'en-US' : 'es-UY');
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.i18n = { t, money, date, getLang, setLang };
})();
