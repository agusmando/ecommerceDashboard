# Operación y brechas conocidas

## Puesta en marcha y comandos

- `npm i`: instala dependencias.
- `npm run dev`: inicia Vite en desarrollo.
- `npm run typecheck`: ejecuta `tsc -p .`.
- `npm run build`: crea la build de producción con Vite.
- `npm test`: ejecuta pruebas unitarias con Vitest.
- `npm run check:api-contract`: comprueba estructura, versión, responses y unicidad de `operationId` en el inventario OpenAPI.
- `npm run audit:prod`: falla si npm reporta vulnerabilidades altas o críticas en dependencias de producción.
- `.env.example` lista `VITE_API_URL`, `VITE_API_PROXY_TARGET`, `VITE_API_TIMEOUT` y `VITE_SHOP_URL`. No copiar valores sensibles a documentación.
- En desarrollo, si `VITE_API_URL` está vacía, el proxy de Vite puede redirigir `/api` al objetivo local. Producción necesita URL API correcta o reverse proxy equivalente.

## Verificaciones disponibles

`package.json` declara scripts de desarrollo/build/typecheck/test, chequeo del contrato y auditoría de dependencias runtime. No hay script de lint. Las pruebas actuales cubren validación estructural de respuestas genéricas y usuario de sesión, renovación de tokens, retorno OAuth seguro, parámetros HTTP, normalización de paginación, permisos, filtros persistidos y agregados estadísticos. La colección `CanelaEnRama.postman_collection.json` sigue siendo material de referencia, no una suite automatizada de frontend.

## Límites / asuntos a confirmar

1. **Autorización real:** los permisos de rutas/controles son del cliente; inspeccionar backend para confirmar cualquier operación. Cobertura explícita de route-level `perm` es parcial; varias páginas dependen de permisos a nivel de controles/API.
2. **Validación runtime parcial:** Zod verifica campos estructurales esenciales en los endpoints CRUD genéricos. Endpoints especializados y validaciones de negocio no quedan cubiertos automáticamente; `types.ts` por sí solo no valida datos.
3. **Analítica limitada:** `useOrderStats.ts` consulta como máximo diez páginas de 100 órdenes y expone `truncated` cuando hay más. Errores de cada página se combinan, reintentar solicita las páginas consultadas y la UI advierte de resultados potencialmente parciales. El límite local sigue siendo 1.000 órdenes hasta mover la agregación al backend.
4. **Conteos de stock localizados:** Dashboard toma un máximo de 100 variantes; el filtro de inventario de stock bajo y tiles cuentan la página actual, no el total global.
5. **Carritos:** sólo lectura; búsqueda, orden y totales están basados en la página cargada. No hay edición, conversión manual ni recuperación del carrito.
6. **Reposición:** presenta ítems pendientes y enlace al inventario, pero no crea orden de compra, no selecciona proveedor y no confirma recepción.
7. **Pagos:** hay sincronización de Mercado Pago, pero no interfaz de reembolso. Pagos offline pueden requerir operación manual.
8. **Proveedor Uber:** el dashboard llama a endpoints para despacho/sincronización/cancelación cuando se expone disponibilidad; la integración depende del backend y configuración. No asumir que siempre está habilitada.
9. **Timeout:** el cliente usa 15 s por defecto, alineado con README y `.env.example`; se puede cambiar mediante `VITE_API_TIMEOUT`.
10. **Interfaz vs API externa:** `api-contract/openapi.json` inventaría la superficie que consume el frontend, pero no garantiza que el servidor desplegado soporte todos los endpoints de users, shipping zones o Uber. Schemas y permisos deben confirmarse contra el backend antes de generar clientes o configurar gateways.
11. **Reglas locales de estado:** la tabla de transición de orden es un espejo local; envío se pide al backend con fallback. La respuesta del servidor debe ser autoridad.
12. **No se inspecciona producción:** no se auditó configuración desplegada, credenciales ni datos de tienda/backend. Estas notas describen archivos versionados.

## Pendientes externos al repositorio

- Completar pruebas con backend real para renovación de sesión entre pestañas, errores/401 reales e invalidación de caché.
- Confirmar los contratos multipart y los envelopes reales de cada endpoint especializado contra el backend vigente.
- Confirmar servidor-side los permisos efectivos y las operaciones autorizadas; `x-dashboard-permission` solo describe gates visibles del frontend.
- Mover agregaciones a un endpoint backend o ampliar paginación sin límite si las 1.000 órdenes no alcanzan la necesidad operativa.
- Revisar la superficie OpenAPI con responsables del backend y versionar conjuntamente cambios de paths, payloads y permisos.
- Documentar Uber Direct y zonas por deployment con evidencia del backend.