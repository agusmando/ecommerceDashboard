import { Building2 } from 'lucide-react';
import { suppliersApi } from '../api/resources';
import type { Id, Supplier } from '../api/types';
import { MasterPage, type MasterApi, type MasterConfig } from '../components/masters/MasterPage';
import { RelationEditor } from '../components/masters/RelationEditor';
import { BrandMultiSelect } from '../components/CatalogPickers';
import { Field } from '../components/Form';
import { formatDate } from '../lib/utils';

function SupplierDetail({ supplier }: { supplier: Supplier }) {
  const [setBrands] = suppliersApi.useBrands();
  return (
    <>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="col-span-2">
          <dt className="text-muted-foreground">Contacto</dt>
          <dd className="break-words">{supplier.contact || '—'}</dd>
        </div>
        {supplier.description && (
          <div className="col-span-2">
            <dt className="text-muted-foreground">Descripción</dt>
            <dd>{supplier.description}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">Alta</dt>
          <dd>{formatDate(supplier.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Actualizado</dt>
          <dd>{formatDate(supplier.updatedAt)}</dd>
        </div>
      </dl>
      <RelationEditor
        title="Marcas que distribuye"
        items={supplier.brands ?? []}
        emptyText="Sin marcas asociadas"
        onChange={(ids, attach) => setBrands(supplier.id, ids, attach)}
        renderPicker={(p) => <BrandMultiSelect {...p} placeholder="Elegí marcas para asociar" />}
      />
    </>
  );
}

const config: MasterConfig<Supplier> = {
  key: 'suppliers',
  title: 'Proveedores',
  description: 'Quién te provee cada marca y cómo contactarlo.',
  noun: 'el proveedor',
  createLabel: 'Nuevo proveedor',
  api: suppliersApi as unknown as MasterApi<Supplier>,
  emptyIcon: <Building2 className="w-6 h-6" />,
  extraTextFilters: [
    { key: 'contact', placeholder: 'Contacto…' },
    { key: 'brands', placeholder: 'Marca…' },
  ],
  fields: [
    { name: 'name', label: 'Nombre', required: true, placeholder: 'Distribuidora Norte' },
    { name: 'contact', label: 'Contacto', placeholder: 'ventas@norte.com / 11-5555-5555' },
    { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Frutos secos a granel' },
  ],
  columns: [
    {
      key: 'contact',
      header: 'Contacto',
      cell: (r) => <span className="line-clamp-1 text-muted-foreground">{r.contact || '—'}</span>,
    },
    {
      key: 'brands',
      header: 'Marcas',
      hideOnMobile: true,
      cell: (r) =>
        r.brands?.length ? (
          <div className="flex flex-wrap gap-1">
            {r.brands.slice(0, 3).map((b) => (
              <span key={b.id} className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                {b.name}
              </span>
            ))}
            {r.brands.length > 3 && <span className="text-xs text-muted-foreground">+{r.brands.length - 3}</span>}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ],
  toForm: (r) => ({ name: r?.name ?? '', contact: r?.contact ?? '', description: r?.description ?? '' }),
  toBody: (v) => ({
    name: v.name.trim(),
    contact: v.contact.trim() || undefined,
    description: v.description.trim() || undefined,
  }),
  createExtra: ({ extra, setExtra }) => (
    <Field label="Marcas" hint="Opcional. También podés asociarlas después.">
      <BrandMultiSelect value={(extra as Id[]) ?? []} onChange={setExtra} />
    </Field>
  ),
  withExtra: (body, extra) => ({
    ...(body as object),
    brands: ((extra as Id[]) ?? []).map((id) => ({ id })),
  }),
  renderDetail: (r) => <SupplierDetail supplier={r} />,
};

export default function Suppliers() {
  return <MasterPage config={config} />;
}
