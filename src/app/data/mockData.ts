import type { 
  User, Brand, Supplier, Category, Tag, Product, ProductVariant, 
  Order, OrderItem, Offer, StockMovement, KPI, ChartData 
} from '../types';

// Users
export const mockUsers: User[] = [
  { id:1, name: 'Admin Usuario', email: 'admin@example.com', role: 'Admin' },
  { id:2, name: 'Juan Personal', email: 'juan@example.com', role: 'Staff' },
  { id:3, name: 'Maria Garcia', email: 'maria@example.com', role: 'Staff' },
];

// Suppliers
export const mockSuppliers: Supplier[] = [
  { id: 1, name: 'Distribuidora Natural', active: true },
  { id: 2, name: 'Granjas del Valle', active: true },
  { id: 3, name: 'Importadora Orgánica', active: true },
  { id: 4, name: 'Especias del Mundo', active: false },
];

// Brands
export const mockBrands: Brand[] = [
  { id: 1, name: 'NaturLife', supplierId: 1, active: true },
  { id: 2, name: 'Valle Verde', supplierId: 2, active: true },
  { id: 3, name: 'BioOrganics', supplierId: 3, active: true },
  { id: 4, name: 'Especias Premium', supplierId: 1, active: true },
  { id: 5, name: 'Campo Real', supplierId: 2, active: false },
];

// Categories (Single Level)
export const mockCategories: Category[] = [
  { id: 1, name: 'Secos' },
  { id: 2, name: 'Harinas' },
  { id: 3, name: 'Cereales' },
  { id: 4, name: 'Especias' },
  { id: 5, name: 'Hierbas' },
  { id: 6, name: 'Infusiones' },
  { id: 7, name: 'Legumbres' },
];

// Tags (No colors)
export const mockTags: Tag[] = [
  { id: 1, name: 'Sin TACC' },
  { id: 2, name: 'Orgánico' },
  { id: 3, name: 'Vegano' },
  { id: 4, name: 'Oferta' },
  { id: 5, name: 'Premium' },
];

// Product Variants Helper
const generateVariants = (productPrefix: string): ProductVariant[] => [
  {
    id: 1,
    name: 'Estándar',
    price: 299.99,
    currentStock: 45,
    type: 'normal',
    active: true,
  },
];

