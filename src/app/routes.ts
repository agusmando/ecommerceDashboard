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
  { path: '/auth/callback/google', lazy: page(() => import('./pages/GoogleCallback')) },
  {
    path: '/dashboard',
    Component: DashboardLayout,
    children: [
      { index: true, lazy: page(() => import('./pages/Dashboard')), handle: h({ title: 'Inicio' }) },
      { path: 'orders', lazy: page(() => import('./pages/Orders')), handle: h({ title: 'Órdenes', perm: 'orders.manage' }) },
      { path: 'orders/:id', lazy: page(() => import('./pages/OrderDetail')), handle: h({ title: 'Orden', perm: 'orders.manage' }) },
      { path: 'shipments', lazy: page(() => import('./pages/Shipments')), handle: h({ title: 'Envíos', perm: 'orders.manage' }) },
      { path: 'shipping-zones', lazy: page(() => import('./pages/ShippingZones')), handle: h({ title: 'Tarifas de envío', perm: 'shipping.config' }) },
      { path: 'shipments/:id', lazy: page(() => import('./pages/ShipmentDetail')), handle: h({ title: 'Envío', perm: 'orders.manage' }) },
      { path: 'restock', lazy: page(() => import('./pages/Restock')), handle: h({ title: 'Reposición', perm: 'orders.manage' }) },
      { path: 'carts', lazy: page(() => import('./pages/Carts')), handle: h({ title: 'Carritos', perm: 'orders.manage' }) },
      { path: 'products', lazy: page(() => import('./pages/Products')), handle: h({ title: 'Productos' }) },
      { path: 'products/:id', lazy: page(() => import('./pages/ProductDetail')), handle: h({ title: 'Producto' }) },
      { path: 'inventory', lazy: page(() => import('./pages/Inventory')), handle: h({ title: 'Inventario' }) },
      { path: 'movements', lazy: page(() => import('./pages/Movements')), handle: h({ title: 'Movimientos' }) },
      { path: 'offers', lazy: page(() => import('./pages/Offers')), handle: h({ title: 'Ofertas', perm: 'offers.edit' }) },
      { path: 'reviews', lazy: page(() => import('./pages/Reviews')), handle: h({ title: 'Reseñas', perm: 'content.edit' }) },
      { path: 'banners', lazy: page(() => import('./pages/Banners')), handle: h({ title: 'Banners', perm: 'content.edit' }) },
      { path: 'categories', lazy: page(() => import('./pages/Categories')), handle: h({ title: 'Categorías', perm: 'masters.edit' }) },
      { path: 'brands', lazy: page(() => import('./pages/Brands')), handle: h({ title: 'Marcas', perm: 'masters.edit' }) },
      { path: 'suppliers', lazy: page(() => import('./pages/Suppliers')), handle: h({ title: 'Proveedores', perm: 'masters.edit' }) },
      { path: 'tags', lazy: page(() => import('./pages/Tags')), handle: h({ title: 'Etiquetas', perm: 'masters.edit' }) },
      { path: 'statistics', lazy: page(() => import('./pages/Statistics')), handle: h({ title: 'Estadísticas' }) },
      { path: 'users', lazy: page(() => import('./pages/Users')), handle: h({ title: 'Usuarios', perm: 'users.manage' }) },
      { path: 'administration', lazy: page(() => import('./pages/Administration')), handle: h({ title: 'Administración' }) },
      { path: '*', lazy: page(() => import('./pages/NotFound')), handle: h({ title: 'No encontrado' }) },
    ],
  },
  { path: '*', loader: () => redirect('/dashboard') },
]);
