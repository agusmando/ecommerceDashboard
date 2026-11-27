import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery, type QueryParams } from './client';
import type { Id, Paginated } from './types';

/**
 * API única de RTK Query. Cada recurso REST del backend sigue el mismo patrón:
 *
 *   GET    /{resource}               listado (paginado o no, con filtros)
 *   GET    /{resource}/:id           detalle
 *   POST   /{resource}               alta
 *   PUT    /{resource}/:id           modificación
 *   DELETE /{resource}/:id/active    baja lógica
 *   PUT    /{resource}/:id/active    reactivación
 *
 * Por eso los endpoints genéricos reciben el `resource` y los hooks tipados se
 * generan con `resourceHooks()` (ver resources.ts). La cache se comparte: por
 * ejemplo las categorías se piden una vez y las usan filtros, formularios y la
 * página de categorías. Las mutaciones invalidan los tags relacionados.
 */

export const TAG_TYPES = [
  'Category',
  'Tag',
  'Brand',
  'Supplier',
  'Product',
  'Variant',
  'Offer',
  'Movement',
  'Order',
  'OrderItem',
  'Cart',
  'Me',
  'Shipment',
  'Review',
  'GoogleReview',
  'Banner',
  'ShippingZone',
  'User',
  'DiscountCode',
  'Settings',
] as const;
export type TagType = (typeof TAG_TYPES)[number];

export type Resource =
  | 'category'
  | 'tag'
  | 'brand'
  | 'supplier'
  | 'product'
  | 'product/variant'
  | 'offer'
  | 'movement'
  | 'order'
  | 'order/item'
  | 'cart'
  | 'shipment'
  | 'review'
  | 'banner'
  | 'discount-code';

export const RESOURCE_TAG: Record<Resource, TagType> = {
  category: 'Category',
  tag: 'Tag',
  brand: 'Brand',
  supplier: 'Supplier',
  product: 'Product',
  'product/variant': 'Variant',
  offer: 'Offer',
  movement: 'Movement',
  order: 'Order',
  'order/item': 'OrderItem',
  cart: 'Cart',
  shipment: 'Shipment',
  review: 'Review',
  banner: 'Banner',
  'discount-code': 'DiscountCode',
};

/** Qué otras vistas quedan desactualizadas cuando cambia un recurso. */
export const AFFECTS: Record<Resource, TagType[]> = {
  category: ['Category', 'Product'],
  tag: ['Tag', 'Product'],
  brand: ['Brand', 'Product', 'Supplier'],
  supplier: ['Supplier', 'Brand'],
  product: ['Product', 'Variant', 'Offer', 'Brand', 'Category', 'Tag'],
  'product/variant': ['Variant', 'Product', 'Movement', 'Offer'],
  offer: ['Offer', 'Product', 'Variant'],
  movement: ['Movement', 'Variant', 'Product'],
  order: ['Order', 'OrderItem', 'Variant', 'Product', 'Movement', 'Shipment'],
  'order/item': ['OrderItem', 'Order'],
  cart: ['Cart'],
  // Un cambio de envío puede mover el estado de la orden (SHIPPED / DELIVERED).
  shipment: ['Shipment', 'Order'],
  review: ['Review'],
  banner: ['Banner'],
  // El cupón queda snapshot en la orden: no hace falta invalidar Order.
  'discount-code': ['DiscountCode'],
};

export const MAX_PAGE_SIZE = 100;

interface ListArg {
  resource: Resource;
  params?: QueryParams;
}
interface OneArg {
  resource: Resource;
  id: Id;
}
interface BodyArg {
  resource: Resource;
  body: unknown;
}
interface UpdateArg extends BodyArg {
  id: Id;
}
interface ActiveArg extends OneArg {
  active: boolean;
}

function withPages<T>(raw: Paginated<T> | T[]): Paginated<T> {
  if (Array.isArray(raw)) {
    return {
      content: raw,
      pagination: { page: 1, amountPerPage: raw.length, totalAmount: raw.length, totalPages: 1 },
    };
  }
  const { page = 1, amountPerPage = 10, totalAmount = raw.content?.length ?? 0 } = raw.pagination ?? {};
  return {
    content: raw.content ?? [],
    pagination: {
      page,
      amountPerPage,
      totalAmount,
      totalPages: Math.max(1, Math.ceil(totalAmount / Math.max(1, amountPerPage))),
    },
  };
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery,
  tagTypes: TAG_TYPES,
  keepUnusedDataFor: 120,
  refetchOnReconnect: true,
  endpoints: (build) => ({
    /** Listado sin paginar (`paginate=false`). Ideal para selects y maestros chicos. */
    list: build.query<unknown[], ListArg>({
      query: ({ resource, params }) => ({ url: `/${resource}`, params: { ...params, paginate: false } }),
      transformResponse: (raw: unknown) => (Array.isArray(raw) ? raw : withPages(raw as Paginated<unknown>).content),
      providesTags: (_r, _e, { resource }) => [RESOURCE_TAG[resource]],
    }),

    /** Listado paginado (`paginate=true`). */
    page: build.query<Paginated<unknown>, ListArg>({
      query: ({ resource, params }) => ({
        url: `/${resource}`,
        params: {
          currentPage: 1,
          amountPerPage: 20,
          ...params,
          paginate: true,
        },
      }),
      transformResponse: (raw: Paginated<unknown> | unknown[]) => withPages(raw),
      providesTags: (_r, _e, { resource }) => [RESOURCE_TAG[resource]],
    }),

    getOne: build.query<unknown, OneArg>({
      query: ({ resource, id }) => ({ url: `/${resource}/${id}` }),
      providesTags: (_r, _e, { resource, id }) => [
        { type: RESOURCE_TAG[resource], id },
        RESOURCE_TAG[resource],
      ],
    }),

    create: build.mutation<unknown, BodyArg>({
      query: ({ resource, body }) => ({ url: `/${resource}`, method: 'POST', data: body }),
      invalidatesTags: (_r, error, { resource }) => (error ? [] : AFFECTS[resource]),
    }),

    update: build.mutation<unknown, UpdateArg>({
      query: ({ resource, id, body }) => ({ url: `/${resource}/${id}`, method: 'PUT', data: body }),
      invalidatesTags: (_r, error, { resource }) => (error ? [] : AFFECTS[resource]),
    }),

    setActive: build.mutation<void, ActiveArg>({
      query: ({ resource, id, active }) => ({
        url: `/${resource}/${id}/active`,
        method: active ? 'PUT' : 'DELETE',
      }),
      invalidatesTags: (_r, error, { resource }) => (error ? [] : AFFECTS[resource]),
    }),

    /** Relaciones N:M: PUT asocia / DELETE desasocia (`/brand/:id/products`, `/supplier/:id/brands`, `/product/:id/tags`). */
    relation: build.mutation<
      unknown,
      { resource: Resource; id: Id; relation: string; key: string; ids: Id[]; attach: boolean }
    >({
      query: ({ resource, id, relation, key, ids, attach }) => ({
        url: `/${resource}/${id}/${relation}`,
        method: attach ? 'PUT' : 'DELETE',
        data: { [key]: ids.map((i) => ({ id: i })) },
      }),
      invalidatesTags: (_r, error, { resource }) => (error ? [] : AFFECTS[resource]),
    }),
  }),
});
