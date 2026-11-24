# Canela en Rama · Panel de administración

Dashboard en React + Vite que consume el backend documentado en
`canelaEnRama.postman_collection.json`.

## Puesta en marcha

```bash
npm i
cp .env.example .env   # opcional, ver variables abajo
npm run dev
```

Ingresá con un usuario de SuperTokens que tenga rol **ADMIN** o **EMPLOYEE** (los roles
se asignan desde el dashboard de SuperTokens). Los usuarios CONSUMER no pueden entrar.

## Configuración de la API

| Variable | Uso |
| --- | --- |
| `VITE_API_URL` | URL base del backend **sin** `/api` (p. ej. `https://canelaenramaback.onrender.com`). Si queda vacía, las peticiones van a `/api/...` del mismo origen. |
| `VITE_API_PROXY_TARGET` | Solo en `npm run dev`: a dónde redirige Vite las peticiones `/api` (por defecto `http://localhost:8080`, igual que `baseUrl` en Postman). Así se evita CORS en desarrollo. |
| `VITE_API_TIMEOUT` | Timeout por petición en ms (por defecto 15000). |

En producción (`npm run build`) definí `VITE_API_URL`, o serví el frontend detrás de un
proxy que redirija `/api` al backend.

Desde **Administración → Conexión con la API → Probar conexión** se puede verificar el backend.

## Arquitectura

- **Redux Toolkit + RTK Query** (`src/app/store`, `src/app/api`). Toda la data del backend pasa
  por una única API de RTK Query con cache compartida: las categorías, marcas o etiquetas se
  piden una sola vez y las reutilizan filtros, formularios y páginas. Cada mutación invalida
  los tags afectados (p. ej. un movimiento de stock refresca variantes, productos y movimientos).
- Los recursos REST del backend comparten el patrón `GET / GET :id / POST / PUT :id / (DELETE|PUT) :id/active`,
  así que hay **endpoints genéricos** + `resourceHooks()` que genera hooks tipados por recurso
  (`categoriesApi.usePage()`, `ordersApi.useUpdate()`…).
- Slices propios: `auth` (sesión SuperTokens), `ui` (tema, sidebar) y `filters` (filtros y
  página de cada listado; se conservan al ir al detalle y volver).
- **Auth**: SuperTokens en modo header. El access token viaja como `Bearer`; ante un 401 se
  hace `POST /auth/session/refresh` una sola vez (compartido entre requests) y se reintenta.

## Estructura

```
src/app/
  api/            client.ts (axios + tokens + refresh), baseApi.ts (RTK Query), resources.ts (hooks por recurso), types.ts
  store/          configureStore + slices auth / ui / filters
  hooks/          useListFilters, useAction (toasts), useActiveToggle, useOrderStats
  lib/            domain.ts (etiquetas, unidades g/kg, totales de ítems, ofertas), utils.ts (formatos)
  components/     DataTable, Filters, Form, Pickers, CatalogPickers, Charts, RowActions, Badge…
    masters/        MasterPage genérica (categorías, marcas, proveedores, etiquetas)
    products/ orders/ offers/ movements/   modales de cada área
  pages/          una página por ruta
```

## Pantallas y endpoints

| Pantalla | Endpoints |
| --- | --- |
| Login | `POST /auth/signin`, `GET /user/me`, `POST /auth/signout`, `POST /auth/session/refresh` |
| Inicio / Estadísticas | `GET /order` (detalle, desde fecha), `GET /order/item?status=AWAITING_STOCK`, `GET /product/variant`, `GET /offer` |
| Órdenes / Detalle | `GET /order` (estado, pago, cliente, fecha), `GET /order/:id`, `POST /order`, `PUT /order/:id` (estado, devoluciones, esperando stock) |
| Reposición | `GET /order/item` (estado, producto, orden) |
| Carritos | `GET /cart?detalle=true` |
| Productos / Detalle | `GET/POST/PUT /product`, tags `PUT/DELETE /product/:id/tags`, `(DELETE|PUT) /product/:id/active` |
| Inventario | `GET /product/variant` (nombre, costo, stock máx., web), `POST/PUT /product/variant/:id` (precio, stock, receta, disponibilidad, imágenes) |
| Movimientos | `GET /movement` (variante, tipo, fechas), `POST /movement` |
| Ofertas | `GET/POST/PUT /offer`, `(DELETE|PUT) /offer/:id/active` |
| Categorías, Etiquetas, Marcas, Proveedores | CRUD + activar/desactivar; `PUT/DELETE /brand/:id/products`, `PUT/DELETE /supplier/:id/brands` |
| Administración | `GET /health` |

## Verificación de tipos

```bash
npm run typecheck
npm test
npm run check:api-contract
npm run audit:prod
npm run build
```

Las pruebas son unitarias y de cobertura parcial; no reemplazan pruebas de integración contra el backend. El inventario OpenAPI consumido por el dashboard está en `api-contract/openapi.json` y debe coordinarse con el contrato autoritativo del servidor.
