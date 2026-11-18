import { Award } from 'lucide-react';
import { brandsApi } from '../api/resources';
import type { Brand } from '../api/types';
import { MasterPage, type MasterApi, type MasterConfig } from '../components/masters/MasterPage';
import { RelationEditor } from '../components/masters/RelationEditor';
import { BrandSelect, ProductMultiSelect } from '../components/CatalogPickers';
import { formatDate } from '../lib/utils';
import { useCan } from '../hooks/useCan';

function BrandDetail({ brand }: { brand: Brand }) {
  const [setProducts] = brandsApi.useProducts();
  const canAssociate = useCan()('catalog.delete');
  return (
    <>
      {brand.description && <p className="text-sm text-muted-foreground">{brand.description}</p>}
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Creada</dt>
          <dd>{formatDate(brand.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Actualizada</dt>
          <dd>{formatDate(brand.updatedAt)}</dd>
        </div>
      </dl>
      <RelationEditor
        title="Productos"
        readOnly={!canAssociate}
        items={brand.products ?? []}
        linkTo={(id) => `/dashboard/products/${id}`}
        emptyText="La marca no tiene productos"
        onChange={(ids, attach) => setProducts(brand.id, ids, attach)}
        renderPicker={(p) => <ProductMultiSelect {...p} placeholder="Buscar productos para asociar" />}
        // Todo producto tiene marca: no se "quita", se pasa a otra (asociarlo a la otra lo mueve).
        removable={false}
        moveLabel="Pasar a otra marca"
        onMove={(ids, to) => setProducts(to, ids, true)}
        renderMoveTarget={(p) => <BrandSelect {...p} exclude={[brand.id]} placeholder="Pasar a marca…" />}
      />
      <RelationEditor
        title="Proveedores"
        readOnly
        items={brand.suppliers ?? []}
        emptyText="Ningún proveedor distribuye esta marca"
      />
      <p className="text-xs text-muted-foreground">
        {canAssociate
          ? 'Un producto siempre tiene una marca: para sacarlo de esta, pasalo a otra con el botón de flechas. '
          : 'Solo un administrador puede asociar o pasar productos a otra marca. '}
        Los proveedores se asignan desde Proveedores.
      </p>
    </>
  );
}

const config: MasterConfig<Brand> = {
  key: 'brands',
  title: 'Marcas',
  description: 'Marcas de los productos y qué proveedores las distribuyen.',
  noun: 'la marca',
  createLabel: 'Nueva marca',
  api: brandsApi as unknown as MasterApi<Brand>,
  emptyIcon: <Award className="w-6 h-6" />,
  extraTextFilters: [{ key: 'suppliers', placeholder: 'Proveedor…' }],
  fields: [
    { name: 'name', label: 'Nombre', required: true, placeholder: 'Canela en Rama' },
    { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Marca propia' },
  ],
  columns: [
    {
      key: 'description',
      header: 'Descripción',
      hideOnMobile: true,
      cell: (r) => <span className="text-muted-foreground line-clamp-1">{r.description || '—'}</span>,
    },
    {
      key: 'suppliers',
      header: 'Proveedores',
      hideOnMobile: true,
      cell: (r) =>
        r.suppliers?.length ? (
          <span className="line-clamp-1">{r.suppliers.map((s) => s.name).join(', ')}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
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
  renderDetail: (r) => <BrandDetail brand={r} />,
};

export default function Brands() {
  return <MasterPage config={config} />;
}

