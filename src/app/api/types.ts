/**
 * Tipos del dominio, tal como los devuelve el backend de Canela en Rama
 * (modelos de Prisma + campos calculados como `finalPrice`).
 *
 * Las relaciones vienen con el nombre de Prisma (`Category`, `Brand`, `Tags`…)
 * y solo están presentes cuando se pide `detalle=true` o en los GET por id.
 */

export type Id = number;
export type ISODate = string;

// ---------------------------------------------------------------- Comunes

export interface PaginationInfo {
  page: number;
  amountPerPage: number;
  totalAmount: number;
  /** Calculado en el front. */
  totalPages: number;
}

export interface Paginated<T> {
  content: T[];
  pagination: PaginationInfo;
}

/** Parámetros de listado comunes a todos los recursos. */
export interface ListParams {
  active?: boolean | '';
  detalle?: boolean;
  currentPage?: number;
  amountPerPage?: number;
}

export const MEASURES = ['KG', 'U', 'L', 'ML', 'G'] as const;
export type Measure = (typeof MEASURES)[number];

// ---------------------------------------------------------------- Auth

export type UserRole = 'ADMIN' | 'EDITOR' | 'EMPLOYEE' | 'CONSUMER';

export interface User {
  id: Id;
  supertokensId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  /** Roles de SuperTokens (los que usa el backend para autorizar). */
  roles: string[];
  /** Permisos efectivos según los roles (RBAC del backend). */
  permissions?: import('../lib/permissions').Permission[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Usuario en la pantalla de gestión (GET /user). */
export interface ManagedUser {
  id: Id;
  supertokensId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  createdAt: ISODate;
  ordersCount: number;
  /** Rol de staff principal; null = cliente. */
  role: import('../lib/permissions').StaffRole | null;
  roles: string[];
  permissions: import('../lib/permissions').Permission[];
}

export interface ManagedUserDetail extends ManagedUser {
  /** 'email' o el proveedor social ('google'). */
  loginMethods: string[];
  lastOrder: { id: Id; createdAt: ISODate; status: string } | null;
}

export type UserRoleFilter = 'ALL' | 'STAFF' | 'ADMIN' | 'EDITOR' | 'EMPLOYEE' | 'CUSTOMER';

export interface UserFilters {
  search?: string;
  role?: Exclude<UserRoleFilter, 'ALL'>;
  currentPage?: number;
  amountPerPage?: number;
}

export interface UserList extends Paginated<ManagedUser> {
  counts: Partial<Record<'total' | 'STAFF' | 'ADMIN' | 'EDITOR' | 'EMPLOYEE' | 'CUSTOMER', number>>;
}

export interface RoleDefinition {
  key: import('../lib/permissions').StaffRole;
  label: string;
  description: string;
  permissions: import('../lib/permissions').Permission[];
}

export interface InviteUserInput {
  email: string;
  name?: string;
  role: import('../lib/permissions').StaffRole;
}

export interface InviteUserResult {
  user: ManagedUserDetail;
  created: boolean;
  emailSent: boolean;
  /** Enlace para elegir contraseña (solo para cuentas nuevas). */
  inviteLink: string | null;
}

// ---------------------------------------------------------------- Maestros

export interface Category {
  id: Id;
  name: string;
  description: string | null;
  active: boolean;
  products?: Product[];
}

export interface Tag {
  id: Id;
  name: string;
  active: boolean;
  products?: Product[];
}

export interface Brand {
  id: Id;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
  products?: Product[];
  suppliers?: Supplier[];
}

export interface Supplier {
  id: Id;
  name: string;
  contact: string | null;
  description: string | null;
  active: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
  brands?: Brand[];
}

// ---------------------------------------------------------------- Productos

export interface Image {
  id: Id;
  productVariantId: Id;
  public_id: string;
  secure_url: string;
}

/** Línea de receta de un mix: `quantity` en g (componentes KG) o unidades. */
export interface Dependency {
  mixVariantId: Id;
  productVariantId: Id;
  quantity: number;
  active: boolean;
  componentProduct?: ProductVariant;
  mixVariant?: ProductVariant;
}

export interface ProductVariant {
  id: Id;
  productId: Id;
  name: string;
  /** Costo (por kg si `contentMeasure` = KG). Solo visible para staff. */
  price?: number;
  /** Fracción: 0.5 = 50 %. */
  profitMargin?: number;
  /** Gramos si KG, si no unidades. */
  currentStock: number;
  active: boolean;
  contentMeasure: Measure;
  contentAmount: number | null;
  packagingOptions: number[];
  /** Días de demora (string en la base). */
  requestTime: string;
  stockThreshold: number;
  roundingOption: number;
  availableWeb: boolean;
  /** Productor local solo para esta variante; null = igual que el producto. */
  isLocal?: boolean | null;
  /** Ya resuelto por el API (variante o, si no lo define, producto). */
  local?: boolean;
  finalPrice?: number;
  /** Oferta vigente (calculada por el backend, mismas reglas que el carrito). */
  activeOffer?: ActiveOffer | null;
  /** Precio por kg/u con la oferta aplicada a 1 unidad; null si depende de la cantidad (ej. 3x2). */
  offerPrice?: number | null;
  hasComponents?: Dependency[];
  isComponentOf?: Dependency[];
  offers?: Offer[];
  images?: Image[];
  product?: Product;
}

export interface Product {
  id: Id;
  name: string;
  description: string | null;
  active: boolean;
  measure: Measure;
  categoryId: Id;
  brandId: Id;
  /** De productores locales (sin marca comercial). En la tienda reemplaza a la marca. */
  isLocal?: boolean;
  Category?: Category;
  Brand?: Brand;
  Tags?: Tag[];
  variants?: ProductVariant[];
  offers?: Offer[];
}

export interface ProductFilters extends ListParams {
  /** Búsqueda como la de la tienda: sin acentos, todas las palabras en nombre, descripción, categoría, marca, etiquetas o variantes; ordena por relevancia. */
  q?: string;
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  /** Nombre de tag; repetido exige todos. */
  tags?: string[];
  variants?: string;
  isLocal?: boolean | '';
}

export interface VariantFilters extends ListParams {
  /** Búsqueda como la de la tienda sobre producto + variante (ver ProductFilters.q). */
  q?: string;
  name?: string;
  /** Texto libre: nombre del producto o de la variante. */
  search?: string;
  minPrice?: number | '';
  maxPrice?: number | '';
  maxStock?: number | '';
  availableWeb?: boolean | '';
  /** Solo variantes con stock bajo o sin stock (filtro del servidor, todas las páginas). */
  lowStock?: boolean | '';
}

export interface VariantInput {
  name: string;
  price: number;
  profitMargin?: number;
  roundingOption?: number;
  contentMeasure: Measure;
  packagingOptions?: number[];
  currentStock?: number;
  stockThreshold?: number;
  requestTime?: string;
  availableWeb?: boolean;
  isLocal?: boolean | null;
  hasComponents?: { productVariantId: Id; quantity: number }[];
}

export interface CreateProductInput {
  name: string;
  description?: string;
  measure: Measure;
  categoryId: Id;
  brandId: Id;
  isLocal?: boolean;
  Tags?: { id: Id }[];
  variants: VariantInput[];
  images?: File[];
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  measure?: Measure;
  categoryId?: Id;
  brandId?: Id;
  isLocal?: boolean;
  addVariants?: VariantInput[];
  activateVariants?: Id[];
  deactivateVariants?: Id[];
  removeVariants?: Id[];
}

/** Body de `PUT /product/variant/:id`. Cada caso de la colección es un subconjunto. */
export interface UpdateVariantInput {
  name?: string;
  contentMeasure?: Measure;
  price?: number;
  profitMargin?: number;
  roundingOption?: number;
  /** Absoluto: genera un ADJUSTMENT por la diferencia. */
  currentStock?: number;
  /** Delta: + IN (o produce si es mix), − OUT. */
  stockIncrement?: number;
  availableWeb?: boolean;
  isLocal?: boolean | null;
  packagingOptions?: number[];
  stockThreshold?: number;
  requestTime?: string;
  addComponents?: { productVariantId: Id; quantity: number }[];
  editComponents?: { productVariantId: Id; quantity: number }[];
  removeComponents?: { productVariantId: Id }[];
  removeImages?: { id: Id }[];
  images?: File[];
}

// ---------------------------------------------------------------- Ofertas

export const DISCOUNT_TYPES = [
  'PERCENTAGE',
  'FIXED',
  'BUY_MORE_GET_MORE',
  'BUY_MORE_GET_DISCOUNT',
  'BUY_MORE_GET_FIXED_DISCOUNT',
] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number] | 'BUY_ONE_GET_MORE';

export interface Offer {
  id: Id;
  productId: Id | null;
  productVariantId: Id | null;
  Product?: Product | null;
  ProductVariant?: ProductVariant | null;
  startTime: ISODate;
  finishTime: ISODate;
  discountType: DiscountType;
  discountValue: number | null;
  discountQuantity: number | null;
  quantityToGet: number | null;
  stockThreshold: number | null;
  active: boolean;
}

export interface OfferFilters extends ListParams {
  product?: string;
  variants?: string;
  from?: string;
  to?: string;
}

export interface OfferInput {
  productId?: Id;
  productVariantId?: Id;
  discountType: DiscountType;
  discountValue?: number;
  discountQuantity?: number;
  quantityToGet?: number;
  stockThreshold?: number;
  startTime: ISODate;
  finishTime: ISODate;
}

// ---------------------------------------------------------------- Códigos de descuento (cupón de checkout)

export const COUPON_TYPES = ['PERCENTAGE', 'FIXED'] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export interface DiscountCode {
  id: Id;
  code: string;
  description?: string | null;
  discountType: CouponType | string;
  discountValue: number;
  /** Tope del descuento cuando es porcentual (opcional). */
  maxDiscountAmount?: number | null;
  /** Subtotal mínimo de productos para que aplique (0 = sin mínimo). */
  minOrderAmount: number;
  /** Límite total de canjes (null = ilimitado). */
  usageLimit?: number | null;
  /** Límite de usos por cliente (null = ilimitado). */
  perUserLimit?: number | null;
  usedCount: number;
  startTime: ISODate;
  finishTime: ISODate;
  active: boolean;
}

export interface DiscountCodeFilters extends ListParams {
  code?: string;
  description?: string;
  discountType?: CouponType | '';
  from?: string;
  to?: string;
}

export interface DiscountCodeInput {
  code: string;
  description?: string;
  discountType: CouponType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  startTime: ISODate;
  finishTime: ISODate;
}

// ---------------------------------------------------------------- Stock

export const MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'PRODUCTION'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export interface Movement {
  id: Id;
  productVariantId: Id;
  quantity: number;
  priceAtTime?: number;
  type: MovementType;
  /** Motivo legible: "Venta · pedido #123", nota de carga manual, etc. */
  note?: string | null;
  createdAt: ISODate;
  productVariant?: ProductVariant | null;
}

export interface MovementFilters extends ListParams {
  /** Texto libre: nombre del producto o de la variante. */
  search?: string;
  productVariantId?: Id | '';
  type?: MovementType | '';
  from?: string;
  to?: string;
  day?: string;
}

export interface MovementInput {
  productVariantId: Id;
  quantity: number;
  type: Exclude<MovementType, 'PRODUCTION'>;
  /** Motivo legible del movimiento (opcional). */
  note?: string;
  /** Fecha del movimiento (ISO). Vacía = ahora. */
  createdAt?: string;
}

// ---------------------------------------------------------------- Órdenes

export const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_ITEM_STATUSES = [
  'FULFILLED',
  'AWAITING_STOCK',
  'PARTIALLY_RETURNED',
  'OUT_OF_STOCK',
  'CANCELLED',
  'RETURNED',
] as const;
export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number];

