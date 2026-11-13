import type React from 'react';
import { createBrowserRouter, redirect } from 'react-router';
import { DashboardLayout, type RouteHandle } from './layouts/DashboardLayout';
import Login from './pages/Login';

const h = (handle: RouteHandle) => handle;

/** Cada página se descarga recién al visitarla (code splitting por ruta). */
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await load()).default,
});

export const router = createBrowserRouter([
  { path: '/', loader: () => redirect('/dashboard') },
  { path: '/login', Component: Login },
  {
    path: '/dashboard',
    Component: DashboardLayout,
    children: [
      { index: true, lazy: page(() => import('./pages/Dashboard')), handle: h({ title: 'Inicio' }) },
      { path: 'orders', lazy: page(() => import('./pages/Orders')), handle: h({ title: 'Órdenes' }) },
      { path: 'orders/:id', lazy: page(() => import('./pages/OrderDetail')), handle: h({ title: 'Orden' }) },
      { path: 'shipments', lazy: page(() => import('./pages/Shipments')), handle: h({ title: 'Envíos' }) },
      { path: 'shipments/:id', lazy: page(() => import('./pages/ShipmentDetail')), handle: h({ title: 'Envío' }) },
      { path: 'restock', lazy: page(() => import('./pages/Restock')), handle: h({ title: 'Reposición' }) },
      { path: 'carts', lazy: page(() => import('./pages/Carts')), handle: h({ title: 'Carritos' }) },
      { path: 'products', lazy: page(() => import('./pages/Products')), handle: h({ title: 'Productos' }) },
      { path: 'products/:id', lazy: page(() => import('./pages/ProductDetail')), handle: h({ title: 'Producto' }) },
      { path: 'inventory', lazy: page(() => import('./pages/Inventory')), handle: h({ title: 'Inventario' }) },
      { path: 'movements', lazy: page(() => import('./pages/Movements')), handle: h({ title: 'Movimientos' }) },
      { path: 'offers', lazy: page(() => import('./pages/Offers')), handle: h({ title: 'Ofertas' }) },
      { path: 'reviews', lazy: page(() => import('./pages/Reviews')), handle: h({ title: 'Reseñas' }) },
      { path: 'banners', lazy: page(() => import('./pages/Banners')), handle: h({ title: 'Banners' }) },
      { path: 'categories', lazy: page(() => import('./pages/Categories')), handle: h({ title: 'Categorías' }) },
      { path: 'brands', lazy: page(() => import('./pages/Brands')), handle: h({ title: 'Marcas' }) },
      { path: 'suppliers', lazy: page(() => import('./pages/Suppliers')), handle: h({ title: 'Proveedores' }) },
      { path: 'tags', lazy: page(() => import('./pages/Tags')), handle: h({ title: 'Etiquetas' }) },
      { path: 'statistics', lazy: page(() => import('./pages/Statistics')), handle: h({ title: 'Estadísticas' }) },
      { path: 'administration', lazy: page(() => import('./pages/Administration')), handle: h({ title: 'Administración' }) },
      { path: '*', lazy: page(() => import('./pages/NotFound')), handle: h({ title: 'No encontrado' }) },
    ],
  },
  { path: '*', loader: () => redirect('/dashboard') },
]);
