# Guía de trabajo para asistentes de IA

## Lectura antes de cambiar

1. Empieza por la ruta y página afectadas; sigue el flujo hacia componentes, hooks, `api/resources.ts`, `baseApi.ts`, `types.ts` y permisos.
2. Para cambios de negocio que dependen del servidor, inspecciona el endpoint/DTO/backend relacionado o la colección Postman; declara cualquier incertidumbre si el servidor no está disponible en este workspace.
3. Antes de cambiar un literal, revisa `.claude/glossary.md`, los tipos y todas las referencias; confirma el contrato de API.
4. Para una acción UI, identifica estados loading/error/success, confirmación, toasts, permisos y tags de caché que deben invalidarse.
5. Para formularios multipart, verifica el nombre y shape exactos de los campos, limpieza de imágenes y representación del backend.
6. Para órdenes/pagos/stock/envíos, separa dominios de estado y no dupliques reglas servidor-side.

## Reglas que no se deben romper

- Mantener nombres exactos de rutas, fields, enums, permisos, claves de storage y headers compartidos.
- El backend es la autoridad para roles/permisos, estado de pago, importe, stock, precio, descuentos y transición válida. No ejecutar mutación basándose solo en permiso del cliente.
- No mezclar `OrderStatus`, `PaymentStatus`, `OrderItemStatus` y `ShipmentStatus`; cada estado tiene ciclo de vida diferente.
- Preservar snapshots históricos de líneas de pedido. No calcular totales o historial autoritativo desde el catálogo actual.
- No tratar `currentStock` como valor editable casual: diferenciar ajuste absoluto, delta y movimiento con el endpoint específico.
- No presentar filtros/estadísticas locales de una página como resultados globales. Anotar truncamiento o página parcial si aplica.
- No convertir un preview local de oferta/precio en la regla final; pedir al backend el resultado definitivo.
- No incluir tokens, links de invitación, datos personales o secretos en logs, capturas, documentación ni mensajes de error.
- No inventar integraciones o flujos no soportados; consultar límites documentados en `operations-and-gaps.md`.
- Mantener accesibilidad básica, diseño responsive, texto en español existente, componentes UI y patrones locales.
- Evitar dependencias nuevas salvo que aporten una necesidad clara; no duplicar controles existentes.

## Calidad de implementación

- TypeScript estricto; aprovechar tipos existentes, no usar `any` sin justificación.
- Usar hooks/endpoints tipados de RTK Query. No crear un segundo cliente API ni fetch directo para operaciones normales.
- Al añadir/reutilizar endpoint, definir tipos, query args, manejo de error, `providesTags`/`invalidatesTags` y invalidaciones cruzadas adecuadas.
- Si se modifica un shape de respuesta CRUD genérico, actualizar `src/app/api/contracts.ts` y sus pruebas; si es endpoint especializado, definir validación explícita cuando corresponda.
- No omitir estados de carga, error y vacío; deshabilitar doble envío mientras la mutación está en curso.
- Para acciones destructivas o irreversibles, usar confirmación compartida y explicar el efecto.
- Mantener presentación y etiquetas exactas como constantes centralizadas cuando existen (`types.ts`, `domain.ts`, `permissions.ts`).
- Evitar editar la respuesta de tipos del backend a mano como si fuera validación runtime.

## Verificación y comunicación

- Ejecutar `npm run typecheck` y `npm run build` ante cambios funcionales si el entorno lo permite.
- Ejecutar `npm test` y `npm run check:api-contract` cuando el cambio afecte código cubierto o rutas/contratos.
- Si se agregan o actualizan dependencias, ejecutar `npm run audit:prod` y revisar el resultado de npm audit.
- La cobertura automatizada es parcial; no presentar tests unitarios como pruebas de integración o autorización backend.
- Revisar diff y errores nuevos; indicar qué comandos se ejecutaron y resultado real.
- Informar brechas de backend/configuración externa por separado de las capacidades implementadas en el frontend.
- Actualizar `functional.md`, `architecture.md`, `glossary.md` u `operations-and-gaps.md` cuando cambien hechos documentados.

## Formato al documentar funcionalidades nuevas

Registrar como mínimo: actor/permisos de UI, endpoint y payload, validación, efecto esperado, invalidación de caché, estados/errores de UI, reglas que dependen del backend, impacto en privacidad e integración externa.