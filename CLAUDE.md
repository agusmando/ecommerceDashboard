# Instrucciones para asistentes de IA

Este repositorio es el panel administrativo web de Canela en Rama (React + TypeScript + Vite), no la tienda ni el backend. Antes de cambiar comportamiento de negocio, permisos, contratos HTTP o términos del dominio, consulta la documentación de [.claude/README.md](.claude/README.md) y sus documentos enlazados.

## Reglas esenciales

- El código vigente es la fuente de verdad. Si difiere de la documentación, verifica componentes, rutas, tipos y cliente API; corrige la documentación si corresponde.
- Mantén la interfaz y los mensajes en español rioplatense, coherentes con la aplicación existente.
- Los permisos del cliente solo ocultan/condicionan controles. Nunca los trates como autorización suficiente: el backend debe validar cada operación.
- No cambies nombres de campos, rutas, roles, permisos, estados, literales de API ni claves persistidas sin evaluar compatibilidad con el backend y los datos guardados.
- Mantén tipos estrictos, reutiliza RTK Query y los componentes/hooks compartidos, e invalida las etiquetas de caché afectadas tras una mutación.
- No inventes capacidades del backend. Distingue claramente los datos que la UI calcula como vista previa de los resultados autoritativos del servidor.
- Evita exponer tokens, secretos, datos personales o costos a usuarios no autorizados. No leas ni copies valores de archivos `.env`.
- Para cambios en flujos de ventas, inventario, pagos o envíos, revisa las reglas y limitaciones documentadas antes de editar.
- Después de cambios relevantes, ejecuta `npm test`, `npm run typecheck` y `npm run build` cuando el entorno lo permita. La cobertura de tests es parcial y no sustituye pruebas de integración/autorización del backend.
- Mantén actualizados `.claude/glossary.md` y `.claude/specs/` al modificar funcionalidades o contratos.

## Documentación del proyecto

- [.claude/specs/ai-guidelines.md](.claude/specs/ai-guidelines.md): flujo de trabajo y reglas para cambios.
- [.claude/specs/functional.md](.claude/specs/functional.md): mapa funcional completo del panel.
- [.claude/glossary.md](.claude/glossary.md): vocabulario contractual y literales reservados.
- [.claude/specs/architecture.md](.claude/specs/architecture.md): stack, estado, API, autenticación y estructura.
- [.claude/specs/operations-and-gaps.md](.claude/specs/operations-and-gaps.md): comandos, configuración y brechas conocidas.