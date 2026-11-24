import { z } from 'zod';
import type { Resource } from './baseApi';
import type { User } from './types';

const id = z.number().int();
const measure = z.enum(['KG', 'U', 'L', 'ML', 'G']);
const orderStatus = z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
const orderItemStatus = z.enum(['FULFILLED', 'AWAITING_STOCK', 'PARTIALLY_RETURNED', 'CANCELLED', 'RETURNED']);
const shipmentStatus = z.enum([
  'PENDING',
  'PREPARING',
  'READY_FOR_PICKUP',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'FAILED_ATTEMPT',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
]);
const currentUserSchema = z
  .object({
    id,
    supertokensId: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    role: z.enum(['ADMIN', 'EDITOR', 'EMPLOYEE', 'CONSUMER']),
    roles: z.array(z.string()),
    permissions: z.array(z.string()).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export function validateCurrentUser(value: unknown): User {
  const result = currentUserSchema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`).join('; ');
    throw new Error(`La respuesta de /user/me no coincide con el contrato esperado: ${details}`);
  }
  return result.data as User;
}

/**
 * Validación estructural de campos esenciales. Se permite que el backend
 * agregue campos (`passthrough`) y se evita duplicar aquí sus reglas de negocio.
 */
const resourceSchemas = {
  category: z.object({ id, name: z.string(), active: z.boolean() }).passthrough(),
  tag: z.object({ id, name: z.string(), active: z.boolean() }).passthrough(),
  brand: z.object({ id, name: z.string(), active: z.boolean() }).passthrough(),
  supplier: z.object({ id, name: z.string(), active: z.boolean() }).passthrough(),
  product: z.object({ id, name: z.string(), active: z.boolean() }).passthrough(),
  'product/variant': z
    .object({ id, productId: id, name: z.string(), active: z.boolean(), currentStock: z.number(), contentMeasure: measure })
    .passthrough(),
  offer: z.object({ id, startTime: z.string(), finishTime: z.string(), active: z.boolean() }).passthrough(),
  movement: z.object({ id, productVariantId: id, quantity: z.number(), type: z.string() }).passthrough(),
  order: z.object({ id, status: orderStatus, totalPrice: z.number() }).passthrough(),
  'order/item': z.object({ id, orderId: id, status: orderItemStatus }).passthrough(),
  cart: z.object({ id }).passthrough(),
  shipment: z.object({ id, orderId: id, status: shipmentStatus, method: z.enum(['DELIVERY', 'PICKUP']) }).passthrough(),
  review: z.object({ id, status: z.enum(['PENDING', 'APPROVED', 'REJECTED']), rating: z.number() }).passthrough(),
  banner: z
    .object({ id, placement: z.enum(['HOME_HERO', 'HOME_RECOMMENDATION', 'CATALOG_STRIP', 'ANNOUNCEMENT_BAR']), name: z.string() })
    .passthrough(),
} satisfies Record<Resource, z.ZodType>;

export function validateResource(resource: Resource, value: unknown): unknown {
  const result = resourceSchemas[resource].safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`).join('; ');
    throw new Error(`La respuesta de /${resource} no coincide con el contrato esperado: ${details}`);
  }
  return result.data;
}

export function validateResourceList(resource: Resource, values: unknown[]): unknown[] {
  return values.map((value, index) => {
    try {
      return validateResource(resource, value);
    } catch (error) {
      throw new Error(`Elemento ${index + 1}: ${error instanceof Error ? error.message : 'respuesta inválida'}`);
    }
  });
}

const shipmentMetaSchema = z.object({
  statuses: z.array(shipmentStatus),
  methods: z.array(z.enum(['DELIVERY', 'PICKUP'])),
  transitions: z.record(z.string(), z.record(z.string(), z.array(shipmentStatus))),
  finalStatuses: z.array(shipmentStatus),
}).passthrough();

const shippingZoneSchema = z.object({
  id,
  name: z.string(),
  price: z.number(),
  etaMinutes: z.number().nullable(),
  active: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();

const shippingConfigSchema = z.object({
  zones: z.array(z.object({ name: z.string(), price: z.number(), etaMinutes: z.number().nullable() }).passthrough()),
  departments: z.array(z.string()),
  providers: z.object({ uber: z.boolean() }).passthrough(),
  pickup: z.object({ name: z.string(), address: z.string() }).passthrough(),
}).passthrough();

const reviewStatsSchema = z.object({
  pending: z.number(),
  approved: z.number(),
  rejected: z.number(),
  average: z.number(),
}).passthrough();

const googleReviewsSchema = z.object({
  place: z.object({
    placeId: z.string().nullable(),
    name: z.string().nullable(),
    rating: z.number().nullable(),
    userRatingCount: z.number().nullable(),
    lastSyncAt: z.string().nullable(),
    configured: z.boolean(),
    lastError: z.string().nullable(),
  }).passthrough(),
  reviews: z.array(z.object({
    id,
    googleId: z.string(),
    authorName: z.string(),
    rating: z.number(),
    featured: z.boolean(),
    active: z.boolean(),
  }).passthrough()),
}).passthrough();

const bannerPlacementSchema = z.object({
  key: z.enum(['HOME_HERO', 'HOME_RECOMMENDATION', 'CATALOG_STRIP', 'ANNOUNCEMENT_BAR']),
  label: z.string(),
  description: z.string(),
  desktop: z.object({ width: z.number(), height: z.number() }).nullable(),
  mobile: z.object({ width: z.number(), height: z.number() }).nullable(),
  imageRequired: z.boolean(),
  textRequired: z.boolean(),
}).passthrough();

const specializedSchemas = {
  shipmentMeta: shipmentMetaSchema,
  shippingConfig: shippingConfigSchema,
  shippingZone: shippingZoneSchema,
  shippingZoneList: z.array(shippingZoneSchema),
  reviewStats: reviewStatsSchema,
  googleReviews: googleReviewsSchema,
  bannerPlacements: z.array(bannerPlacementSchema),
} satisfies Record<string, z.ZodType>;

export type SpecializedContract = keyof typeof specializedSchemas;

/** Valida respuestas especializadas conocidas sin convertir tipos TypeScript en reglas de negocio. */
export function validateSpecialized(contract: SpecializedContract, value: unknown): unknown {
  const result = specializedSchemas[contract].safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`).join('; ');
    throw new Error(`La respuesta especializada ${contract} no coincide con el contrato esperado: ${details}`);
  }
  return result.data;
}