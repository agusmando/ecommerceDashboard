# Especificación funcional del panel administrativo

## 1. Propósito y límites

Aplicación web interna de administración para Canela en Rama, construida con React + Vite. Permite al personal consultar ventas, catálogo, inventario, contenido, usuarios e informes, y ejecutar mutaciones autorizadas contra una API backend separada. No es el storefront ni implementa checkout público.

La especificación describe capacidades de interfaz confirmadas en rutas, páginas, hooks, tipos y endpoints usados. La autorización, integridad de datos y reglas finales deben verificarse en el backend; no se infieren de la interfaz.

## 2. Mapa de páginas

| Ruta | Página | Funcionalidad |
|---|---|---|
| `/` | Redirección | Redirige a `/dashboard`. |
| `/login` | Login | Inicio por email/contraseña o Google; recupera ruta previa tras login. El vínculo de recuperación de contraseña va a la tienda. Rechaza cuentas sin permiso `dashboard.access`. |
| `/auth/callback/google` | Callback Google | Valida callback OAuth/estado guardado y termina login antes de volver a una ruta interna segura. |
| `/dashboard` | Inicio | Resumen de ventas de 14 días, órdenes pendientes/en preparación, ítems esperando stock, ofertas activas, variantes de stock bajo, órdenes recientes y accesos rápidos con filtros. |
| `/dashboard/orders` | Órdenes | Lista paginada y filtros por estado de orden/pago/envío, fecha y cliente; navegación por número y creación de venta manual. Permiso de ruta: `orders.manage`. |
| `/dashboard/orders/:id` | Detalle de orden | Líneas, totales, estado operativo/pago, envío, cambio de estado, sincronización del pago Mercado Pago, cancelación/devolución de ítems y gestión de espera de stock. `orders.manage`. |
| `/dashboard/shipments` | Envíos | Lista y filtros por estado, modalidad, orden, transportista y tracking; edición y acceso a orden/detalle. `orders.manage`. |
| `/dashboard/shipments/:id` | Detalle de envío | Datos de destinatario/dirección, costo/ETA, tracking y eventos; edición de datos/estado y panel del proveedor/courier cuando esté disponible. `orders.manage`. |
| `/dashboard/shipping-zones` | Tarifas de envío | Tarifas por departamento, activar/desactivar, orden y tiempo estimado; muestra disponibilidad de proveedor Uber y configuración de retiro. `shipping.config`. |
| `/dashboard/restock` | Reposición | Resumen de ítems de orden `AWAITING_STOCK`, agrupación de página por variante y enlace al inventario con búsqueda precargada. No genera pedidos de compra. `orders.manage`. |
| `/dashboard/carts` | Carritos | Vista de solo lectura de carritos guest/usuario, líneas, cotización estimada, descuentos y suficiencia de stock. `orders.manage`. |
| `/dashboard/products` | Productos | Vista tabla/grilla; búsqueda/filtros de categoría, marca, etiqueta, variante, productor local y activo; alta y activación/baja según permiso de acción. |
| `/dashboard/products/:id` | Detalle de producto | Datos, etiquetas, ofertas, variantes y reseñas; accesos a edición de precio/stock/disponibilidad/receta/imágenes y movimientos. |
| `/dashboard/inventory` | Inventario | Consulta de variantes y métricas de stock/costo/precio/umbral/disponibilidad; ajustar stock absoluto o delta y editar disponibilidad. Filtro stock bajo es local a la página recibida. |
| `/dashboard/movements` | Movimientos | Historial filtrable por fecha, tipo y variante; totales de página y alta individual o masiva de movimientos. |
| `/dashboard/offers` | Ofertas | CRUD de ofertas a producto/variante, vigencia, umbral y tipo de descuento; filtros por ámbito/fechas/activo y controles de activación. `offers.edit`. |
| `/dashboard/reviews` | Reseñas | Moderación de reseñas de productos (aprobar/rechazar, motivo/respuesta, borrar) y panel separado de reseñas Google (sincronizar, activar/destacar). `content.edit`. |
| `/dashboard/banners` | Banners | CRUD, preview, fechas, imágenes desktop/móvil, activación, orden dentro del placement y eliminación permanente. `content.edit`. |
| `/dashboard/categories` | Categorías | CRUD/activación de maestro; consulta de productos relacionados. `masters.edit`. |
| `/dashboard/brands` | Marcas | CRUD/activación, ver productos/proveedores y administrar relaciones permitidas. `masters.edit`; asociación de productos puede exigir control más específico. |
| `/dashboard/suppliers` | Proveedores | CRUD/activación y asociación de marcas. `masters.edit`. |
| `/dashboard/tags` | Etiquetas | CRUD/activación de maestro y consulta de productos relacionados. `masters.edit`. |
| `/dashboard/statistics` | Estadísticas | Resúmenes para 7/30/90 días, ventas, estados/pagos, productos principales y análisis de retiro/entrega, envío y zonas/proveedores. |
| `/dashboard/users` | Usuarios | Lista, filtros y contadores por rol; detalle de cuenta/métodos de acceso/última orden; invitar personal, asignar/quitar rol y revocar sesiones. `users.manage`. |
| `/dashboard/administration` | Administración | Health/latencia de API, sesión actual, tema, vaciar caché de API, borrar filtros guardados y cerrar sesión. |
| Ruta inexistente en dashboard | No encontrado | Muestra página 404 dentro del layout. Otras rutas desconocidas redirigen a dashboard. |

