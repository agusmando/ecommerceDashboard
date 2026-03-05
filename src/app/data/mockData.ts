import type { 
  User, Brand, Supplier, Category, Tag, Product, ProductVariant, 
  Order, OrderItem, Offer, StockMovement, KPI, ChartData 
} from '../types';

// Users
export const mockUsers: User[] = [
  { id: '1', name: 'Admin Usuario', email: 'admin@example.com', role: 'Admin' },
  { id: '2', name: 'Juan Personal', email: 'juan@example.com', role: 'Staff' },
  { id: '3', name: 'Maria Garcia', email: 'maria@example.com', role: 'Staff' },
];

// Suppliers
export const mockSuppliers: Supplier[] = [
  { id: 's1', name: 'Distribuidora Natural', status: 'active' },
  { id: 's2', name: 'Granjas del Valle', status: 'active' },
  { id: 's3', name: 'Importadora Orgánica', status: 'active' },
  { id: 's4', name: 'Especias del Mundo', status: 'inactive' },
];

// Brands
export const mockBrands: Brand[] = [
  { id: 'b1', name: 'NaturLife', supplierId: 's1', status: 'active' },
  { id: 'b2', name: 'Valle Verde', supplierId: 's2', status: 'active' },
  { id: 'b3', name: 'BioOrganics', supplierId: 's3', status: 'active' },
  { id: 'b4', name: 'Especias Premium', supplierId: 's1', status: 'active' },
  { id: 'b5', name: 'Campo Real', supplierId: 's2', status: 'inactive' },
];

// Categories (Single Level)
export const mockCategories: Category[] = [
  { id: 'c1', name: 'Secos' },
  { id: 'c2', name: 'Harinas' },
  { id: 'c3', name: 'Cereales' },
  { id: 'c4', name: 'Especias' },
  { id: 'c5', name: 'Hierbas' },
  { id: 'c6', name: 'Infusiones' },
  { id: 'c7', name: 'Legumbres' },
];

// Tags (No colors)
export const mockTags: Tag[] = [
  { id: 't1', name: 'Sin TACC' },
  { id: 't2', name: 'Orgánico' },
  { id: 't3', name: 'Vegano' },
  { id: 't4', name: 'Oferta' },
  { id: 't5', name: 'Premium' },
];

// Product Variants Helper
const generateVariants = (productPrefix: string): ProductVariant[] => [
  {
    id: `${productPrefix}-v1`,
    name: 'Estándar',
    price: 299.99,
    stock: 45,
    type: 'normal',
    status: 'active',
    sku: `SKU-${productPrefix}-STD`,
  },
];

