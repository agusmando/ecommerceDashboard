import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
  Building2,
  Award,
  FolderTree,
  Hash,
  BarChart3,
  Settings,
  Boxes,
  ArrowLeftRight,
  PackageSearch,
  ShoppingBasket,
  Truck,
  MapPinned,
  MessageSquareText,
  TicketPercent,
  GalleryHorizontal,
  ChevronsLeft,
  Users,
  ChevronsRight,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useAppDispatch, useAppSelector } from '../store';
import { toggleSidebar } from '../store/uiSlice';
import { orderItemsApi, ordersApi, useReviewStatsQuery } from '../api/resources';
import { hasPermission, ROLE_LABEL, type Permission, type StaffRole } from '../lib/permissions';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  end?: boolean;
  /** Contador en vivo (sale de la cache de RTK Query). */
  count?: 'pendingOrders' | 'awaitingItems' | 'pendingReviews';
  /** Sin este permiso el ítem no aparece (la ruta también lo exige). */
  perm?: Permission;
}

const sections: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Ventas',
    items: [
      { icon: LayoutDashboard, label: 'Inicio', path: '/dashboard', end: true },
      { icon: ShoppingCart, label: 'Órdenes', path: '/dashboard/orders', count: 'pendingOrders', perm: 'orders.manage' },
      { icon: Truck, label: 'Envíos', path: '/dashboard/shipments', perm: 'orders.manage' },
      { icon: MapPinned, label: 'Tarifas de envío', path: '/dashboard/shipping-zones', perm: 'shipping.config' },
      { icon: PackageSearch, label: 'Reposición', path: '/dashboard/restock', count: 'awaitingItems', perm: 'orders.manage' },
      { icon: ShoppingBasket, label: 'Carritos', path: '/dashboard/carts', perm: 'orders.manage' },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { icon: Package, label: 'Productos', path: '/dashboard/products' },
      { icon: Boxes, label: 'Inventario', path: '/dashboard/inventory' },
      { icon: ArrowLeftRight, label: 'Movimientos', path: '/dashboard/movements' },
      { icon: Tag, label: 'Ofertas', path: '/dashboard/offers', perm: 'offers.edit' },
      { icon: TicketPercent, label: 'Códigos', path: '/dashboard/discounts', perm: 'offers.edit' },
    ],
  },
  {
    title: 'Contenido',
    items: [
      { icon: MessageSquareText, label: 'Reseñas', path: '/dashboard/reviews', count: 'pendingReviews', perm: 'content.edit' },
      { icon: GalleryHorizontal, label: 'Banners', path: '/dashboard/banners', perm: 'content.edit' },
    ],
  },
  {
    title: 'Maestros',
    items: [
      { icon: FolderTree, label: 'Categorías', path: '/dashboard/categories', perm: 'masters.edit' },
      { icon: Award, label: 'Marcas', path: '/dashboard/brands', perm: 'masters.edit' },
      { icon: Building2, label: 'Proveedores', path: '/dashboard/suppliers', perm: 'masters.edit' },
      { icon: Hash, label: 'Etiquetas', path: '/dashboard/tags', perm: 'masters.edit' },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { icon: BarChart3, label: 'Estadísticas', path: '/dashboard/statistics' },
      { icon: Users, label: 'Usuarios', path: '/dashboard/users', perm: 'users.manage' },
      { icon: Settings, label: 'Administración', path: '/dashboard/administration' },
    ],
  },
];

/** Totales chicos para los badges del menú (amountPerPage=1 → sólo interesa totalAmount). */
function useMenuCounts(can: (p: Permission) => boolean) {
  const opts = { pollingInterval: 60_000 };
  const pending = ordersApi.usePage({ status: 'PENDING', amountPerPage: 1 }, { ...opts, skip: !can('orders.manage') });
  const awaiting = orderItemsApi.usePage({ status: 'AWAITING_STOCK', amountPerPage: 1 }, { ...opts, skip: !can('orders.manage') });
  const reviews = useReviewStatsQuery(undefined, { ...opts, skip: !can('content.edit') });
  return {
    pendingOrders: pending.data?.pagination.totalAmount ?? 0,
    awaitingItems: awaiting.data?.pagination.totalAmount ?? 0,
    pendingReviews: reviews.data?.pending ?? 0,
  };
}

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((st) => st.auth.user);
  const collapsed = useAppSelector((st) => st.ui.sidebarCollapsed);
  const can = (p: Permission) => hasPermission(user, p);
  const counts = useMenuCounts(can);
  const visibleSections = sections
    .map((section) => ({ ...section, items: section.items.filter((i) => !i.perm || can(i.perm)) }))
    .filter((section) => section.items.length > 0);
  const roleLabel = (user?.roles ?? [])
    .filter((r): r is StaffRole => r in ROLE_LABEL && r !== 'CUSTOMER')
    .map((r) => ROLE_LABEL[r])
    .join(' · ');

  const displayName = user?.name || user?.email?.split('@')[0] || 'Usuario';
  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // En mobile siempre se muestra expandido.
  const isCollapsed = collapsed && !mobileOpen;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onMobileClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          'bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0 transition-all duration-300',
          'fixed inset-y-0 left-0 z-50 w-64 lg:static lg:translate-x-0',
          // invisible: con el menú cerrado en mobile, sus links no reciben foco con Tab
          mobileOpen ? 'translate-x-0' : '-translate-x-full invisible lg:visible',
          isCollapsed && 'lg:w-[72px]',
        )}
      >
        <div className={cn('h-16 flex items-center gap-2 px-4 border-b border-sidebar-border', isCollapsed && 'justify-center px-0')}>
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
            CR
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sidebar-foreground truncate leading-tight">Canela en Rama</div>
              <div className="text-xs text-muted-foreground">Panel de administración</div>
            </div>
          )}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:bg-sidebar-accent"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {visibleSections.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
                <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const link = (
                    <NavLink
                      to={item.path}
                      end={item.end}
                      onClick={onMobileClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                            : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                          isCollapsed && 'justify-center px-0 py-2.5',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className="relative">
                            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                            {isCollapsed && item.count && counts[item.count] > 0 && (
                              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500" />
                            )}
                          </span>
                          {!isCollapsed && (
                            <>
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.count && counts[item.count] > 0 && (
                                <span
                                  className={cn(
                                    'min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums',
                                    isActive
                                      ? 'bg-white/15 text-inherit'
                                      : 'bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300',
                                  )}
                                >
                                  {counts[item.count]}
                                </span>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                  return isCollapsed ? (
                    <Tooltip key={item.path} delayDuration={0}>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">
                        {item.label}
                        {item.count && counts[item.count] > 0 ? ` (${counts[item.count]})` : ''}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div key={item.path}>{link}</div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={cn('border-t border-sidebar-border p-3 flex items-center gap-3', isCollapsed && 'flex-col')}>
          <div className="w-9 h-9 rounded-full bg-sidebar-accent text-sidebar-foreground flex items-center justify-center text-sm font-semibold shrink-0">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground truncate">{roleLabel || user?.role}</div>
            </div>
          )}
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="hidden lg:flex p-1.5 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
}