El layout común protege `/dashboard/*` exigiendo sesión, aplica permiso de ruta cuando lo define `handle.perm`, conserva sidebar/header y cierra menú móvil al navegar o pulsar Escape. El sidebar agrupa navegación por ventas, catálogo, contenido, maestros y análisis y muestra badges/polling de pendientes.

## 3. Flujos funcionales

### Sesión y permisos

1. En el arranque se intenta restaurar sesión consultando `/user/me` si hay token guardado.
2. Email/password usa SuperTokens `emailpassword`; Google usa flujo OAuth ThirdParty con `state`, PKCE y URI `/auth/callback/google`.
3. Los tokens se reciben en headers, se guardan bajo claves `cer_*`, y el cliente restaura/verifica usuario y permisos. Sin `dashboard.access`, cierra la sesión.
4. La sesión puede renovar token proactivamente o al recibir 401; reintenta una petición una vez y sincroniza renovaciones cuando el navegador ofrece Web Locks.
5. El frontend aplica RBAC para navegación/controles, pero todas las operaciones deben tener autorización servidor-side.

### Catálogo, variantes y maestros

- Productos tienen categoría, marca, medida, productor local, etiquetas y una o varias variantes. Formularios soportan crear/editar producto y variantes, carga de imágenes y configuración de componentes de mix.
- Variantes gestionan costo, margen/redondeo, cantidad de stock, umbral, tiempo de solicitud, presentaciones, disponibilidad web/localidad, receta y fotos.
- Asociaciones producto-etiqueta, marca-productos y proveedor-marcas usan endpoints de relación específicos. Categorías/marcas/proveedores/etiquetas comparten patrones de maestro reutilizable.
- La baja suele ser activar/desactivar; no asumir borrado físico. La UI ofrece controles condicionados por permisos y el backend debe validar.

### Inventario, movimientos y mix

- Ajuste de variante distingue stock absoluto (`currentStock`) y delta (`stockIncrement`). La mutación de stock invalida caché de variantes/productos/movimientos.
- Movimiento individual acepta `IN`, `OUT`, `ADJUSTMENT`, `RETURN`; movimiento `PRODUCTION` es interno a mixes. Carga masiva usa `/movement/bulk`.
- Para `KG`, el dominio usa gramos para stock/cantidad y precio por kilo.
- Un mix se representa por dependencias/receta; la pantalla permite editar componentes. La producción y las reglas de consumo pertenecen al backend.

### Ofertas y precio

- Tipos de descuento del frontend: porcentaje, importe fijo y promociones por cantidad (comprar X obtener más/descuento).
- Alta/edición contempla objetivo producto o variante, período, cantidades/valor y umbral.
- Las etiquetas de vigencia/preview son ayuda visual. Precio y elegibilidad final los determina la API; no codificar una regla duplicada como autoridad.

### Órdenes y reposición

- Listado ofrece paginación y filtros, además de alta de venta manual con variante, cantidad/presentación y método de pago.
- Detalle combina estado de orden, estado del pago, ítems y envío, conservando su independencia. Admite edición de líneas autorizada: asignar/editar cantidad, marcar espera de stock, cumplir, cancelar o devolver parcial/total.
- El hook de cambio de estado usa tabla local de transiciones de orden y petición backend; validar divergencias con el servidor antes de alterar transiciones.
- Reposición agrupa líneas `AWAITING_STOCK` y enlaza inventario. No hay flujo de compra a proveedor ni recepción de orden de compra aquí.

### Pagos

- La página de orden permite solicitar al backend sincronización de Mercado Pago.
- No hay UI de reembolso: casos de pago tardío, rechazado o discrepancia deben tratarse según procedimientos del backend/operación.
- No afirmar que el panel aprueba pagos offline automáticamente. Los estados de pago son independientes del estado de orden.

### Envíos, tarifas y couriers