// Products
export const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Aceite Laur',
    description: 'Aceite de primera prensada en frio, ideal para cocinar y ensaladas.',
    brandId: 'b1',
    categoryId: 'c1',
    tags: ['t2', 't3'],
    status: 'activo',
    variants: [
      { id: 'p1-v1', name: 'Lata', price: 850.00, stock: 150, type: 'normal', status: 'activo', unit: 'l', profitMargin: 30 },
      { id: 'p1-v2', name: 'Botella', price: 920.00, stock: 89, type: 'normal', status: 'activo', unit: 'l', profitMargin: 32 },
    ],
    createdAt: new Date('2025-12-01'),
    updatedAt: new Date('2026-01-15'),
  },
  {
    id: 'p2',
    name: 'Almohaditas de Avena',
    description: 'Almohaditas crocantes de avena con diferentes sabores.',
    brandId: 'b2',
    categoryId: 'c3',
    tags: ['t3'],
    status: 'activo',
    variants: [
      { id: 'p2-v1', name: 'Chocolate', price: 320.00, stock: 234, type: 'normal', status: 'activo', unit: 'u', profitMargin: 40 },
      { id: 'p2-v2', name: 'Avellana', price: 350.00, stock: 156, type: 'normal', status: 'activo', unit: 'u', profitMargin: 40 },
      { id: 'p2-v3', name: 'Frutilla', price: 330.00, stock: 189, type: 'normal', status: 'activo', unit: 'u', profitMargin: 40 },
      { id: 'p2-v4', name: 'Limón', price: 330.00, stock: 142, type: 'normal', status: 'activo', unit: 'u', profitMargin: 40 },
    ],
    createdAt: new Date('2025-10-15'),
    updatedAt: new Date('2026-02-01'),
  },
  {
    id: 'p3',
    name: 'Arroz',
    description: 'Arroz de excelente calidad en diferentes variedades.',
    brandId: 'b2',
    categoryId: 'c3',
    tags: ['t2', 't3'],
    status: 'activo',
    variants: [
      { id: 'p3-v1', name: 'Yamaní', price: 450.00, stock: 123, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 35 },
      { id: 'p3-v2', name: 'Sushi', price: 520.00, stock: 98, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 35 },
      { id: 'p3-v3', name: 'Basmati', price: 680.00, stock: 87, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 38 },
    ],
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-02-05'),
  },
  {
    id: 'p4',
    name: 'Harina',
    description: 'Harinas de diferentes tipos para todos tus preparados.',
    brandId: 'b3',
    categoryId: 'c2',
    tags: ['t1', 't5'],
    status: 'activo',
    variants: [
      { id: 'p4-v1', name: 'Almendras', price: 2500.00, stock: 34, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 45 },
      { id: 'p4-v2', name: 'Avena', price: 580.00, stock: 123, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 35 },
      { id: 'p4-v3', name: 'Integral', price: 420.00, stock: 156, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 30 },
      { id: 'p4-v4', name: 'Centeno', price: 680.00, stock: 78, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 35 },
    ],
    createdAt: new Date('2025-11-20'),
    updatedAt: new Date('2026-01-28'),
  },
  {
    id: 'p5',
    name: 'Té',
    description: 'Tés e infusiones de alta calidad.',
    brandId: 'b4',
    categoryId: 'c6',
    tags: ['t2', 't5'],
    status: 'activo',
    variants: [
      { id: 'p5-v1', name: 'Verde', price: 1200.00, stock: 145, type: 'normal', status: 'activo', unit: 'g', profitMargin: 50 },
      { id: 'p5-v2', name: 'Negro', price: 980.00, stock: 167, type: 'normal', status: 'activo', unit: 'g', profitMargin: 48 },
      { id: 'p5-v3', name: 'Matcha', price: 4500.00, stock: 45, type: 'normal', status: 'activo', unit: 'g', profitMargin: 55 },
      { id: 'p5-v4', name: 'Chai', price: 1350.00, stock: 98, type: 'normal', status: 'activo', unit: 'g', profitMargin: 52 },
    ],
    createdAt: new Date('2025-09-15'),
    updatedAt: new Date('2026-02-08'),
  },
  {
    id: 'p6',
    name: 'Granola',
    description: 'Granola artesanal con diferentes mezclas.',
    brandId: 'b1',
    categoryId: 'c3',
    tags: ['t2', 't3'],
    status: 'activo',
    variants: [
      { id: 'p6-v1', name: 'Original', price: 650.00, stock: 234, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 42 },
      { id: 'p6-v2', name: 'Con Miel', price: 780.00, stock: 189, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 42 },
      { id: 'p6-v3', name: 'Frutos Rojos', price: 890.00, stock: 156, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 45 },
    ],
    createdAt: new Date('2025-12-10'),
    updatedAt: new Date('2026-01-22'),
  },
  {
    id: 'p7',
    name: 'Pasta',
    description: 'Pastas secas de sémola y variedades integrales.',
    brandId: 'b2',
    categoryId: 'c1',
    tags: ['t3'],
    status: 'activo',
    variants: [
      { id: 'p7-v1', name: 'Spaghetti', price: 420.00, stock: 278, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 30 },
      { id: 'p7-v2', name: 'Fusilli', price: 450.00, stock: 234, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 30 },
      { id: 'p7-v3', name: 'Penne', price: 430.00, stock: 198, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 30 },
    ],
    createdAt: new Date('2025-11-05'),
    updatedAt: new Date('2026-02-12'),
  },
  {
    id: 'p8',
    name: 'Legumbres',
    description: 'Legumbres secas de primera calidad.',
    brandId: 'b1',
    categoryId: 'c7',
    tags: ['t2', 't3'],
    status: 'activo',
    variants: [
      { id: 'p8-v1', name: 'Lentejas', price: 450.00, stock: 312, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 35 },
      { id: 'p8-v2', name: 'Garbanzos', price: 520.00, stock: 267, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 35 },
      { id: 'p8-v3', name: 'Porotos Negros', price: 480.00, stock: 189, type: 'normal', status: 'activo', unit: 'kg', profitMargin: 35 },
    ],
    createdAt: new Date('2025-10-28'),
    updatedAt: new Date('2026-02-08'),
  },
];

