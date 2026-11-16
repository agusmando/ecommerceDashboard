import { skipToken } from '@reduxjs/toolkit/query/react';
import { api, MAX_PAGE_SIZE, type Resource } from './baseApi';
import { toFormData, type QueryError, type QueryParams } from './client';
import type {
  Banner,
  BannerFilters,
  BannerInput,
  BannerPlacementSpec,
  Brand,
  Cart,
  Category,
  CreateOrderInput,
  CreateShipmentInput,
  GoogleReview,
  GoogleReviewsResponse,
  Id,
  ListParams,
  Movement,
  MovementFilters,
  MovementInput,
  ModerateReviewInput,
  Offer,
  OfferFilters,
  OfferInput,
  Order,
  OrderFilters,
  OrderItem,
  OrderItemFilters,
  Paginated,
  Product,
  ProductFilters,
  ProductVariant,
  Review,
  ReviewFilters,
  ReviewStats,
  ReviewSummary,
  Shipment,
  ShippingConfig,
  ShippingZone,
  ShippingZoneInput,
  ShipmentEventInput,
  ShipmentFields,
  ShipmentFilters,
  ShipmentMeta,
  Supplier,
  Tag,
  UpdateOrderInput,
  UpdateProductInput,
  UpdateVariantInput,
  VariantFilters,
  VariantInput,
} from './types';

type QueryOpts = { skip?: boolean; pollingInterval?: number; refetchOnMountOrArgChange?: boolean | number };

/**
 * Genera hooks tipados para un recurso sobre los endpoints genéricos de baseApi.
 * Así cada página usa `categoriesApi.useList()` sin repetir URLs ni cache tags.
 */
function resourceHooks<T, F extends ListParams = ListParams, C = Partial<T>, U = Partial<C>>(resource: Resource) {
  return {
    resource,
    useList(params?: F, opts?: QueryOpts) {
      const r = api.useListQuery({ resource, params: params as QueryParams }, opts);
      return r as Omit<typeof r, 'data' | 'currentData'> & { data?: T[]; currentData?: T[] };
    },
    usePage(params?: F, opts?: QueryOpts) {
      const r = api.usePageQuery({ resource, params: params as QueryParams }, opts);
      return r as Omit<typeof r, 'data' | 'currentData'> & { data?: Paginated<T>; currentData?: Paginated<T> };
    },
    useOne(id: Id | undefined | null, opts?: QueryOpts) {
      const r = api.useGetOneQuery(id ? { resource, id } : skipToken, opts);
      return r as Omit<typeof r, 'data' | 'currentData'> & { data?: T; currentData?: T };
    },
    useCreate() {
      const [trigger, state] = api.useCreateMutation();
      return [(body: C) => trigger({ resource, body }).unwrap() as Promise<T>, state] as const;
    },
    useUpdate() {
      const [trigger, state] = api.useUpdateMutation();
      return [(id: Id, body: U) => trigger({ resource, id, body }).unwrap() as Promise<T>, state] as const;
    },
    useSetActive() {
      const [trigger, state] = api.useSetActiveMutation();
      return [(id: Id, active: boolean) => trigger({ resource, id, active }).unwrap(), state] as const;
    },
  };
}

/** Hook para asociar/desasociar entidades (`attach=false` desasocia). */
function relationHook(resource: Resource, relation: string, key: string) {
  return function useRelation() {
    const [trigger, state] = api.useRelationMutation();
    return [
      (id: Id, ids: Id[], attach: boolean) => trigger({ resource, id, relation, key, ids, attach }).unwrap(),
      state,
    ] as const;
  };
}

// ---------------------------------------------------------------- Maestros

export interface NamedFilters extends ListParams {
  name?: string;
}

export const categoriesApi = resourceHooks<
  Category,
  NamedFilters & { products?: string },
  { name: string; description?: string }
>('category');

export const tagsApi = resourceHooks<Tag, NamedFilters, { name: string }>('tag');

export const brandsApi = {
  ...resourceHooks<Brand, NamedFilters & { suppliers?: string; products?: string }, { name: string; description?: string }>(
    'brand',
  ),
  useProducts: relationHook('brand', 'products', 'productsId'),
};

export const suppliersApi = {
  ...resourceHooks<
    Supplier,
    NamedFilters & { contact?: string; brands?: string },
    { name: string; contact?: string; description?: string; brands?: { id: Id }[] },
    { name?: string; contact?: string; description?: string }
  >('supplier'),
  useBrands: relationHook('supplier', 'brands', 'brandsId'),
};

// ---------------------------------------------------------------- Catálogo

export const productsApi = {
  ...resourceHooks<Product, ProductFilters, never, UpdateProductInput>('product'),
  useTags: relationHook('product', 'tags', 'tagsId'),
};

