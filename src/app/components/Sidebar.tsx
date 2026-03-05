import { useState } from "react";
import { Link, useLocation } from "react-router";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "../lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import { Button } from "./ui/button";

const menuItems = [
  {
    icon: LayoutDashboard,
    label: "Inicio",
    path: "/dashboard",
  },
  {
    icon: Package,
    label: "Productos",
    path: "/dashboard/products",
  },
  {
    icon: ShoppingCart,
    label: "Órdenes",
    path: "/dashboard/orders",
  },
  { icon: Tag, label: "Ofertas", path: "/dashboard/offers" },
  {
    icon: Building2,
    label: "Proveedores",
    path: "/dashboard/suppliers",
  },
  { icon: Award, label: "Marcas", path: "/dashboard/brands" },
  {
    icon: FolderTree,
    label: "Categorías",
    path: "/dashboard/categories",
  },
  { icon: Hash, label: "Etiquetas", path: "/dashboard/tags" },
  {
    icon: BarChart3,
    label: "Estadísticas",
    path: "/dashboard/statistics",
  },
  {
    icon: Settings,
    label: "Administración",
    path: "/dashboard/administration",
  },
];

export function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "bg-sidebar border-r border-sidebar-border flex-shrink-0 transition-all duration-300 relative flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-4 flex items-center justify-between h-16">
        {!collapsed && (
          <h1 className="text-sidebar-foreground font-bold truncate">
            Panel Admin
          </h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed ? "mx-auto" : "ml-auto"
          )}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>

      <nav className="flex-1 px-3 space-y-2 overflow-y-auto py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          const LinkComponent = (
            <Link
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-black/5 dark:hover:bg-white/10",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>{LinkComponent}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.path}>{LinkComponent}</div>;
        })}
      </nav>
      
      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold">
                 AU
             </div>
             {!collapsed && (
                 <div className="flex flex-col">
                     <span className="text-sm font-medium text-sidebar-foreground">Admin Usuario</span>
                     <span className="text-xs text-muted-foreground">admin@example.com</span>
                 </div>
             )}
        </div>
      </div>
    </aside>
  );
}