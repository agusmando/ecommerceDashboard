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

export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'CONSUMER';

export interface User {
  id: Id;
  supertokensId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  /** Roles de SuperTokens (los que usa el backend para autorizar). */
  roles: string[];
  createdAt: ISODate;
  updatedAt: ISODate;
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
  availablePedidosYa: boolean;
  finalPrice?: number;
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
  Category?: Category;
  Brand?: Brand;
  Tags?: Tag[];
  variants?: ProductVariant[];
  offers?: Offer[];
}

export interface ProductFilters extends ListParams {
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  /** Nombre de tag; repetido exige todos. */
  tags?: string[];
  variants?: string;
}

export interface VariantFilters extends ListParams {
  name?: string;
  minPrice?: number | '';
  maxPrice?: number | '';
  maxStock?: number | '';
  availableWeb?: boolean | '';
  availablePedidosYa?: boolean | '';
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
  availablePedidosYa?: boolean;
  hasComponents?: { productVariantId: Id; quantity: number }[];
}

export interface CreateProductInput {
  name: string;
  description?: string;
  measure: Measure;
  categoryId: Id;
  brandId: Id;
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
  addVariants?: VariantInput[];
  activateVariants?: Id[];
  deactivateVariants?: Id[];
  removeVariants?: Id[];
}

/** Body de `PUT /product/variant/:id`. Cada caso de la colección es un subconjunto. */
export interface UpdateVariantInput {
  name?: string;
  price?: number;
  profitMargin?: number;
  roundingOption?: number;
  /** Absoluto: genera un ADJUSTMENT por la diferencia. */
  currentStock?: number;
  /** Delta: + IN (o produce si es mix), − OUT. */
  stockIncrement?: number;
  availableWeb?: boolean;
  availablePedidosYa?: boolean;
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

// ---------------------------------------------------------------- Stock

export const MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'PRODUCTION'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export interface Movement {
  id: Id;
  productVariantId: Id;
  quantity: number;
  priceAtTime?: number;
  type: MovementType;
  createdAt: ISODate;
  productVariant?: ProductVariant | null;
}

export interface MovementFilters extends ListParams {
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
}

// ---------------------------------------------------------------- Órdenes

export const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_ITEM_STATUSES = [
  'FULFILLED',
  'AWAITING_STOCK',
  'PARTIALLY_RETURNED',
  'CANCELLED',
  'RETURNED',
] as const;
export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number];

export const PAYMENT_TYPES = ['DEBIT', 'CREDIT', 'CASH', 'TRANSFER', 'MERCADOPAGO'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

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
  totalPrice: number;
  totalItems: number;
  paymentType: PaymentType | string;
  estimatedReadyAt: ISODate | null;
  status: OrderStatus;
  orderItems?: OrderItem[];
}

export interface OrderFilters extends ListParams {
  status?: OrderStatus | '';
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
  | { id?: Id; productVariantId?: Id; status: 'RETURNED' | 'CANCELLED' }
  | { id?: Id; productVariantId?: Id; awaitingStockAt: ISODate };

export interface UpdateOrderInput {
  status?: OrderStatus;
  editItem?: OrderItemEdit[];
}

// ---------------------------------------------------------------- Carritos

export interface CartItem {
  cartId: Id;
  productVariantId: Id;
  selectedBulkOption: number;
  quantity: number;
  createdAt: ISODate;
  productVariant?: ProductVariant;
}

export interface Cart {
  id: Id;
  userSuperTokensId: string | null;
  sessionId: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  items?: CartItem[];
}