export const variantsApi = resourceHooks<ProductVariant, VariantFilters, VariantInput & { productId: Id }, UpdateVariantInput>(
  'product/variant',
);

export const offersApi = resourceHooks<Offer, OfferFilters, OfferInput, Partial<OfferInput>>('offer');

export const movementsApi = resourceHooks<Movement, MovementFilters, MovementInput>('movement');

// ---------------------------------------------------------------- Ventas

export const ordersApi = resourceHooks<Order, OrderFilters, CreateOrderInput, UpdateOrderInput>('order');
export const orderItemsApi = resourceHooks<OrderItem, OrderItemFilters>('order/item');
export const cartsApi = resourceHooks<Cart, ListParams>('cart');
export const shipmentsApi = resourceHooks<Shipment, ShipmentFilters, CreateShipmentInput, ShipmentFields>('shipment');

// ---------------------------------------------------------------- Contenido

/** Listado/detalle de reseñas (staff ve todos los estados). La moderación va por endpoints propios. */
export const reviewsApi = resourceHooks<Review, ReviewFilters & ListParams>('review');

/** Listado y activar/desactivar de banners. Alta/edición son multipart (ver abajo). */
export const bannersApi = resourceHooks<Banner, BannerFilters>('banner');

/** Campos de texto + archivos `desktopImage` / `mobileImage` como multipart. */
function bannerFormData({ desktopImage, mobileImage, removeDesktopImage, removeMobileImage, ...fields }: BannerInput) {
  const fd = toFormData({
    ...fields,
    removeDesktopImage: removeDesktopImage || undefined,
    removeMobileImage: removeMobileImage || undefined,
  });
  if (desktopImage) fd.append('desktopImage', desktopImage);
  if (mobileImage) fd.append('mobileImage', mobileImage);
  return fd;
}

// ---------------------------------------------------------------- Endpoints especiales