export const PAYMENT_TYPES = ['DEBIT', 'CREDIT', 'CASH', 'TRANSFER', 'MERCADOPAGO'] as const;
/** Medios para órdenes nuevas: las tarjetas se cobran por Mercado Pago (DEBIT/CREDIT solo en pedidos viejos). */
export const NEW_ORDER_PAYMENT_TYPES = ['CASH', 'TRANSFER', 'MERCADOPAGO'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];
export type PaymentStatus = 'PENDING' | 'IN_PROCESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED' | 'CHARGED_BACK';

/** Transiciones válidas para staff (espejo de ORDER_TRANSITIONS del backend). */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export interface OrderItem {
  id: Id;
  orderId: Id;
  productVariantId: Id | null;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  /** Precio de venta por kg/unidad al momento de la compra. */
  unitPriceSnapshot: number;
  /** Descuento total aplicado a la línea. */
  discountAppliedSnapshot: number;
  offerTypeSnapshot: string;
  /** Paquetes si hay `selectedBulkOption`, si no g/unidades. */
  quantity: number;
  selectedBulkOption: number | null;
  status: OrderItemStatus;
  awaitingStockAt: ISODate | null;
  productVariant?: (Partial<ProductVariant> & { product?: Pick<Product, 'id' | 'name'> }) | null;
}