- Envío maneja `DELIVERY`/`PICKUP`, tracking interno, eventos, dirección, carrier/manual, costo y fecha estimada.
- El cliente consulta `/shipment/meta` para modalidades, estados y transiciones; el mapa local es fallback.
- Configuración de zonas consulta/edita tarifas por departamento. La configuración pública indica proveedores disponibles y ubicación de retiro.
- Si backend informa integración disponible, el panel puede solicitar despacho Uber Direct, sincronizarlo o cancelarlo; de lo contrario la gestión es manual. No asumir que toda instalación tiene credenciales ni que la integración siempre está activa.

### Reseñas y banners

- Reseñas de producto: listado/estadísticas/resumen, moderación `APPROVED`/`REJECTED`, respuesta, motivo de rechazo y borrado. Solo el backend puede verificar compra y aplicar visibilidad pública.
- Google: consulta lista staff, sincronización remota y cambio de `active`/`featured`.
- Banners: placement, tamaño, textos, CTA/enlace, colores, imágenes, programación y posición. Los archivos se envían como multipart; eliminación borra banner según endpoint.

### Usuarios, carrito e informes

- Usuarios/roles: consultar catálogo de roles, invitar, asignar rol staff o eliminar asignación (cliente), revocar sesiones. La API puede devolver enlace de invitación; tratarlo como información sensible y no registrarlo en logs.
- Carritos: sólo lectura; filtros/agrupación/sumas operan sobre la página cargada según la implementación observada.
- Inicio y estadísticas consumen órdenes, ítems, variantes, ofertas y envíos. Las estadísticas consultan hasta tres páginas de 100 órdenes. La UI expone truncamiento y páginas fallidas; el gráfico informa error y los textos de contexto advierten si algunos valores son parciales.

## 4. Familias de endpoints consumidas

Prefijo común `/api`. Los endpoints genéricos se exponen mediante `resourceHooks()`/RTK Query; para formas de body, filtros y permisos finales confirmar backend y Postman.

| Recurso/endpoint | Uso en el frontend |
|---|---|
| `/auth/signin`, `/auth/signout`, `/auth/session/refresh`, `/auth/authorisationurl`, `/auth/signinup` | Sesión, renovación y Google OAuth. |
| `/user/me`, `/user`, `/user/roles`, `/user/:supertokensId/detail`, `/user/:supertokensId/role`, `/user/:supertokensId/revoke-sessions`, `/user/invite` | Identidad, gestión de usuarios y roles. |
| `/health` | Estado y latencia de API. |
| `/category`, `/tag`, `/brand`, `/supplier` + `/:id`, `/:id/active` | Listado/CRUD/activación de maestros. Relaciones: `/brand/:id/products`, `/supplier/:id/brands`. |
| `/product`, `/product/:id`, `/product/:id/tags`, `/product/:id/active` | Catálogo, relaciones y activación; creación puede usar multipart. |
| `/product/variant`, `/product/variant/:id`, `/product/variant/:id/active`, `/product/variant/:id/stock` | Variantes, activación y ajuste de stock. |
| `/offer`, `/offer/:id`, `/offer/:id/active` | CRUD, consulta y activación de ofertas. |
| `/movement`, `/movement/:id`, `/movement/bulk` | Consulta, alta simple y carga masiva de movimientos. |
| `/order`, `/order/:id`, `/order/item` | Listar/crear/actualizar órdenes, detalle y líneas de orden. |
| `/cart` | Lista interna de carritos. |
| `/shipment`, `/shipment/:id`, `/shipment/:id/events`, `/shipment/order/:orderId`, `/shipment/meta` | Lista/edición/alta, eventos, orden asociada y transiciones. |
| `/shipping/config`, `/shipping/zones`, `/shipping/zones/:id` | Configuración y mantenimiento de zonas. |
| `/shipping/shipment/:id/dispatch`, `/sync`, `/cancel` | Operaciones de Uber Direct según disponibilidad configurada. |
| `/review`, `/review/stats`, `/review/summary`, `/review/:id/moderate`, `/review/:id` | Reseñas, estadísticas, resumen, moderación y eliminación. |
| `/google-review/all`, `/google-review/sync`, `/google-review/:id` | Gestión/sincronización de Google Reviews. |
| `/banner`, `/banner/:id`, `/banner/placements`, `/banner/reorder`, `/banner/:id/active` | CRUD, ubicaciones, activación y orden. |
| `/payment/order/:id/sync` | Resincronizar pago de la orden con proveedor. |

## 5. Estados de interfaz compartidos

Listados usan filtros con reinicio de paginación al cambiar criterios, debounce de texto si se configura, estados loading/error/empty y paginación de servidor. Acciones asíncronas comparten confirmación, toasts y estado busy; formularios emplean modales/sheets y controles de catálogo reutilizables. La UI soporta tema claro/oscuro y navegación responsive.