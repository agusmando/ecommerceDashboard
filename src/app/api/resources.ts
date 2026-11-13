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
  useUpdateVariantMutation,
  useHealthQuery,
  useShipmentMetaQuery,
  useShipmentByOrderQuery,
  useAddShipmentEventMutation,
  useReviewStatsQuery,
  useReviewSummaryQuery,
  useModerateReviewMutation,
  useDeleteReviewMutation,
  useGoogleReviewsQuery,
  useSyncGoogleReviewsMutation,
  useUpdateGoogleReviewMutation,
  useBannerPlacementsQuery,
  useCreateBannerMutation,
  useUpdateBannerMutation,
  useReorderBannersMutation,
  useDeleteBannerMutation,
} = extended;

/** Hasta 100 por página es el máximo que acepta el backend. */
export const ALL = { amountPerPage: MAX_PAGE_SIZE } as const;

export type { CreateOrderInput };