export interface Order {
  id: Id;
  userSuperTokensId: string;
  user?: Omit<User, 'roles'> | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  /** Solo productos (con descuentos). Lo que paga el cliente es `totalPrice + shippingCost` (ver `orderChargedTotal`). */
  totalPrice: number;
  totalItems: number;
  /** Cupón aplicado al checkout (snapshot; el código puede editarse o borrarse después). */
  couponCode?: string | null;
  /** Descuento del cupón (se descuenta del total cobrado). */
  couponDiscount?: number;
  /** Retiro en el local o envío a domicilio (elegido al comprar). */
  shippingMethod?: ShippingMethod;
  /** Costo de envío cobrado al cliente (0 en retiro). */
  shippingCost?: number;
  /** Quién cotizó el envío: 'own' (tarifa propia por departamento) o 'uber' (Uber Direct). */
  shippingProvider?: ShippingProvider | string | null;
  /** Departamento de entrega. */
  shippingZone?: string | null;
  paymentType: PaymentType | string;
  /** WEB = tienda online; COUNTER = venta de mostrador cargada desde el panel. */
  channel?: 'WEB' | 'COUNTER';
  /** Estado del cobro online (Mercado Pago). En otros medios queda PENDING y se gestiona a mano. */
  paymentStatus?: PaymentStatus;
  paymentStatusDetail?: string | null;
  paymentId?: string | null;
  paidAt?: ISODate | null;
  /** Lo que cobró Mercado Pago y lo ya reintegrado (dato de Mercado Pago). */
  paidAmount?: number | null;
  refundedAmount?: number;
  refunds?: OrderRefund[];
  estimatedReadyAt: ISODate | null;
  status: OrderStatus;
  orderItems?: OrderItem[];
  /** Solo en `GET /order/:id` y `/order/mine` (null si la orden no tiene envío). */
  shipment?: Shipment | null;
}

