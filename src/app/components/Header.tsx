import { useState, type FormEvent } from 'react';
import { Search, Moon, Sun, LogOut, Menu, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '../store';
import { signOut } from '../store/authSlice';
import { toggleTheme } from '../store/uiSlice';
import { patchFilters } from '../store/filtersSlice';

interface HeaderProps {
  title?: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((st) => st.auth.user);
  const theme = useAppSelector((st) => st.ui.theme);
  const displayName = user?.name || user?.email?.split('@')[0] || 'Usuario';
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [query, setQuery] = useState('');

  const handleLogout = async () => {
    await dispatch(signOut());
    navigate('/login');
  };

  // La búsqueda global aplica el filtro de nombre del listado de productos (?name=).
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    dispatch(patchFilters({ key: 'products', patch: { name: query.trim(), page: 1 } }));
    navigate('/dashboard/products');
    setQuery('');
  };

  return (
    <header className="h-16 bg-card/80 backdrop-blur border-b border-border flex items-center gap-3 px-4 sm:px-6 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden w-10 h-10 -ml-2 flex items-center justify-center rounded-lg hover:bg-accent"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {title && <div className="font-medium text-foreground lg:hidden truncate">{title}</div>}

      <form onSubmit={handleSearch} className="hidden sm:block flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos..."
            aria-label="Buscar productos"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </form>

      <div className="flex items-center gap-1 ml-auto">
        <button
          onClick={() => dispatch(toggleTheme())}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent text-foreground transition-colors"
          aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
        >
          {theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-1 pr-2 h-9 rounded-lg hover:bg-accent transition-colors"
            aria-haspopup="menu"
            aria-expanded={showUserMenu}
          >
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
              {displayName[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-foreground hidden md:inline">{displayName}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:inline" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div role="menu" className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
                <div className="px-4 py-2 border-b border-border">
                  <div className="text-sm font-medium text-foreground truncate">{displayName}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(user?.roles ?? []).map((r) => (
                      <span key={r} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
