import { Hash } from 'lucide-react';
import { tagsApi } from '../api/resources';
import type { Tag } from '../api/types';
import { MasterPage, type MasterApi, type MasterConfig } from '../components/masters/MasterPage';
import { RelationEditor } from '../components/masters/RelationEditor';

const config: MasterConfig<Tag> = {
  key: 'tags',
  title: 'Etiquetas',
  description: 'Atributos transversales para filtrar el catálogo (ej. Sin TACC, Orgánico).',
  noun: 'la etiqueta',
  createLabel: 'Nueva etiqueta',
  api: tagsApi as unknown as MasterApi<Tag>,
  emptyIcon: <Hash className="w-6 h-6" />,
  fields: [{ name: 'name', label: 'Nombre', required: true, placeholder: 'Sin TACC', hint: 'Debe ser único.' }],
  columns: [
    {
      key: 'products',
      header: 'Productos',
      align: 'right',
      cell: (r) => <span className="tabular-nums">{r.products?.length ?? 0}</span>,
    },
  ],
  toForm: (r) => ({ name: r?.name ?? '' }),
  toBody: (v) => ({ name: v.name.trim() }),
  renderDetail: (r) => (
    <>
      <RelationEditor
        title="Productos etiquetados"
        readOnly
        items={r.products ?? []}
        linkTo={(id) => `/dashboard/products/${id}`}
        emptyText="Ningún producto tiene esta etiqueta"
      />
      <p className="text-xs text-muted-foreground">Las etiquetas se asignan desde la ficha de cada producto.</p>
    </>
  ),
};

export default function Tags() {
  return <MasterPage config={config} />;
}
