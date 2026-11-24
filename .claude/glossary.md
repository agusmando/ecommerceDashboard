# Glosario y vocabulario contractual

Los términos y literales de abajo describen el vocabulario usado por el panel y sus contratos con el backend. Los identificadores entre mayúsculas y las claves de API/almacenamiento deben conservarse exactamente, salvo cambio coordinado y compatible.

## Conceptos de negocio

| Término | Significado en el panel |
|---|---|
| Producto (`Product`) | Entidad del catálogo que agrupa categoría, marca, etiquetas y variantes. |
| Variante (`ProductVariant`) | Presentación vendible y unidad de inventario; concentra costo, precio de venta calculado, stock, presentación, disponibilidad e imágenes. |
| Mix | Variante producida a partir de otras variantes mediante una receta; el backend controla consumo y producción de stock. |
| Receta / componente (`Dependency`) | Relación de una variante mix con las variantes y cantidades que la componen. |
| Medida (`Measure`) | Unidad física del producto o variante. Para `KG`, el stock/cantidad se maneja en gramos y el precio se expresa por kilo. |
| Presentación / venta suelta | `packagingOptions` define tamaños de paquete. `selectedBulkOption = 0` representa venta suelta; un valor positivo selecciona un tamaño de paquete. |
| Productor local | Marca visual/atributo local del producto (`isLocal`) que puede heredarse o ser sobrescrito por variante. No equivale a proveedor. |
| Stock actual (`currentStock`) | Existencia en variante. No modificarlo como simple campo si existe flujo de movimiento/ajuste del servidor. |
| Umbral de stock (`stockThreshold`) | Límite usado en indicadores de stock bajo y/o reglas de oferta; el alcance concreto depende del backend. |
| Movimiento | Registro de ingreso, egreso, ajuste, devolución o producción. La UI admite carga manual de los cuatro primeros, no `PRODUCTION`. |
| Costo (`price`) | Costo base de variante en el contrato; es privado de staff. No confundir con el precio de venta. |
| Margen (`profitMargin`) | Fracción aplicada al costo para derivar precio final; por ejemplo `0.5` significa 50 %. |
| Precio final (`finalPrice`) | Precio de venta calculado por el backend. La cifra vista en formularios/preview no sustituye el valor autoritativo de la API. |
| Oferta | Descuento temporal asociado a producto o variante. La presentación calcula etiquetas/estados para ayudar al usuario; la aplicación efectiva es del backend. |
| Orden / pedido (`Order`) | Venta del cliente. El estado operativo es independiente de pago, envío y estado de cada ítem. |
| Ítem de orden (`OrderItem`) | Línea de venta que conserva snapshots de producto, variante, precio y descuento; puede esperar stock, devolverse o cancelarse. |
| Snapshot | Copia histórica de datos de catálogo/oferta al momento de venta; no debe recalcularse desde los datos actuales. |
| Carrito | Carrito abierto de usuario o invitado. La pantalla de administración es de consulta, no de edición/recuperación. |
| Reposición | Vista de ítems de órdenes en espera de stock; no es una orden de compra a proveedor. |
| Envío (`Shipment`) | Entrega a domicilio o retiro, con estado, dirección/metadatos y eventos de seguimiento. |
| Zona de envío | Tarifa y ETA por departamento configuradas desde el panel. |
| Tracking | Seguimiento del envío con `trackingCode`; el panel también muestra/carga datos de transportista. |
| Reseña de producto | Opinión vinculada a producto/variante que se modera antes de considerarse aprobada. |
| Reseña de Google | Contenido importado desde Google y gestionado aparte de reseñas de productos. |
| Banner / placement | Pieza de contenido asignada a una ubicación de la tienda; el panel administra contenido, vigencia y orden. |
| Staff | Usuario con permiso efectivo para acceder al dashboard. Roles y permisos efectivos provienen del backend. |
| Carga masiva | Envío de una lista de movimientos en una operación; la UI describe el resultado como todo o nada. Confirmar atomicidad en el backend. |

## Literales exactos del dominio

Valores declarados en `src/app/api/types.ts`; el backend sigue siendo la autoridad de validación.