export interface OrderRefund {
  id: Id;
  amount: number;
  status: string;
  reason?: string | null;
  createdAt: ISODate;
}

/** `GET /payment/order/:id/refund`: estado del pago consultado en vivo a Mercado Pago. */
export interface RefundInfo {
  paymentId: string;
  /** Estado en Mercado Pago (approved, refunded, ...). */
  paymentStatus: string;
  paid: number;
  refunded: number;
  /** Lo que todavía se puede devolver. */
  refundable: number;
  /** Total actual del pedido (productos + envío). */
  currentTotal: number;
  /** Lo cobrado de más respecto del total actual (o todo si el pedido está cancelado). */
  suggested: number;
  refunds: OrderRefund[];
}

export interface OrderFilters extends ListParams {
  status?: OrderStatus | '';
  shippingMethod?: ShippingMethod | '';
  paymentType?: string;
  userSuperTokensId?: string;
  /** Creadas desde (YYYY-MM-DD). */
  createdAt?: string;
}

export interface OrderItemFilters extends ListParams {
  orderId?: Id | '';
  productVariantId?: Id | '';
  status?: OrderItemStatus | '';
  productNameSnapshot?: string;
}

export interface CreateOrderInput {
  paymentType: PaymentType;
  orderItems: { productVariantId: Id; quantity: number; selectedBulkOption?: number }[];
}