// Products
export const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Aceite Laur',
    description: 'Aceite de primera prensada en frio, ideal para cocinar y ensaladas.',
    brandId: 1,
    categoryId: 1,
    tags: ['t2', 't3'],
    active: true,
    variants: [
      { id: 1, name: 'Lata', price: 850.00, currentStock: 150, type: 'normal', active: true, unit: 'l', profitMargin: 30 },
      { id: 2, name: 'Botella', price: 920.00, currentStock: 89, type: 'normal', active: true, unit: 'l', profitMargin: 32 },
    ],
    createdAt: new Date('2025-12-01'),
    updatedAt: new Date('2026-01-15'),
  },
  {
    id: 2,
    name: 'Almohaditas de Avena',
    description: 'Almohaditas crocantes de avena con diferentes sabores.',
    brandId: 2,
    categoryId: 3,
    tags: ['t3'],
    active: true,
    variants: [
      { id: 1, name: 'Chocolate', price: 320.00, currentStock: 234, type: 'normal', active: true, unit: 'u', profitMargin: 40 },
      { id: 2, name: 'Avellana', price: 350.00, currentStock: 156, type: 'normal', active: true, unit: 'u', profitMargin: 40 },
      { id: 3, name: 'Frutilla', price: 330.00, currentStock: 189, type: 'normal', active: true, unit: 'u', profitMargin: 40 },
      { id: 4, name: 'Limón', price: 330.00, currentStock: 142, type: 'normal', active: true, unit: 'u', profitMargin: 40 },
    ],
    createdAt: new Date('2025-10-15'),
    updatedAt: new Date('2026-02-01'),
  },
  {
    id: 3,
    name: 'Arroz',
    description: 'Arroz de excelente calidad en diferentes variedades.',
    brandId: 2,
    categoryId: 3,
    tags: ['t2', 't3'],
    active: true,
    variants: [
      { id: 1, name: 'Yamaní', price: 450.00, currentStock: 123, type: 'normal', active: true, unit: 'kg', profitMargin: 35 },
      { id: 2, name: 'Sushi', price: 520.00, currentStock: 98, type: 'normal', active: true, unit: 'kg', profitMargin: 35 },
      { id: 3, name: 'Baati', price: 680.00, currentStock: 87, type: 'normal', active: true, unit: 'kg', profitMargin: 38 },
    ],
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-02-05'),
  },
  {
    id: 4,
    name: 'Harina',
    description: 'Harinas de diferentes tipos para todos tus preparados.',
    brandId: 3,
    categoryId: 2,
    tags: ['t1', 't5'],
    active: true,
    variants: [
      { id: 1, name: 'Almendras', price: 2500.00, currentStock: 34, type: 'normal', active: true, unit: 'kg', profitMargin: 45 },
      { id: 2, name: 'Avena', price: 580.00, currentStock: 123, type: 'normal', active: true, unit: 'kg', profitMargin: 35 },
      { id: 3, name: 'Integral', price: 420.00, currentStock: 156, type: 'normal', active: true, unit: 'kg', profitMargin: 30 },
      { id: 4, name: 'Centeno', price: 680.00, currentStock: 78, type: 'normal', active: true, unit: 'kg', profitMargin: 35 },
    ],
    createdAt: new Date('2025-11-20'),
    updatedAt: new Date('2026-01-28'),
  },
  {
    id: 5,
    name: 'Té',
    description: 'Tés e infusiones de alta calidad.',
    brandId: 4,
    categoryId: 6,
    tags: ['t2', 't5'],
    active: true,
    variants: [
      { id: 1, name: 'Verde', price: 1200.00, currentStock: 145, type: 'normal', active: true, unit: 'g', profitMargin: 50 },
      { id: 2, name: 'Negro', price: 980.00, currentStock: 167, type: 'normal', active: true, unit: 'g', profitMargin: 48 },
      { id: 3, name: 'Matcha', price: 4500.00, currentStock: 45, type: 'normal', active: true, unit: 'g', profitMargin: 55 },
      { id: 4, name: 'Chai', price: 1350.00, currentStock: 98, type: 'normal', active: true, unit: 'g', profitMargin: 52 },
    ],
    createdAt: new Date('2025-09-15'),
    updatedAt: new Date('2026-02-08'),
  },
  {
    id: 6,
    name: 'Granola',
    description: 'Granola artesanal con diferentes mezclas.',
    brandId: 1,
    categoryId: 3,
    tags: ['t2', 't3'],
    active: true,
    variants: [
      { id: 1, name: 'Original', price: 650.00, currentStock: 234, type: 'normal', active: true, unit: 'kg', profitMargin: 42 },
      { id: 2, name: 'Con Miel', price: 780.00, currentStock: 189, type: 'normal', active: true, unit: 'kg', profitMargin: 42 },
      { id: 3, name: 'Frutos Rojos', price: 890.00, currentStock: 156, type: 'normal', active: true, unit: 'kg', profitMargin: 45 },
    ],
    createdAt: new Date('2025-12-10'),
    updatedAt: new Date('2026-01-22'),
  },
  {
    id: 7,
    name: 'Pasta',
    description: 'Pastas secas de sémola y variedades integrales.',
    brandId: 2,
    categoryId: 1,
    tags: ['t3'],
    active: true,
    variants: [
      { id: 1, name: 'Spaghetti', price: 420.00, currentStock: 278, type: 'normal', active: true, unit: 'kg', profitMargin: 30 },
      { id: 2, name: 'Fusilli', price: 450.00, currentStock: 234, type: 'normal', active: true, unit: 'kg', profitMargin: 30 },
      { id: 3, name: 'Penne', price: 430.00, currentStock: 198, type: 'normal', active: true, unit: 'kg', profitMargin: 30 },
    ],
    createdAt: new Date('2025-11-05'),
    updatedAt: new Date('2026-02-12'),
  },
  {
    id: 8,
    name: 'Legumbres',
    description: 'Legumbres secas de primera calidad.',
    brandId: 1,
    categoryId: 7,
    tags: ['t2', 't3'],
    active: true,
    variants: [
      { id: 1, name: 'Lentejas', price: 450.00, currentStock: 312, type: 'normal', active: true, unit: 'kg', profitMargin: 35 },
      { id: 2, name: 'Garbanzos', price: 520.00, currentStock: 267, type: 'normal', active: true, unit: 'kg', profitMargin: 35 },
      { id: 3, name: 'Porotos Negros', price: 480.00, currentStock: 189, type: 'normal', active: true, unit: 'kg', profitMargin: 35 },
    ],
    createdAt: new Date('2025-10-28'),
    updatedAt: new Date('2026-02-08'),
  },
];

