# Contexto de Canela en Rama Admin

Documentación de referencia para personas y asistentes que trabajen sobre el dashboard administrativo. Resume lo observado en el frontend y sus contratos de consumo; no garantiza el comportamiento o la configuración de los servicios desplegados.

## Documentos

- [Glosario y palabras reservadas](glossary.md): términos de dominio y literales contractuales del frontend/API.
- [Especificación funcional](specs/functional.md): rutas, pantallas, capacidades, flujos y cobertura de API.
- [Arquitectura y contratos](specs/architecture.md): capas, autenticación, estado, caché y configuración.
- [Guía de trabajo para IA](specs/ai-guidelines.md): prácticas y límites para hacer cambios compatibles.
- [Operación y brechas](specs/operations-and-gaps.md): comandos disponibles, configuración observada y aspectos incompletos.
- [Contrato HTTP](../api-contract/README.md): alcance y ciclo de mantenimiento del inventario OpenAPI de rutas consumidas.
- [Instrucciones automáticas](../CLAUDE.md): reglas breves para agentes que cargan automáticamente `CLAUDE.md`.

## Alcance y autoridad

Este es un panel de personal. No implementa la tienda pública, el backend ni sus procesos internos. Las funcionalidades documentadas son las que la UI/rutas/hooks/types del repositorio exponen o sugieren; los endpoints y las reglas de autorización finales pertenecen al backend.

La documentación se compiló por inspección estática. Ante diferencias, prevalece el código vigente del frontend para describir la interfaz, y el backend vigente para describir autorización, persistencia y reglas de negocio. El archivo `CanelaEnRama.postman_collection.json` aporta contratos de referencia, pero puede quedar desactualizado. No inferir disponibilidad real de una integración solo porque exista un botón o un campo.

## Qué significa «palabras reservadas» aquí

El glosario recopila vocabulario propio de Canela en Rama y valores exactos que cruzan el límite del cliente (roles, permisos, estados, tipos, rutas, claves de almacenamiento y variables de configuración). No intenta listar palabras reservadas de JavaScript, TypeScript, React, SQL ni otros lenguajes.

Actualizar estos documentos cuando se alteren rutas, nombres de campos, permisos, literales, reglas visibles o integraciones.