export type OrderItemEdit =
  | { id?: Id; productVariantId?: Id; quantity: number }
  | { id?: Id; productVariantId?: Id; status: 'RETURNED' | 'CANCELLED' | 'FULFILLED' }
  | { id?: Id; productVariantId?: Id; awaitingStockAt: ISODate };

export interface UpdateOrderInput {
  status?: OrderStatus;
  editItem?: OrderItemEdit[];
}

// ---------------------------------------------------------------- Carritos

export interface ActiveOffer {
  id: Id;
  scope: 'VARIANT' | 'PRODUCT';
  discountType: DiscountType;
  discountValue: number | null;
  discountQuantity: number | null;
  quantityToGet: number | null;
  finishTime: ISODate | null;
  /** "20% off", "-$100", "3x2", "20% off desde 3". */
  label: string;
}

export interface CartItem {
  cartId: Id;
  productVariantId: Id;
  selectedBulkOption: number;
  quantity: number;
  createdAt: ISODate;
  productVariant?: ProductVariant;
  /** Cotización del backend (listado con `detalle`). */
  quote?: { unitPrice: number; total: number; discount: number; offerType: string };
}

export interface Cart {
  id: Id;
  userSuperTokensId: string | null;
  sessionId: string | null;
  user?: { email: string | null; name: string | null } | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  items?: CartItem[];
  summary?: { itemsCount: number; subtotal: number; discount: number; total: number };
}

// ---------------------------------------------------------------- Envíos

export const SHIPMENT_METHODS = ['DELIVERY', 'PICKUP'] as const;
export type ShipmentMethod = (typeof SHIPMENT_METHODS)[number];
/** Modalidad de entrega de la orden (mismos valores que el envío). */
export type ShippingMethod = ShipmentMethod;
export type ShippingProvider = 'own' | 'uber';
/** Estados de una entrega de Uber Direct. */
export type UberDeliveryStatus = 'pending' | 'pickup' | 'pickup_complete' | 'dropoff' | 'delivered' | 'canceled' | 'returned';