const extended = api.injectEndpoints({
  endpoints: (build) => ({
    /** Alta de producto. Con imágenes va multipart (variants/Tags como JSON string). */
    createProduct: build.mutation<Product, import('./types').CreateProductInput>({
      query: ({ images, ...input }) => {
        if (!images?.length) return { url: '/product', method: 'POST', data: input };
        const fd = new FormData();
        Object.entries(input).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
        });
        images.forEach((f) => fd.append('image', f));
        return { url: '/product', method: 'POST', data: fd };
      },
      invalidatesTags: (_r, e) => (e ? [] : ['Product', 'Variant', 'Movement', 'Brand', 'Category', 'Tag']),
    }),

    /**
     * Modificación de variante. Si hay imágenes nuevas va multipart: el backend
     * usa multer, que entiende `removeImages[0][id]`.
     */
    updateVariant: build.mutation<ProductVariant, { id: Id; body: UpdateVariantInput }>({
      query: ({ id, body: { images, ...body } }) => {
        if (!images?.length) return { url: `/product/variant/${id}`, method: 'PUT', data: body };
        const fd = new FormData();
        images.forEach((f) => fd.append('image', f));
        body.removeImages?.forEach((img, i) => fd.append(`removeImages[${i}][id]`, String(img.id)));
        return { url: `/product/variant/${id}`, method: 'PUT', data: fd };
      },
      invalidatesTags: (_r, e) => (e ? [] : ['Variant', 'Product', 'Movement', 'Offer']),
    }),

    // ------------------------------------------------------------ Envíos

    /** Estados, métodos y transiciones válidas. Casi estático: se cachea un buen rato. */
    shipmentMeta: build.query<ShipmentMeta, void>({
      query: () => ({ url: '/shipment/meta' }),
      keepUnusedDataFor: 3600,
    }),

    /** Envío de una orden; `null` si la orden todavía no tiene (el backend responde 404). */
    shipmentByOrder: build.query<Shipment | null, Id>({
      queryFn: async (orderId, _api, _extra, baseQuery) => {
        const res = await baseQuery({ url: `/shipment/order/${orderId}` });
        if (res.error) {
          const err = res.error as QueryError;
          return err.status === 404 ? { data: null } : { error: err };
        }
        return { data: res.data as Shipment };
      },
      providesTags: (r) => (r ? [{ type: 'Shipment', id: r.id }, 'Shipment'] : ['Shipment']),
    }),

    /** Cambio de estado + evento en la línea de tiempo. Puede mover la orden a SHIPPED/DELIVERED. */
    addShipmentEvent: build.mutation<Shipment, { id: Id; body: ShipmentEventInput }>({
      query: ({ id, body }) => ({ url: `/shipment/${id}/events`, method: 'POST', data: body }),
      invalidatesTags: (_r, e) => (e ? [] : ['Shipment', 'Order']),
    }),

    // ------------------------------------------------------------ Envío a domicilio (tarifas y repartidor)

    /** Configuración pública: zonas activas, departamentos, proveedores configurados y punto de retiro. */
    shippingConfig: build.query<ShippingConfig, void>({
      query: () => ({ url: '/shipping/config' }),
      providesTags: ['ShippingZone'],
    }),

    /** Todas las tarifas por departamento (activas o no). */
    shippingZones: build.query<ShippingZone[], void>({
      query: () => ({ url: '/shipping/zones' }),
      providesTags: ['ShippingZone'],
    }),

    createShippingZone: build.mutation<ShippingZone, ShippingZoneInput>({
      query: (body) => ({ url: '/shipping/zones', method: 'POST', data: body }),
      invalidatesTags: (_r, e) => (e ? [] : ['ShippingZone']),
    }),

    updateShippingZone: build.mutation<ShippingZone, { id: Id; body: Partial<ShippingZoneInput> }>({
      query: ({ id, body }) => ({ url: `/shipping/zones/${id}`, method: 'PUT', data: body }),
      invalidatesTags: (_r, e) => (e ? [] : ['ShippingZone']),
    }),

    /** Carga masiva de movimientos: todos o ninguno (el error indica la fila). */
    createMovementsBulk: build.mutation<{ count: number }, import('./types').MovementInput[]>({
      query: (movements) => ({ url: '/movement/bulk', method: 'POST', data: { movements } }),
      invalidatesTags: (_r, e) => (e ? [] : ['Movement', 'Variant', 'Product']),
    }),

    /** Pide un repartidor de Uber Direct para el envío. Devuelve el envío actualizado. */
    dispatchShipment: build.mutation<Shipment, Id>({
      query: (id) => ({ url: `/shipping/shipment/${id}/dispatch`, method: 'POST' }),
      invalidatesTags: (_r, e) => (e ? [] : ['Shipment', 'Order']),
    }),

    /** Re-consulta el estado de la entrega en Uber. */
    syncShipmentCourier: build.mutation<Shipment, Id>({
      query: (id) => ({ url: `/shipping/shipment/${id}/sync`, method: 'POST' }),
      invalidatesTags: (_r, e) => (e ? [] : ['Shipment', 'Order']),
    }),

    /** Cancela el repartidor de Uber (el envío se puede volver a despachar). */
    cancelShipmentCourier: build.mutation<Shipment, Id>({
      query: (id) => ({ url: `/shipping/shipment/${id}/cancel`, method: 'POST' }),
      invalidatesTags: (_r, e) => (e ? [] : ['Shipment', 'Order']),
    }),

    // ------------------------------------------------------------ Reseñas

    reviewStats: build.query<ReviewStats, void>({
      query: () => ({ url: '/review/stats' }),
      providesTags: ['Review'],
    }),

    reviewSummary: build.query<ReviewSummary, Id>({
      query: (productId) => ({ url: '/review/summary', params: { productId } }),
      providesTags: ['Review'],
    }),

    moderateReview: build.mutation<Review, { id: Id; body: ModerateReviewInput }>({
      query: ({ id, body }) => ({ url: `/review/${id}/moderate`, method: 'PUT', data: body }),
      invalidatesTags: (_r, e) => (e ? [] : ['Review']),
    }),

    deleteReview: build.mutation<void, Id>({
      query: (id) => ({ url: `/review/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, e) => (e ? [] : ['Review']),
    }),

    // ------------------------------------------------------------ Pagos (Mercado Pago)

    /** Re-consulta en Mercado Pago el pago de una orden y devuelve la orden actualizada. */
    syncOrderPayment: build.mutation<import('./types').Order, Id>({
      query: (orderId) => ({ url: `/payment/order/${orderId}/sync`, method: 'POST' }),
      invalidatesTags: (_r, e) => (e ? [] : ['Order']),
    }),

    // ------------------------------------------------------------ Reseñas de Google

    googleReviews: build.query<GoogleReviewsResponse, void>({
      query: () => ({ url: '/google-review/all' }),
      providesTags: ['GoogleReview'],
    }),

    syncGoogleReviews: build.mutation<GoogleReviewsResponse & { synced: number }, void>({
      query: () => ({ url: '/google-review/sync', method: 'POST' }),
      // Aun si falla, el backend guarda `lastError`: conviene refrescar el resumen.
      invalidatesTags: ['GoogleReview'],
    }),

    updateGoogleReview: build.mutation<GoogleReview, { id: Id; body: { featured?: boolean; active?: boolean } }>({
      query: ({ id, body }) => ({ url: `/google-review/${id}`, method: 'PUT', data: body }),
      invalidatesTags: (_r, e) => (e ? [] : ['GoogleReview']),
    }),

    // ------------------------------------------------------------ Banners

    bannerPlacements: build.query<BannerPlacementSpec[], void>({
      query: () => ({ url: '/banner/placements' }),
      keepUnusedDataFor: 3600,
    }),

    createBanner: build.mutation<Banner, BannerInput>({
      query: (input) => ({ url: '/banner', method: 'POST', data: bannerFormData(input) }),
      invalidatesTags: (_r, e) => (e ? [] : ['Banner']),
    }),

    updateBanner: build.mutation<Banner, { id: Id; body: BannerInput }>({
      query: ({ id, body }) => ({ url: `/banner/${id}`, method: 'PUT', data: bannerFormData(body) }),
      invalidatesTags: (_r, e) => (e ? [] : ['Banner']),
    }),

    /** Nuevo orden dentro de una ubicación (position = índice). */
    reorderBanners: build.mutation<Banner[], Id[]>({
      query: (ids) => ({ url: '/banner/reorder', method: 'PUT', data: { ids } }),
      invalidatesTags: (_r, e) => (e ? [] : ['Banner']),
    }),

    /** Baja física (también borra las imágenes de Cloudinary). */
    deleteBanner: build.mutation<void, Id>({
      query: (id) => ({ url: `/banner/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, e) => (e ? [] : ['Banner']),
    }),

    // ------------------------------------------------------------ Usuarios y roles (users.manage)

    users: build.query<import('./types').UserList, import('./types').UserFilters>({
      query: (params) => ({ url: '/user', params: { currentPage: 1, amountPerPage: 20, ...params } }),
      transformResponse: (raw: Omit<import('./types').UserList, 'pagination'> & { pagination: Omit<import('./types').PaginationInfo, 'totalPages'> }) => ({
        ...raw,
        pagination: {
          ...raw.pagination,
          totalPages: Math.max(1, Math.ceil(raw.pagination.totalAmount / Math.max(1, raw.pagination.amountPerPage))),
        },
      }),
      providesTags: ['User'],
    }),
    userDetail: build.query<import('./types').ManagedUserDetail, string>({
      query: (supertokensId) => ({ url: `/user/${supertokensId}/detail` }),
      providesTags: (_r, _e, id) => [{ type: 'User', id }],
    }),
    roleCatalog: build.query<import('./types').RoleDefinition[], void>({
      query: () => ({ url: '/user/roles' }),
      keepUnusedDataFor: 3600,
    }),
    setUserRole: build.mutation<import('./types').ManagedUserDetail, { supertokensId: string; role: import('../lib/permissions').StaffRole | null }>({
      query: ({ supertokensId, role }) => ({ url: `/user/${supertokensId}/role`, method: 'PUT', data: { role } }),
      invalidatesTags: (_r, e) => (e ? [] : ['User']),
    }),
    revokeUserSessions: build.mutation<{ revoked: number }, string>({
      query: (supertokensId) => ({ url: `/user/${supertokensId}/revoke-sessions`, method: 'POST' }),
    }),
    inviteUser: build.mutation<import('./types').InviteUserResult, import('./types').InviteUserInput>({
      query: (body) => ({ url: '/user/invite', method: 'POST', data: body }),
      invalidatesTags: (_r, e) => (e ? [] : ['User']),
    }),

    health: build.query<{ status: string; latencyMs: number }, void>({
      queryFn: async (_arg, _api, _extra, baseQuery) => {
        const t0 = performance.now();
        const res = await baseQuery({ url: '/health' });
        if (res.error) return { error: res.error as import('./client').QueryError };
        return { data: { ...(res.data as { status: string }), latencyMs: Math.round(performance.now() - t0) } };
      },
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useCreateProductMutation,
  useCreateMovementsBulkMutation,
  useUpdateVariantMutation,
  useHealthQuery,
  useShipmentMetaQuery,
  useShipmentByOrderQuery,
  useAddShipmentEventMutation,
  useShippingConfigQuery,
  useShippingZonesQuery,
  useCreateShippingZoneMutation,
  useUpdateShippingZoneMutation,
  useDispatchShipmentMutation,
  useSyncShipmentCourierMutation,
  useCancelShipmentCourierMutation,
  useReviewStatsQuery,
  useReviewSummaryQuery,
  useModerateReviewMutation,
  useDeleteReviewMutation,
  useGoogleReviewsQuery,
  useSyncGoogleReviewsMutation,
  useSyncOrderPaymentMutation,
  useUpdateGoogleReviewMutation,
  useBannerPlacementsQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useReorderBannersMutation,
  useDeleteBannerMutation,
  useUsersQuery,
  useUserDetailQuery,
  useRoleCatalogQuery,
  useSetUserRoleMutation,
  useRevokeUserSessionsMutation,
  useInviteUserMutation,
} = extended;

/** Hasta 100 por página es el máximo que acepta el backend. */
export const ALL = { amountPerPage: MAX_PAGE_SIZE } as const;

export type { CreateOrderInput };