// Orders
export const mockOrders: Order[] = [
  {
    id: 'o1',
    orderNumber: 'ORD-2026-0001',
    customerId: 'cust1',
    customerName: 'Sofia Lopez',
    customerEmail: 'sofia.l@example.com',
    items: [
      { id: 'oi1', variantId: 'p1-v1', productId: 'p1', quantity: 2, price: 450.00, status: 'completed' },
      { id: 'oi2', variantId: 'p2-v1', productId: 'p2', quantity: 1, price: 320.00, status: 'completed' },
    ],
    status: 'delivered',
    total: 1220.00,
    date: new Date('2026-02-01'),
  },
  {
    id: 'o2',
    orderNumber: 'ORD-2026-0002',
    customerId: 'cust2',
    customerName: 'Miguel Angel',
    customerEmail: 'miguel.a@example.com',
    items: [
      { id: 'oi3', variantId: 'p4-v2', productId: 'p4', quantity: 1, price: 5800.00, status: 'completed' },
    ],
    status: 'shipped',
    total: 5800.00,
    date: new Date('2026-02-05'),
  },
  {
    id: 'o3',
    orderNumber: 'ORD-2026-0003',
    customerId: 'cust3',
    customerName: 'Elena Rodriguez',
    customerEmail: 'elena.r@example.com',
    items: [
      { id: 'oi4', variantId: 'p3-v1', productId: 'p3', quantity: 3, price: 1200.00, status: 'pending' },
    ],
    status: 'pending',
    total: 3600.00,
    date: new Date('2026-02-10'),
  },
];

// Offers
export const mockOffers: Offer[] = [
  {
    id: 'of1',
    name: 'Descuento Sin TACC',
    type: 'PERCENTAGE',
    value: 15,
    variantIds: ['p4-v1', 'p4-v2'],
    productIds: [],
    discountQuantity: 0,
    discountValue: 0,
    quantityToGet: 0,
    stockThreshold: 0,
    startDate: new Date('2026-02-10'),
    endDate: new Date('2026-02-14'),
    status: 'active',
  },
];

// Stock Movements
export const mockStockMovements: StockMovement[] = [
  { id: 'sm1', productId: 'p1', variantId: 'p1-v1', type: 'sale', quantity: -2, reference: 'ORD-2026-0001', date: new Date('2026-02-01') },
  { id: 'sm2', productId: 'p2', variantId: 'p2-v1', type: 'sale', quantity: -1, reference: 'ORD-2026-0001', date: new Date('2026-02-01') },
  { id: 'sm3', productId: 'p4', variantId: 'p4-v2', type: 'sale', quantity: -1, reference: 'ORD-2026-0002', date: new Date('2026-02-05') },
  { id: 'sm4', productId: 'p1', variantId: 'p1-v1', type: 'purchase', quantity: 50, reference: 'PO-2026-001', date: new Date('2026-01-28') },
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