# Arquitectura y contratos técnicos del frontend

## Stack y arranque

- React 18, TypeScript 5.7+, Vite 6, módulos ES.
- React Router 7 con router browser y lazy loading por página bajo dashboard.
- Redux Toolkit + RTK Query para estado global/cache; Axios para transporte HTTP.
- Tailwind CSS 4, estilos/tokens en `src/styles/`; componentes React propios y Radix/MUI según necesidad.
- Recharts para gráficos, Lucide para iconografía, React Hook Form disponible, Sonner para notificaciones.
- Entrada `src/main.tsx`; montaje de providers/bootstrap en `src/app/App.tsx`; rutas en `src/app/routes.ts`.

## Capas principales

1. `src/app/pages/`: páginas por ruta, coordinación de consultas/formularios.
2. `src/app/components/`: UI reutilizable; subcarpetas `products`, `orders`, `shipments`, `banners`, `offers`, `masters`, etc. contienen formularios y operaciones de dominio.
3. `src/app/api/client.ts`: Axios, headers/token, renovación, formato/errores y `baseQuery`.
4. `src/app/api/baseApi.ts`: una instancia RTK Query, endpoints genéricos CRUD/relación, tags e invalidaciones.
5. `src/app/api/resources.ts`: hooks tipados por recursos y queries/mutaciones específicas.
6. `src/app/api/contracts.ts`: validación Zod de campos estructurales esenciales en respuestas CRUD genéricas y de endpoints especializados conocidos (envíos, configuración, reseñas, Google y banners); no sustituye validación de negocio ni cubre automáticamente endpoints nuevos.
7. `src/app/api/types.ts`: contratos TypeScript del frontend. Los tipos no validan por sí solos en runtime.
8. `src/app/store/`: store Redux y slices de auth/UI/filtros.
9. `src/app/hooks/`: reutilización de acciones, permisos, filtros, toggles y estadísticas.
10. `src/app/lib/`: permisos, formatos y reglas auxiliares del dominio; evitar duplicar reglas autoritativas del backend.

## API y caché

- `API_BASE_URL` es `${VITE_API_URL}/api`; si `VITE_API_URL` vacío, origen actual más `/api`. Vite proxy `/api` en desarrollo según `VITE_API_PROXY_TARGET`.
- Respuesta normal del backend `{ statusCode, message, response }`; `client.ts` retorna normalmente el valor interno `response`. Algunos endpoints pueden devolver datos crudos, por lo que verificar respuesta real antes de cambiar unwrap.
- Parámetros vacíos (`undefined`, `null`, `''`, arrays vacíos) se eliminan. Arrays se serializan como `tags=a&tags=b` (sin `[]`).
- Paginación común: `currentPage`, `amountPerPage`, `paginate`; `baseApi.ts` normaliza array o `{ content, pagination }` y limita el tamaño genérico a 100.
- `resourceHooks()` genera list/page/detail/create/update/active sobre recursos REST. Asociaciones N:M usan `PUT` para asociar y `DELETE` para desasociar, enviando arrays de objetos `{ id }` con claves específicas.
- RTK Query comparte resultados y evita repetir lecturas de maestros. Al mutar, actualizar `AFFECTS` o `invalidatesTags` de endpoints especiales si cambian consumidores relacionados.
- Endpoints especiales incluyen ajustes de stock, bulk movements, pagos, envíos/courier, usuarios, reviews, Google reviews y banners.
- `api-contract/openapi.json` inventaría la superficie de rutas consumida por la UI. `npm run check:api-contract` verifica formato JSON y consistencia estructural básica; no prueba que el backend implemente rutas ni valida todo el schema OpenAPI.

## Autenticación y permisos

- SuperTokens funciona en modo header: cliente añade `st-auth-mode: header`; access token se envía `Authorization: Bearer …`; refresh token se usa en `/auth/session/refresh`.
- Tokens guardados en `localStorage` como `cer_access_token` / `cer_refresh_token`; se capturan de response headers `st-access-token`, `st-refresh-token`.
- Renovación proactiva ante TTL menor a 60s y reintento único después de 401. Se coordina dentro de pestaña y usa Web Locks si hay soporte; la sesión se notifica al store cuando expira.
- Login email/password usa `rid: emailpassword`; Google usa `rid: thirdparty`, state/PKCE temporal en sessionStorage. Se valida ruta de retorno para impedir redirección externa.
- La aplicación llama `/user/me` para verificar la sesión y exige `dashboard.access`. Los permisos efectivos en el usuario provienen del backend; el fallback `ADMIN`/`EMPLOYEE` es compatibilidad con un backend antiguo.
- `DashboardLayout` aplica permiso de `handle.perm` a rutas que lo definen; componentes también pueden condicionar controles. Esta lógica es UX, no seguridad. Backend debe autorizar cada API.

## Estado global y persistencia

- `auth`: usuario, estado `checking | authenticated | anonymous`, aviso de expiración.
- `ui`: tema claro/oscuro y sidebar colapsado, persistidos en localStorage.
- `filters`: filtros y paginación por listado, persistidos en sessionStorage para volver del detalle.
- RTK Query maneja datos servidor/API. Signout y expiración limpian sesión y resetéan caché.
- `App.tsx` aplica clase de tema a `<html>`, restaura sesión inicial y monta router, toaster y providers de confirmación/tooltip.

## Configuración y límites

Variables del cliente documentadas en `.env.example`: `VITE_API_URL`, `VITE_API_PROXY_TARGET`, `VITE_API_TIMEOUT`, `VITE_SHOP_URL`. No guardar secretos en variables `VITE_*`, porque se empaquetan para el navegador. Timeout por defecto: 15 000 ms; un valor de configuración inválido o no positivo cae al mismo default.

Este repositorio consume backend separado: no contiene persistencia propia, reglas de autorización definitivas ni migraciones de DB. Integraciones observadas desde la UI (Mercado Pago, Google, Cloudinary, Uber Direct) requieren soporte/configuración del servidor; mostrar un control no garantiza disponibilidad.