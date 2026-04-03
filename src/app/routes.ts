import { createBrowserRouter } from 'react-router';

// Auth Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';

// Dashboard Pages
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Offers from './pages/Offers';
import Suppliers from './pages/Suppliers';
import Brands from './pages/Brands';
import Categories from './pages/Categories';
import Tags from './pages/Tags';
import Statistics from './pages/Statistics';
import Administration from './pages/Administration';
import GoogleCallback from './pages/GoogleCallback';

export const router = createBrowserRouter([
  {
    path: '/',
    loader: () => ({ redirect: '/login' }),
    Component: Login,
  },
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/forgot-password',
    Component: ForgotPassword,
  },
  {
    path: '/dashboard',
    Component: Dashboard,
  },
  {
    path: '/dashboard/products',
    Component: Products,
  },
  {
    path: '/dashboard/products/:id',
    Component: ProductDetail,
  },
  {
    path: '/dashboard/orders',
    Component: Orders,
  },
  {
    path: '/dashboard/orders/:id',
    Component: OrderDetail,
  },
  {
    path: '/dashboard/offers',
    Component: Offers,
  },
  {
    path: '/dashboard/suppliers',
    Component: Suppliers,
  },
  {
    path: '/dashboard/brands',
    Component: Brands,
  },
  {
    path: '/dashboard/categories',
    Component: Categories,
  },
  {
    path: '/dashboard/tags',
    Component: Tags,
  },
  {
    path: '/dashboard/statistics',
    Component: Statistics,
  },
  {
    path: '/dashboard/administration',
    Component: Administration,
  },
  {
    path: "/auth/callback/google",
    Component: GoogleCallback 
  }
]);
