// Types for the ecommerce dashboard

export interface User {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Staff";
  avatar?: string;
}

export interface Brand {
  id: number;
  name: string;
  supplierId: number;
  active: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  active: boolean;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
}

export interface ProductVariant {
  id: number;
  name: string;
  price: number;
  currentStock: number;
  type: "normal" | "mix";
  active: boolean;
  profitMargin?: number;
  unit?: string;
  requestTime?: number; // Days or hours? Assuming days/hours as number
  images?: string[]; // Changed from image to images array
  packagingOptions?: number[]; // For bulk products (up to 3 values) - only for KG/G units
  contentAmount?: number; // e.g., 90ml in a jar
  roundingOption?: "none" | "tens" | "hundreds"; // Rounding to tens or hundreds
  mixComponents?: {
    variantid: number;
    variantName?: string; // For display purposes
    quantity: number;
  }[];
}

export interface Product {
  id: number;
  name: string;
  description: string;
  brandId: number;
  Brand?: Brand;
  categoryId: number;
  Category?: Category;
  tags: string[];
  Tags?: Tag[];
  unit?: string; // Base unit for the product
  active: boolean;
  variants: ProductVariant[];
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: number;
  productId: number;
  variantId: number;
  type: "sale" | "purchase" | "adjustment" | "return";
  quantity: number;
  reference: string;
  date: Date;
}

export interface Offer {
  id: number;
  name: string;
  type:
    | "PERCENTAGE"
    | "FIXED"
    | "BUY_ONE_GET_MORE"
    | "BUY_MORE_GET_MORE"
    | "BUY_MORE_GET_DISCOUNT"
    | "BUY_MORE_GET_FIXED_DISCOUNT";
  value: number;
  variantIds?: string[];
  productIds?: string[];
  discountQuantity?: number;
  discountValue?: number;
  quantityToGet?: number;
  stockThreshold?: number;
  startDate: Date;
  endDate: Date;
  active: boolean | "scheduled" | "expired";
}

export interface OrderItem {
  id: number;
  variantId: number;
  productId: number;
  quantity: number;
  price: number;
  status: "pending" | "completed" | "cancelled";
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  status:
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  total: number;
  date: Date;
}

export interface KPI {
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down";
}

export interface ChartData {
  name: string;
  value?: number;
  [key: string]: string | number;
}

export interface BaseResponse<T> {
  message: string;
  status: number;
  response: T;
}

export interface PaginatedResponse<T> {
  content: T[];
  pagination: {
    page: number;
    amountPerPage: number;
    totalAmount: number;
  };
}