| Grupo | Valores exactos |
|---|---|
| `Measure` | `KG`, `U`, `L`, `ML`, `G` |
| `UserRole` (tipo de usuario) | `ADMIN`, `EDITOR`, `EMPLOYEE`, `CONSUMER` |
| Rol efectivo de staff | `ADMIN`, `EDITOR`, `EMPLOYEE`; `CUSTOMER` se usa como etiqueta/filtro de UI para cliente sin rol de staff. |
| `Permission` | `dashboard.access`, `orders.manage`, `stock.manage`, `catalog.edit`, `masters.edit`, `offers.edit`, `content.edit`, `catalog.delete`, `shipping.config`, `users.manage` |
| `DiscountType` | `PERCENTAGE`, `FIXED`, `BUY_ONE_GET_MORE`, `BUY_MORE_GET_MORE`, `BUY_MORE_GET_DISCOUNT`, `BUY_MORE_GET_FIXED_DISCOUNT` |
| `MovementType` | `IN`, `OUT`, `ADJUSTMENT`, `RETURN`, `PRODUCTION` |
| Tipos de pago | `CASH`, `TRANSFER`, `MERCADOPAGO` |
| `PaymentStatus` | `PENDING`, `IN_PROCESS`, `APPROVED`, `REJECTED`, `CANCELLED`, `REFUNDED`, `CHARGED_BACK` |
| `OrderStatus` | `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED` |
| `OrderItemStatus` | `FULFILLED`, `AWAITING_STOCK`, `PARTIALLY_RETURNED`, `CANCELLED`, `RETURNED` |
| `ShipmentMethod` / `ShippingMethod` | `DELIVERY`, `PICKUP` |
| `ShipmentStatus` | `PENDING`, `PREPARING`, `READY_FOR_PICKUP`, `SHIPPED`, `OUT_FOR_DELIVERY`, `FAILED_ATTEMPT`, `DELIVERED`, `RETURNED`, `CANCELLED` |
| `UberDeliveryStatus` | `pending`, `pickup`, `pickup_complete`, `dropoff`, `delivered`, `canceled`, `returned` |
| Proveedor de envío | `own`, `uber` |
| `ReviewStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `BannerPlacement` | `HOME_HERO`, `HOME_RECOMMENDATION`, `CATALOG_STRIP`, `ANNOUNCEMENT_BAR` |
| `BannerSize` | `SQUARE`, `WIDE` |
| Ubicaciones/filtros usuarios | `ALL`, `STAFF`, `ADMIN`, `EDITOR`, `EMPLOYEE`, `CUSTOMER` |
| Ordenamiento de reseñas | `recent`, `rating_desc`, `rating_asc` |

Las transiciones locales de orden definidas en `ORDER_TRANSITIONS` son `PENDING → PROCESSING/CANCELLED`, `PROCESSING → PENDING/SHIPPED/DELIVERED/CANCELLED`, `SHIPPED → DELIVERED/CANCELLED`; `DELIVERED` y `CANCELLED` son terminales en ese espejo. La UI obtiene las transiciones de envío desde `/shipment/meta` y usa `SHIPMENT_TRANSITIONS` solo como fallback, por modalidad.

## Campos y claves contractuales relevantes

| Nombre exacto | Semántica/precaución |
|---|---|
| `price` | Costo de variante, no el precio público de venta. |
| `profitMargin`, `roundingOption`, `finalPrice`, `offerPrice` | Datos de costo/margen/precio calculado; preservar qué valores son del servidor y cuáles son vista previa. |
| `currentStock`, `stockIncrement` | Stock absoluto versus delta de stock; no son intercambiables. |
| `contentMeasure`, `contentAmount`, `packagingOptions`, `selectedBulkOption` | Unidad, contenido y presentación seleccionada. |
| `availableWeb`, `availablePedidosYa` | Indicadores del catálogo; el segundo no acredita integración real con PedidosYa. |
| `isLocal`, `local` | Marca local establecida o resuelta; no renombrar sin verificar contrato. |
| `productNameSnapshot`, `variantNameSnapshot`, `unitPriceSnapshot`, `discountAppliedSnapshot`, `offerTypeSnapshot` | Snapshot histórico del ítem de orden. |
| `paymentStatus`, `status`, `Shipment.status`, `OrderItem.status` | Estados de dominios distintos. No mezclar sus tipos/transiciones. |
| `trackingCode`, `carrierTrackingCode`, `carrierTrackingUrl` | Código de tracking del sistema, código externo y URL externa respectivamente. |
| `provider`, `providerDeliveryId`, `providerStatus` | Datos opcionales del proveedor de envío (incluido Uber Direct según configuración). |
| `desktopImage`, `mobileImage`, `removeDesktopImage`, `removeMobileImage` | Campos multipart para banner. Producto/variante usan `image` y `removeImages[índice][id]`. |
| `response`, `statusCode`, `message` | Envoltorio HTTP del backend; el cliente normalmente desenvuelve `response`. |
| `currentPage`, `amountPerPage`, `paginate`, `detalle` | Parámetros de lista que el dashboard usa en endpoints REST. |
| `ids`, `productsId`, `brandsId`, `tagsId` | Forma de carga para reordenar/asociar entidades; revisar implementación antes de cambiar. |

## Rutas, claves de navegador y configuración

- Prefijo base de API: `/api`. Recursos principales: `category`, `tag`, `brand`, `supplier`, `product`, `product/variant`, `offer`, `movement`, `order`, `order/item`, `cart`, `shipment`, `review`, `banner`.
- Rutas UI contractuales: `/login`, `/auth/callback/google`, `/dashboard` y sus hijos indicados en `specs/functional.md`.
- Claves del navegador: `cer_access_token`, `cer_refresh_token` (localStorage); `cer_admin_google_oauth` (sessionStorage). Filtros en sessionStorage y preferencias de UI en localStorage mediante slices; no renombrar sin migración/compatibilidad.
- Headers de login SuperTokens: `st-auth-mode: header`; selección de receta con `rid: emailpassword` o `rid: thirdparty`; Google usa `thirdPartyId: google`.
- Variables de entorno del frontend: `VITE_API_URL`, `VITE_API_PROXY_TARGET`, `VITE_API_TIMEOUT`, `VITE_SHOP_URL`. Registrar solo nombres, nunca secretos/valores reales.
- Formato de fecha de filtro: `YYYY-MM-DD`; fechas de contratos son strings ISO (`ISODate`).

## Precauciones de vocabulario

1. No traducir valores enviados a la API; traducir únicamente sus etiquetas visibles.
2. No afirmar que los tipos TS constituyen validación en runtime: el cliente castea respuestas del backend.
3. La UI no es fuente de verdad para precios, stock, pagos, roles ni transiciones. Confirmar cada regla en servidor.
4. No asumir que una bandera `active` equivale a vigente: ofertas y banners también pueden depender de fechas.