# Prompt para Claude — Correcciones del prototipo Fluvë Studio

Actúa como Arquitecto de Software Principal y Auditor de prototipos frontend. Tu tarea es corregir, reforzar y ordenar el sistema actual de Fluvë Studio, manteniendo su naturaleza de prototipo funcional y sin convertirlo en un stack de producción.

## Contexto
- Este proyecto es un prototipo funcional para probar navegación, vistas, capa de datos, diseño, flujos y experiencia de usuario.
- No es producción y no debe tratarse como un sistema productivo.
- Debe seguir funcionando sin servidor, sin build tools, sin npm, sin bundler, y sin módulos ES6.
- Debe correr con apertura directa de index.html (file://) en Chrome/Edge.
- La arquitectura actual usa JS vanilla clásico, routing por hash, IndexedDB para persistencia, localStorage solo para idioma/sesión y un namespace global window.Fluve.*.

## Objetivo
Mejorar la calidad estructural, la coherencia de flujos, la estabilidad operativa y la claridad del código, priorizando:
- navegación y rutas,
- estados de vista,
- coherencia de datos,
- flujos de autenticación y checkout,
- panel admin y herramientas de seed/reset,
- manejo de errores y feedback visual,
- legibilidad y mantenimiento del código.

## Restricciones duras a respetar
- No introducir frameworks ni librerías externas.
- No introducir build tools, bundlers, npm o compilación.
- No asumir backend real ni APIs de producción.
- Mantener compatibilidad con ejecución local vía file://.
- Mantener scripts clásicos y namespace global window.Fluve.*.
- No reescribir el sistema completo de forma agresiva; priorizar mejoras incrementales y seguras.
- Si se necesita un cambio más grande, dejarseguimiento claro con TODOs y notas de migración.

## Prioridades de corrección

### 1) Arquitectura y estructura
- Revisar el acoplamiento entre vistas, router, shell, DAO y estado global.
- Reducir dependencias implícitas y mejorar la claridad del flujo de arranque.
- Asegurar que el orden de carga de scripts siga siendo correcto y estable.
- Identificar y resolver puntos donde la lógica de negocio está mezclada con la UI.

### 2) Flujos críticos del prototipo
- Autenticación y sesión: mejorar consistencia de estado, manejo de guest/customer/staff/admin, redirecciones y errores.
- Checkout: corregir flujo de creación de orden, persistencia, resumen, estados de carga y navegación posterior.
- Admin: mejorar panel de config/seed/reset/import/export y asegurar que las acciones sensibles queden bien guiadas.
- Carrito: corregir sincronía entre invitado/logueado y persistencia en IndexedDB.

### 3) Seguridad y control de acceso (nivel prototipo)
- No implementar seguridad de producción, pero sí mejorar el nivel de protección del prototipo.
- Evitar exponer credenciales sensibles en la UI.
- Evitar que el usuario pueda “pasar” por lógica de permisos solo con cambios locales del navegador.
- Señalar claramente qué problemas son prototipo y qué debe reforzarse en producción.

### 4) Experiencia de usuario y robustez
- Asegurar estados de loading, vacío, error y sin resultados en todas las vistas relevantes.
- Mejorar mensajes de feedback, toasts y confirmaciones.
- Corregir navegación, rutas, y estados en vistas clave.
- Evitar comportamientos inconsistentes al recargar, iniciar sesión, cambiar de rol o resembrar datos.

### 5) Calidad de código
- Eliminar duplicaciones innecesarias cuando sea claro.
- Corregir malas prácticas visibles y simplificar lógica compleja.
- Mejorar el manejo de excepciones en DAO, seed, session y flows de UI.
- Dejar comentarios y TODOs para lo que luego se resolverá en producción.

## Reglas de trabajo
- Trabajar por fases y priorizar cambios de alto impacto.
- Si un problema requiere un cambio más grande, documentarlo con una nota de desarrollo y dejar el prototipo funcional.
- Mantener cambios localmente coherentes y evitar reescrituras excesivas.
- Preferir mejoras pequeñas, claras y verificables.
- No inventar infraestructura de backend que no encaja con el modelo actual.

## Entregables esperados
1. Un resumen claro de los cambios aplicados por módulo.
2. Una lista de problemas corregidos y de riesgos que quedan para producción.
3. Notas de desarrollo donde quede explícito qué se debe revisar cuando se migre a producción real.
4. Si aplica, dejar TODOs en el código señalando: “revisar en producción” o “reemplazar por backend real”.

## Verificación recomendada
- Probar manualmente los flujos principales: carga inicial, navegación, auth, carrito, checkout, admin config, seed reset y re-seed.
- Confirmar que el prototipo sigue funcionando bajo file://.
- Verificar que no se rompió el estado de sesión, el router ni la persistencia en IndexedDB.

## Output final esperado
Debes entregar una respuesta breve y accionable con:
- qué se corrigió,
- qué se dejó pendiente para la migración,
- y un listado de riesgos de producción que deben revisarse luego.
