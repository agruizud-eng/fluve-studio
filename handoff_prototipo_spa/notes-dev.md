# Notes Dev — Migración a producción real de Fluvë Studio

## Contexto
Este documento recoge los riesgos y limitaciones detectados en la fase de prototipo de Fluvë Studio. El objetivo es dejar claro qué debe cambiar cuando el sistema pase a producción real.

## 1) Seguridad
- La autenticación actual es de prototipo y no es segura para producción.
- No usar comparación directa de contraseñas ni almacenamiento de credenciales en claro dentro del seed o la UI.
- En producción real se debe implementar:
  - backend autenticado,
  - hashing seguro de contraseñas,
  - sesiones seguras o tokens firmados,
  - control de acceso basado en roles real (RBAC),
  - trazabilidad de acciones sensibles.

## 2) Permisos y roles
- El control de acceso actual depende de estado local y del navegador.
- En producción, los permisos deben validarse del lado del servidor y no confiar en el frontend.
- Definir roles claros: guest, customer, staff, admin, con reglas de negocio y auditoría.

## 3) Procesos transaccionales
- El checkout y la creación de órdenes actualmente se simulan en el cliente.
- En producción real, se debe implementar:
  - reserva de stock,
  - validación de pagos,
  - manejo de idempotencia,
  - confirmación de pagos y webhooks,
  - integridad transaccional entre órdenes, pagos y stock.

## 4) Persistencia y datos
- IndexedDB y localStorage son adecuados para prototipo, pero no para un sistema multiusuario real.
- En producción se debe migrar a un backend con base de datos relacional o documental escalable.
- Definir estrategia de migración de datos y versionado de esquema.

## 5) Arquitectura técnica
- La arquitectura actual basada en scripts globales y window.Fluve.* es válida para prototipo, pero no para mantenimiento a largo plazo.
- En producción se debe migrar a una arquitectura modular o a un stack con bundler y separación de capas clara.
- Definir límites claros entre frontend, backend, reglas de negocio y capa de datos.

## 6) Operación y observabilidad
- Añadir logging centralizado, métricas, monitoreo de errores y alertas.
- Implementar auditoría detallada para pedidos, pagos, cambios de estado, accesos y acciones administrativas.
- Preparar estrategia de backups y recuperación ante incidentes.

## 7) Cumplimiento y negocio
- Revisar privacidad, protección de datos, políticas de uso y almacenamiento de información personal.
- Incorporar gestión de impuestos, devoluciones, envíos, retención de datos y cumplimiento regulatorio.
- Definir contratos de negocio para intermediación, regalías y pagos a artistas/proveedores.

## 8) Recomendación de evolución
- Mantener esta fase como prototipo validado.
- Cuando se migre a producción, hacerlo por etapas: autenticación real, API, persistencia server-side, pagos, permisos, observabilidad.
- No tratar la arquitectura actual como base productiva directamente: usarla como referencia de experiencia y flujo, pero no como implementación de producción.
