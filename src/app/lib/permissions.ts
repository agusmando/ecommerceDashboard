import type { User } from '../api/types';

/**
 * Permisos del RBAC. La definición de qué rol tiene qué permiso vive en el
 * backend (src/config/rbac.ts) y llega en `GET /user/me`; acá solo se usan
 * para mostrar u ocultar secciones y botones. El backend vuelve a validar todo.
 */
export type Permission =
  | 'dashboard.access'
  | 'orders.manage'
  | 'stock.manage'
  | 'catalog.edit'
  | 'masters.edit'
  | 'offers.edit'
  | 'content.edit'
  | 'catalog.delete'
  | 'shipping.config'
  | 'users.manage'
  | 'payments.refund';

export type StaffRole = 'ADMIN' | 'EDITOR' | 'EMPLOYEE';

export const ROLE_LABEL: Record<StaffRole | 'CUSTOMER', string> = {
  ADMIN: 'Administrador',
  EDITOR: 'Editor',
  EMPLOYEE: 'Empleado',
  CUSTOMER: 'Cliente',
};

export const hasPermission = (user: User | null | undefined, permission: Permission) => {
  if (!user) return false;
  if (user.permissions) return user.permissions.includes(permission);
  // Backend anterior al RBAC: solo había ADMIN / EMPLOYEE.
  return (user.roles ?? []).includes('ADMIN') || (permission !== 'users.manage' && permission !== 'payments.refund' && (user.roles ?? []).includes('EMPLOYEE'));
};

/** Textos cortos para la UI (la definición completa está en el backend). */
export const PERMISSION_LABEL: Record<Permission, string> = {
  'dashboard.access': 'Entrar al panel, ver catálogo, stock y estadísticas',
  'orders.manage': 'Órdenes, envíos, reposición y carritos',
  'stock.manage': 'Registrar movimientos de stock',
  'catalog.edit': 'Editar productos, imágenes, descripciones y precios',
  'masters.edit': 'Categorías, marcas, etiquetas y proveedores',
  'offers.edit': 'Ofertas',
  'content.edit': 'Banners y moderación de reseñas',
  'catalog.delete': 'Dar de baja productos',
  'shipping.config': 'Tarifas de envío',
  'users.manage': 'Usuarios y roles',
  'payments.refund': 'Devolver dinero por Mercado Pago',
};

export const ROLE_TONE = {
  ADMIN: 'violet',
  EDITOR: 'info',
  EMPLOYEE: 'success',
  CUSTOMER: 'default',
} as const;
