import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CornerDownLeft, PackageSearch, Search, ShoppingCart } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { sections } from './Sidebar';
import { useAppDispatch, useAppSelector } from '../store';
import { patchFilters } from '../store/filtersSlice';
import { hasPermission, type Permission } from '../lib/permissions';

/**
 * Paleta de comandos (Ctrl/⌘+K): salta a cualquier sección del panel y
 * ofrece búsqueda global de pedidos y productos con el texto ingresado.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const can = useCallback((p?: Permission) => !p || hasPermission(user, p), [user]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    setTerm('');
    navigate(path);
  };

  const navItems = useMemo(
    () =>
      sections
        .map((s) => ({ title: s.title, items: s.items.filter((i) => can(i.perm)) }))
        .filter((s) => s.items.length > 0),
    [can],
  );

  const q = term.trim();
  // Los filtros de los listados viven en Redux (no en la URL): hay que parcharos antes de navegar.
  const searchOrders = () => {
    dispatch(patchFilters({ key: 'orders', patch: { q, page: 1 } }));
    go('/dashboard/orders');
  };
  const searchProducts = () => {
    dispatch(patchFilters({ key: 'products', patch: { name: q, page: 1 } }));
    go('/dashboard/products');
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Búsqueda y comandos" description="Navegá al panel o buscá pedidos y productos">
      <CommandInput placeholder="Escribí una sección, o buscá pedidos y productos…" value={term} onValueChange={setTerm} />
      <CommandList>
        <CommandEmpty>Sin resultados para “{q}”.</CommandEmpty>
        {q.length >= 2 && (
          <CommandGroup heading="Búsquedas">
            <CommandItem value={`buscar pedido ${q}`} onSelect={searchOrders}>
              <ShoppingCart />
              <span>
                Buscar “{q}” en <strong>órdenes</strong> (email, nombre, seguimiento, producto)
              </span>
              <CornerDownLeft className="ml-auto" />
            </CommandItem>
            <CommandItem value={`buscar producto ${q}`} onSelect={searchProducts}>
              <PackageSearch />
              <span>
                Buscar “{q}” en <strong>productos</strong>
              </span>
              <CornerDownLeft className="ml-auto" />
            </CommandItem>
          </CommandGroup>
        )}
        {navItems.map((s) => (
          <CommandGroup key={s.title} heading={s.title}>
            {s.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.path} value={`${item.label} ${s.title}`} onSelect={() => go(item.path)}>
                  <Icon />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
        {!q && (
          <CommandGroup heading="Atajos">
            <CommandItem value="atajo ctrl k" onSelect={() => setOpen(false)}>
              <Search />
              <span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">Ctrl</kbd> +{' '}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">K</kbd> abre esta paleta desde cualquier pantalla
              </span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
