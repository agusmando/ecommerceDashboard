import { useMemo, useState } from 'react';
import { brandsApi, categoriesApi, productsApi, suppliersApi, tagsApi, variantsApi } from '../api/resources';
import type { Id, ProductVariant } from '../api/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatQty } from '../lib/domain';
import { formatCurrency } from '../lib/utils';
import { Combobox, MultiSelect, type PickOption } from './Pickers';

/**
 * Opciones de maestros para selects y filtros. Todas leen de la misma cache de
 * RTK Query: aunque varios componentes las usen a la vez, se hace una sola request.
 */
function toOptions<T extends { id: Id; name: string; active: boolean }>(rows: T[] | undefined): PickOption[] {
  return (rows ?? [])
    .slice()
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
    .map((r) => ({ value: r.id, label: r.active ? r.name : `${r.name} (inactivo)` }));
}

export function useCategoryOptions() {
  const q = categoriesApi.useList();
  return { options: useMemo(() => toOptions(q.data), [q.data]), rows: q.data, loading: q.isLoading };
}
export function useBrandOptions() {
  const q = brandsApi.useList();
  return { options: useMemo(() => toOptions(q.data), [q.data]), rows: q.data, loading: q.isLoading };
}
export function useTagOptions() {
  const q = tagsApi.useList();
  return { options: useMemo(() => toOptions(q.data), [q.data]), rows: q.data, loading: q.isLoading };
}
export function useSupplierOptions() {
  const q = suppliersApi.useList();
  return { options: useMemo(() => toOptions(q.data), [q.data]), rows: q.data, loading: q.isLoading };
}

type SingleProps = { value: Id | null | undefined; onChange: (id: Id | null) => void; placeholder?: string; disabled?: boolean; clearable?: boolean };

export function CategorySelect(p: SingleProps) {
  const { options, loading } = useCategoryOptions();
  return <Combobox {...p} options={options} loading={loading} placeholder={p.placeholder ?? 'Elegí una categoría'} onChange={(v) => p.onChange(v as Id | null)} />;
}
export function BrandSelect(p: SingleProps) {
  const { options, loading } = useBrandOptions();
  return <Combobox {...p} options={options} loading={loading} placeholder={p.placeholder ?? 'Elegí una marca'} onChange={(v) => p.onChange(v as Id | null)} />;
}

type MultiProps = { value: Id[]; onChange: (ids: Id[]) => void; placeholder?: string; disabled?: boolean; exclude?: Id[] };

export function TagMultiSelect(p: MultiProps) {
  const { options, loading } = useTagOptions();
  return <MultiSelect {...p} options={options.filter((o) => !p.exclude?.includes(o.value as Id))} loading={loading} placeholder={p.placeholder ?? 'Agregar etiquetas'} onChange={(v) => p.onChange(v as Id[])} />;
}
export function BrandMultiSelect(p: MultiProps) {
  const { options, loading } = useBrandOptions();
  return <MultiSelect {...p} options={options.filter((o) => !p.exclude?.includes(o.value as Id))} loading={loading} placeholder={p.placeholder ?? 'Elegí marcas'} onChange={(v) => p.onChange(v as Id[])} />;
}

/** Productos con búsqueda en el servidor (`?name=`). */
export function ProductMultiSelect(p: MultiProps) {
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300);
  const { data, isFetching } = productsApi.usePage({ name: dq, amountPerPage: 30 });
  const options = useMemo(
    () => (data?.content ?? []).filter((x) => !p.exclude?.includes(x.id)).map((x) => ({ value: x.id, label: x.name })),
    [data, p.exclude],
  );
  return <MultiSelect {...p} options={options} loading={isFetching && !data} onSearch={setQ} placeholder={p.placeholder ?? 'Buscar productos'} onChange={(v) => p.onChange(v as Id[])} />;
}

/** Producto único con búsqueda en el servidor (`?name=`). `onChange` devuelve también el nombre. */
export function ProductPicker({
  value,
  label,
  onChange,
  placeholder = 'Buscar producto…',
  clearable,
  className,
}: {
  value: Id | null;
  label?: string;
  onChange: (id: Id | null, name?: string) => void;
  placeholder?: string;
  clearable?: boolean;
  className?: string;
}) {
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300);
  const { data, isFetching } = productsApi.usePage({ name: dq, amountPerPage: 30 });
  const rows = data?.content ?? [];
  return (
    <Combobox
      value={value}
      selectedLabel={label}
      onSearch={setQ}
      loading={isFetching && !data}
      placeholder={placeholder}
      searchPlaceholder="Nombre del producto…"
      clearable={clearable}
      className={className}
      options={rows.map((p) => ({ value: p.id, label: p.active ? p.name : `${p.name} (inactivo)` }))}
      onChange={(id) => onChange(id as Id | null, rows.find((r) => r.id === id)?.name)}
    />
  );
}

export function variantLabel(v: Pick<ProductVariant, 'name' | 'product'>) {
  const product = v.product?.name;
  return product && product !== v.name ? `${product} · ${v.name}` : v.name;
}

/**
 * Variante con búsqueda en el servidor (`/product/variant?name=…&detalle=true`).
 * `onChange` devuelve también la variante completa (stock, presentaciones, precio).
 */
export function VariantPicker({
  value,
  onChange,
  placeholder = 'Buscar variante…',
  selectedLabel,
  disabled,
  onlyActive = true,
  exclude,
}: {
  value: Id | null | undefined;
  onChange: (id: Id | null, variant?: ProductVariant) => void;
  placeholder?: string;
  selectedLabel?: string;
  disabled?: boolean;
  onlyActive?: boolean;
  exclude?: Id[];
}) {
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300);
  const { data, isFetching } = variantsApi.usePage({
    name: dq,
    detalle: true,
    active: onlyActive ? true : '',
    amountPerPage: 30,
  });
  const rows = useMemo(() => (data?.content ?? []).filter((v) => !exclude?.includes(v.id)), [data, exclude]);
  const options: PickOption[] = rows.map((v) => ({
    value: v.id,
    label: variantLabel(v),
    description: `Stock ${formatQty(v.currentStock, v.contentMeasure)} · ${formatCurrency(v.finalPrice)}${v.contentMeasure === 'KG' ? '/kg' : ''}`,
  }));
  return (
    <Combobox
      value={value}
      onChange={(id) => onChange(id as Id | null, rows.find((r) => r.id === id))}
      options={options}
      loading={isFetching && !data}
      onSearch={setQ}
      placeholder={placeholder}
      searchPlaceholder="Nombre de la variante…"
      selectedLabel={selectedLabel}
      disabled={disabled}
    />
  );
}
