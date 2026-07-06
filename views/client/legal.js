// views/client/legal.js — Términos de uso (#/terminos) y Política de privacidad (#/privacidad)
(function () {
  const { el } = window.Fluve.dom;

  // ── #/terminos — Términos y condiciones de uso ────────────────────────────
  async function terminos() {
    const wrap = el('div', { class:'fu trust-page' });
    wrap.append(
      crumb('Términos de uso'),
      el('h1', {}, 'Términos y condiciones de uso'),
      el('p', { style:'color:var(--mut);font-size:13px;margin-bottom:28px' },
        'Versión 1.0 · Vigente desde el 1° de enero de 2025 · Fluvë Studio S.R.L. · Montevideo, Uruguay'),

      sec('1. Partes del acuerdo',
        `Estos Términos y Condiciones regulan la relación entre Fluvë Studio S.R.L. (RUT 214765430018), 
        con domicilio en Montevideo, Uruguay ("Fluvë Studio", "nosotros") y el usuario que acceda, 
        navegue o realice compras en la plataforma fluvestudio.uy ("vos", "el cliente"). Al crear una 
        cuenta o realizar una compra, aceptás estos términos en su totalidad.`),

      sec('2. Productos y servicios',
        `Fluvë Studio es una plataforma de impresión personalizada bajo demanda. Los productos 
        (remeras, hoodies, tazas, tote bags, fundas, cuadros y otros) se fabrican exclusivamente 
        a pedido, con el diseño o archivo indicado por el cliente. Cada producto es único y 
        producido después de confirmada la compra.`),

      sec('3. Precios y pagos',
        `Todos los precios incluyen IVA (22%) y se expresan en pesos uruguayos (UYU) salvo indicación 
        contraria. Aceptamos pago por tarjeta de débito/crédito, MercadoPago y transferencia bancaria. 
        El precio final incluye el costo de producción, la técnica de impresión seleccionada y el 
        envío (salvo que se indique "envío gratis" por superar el mínimo establecido). Las promociones 
        y cupones tienen vigencia limitada indicada en cada campaña.`),

      sec('4. Proceso de producción y entrega',
        `Una vez confirmado el pago, el pedido ingresa al proceso de producción en 12–24 horas hábiles. 
        La entrega express en Montevideo y Canelones es en 24–48 horas desde la producción. 
        El interior del país puede demorar hasta 3–5 días hábiles. Fluvë Studio trabaja con operadores 
        logísticos locales y no se responsabiliza por demoras atribuibles a terceros o casos de fuerza 
        mayor (fenómenos climáticos, paros, etc.).`),

      sec('5. Propiedad intelectual y diseños',
        `Al subir un diseño o archivo, el cliente declara y garantiza que: (a) es el titular de los 
        derechos de autor o cuenta con autorización expresa del titular; (b) el contenido no infringe 
        derechos de terceros; (c) no contiene contenido ilegal, violento, discriminatorio u obsceno. 
        Fluvë Studio se reserva el derecho de rechazar pedidos que incumplan estas condiciones sin 
        obligación de reembolso previo al inicio de producción.`),

      sec('6. Programa de artistas',
        `Los artistas que publiquen diseños en la plataforma ceden a Fluvë Studio una licencia no 
        exclusiva para reproducir sus obras en los productos comercializados. Las regalías (base: 10%, 
        Pro: 20%) se calculan sobre el margen de ganancia de cada venta y se liquidan mensualmente 
        por transferencia bancaria o MercadoPago. Los artistas mantienen la propiedad intelectual 
        de sus obras.`),

      sec('7. Devoluciones y garantías',
        `Por tratarse de productos personalizados, no se aceptan devoluciones por cambio de opinión. 
        Sí se aceptan reclamaciones por: defectos de impresión, producto dañado en el envío, o 
        producto incorrecto. El cliente debe notificarlo dentro de los 7 días corridos de recibido 
        el pedido, adjuntando foto del problema a través del módulo de Soporte de su cuenta. 
        Fluvë Studio resolverá mediante reimpresión o reembolso a su criterio, en un plazo máximo 
        de 10 días hábiles.`),

      sec('8. Limitación de responsabilidad',
        `Fluvë Studio no será responsable por daños indirectos, incidentales o punitivos derivados 
        del uso de la plataforma. La responsabilidad máxima frente a cualquier reclamación se limita 
        al monto pagado por el pedido en cuestión.`),

      sec('9. Modificaciones',
        `Fluvë Studio puede modificar estos Términos en cualquier momento. Los cambios se notificarán 
        por email con 15 días de anticipación. El uso continuado de la plataforma implica la 
        aceptación de los términos vigentes.`),

      sec('10. Ley aplicable y jurisdicción',
        `Estos Términos se rigen por la legislación uruguaya (Ley N° 17.250 de Defensa del 
        Consumidor, Decreto 244/000 de comercio electrónico). Cualquier controversia se someterá 
        a la jurisdicción de los Juzgados Ordinarios de Montevideo.`),

      sec('11. Contacto',
        'Para consultas sobre estos Términos: '),
      el('a',{href:'https://wa.me/59899000000',style:'color:var(--accent2)'},'💬 WhatsApp'),
      el('span',{style:'color:var(--mut)'},' · hola@fluvestudio.uy · Av. Italia 6201, Montevideo'),
    );
    return wrap;
  }

  // ── #/privacidad — Política de privacidad ────────────────────────────────
  async function privacidad() {
    const wrap = el('div', { class:'fu trust-page' });
    wrap.append(
      crumb('Política de privacidad'),
      el('h1', {}, 'Política de privacidad'),
      el('p', { style:'color:var(--mut);font-size:13px;margin-bottom:28px' },
        'Versión 1.0 · Vigente desde el 1° de enero de 2025 · En cumplimiento de la Ley N° 18.331 (Uruguay)'),

      sec('1. Responsable del tratamiento',
        `Fluvë Studio S.R.L., RUT 214765430018, con domicilio en Montevideo, Uruguay, es la 
        entidad responsable del tratamiento de tus datos personales.`),

      sec('2. Datos que recopilamos',
        `Recopilamos los siguientes datos cuando creás una cuenta o realizás una compra:
        • Identificación: nombre, apellido, email, número de teléfono.
        • Dirección de entrega: calle, ciudad, código postal.
        • Datos fiscales (opcionales): RUT o Cédula de Identidad para facturación.
        • Datos de pago: procesados exclusivamente por MercadoPago o la pasarela indicada (Fluvë Studio no almacena datos de tarjeta).
        • Datos de uso: historial de pedidos, diseños guardados, favoritos, tickets de soporte.
        • Datos técnicos: IP de origen, navegador, dispositivo (para seguridad y análisis agregado).`),

      sec('3. Finalidad del tratamiento',
        `Usamos tus datos para: (a) procesar y entregar tus pedidos; (b) gestionar tu cuenta y 
        comunicarte actualizaciones relevantes; (c) liquidar regalías a artistas; (d) detectar y 
        prevenir fraudes; (e) mejorar la experiencia de la plataforma mediante análisis agregado 
        y anónimo. No vendemos ni cedemos tus datos personales a terceros con fines comerciales.`),

      sec('4. Base legal',
        `El tratamiento de tus datos se basa en: (a) la ejecución del contrato de compraventa; 
        (b) tu consentimiento explícito al aceptar estos términos; (c) el interés legítimo de 
        Fluvë Studio para prevenir fraudes y mejorar el servicio.`),

      sec('5. Almacenamiento y seguridad',
        `Tus datos se almacenan en servidores ubicados en Uruguay y/o en la Unión Europea con 
        nivel de protección equivalente. Aplicamos cifrado SSL/TLS, control de acceso por roles 
        y auditoría de actividad. Conservamos tus datos mientras tu cuenta esté activa y hasta 
        5 años después de la última transacción, salvo obligación legal mayor.`),

      sec('6. Cookies y tecnologías similares',
        `Usamos cookies estrictamente necesarias para el funcionamiento de la sesión y el carrito. 
        No usamos cookies de seguimiento publicitario de terceros. Podés configurar tu navegador 
        para rechazar cookies, aunque esto puede afectar algunas funcionalidades.`),

      sec('7. Tus derechos',
        `En virtud de la Ley 18.331 tenés derecho a: acceder a tus datos, rectificarlos, suprimirlos 
        ("derecho al olvido"), oponerte a su tratamiento, y solicitar su portabilidad. Para ejercer 
        cualquiera de estos derechos escribí a privacidad@fluvestudio.uy indicando tu nombre y 
        número de cuenta. Respondemos en un plazo máximo de 30 días.`),

      sec('8. Menores de edad',
        `La plataforma está dirigida a personas mayores de 18 años. No recopilamos conscientemente 
        datos de menores. Si detectamos que un menor registró una cuenta sin autorización, 
        procederemos a eliminarla.`),

      sec('9. Cambios en esta política',
        `Podemos actualizar esta Política en cualquier momento. Los cambios materiales se notificarán 
        por email con 15 días de anticipación. La versión vigente siempre estará disponible en 
        fluvestudio.uy/privacidad.`),

      sec('10. Contacto',
        'Consultas sobre privacidad: privacidad@fluvestudio.uy · '),
      el('a',{href:'https://wa.me/59899000000',style:'color:var(--accent2)'},'WhatsApp'),
      el('span',{style:'color:var(--mut)'},' · URCDP (Unidad Reguladora y de Control de Datos Personales): www.gub.uy/urcdp'),
    );
    return wrap;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function crumb(label) {
    return el('div', { class:'mono-label', style:'margin-bottom:12px' },
      el('a', { href:'#/', style:'color:var(--mut);text-decoration:none' }, 'Inicio'),
      ' › ', label,
    );
  }
  function sec(title, text) {
    return el('div', { style:'margin-bottom:20px' },
      el('h2', {}, title),
      el('p', {}, text),
    );
  }

  window.Fluve = window.Fluve || {};
  window.Fluve.views = window.Fluve.views || {};
  window.Fluve.views.client = window.Fluve.views.client || {};
  Object.assign(window.Fluve.views.client, { terminos, privacidad });
})();