// Orders
export const mockOrders: Order[] = [
  {
    id: 1,
    orderNumber: 'ORD-2026-0001',
    customerId: 1,
    customerName: 'Sofia Lopez',
    customerEmail: 'sofia.l@example.com',
    items: [
      { id: 1, variantId: 1, productId: 1, quantity: 2, price: 450.00, status: 'completed' },
      { id: 2, variantId: 1, productId: 2, quantity: 1, price: 320.00, status: 'completed' },
    ],
    status: 'delivered',
    total: 1220.00,
    date: new Date('2026-02-01'),
  },
  {
    id: 2,
    orderNumber: 'ORD-2026-0002',
    customerId: 2,
    customerName: 'Miguel Angel',
    customerEmail: 'miguel.a@example.com',
    items: [
      { id: 3, variantId: 2, productId: 4, quantity: 1, price: 5800.00, status: 'completed' },
    ],
    status: 'shipped',
    total: 5800.00,
    date: new Date('2026-02-05'),
  },
  {
    id: 3,
    orderNumber: 'ORD-2026-0003',
    customerId: 3,
    customerName: 'Elena Rodriguez',
    customerEmail: 'elena.r@example.com',
    items: [
      { id: 4, variantId: 1, productId: 3, quantity: 3, price: 1200.00, status: 'pending' },
    ],
    status: 'pending',
    total: 3600.00,
    date: new Date('2026-02-10'),
  },
];

// Offers
export const mockOffers: Offer[] = [
  {
    id: 1,
    name: 'Descuento Sin TACC',
    type: 'PERCENTAGE',
    value: 15,
    variantIds: ['1', '2'],
    productIds: [],
    discountQuantity: 0,
    discountValue: 0,
    quantityToGet: 0,
    stockThreshold: 0,
    startDate: new Date('2026-02-10'),
    endDate: new Date('2026-02-14'),
    active: true,
  },
];

// Stock Movements
export const mockStockMovements: StockMovement[] = [
  { id: 1, productId: 1, variantId: 1, type: 'sale', quantity: -2, reference: 'ORD-2026-0001', date: new Date('2026-02-01') },
  { id: 2, productId: 2, variantId: 1, type: 'sale', quantity: -1, reference: 'ORD-2026-0001', date: new Date('2026-02-01') },
  { id: 3, productId: 4, variantId: 2, type: 'sale', quantity: -1, reference: 'ORD-2026-0002', date: new Date('2026-02-05') },
  { id: 4, productId: 1, variantId: 1, type: 'purchase', quantity: 50, reference: 'PO-2026-001', date: new Date('2026-01-28') },
];

// KPIs
export const mockKPIs: KPI[] = [
  { label: 'Ventas Totales', value: '$458,392', change: 12.5, trend: 'up' },
  { label: 'Órdenes Pendientes', value: 23, change: -5.2, trend: 'down' },
  { label: 'Stock Bajo', value: 8, change: 2, trend: 'up' },
  { label: 'Producto Top', value: 'Mix Frutos Secos' },
];

// Chart Data for Sales
export const mockSalesChartData: Record<'día' | 'semana' | 'mes' | 'año', ChartData[]> = {
  'día': [
    { name: '08:00', sales: 1200, orders: 1 },
    { name: '10:00', sales: 3500, orders: 2 },
    { name: '12:00', sales: 8200, orders: 4 },
    { name: '14:00', sales: 6500, orders: 3 },
    { name: '16:00', sales: 9100, orders: 5 },
    { name: '18:00', sales: 12500, orders: 6 },
    { name: '20:00', sales: 4300, orders: 2 },
  ],
  'semana': [
    { name: 'Lun', sales: 42000, orders: 12 },
    { name: 'Mar', sales: 38000, orders: 9 },
    { name: 'Mie', sales: 51000, orders: 15 },
    { name: 'Jue', sales: 46000, orders: 13 },
    { name: 'Vie', sales: 68000, orders: 18 },
    { name: 'Sab', sales: 82000, orders: 24 },
    { name: 'Dom', sales: 71000, orders: 21 },
  ],
  'mes': [
    { name: 'Sem 1', sales: 150000, orders: 45 },
    { name: 'Sem 2', sales: 180000, orders: 52 },
    { name: 'Sem 3', sales: 165000, orders: 48 },
    { name: 'Sem 4', sales: 210000, orders: 65 },
  ],
  'año': [
    { name: 'Ene', sales: 620000, orders: 180 },
    { name: 'Feb', sales: 580000, orders: 165 },
    { name: 'Mar', sales: 710000, orders: 210 },
    { name: 'Abr', sales: 650000, orders: 190 },
    { name: 'May', sales: 800000, orders: 240 },
    { name: 'Jun', sales: 750000, orders: 220 },
    { name: 'Jul', sales: 820000, orders: 250 },
    { name: 'Ago', sales: 790000, orders: 235 },
    { name: 'Sep', sales: 850000, orders: 260 },
    { name: 'Oct', sales: 880000, orders: 270 },
    { name: 'Nov', sales: 920000, orders: 290 },
    { name: 'Dic', sales: 1100000, orders: 350 },
  ]
};