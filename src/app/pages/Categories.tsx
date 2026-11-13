import { FolderTree } from 'lucide-react';
import { categoriesApi } from '../api/resources';
import type { Category } from '../api/types';
import { MasterPage, type MasterApi, type MasterConfig } from '../components/masters/MasterPage';
import { RelationEditor } from '../components/masters/RelationEditor';

const config: MasterConfig<Category> = {
  key: 'categories',
  title: 'Categorías',
  description: 'Agrupan los productos del catálogo (ej. Frutos secos, Especias).',
  noun: 'la categoría',
  createLabel: 'Nueva categoría',
  api: categoriesApi as unknown as MasterApi<Category>,
  emptyIcon: <FolderTree className="w-6 h-6" />,
  extraTextFilters: [{ key: 'products', placeholder: 'Contiene producto…' }],
  fields: [
    { name: 'name', label: 'Nombre', required: true, placeholder: 'Frutos secos', hint: 'Debe ser único.' },
    { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Almendras, nueces y más' },
  ],
  columns: [
    {
      key: 'description',
      header: 'Descripción',
      hideOnMobile: true,
      cell: (r) => <span className="text-muted-foreground line-clamp-1">{r.description || '—'}</span>,
    },
    {
      key: 'products',
      header: 'Productos',
      align: 'right',
      cell: (r) => <span className="tabular-nums">{r.products?.length ?? 0}</span>,
    },
  ],
  toForm: (r) => ({ name: r?.name ?? '', description: r?.description ?? '' }),
  toBody: (v) => ({ name: v.name.trim(), description: v.description.trim() || undefined }),
  renderDetail: (r) => (
    <>
      {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
      <RelationEditor
        title="Productos"
        readOnly
        items={r.products ?? []}
        linkTo={(id) => `/dashboard/products/${id}`}
        emptyText="Ningún producto usa esta categoría"
      />
      <p className="text-xs text-muted-foreground">
        La categoría de un producto se cambia desde la ficha del producto.
      </p>
    </>
  ),
};

export default function Categories() {
  return <MasterPage config={config} />;
}