export const SHIPMENT_STATUSES = [
  'PENDING',
  'PREPARING',
  'READY_FOR_PICKUP',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'FAILED_ATTEMPT',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/**
 * Transiciones válidas (espejo de `GET /shipment/meta`). Se usan solo mientras
 * la meta del backend no llegó: la fuente de verdad es el servidor.
 */
export const SHIPMENT_TRANSITIONS: Record<ShipmentMethod, Partial<Record<ShipmentStatus, ShipmentStatus[]>>> = {
  PICKUP: {
    PENDING: ['PREPARING', 'READY_FOR_PICKUP', 'CANCELLED'],
    PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
    READY_FOR_PICKUP: ['DELIVERED', 'CANCELLED'],
  },
  DELIVERY: {
    PENDING: ['PREPARING', 'SHIPPED', 'CANCELLED'],
    PREPARING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_ATTEMPT', 'RETURNED'],
    OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_ATTEMPT', 'RETURNED'],
    FAILED_ATTEMPT: ['OUT_FOR_DELIVERY', 'RETURNED', 'CANCELLED'],
  },
};

export const SHIPMENT_FINAL_STATUSES: ShipmentStatus[] = ['DELIVERED', 'RETURNED', 'CANCELLED'];

export interface ShipmentEvent {
  id: Id;
  shipmentId: Id;
  status: ShipmentStatus;
  description: string | null;
  location: string | null;
  createdAt: ISODate;
}

export interface Shipment {
  id: Id;
  orderId: Id;
  /** Código público de seguimiento (lo genera el backend, p. ej. "CER-7X4K9P2Q"). */
  trackingCode: string;
  method: ShipmentMethod;
  status: ShipmentStatus;
  carrier: string | null;
  carrierTrackingCode: string | null;
  carrierTrackingUrl: string | null;
  recipientName: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  notes: string | null;
  cost: number;
  /** Proveedor de mensajería ('uber' = Uber Direct); null si se gestiona a mano. */
  provider?: ShippingProvider | string | null;
  /** Id de la entrega en el proveedor (Uber). */
  providerDeliveryId?: string | null;
  /** Último estado informado por el proveedor (ver `UberDeliveryStatus`). */
  providerStatus?: UberDeliveryStatus | string | null;
  /** Departamento de entrega. */
  zone?: string | null;
  estimatedDeliveryAt: ISODate | null;
  shippedAt: ISODate | null;
  deliveredAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  /** Ordenados por fecha ascendente. */
  events: ShipmentEvent[];
  /** Solo en el listado con `detalle=true`. */
  order?: Pick<Order, 'id' | 'status' | 'userSuperTokensId' | 'totalPrice' | 'createdAt' | 'shippingCost'> & {
    user?: { name: string | null; email: string | null } | null;
  };
}

export interface ShipmentMeta {
  statuses: ShipmentStatus[];
  methods: ShipmentMethod[];
  transitions: Record<ShipmentMethod, Partial<Record<ShipmentStatus, ShipmentStatus[]>>>;
  finalStatuses: ShipmentStatus[];
}

export interface ShipmentFilters extends ListParams {
  status?: ShipmentStatus | '';
  method?: ShipmentMethod | '';
  orderId?: Id | '';
  trackingCode?: string;
  carrier?: string;
  /** Creados desde (YYYY-MM-DD). */
  createdFrom?: string;
}

export interface ShipmentFields {
  method?: ShipmentMethod;
  carrier?: string | null;
  carrierTrackingCode?: string | null;
  carrierTrackingUrl?: string | null;
  recipientName?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  cost?: number;
  estimatedDeliveryAt?: ISODate | null;
}

export interface CreateShipmentInput extends ShipmentFields {
  orderId: Id;
  method: ShipmentMethod;
}

export interface ShipmentEventInput {
  status: ShipmentStatus;
  description?: string;
  location?: string;
}

// ---------------------------------------------------------------- Tarifas de envío

/** Tarifa propia de envío por departamento. */
export interface ShippingZone {
  id: Id;
  name: string;
  price: number;
  etaMinutes: number | null;
  active: boolean;
  sortOrder: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface ShippingZoneInput {
  name: string;
  price: number;
  etaMinutes?: number | null;
  active?: boolean;
  sortOrder?: number;
}

/** `GET /shipping/config` (público). */
export interface ShippingConfig {
  /** Solo las zonas activas. */
  zones: Pick<ShippingZone, 'name' | 'price' | 'etaMinutes'>[];
  /** Todos los departamentos (activos o no). */
  departments: string[];
  providers: { uber: boolean };
  pickup: { name: string; address: string };
}

// ---------------------------------------------------------------- Reseñas

export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface Review {
  id: Id;
  productId: Id;
  productVariantId: Id;
  /** Entero de 1 a 5. */
  rating: number;
  title: string | null;
  comment: string | null;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  /** Respuesta pública de la tienda. */
  reply: string | null;
  repliedAt: ISODate | null;
  moderatedAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  /** Nombre público abreviado ("María G."). */
  authorName: string;
  productVariant?: {
    id: Id;
    name: string;
    images: { id: Id; secure_url: string }[];
    product: { id: Id; name: string };
  };
  /** Solo staff / autor. */
  user?: { name: string | null; email: string | null } | null;
  rejectionReason?: string | null;
}

export type ReviewOrder = 'recent' | 'rating_desc' | 'rating_asc';

export interface ReviewFilters extends Omit<ListParams, 'active'> {
  productId?: Id | '';
  productVariantId?: Id | '';
  rating?: number | '';
  status?: ReviewStatus | '';
  search?: string;
  orderBy?: ReviewOrder;
}

export interface ReviewSummary {
  productId: Id;
  /** 0 si no hay reseñas (1 decimal). */
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  byVariant: { productVariantId: Id; average: number; count: number }[];
}

export interface ReviewStats {
  pending: number;
  approved: number;
  rejected: number;
  average: number;
}

export interface ModerateReviewInput {
  status: 'APPROVED' | 'REJECTED';
  reply?: string | null;
  rejectionReason?: string;
}

// ---------------------------------------------------------------- Reseñas de Google

export interface GoogleReview {
  id: Id;
  googleId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  authorUrl: string | null;
  rating: number;
  text: string | null;
  language: string | null;
  /** Texto de Google, p. ej. "hace 2 semanas". */
  relativeTime: string | null;
  publishedAt: ISODate | null;
  featured: boolean;
  active: boolean;
  fetchedAt: ISODate;
}

export interface GooglePlaceInfo {
  placeId: string | null;
  name: string | null;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
  lastSyncAt: ISODate | null;
  /** false si faltan las variables de entorno del backend. */
  configured: boolean;
  lastError: string | null;
}

export interface GoogleReviewsResponse {
  place: GooglePlaceInfo;
  reviews: GoogleReview[];
}

// ---------------------------------------------------------------- Banners

export const BANNER_PLACEMENTS = ['HOME_HERO', 'HOME_RECOMMENDATION', 'CATALOG_STRIP', 'ANNOUNCEMENT_BAR'] as const;
export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

export const BANNER_SIZES = ['SQUARE', 'WIDE'] as const;
export type BannerSize = (typeof BANNER_SIZES)[number];

export interface Banner {
  id: Id;
  placement: BannerPlacement;
  /** Nombre interno; también es el `alt` de la imagen. */
  name: string;
  eyebrow: string | null;
  headline: string | null;
  text: string | null;
  ctaLabel: string | null;
  /** Ruta interna ("/productos?categoria=x") o URL absoluta. */
  linkUrl: string | null;
  size: BannerSize | null;
  desktopImageUrl: string | null;
  /** Si es null la web usa la de escritorio. */
  mobileImageUrl: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  position: number;
  startsAt: ISODate | null;
  endsAt: ISODate | null;
  active: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface BannerPlacementSpec {
  key: BannerPlacement;
  label: string;
  description: string;
  desktop: Dimensions | null;
  mobile: Dimensions | null;
  /** Solo HOME_RECOMMENDATION. */
  sizes?: Record<BannerSize, Dimensions>;
  imageRequired: boolean;
  textRequired: boolean;
  /** Informativo. */
  maxActive: number | null;
}

export interface BannerFilters extends ListParams {
  placement?: BannerPlacement | '';
  name?: string;
}

/** Campos de texto del alta/modificación ('' borra un campo opcional al editar). */
export interface BannerFields {
  placement?: BannerPlacement;
  name?: string;
  eyebrow?: string;
  headline?: string;
  text?: string;
  ctaLabel?: string;
  linkUrl?: string;
  size?: BannerSize | '';
  backgroundColor?: string;
  textColor?: string;
  /** ISO o ''. */
  startsAt?: string;
  endsAt?: string;
}

export interface BannerInput extends BannerFields {
  desktopImage?: File | null;
  mobileImage?: File | null;
  removeDesktopImage?: boolean;
  removeMobileImage?: boolean;
}
