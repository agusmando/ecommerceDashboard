# Contrato HTTP consumido por el dashboard

`openapi.json` es un inventario versionado de la superficie HTTP que usa el frontend. Se mantiene en este repositorio para hacer visibles cambios de rutas y tener una base de coordinación con el backend.

## Alcance y autoridad

- No es todavía un schema completo de payloads/respuestas y no debe usarse para generar SDKs, validar requests del servidor, configurar gateways ni asumir autorización.
- Las extensiones `x-dashboard-permission` reflejan un permiso que la interfaz usa para mostrar una ruta/acción; no son la matriz de autorización real. El backend debe validar los permisos por endpoint.
- Las rutas genéricas describen el patrón usado por `baseApi.ts`; para el detalle contractual se debe confirmar el path, método y body en el backend vigente.
- La fuente de verdad de implementación y seguridad es el backend desplegado/versionado, no esta vista del cliente ni la colección Postman.

## Cambios de contrato

1. Al sumar/quitar/modificar una llamada frontend, actualizar `openapi.json` en el mismo cambio y agregar/ajustar la comprobación correspondiente.
2. Confirmar con backend el método, path, body, respuesta, errores, autenticación, permisos e idempotencia antes de declarar un contrato como autoritativo.
3. Incrementar `info.version` cuando haya cambios publicados en el inventario; mantener un changelog/versionado en Git.
4. Ejecutar `npm run check:api-contract`, `npm test`, `npm run typecheck` y `npm run build`.

El chequeo local actualmente valida JSON, versión, responses, unicidad de `operationId` y parámetros de path. No sustituye a un validador completo de OpenAPI 3.1.