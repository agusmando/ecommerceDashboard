import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Pencil, Plus, Power, PowerOff, Eye } from 'lucide-react';
import type { Id, Paginated } from '../../api/types';
import { getErrorMessage } from '../../api/client';
import { useListFilters } from '../../hooks/useListFilters';
import { useActiveToggle } from '../../hooks/useActiveToggle';
import { useAction } from '../../hooks/useAction';
import { PageHeader } from '../PageHeader';
import { Button } from '../Button';
import { DataTable, type Column } from '../DataTable';
import { ActiveFilter, FilterBar, SearchInput } from '../Filters';
import { RowActions } from '../RowActions';
import { ActiveBadge } from '../Badge';
import { Modal } from '../Modal';
import { Field, inputClass, Textarea } from '../Form';
import { FormError } from '../States';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';

/**
 * Página CRUD genérica para los maestros (categorías, etiquetas, marcas,
 * proveedores). Todos comparten: búsqueda por nombre, filtro activo/inactivo,
 * paginación, alta/edición en modal, baja lógica y panel de detalle opcional.
 */

export interface MasterRow {
  id: Id;
  name: string;
  active: boolean;
}

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'textarea';
  required?: boolean;
  placeholder?: string;
  hint?: string;
}

interface QueryLike<D> {
  data?: D;
  isLoading: boolean;
  isFetching: boolean;
  error?: unknown;
  refetch: () => void;
}

export interface MasterApi<T> {
  usePage: (params: Record<string, unknown>) => QueryLike<Paginated<T>>;
  useCreate: () => readonly [(body: never) => Promise<T>, unknown];
  useUpdate: () => readonly [(id: Id, body: never) => Promise<T>, unknown];
  useSetActive: () => readonly [(id: Id, active: boolean) => Promise<unknown>, unknown];
}

export interface MasterConfig<T extends MasterRow> {
  /** Clave de filtros en el store. */
  key: string;
  title: string;
  description: ReactNode;
  /** "la categoría", "el proveedor"… */
  noun: string;
  /** "Nueva categoría" */
  createLabel: string;
  api: MasterApi<T>;
  fields: FieldDef[];
  /** Filtros de texto adicionales (además de `name`), p. ej. `contact` o `brands`. */
  extraTextFilters?: { key: string; placeholder: string }[];
  columns: Column<T>[];
  toForm: (row?: T) => Record<string, string>;
  toBody: (values: Record<string, string>, row?: T) => unknown;
  /** Contenido extra del formulario de alta (p. ej. marcas del proveedor). */
  createExtra?: (state: { extra: unknown; setExtra: (v: unknown) => void }) => ReactNode;
  /** Combina el body con el estado de `createExtra`. */
  withExtra?: (body: unknown, extra: unknown) => unknown;
  /** Panel lateral de detalle (relaciones). */
  renderDetail?: (row: T) => ReactNode;
  emptyIcon?: ReactNode;
}

export function MasterPage<T extends MasterRow>({ config }: { config: MasterConfig<T> }) {
  const { api } = config;
  const textKeys = ['name', ...(config.extraTextFilters ?? []).map((f) => f.key)];
  const defaults: Record<string, string> = { name: '', active: '' };
  config.extraTextFilters?.forEach((f) => (defaults[f.key] = ''));

  const f = useListFilters(config.key, defaults, { textKeys });
  const { page, pageSize, ...filters } = f.debounced;
  const q = api.usePage({ ...filters, detalle: true, currentPage: page, amountPerPage: pageSize });

  const [setActive] = api.useSetActive();
  const toggle = useActiveToggle(setActive, config.noun);

  const [editing, setEditing] = useState<T | 'new' | null>(null);
  const [detail, setDetail] = useState<T | null>(null);

  // Mantener el panel de detalle sincronizado con la cache tras una mutación.
  const rows = q.data?.content;
  const liveDetail = detail ? rows?.find((r) => r.id === detail.id) ?? detail : null;

  const columns: Column<T>[] = [
    {
      key: 'name',
      header: 'Nombre',
      cell: (r) => <span className="font-medium">{r.name}</span>,
    },
    ...config.columns,
    { key: 'active', header: 'Estado', cell: (r) => <ActiveBadge active={r.active} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-12',
      cell: (r) => (
        <RowActions
          actions={[
            { label: 'Ver detalle', icon: <Eye className="w-4 h-4" />, onClick: () => setDetail(r), hidden: !config.renderDetail },
            { label: 'Editar', icon: <Pencil className="w-4 h-4" />, onClick: () => setEditing(r) },
            {
              label: r.active ? 'Desactivar' : 'Activar',
              icon: r.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />,
              onClick: () => toggle(r.id, r.name, r.active),
              danger: r.active,
              separator: true,
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="w-4 h-4" />
            {config.createLabel}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={q.isLoading}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        onRowClick={config.renderDetail ? (r) => setDetail(r) : (r) => setEditing(r)}
        empty={{
          title: f.activeCount ? 'Sin resultados para estos filtros' : `Todavía no hay ${config.title.toLowerCase()}`,
          icon: config.emptyIcon,
          action: f.activeCount ? (
            <Button variant="outline" size="sm" onClick={f.reset}>
              Limpiar filtros
            </Button>
          ) : (
            <Button size="sm" onClick={() => setEditing('new')}>
              <Plus className="w-4 h-4" />
              {config.createLabel}
            </Button>
          ),
        }}
        toolbar={
          <FilterBar activeCount={f.activeCount} onReset={f.reset}>
            <SearchInput
              value={String(f.values.name ?? '')}
              onChange={(v) => f.set({ name: v })}
              placeholder="Buscar por nombre…"
            />
            {config.extraTextFilters?.map((ef) => (
              <SearchInput
                key={ef.key}
                value={String(f.values[ef.key] ?? '')}
                onChange={(v) => f.set({ [ef.key]: v })}
                placeholder={ef.placeholder}
                className="sm:w-52"
              />
            ))}
            <ActiveFilter value={f.values.active as '' | 'true' | 'false'} onChange={(v) => f.set({ active: v })} />
          </FilterBar>
        }
        pagination={{
          info: q.data?.pagination,
          page,
          pageSize,
          onPageChange: f.setPage,
          onPageSizeChange: f.setPageSize,
        }}
      />

      <MasterFormModal config={config} target={editing} onClose={() => setEditing(null)} />

      {config.renderDetail && (
        <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            {liveDetail && (
              <>
                <SheetHeader className="border-b border-border">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-lg">{liveDetail.name}</SheetTitle>
                    <ActiveBadge active={liveDetail.active} />
                  </div>
                  <SheetDescription>Detalle y relaciones</SheetDescription>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(liveDetail)}>
                      <Pencil className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggle(liveDetail.id, liveDetail.name, liveDetail.active)}
                    >
                      {liveDetail.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      {liveDetail.active ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </SheetHeader>
                <div className="space-y-6 p-4">{config.renderDetail(liveDetail)}</div>
              </>
            )}
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

function MasterFormModal<T extends MasterRow>({
  config,
  target,
  onClose,
}: {
  config: MasterConfig<T>;
  target: T | 'new' | null;
  onClose: () => void;
}) {
  const row = target && target !== 'new' ? target : undefined;
  const [values, setValues] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState<unknown>(undefined);
  const [error, setError] = useState('');
  const [create] = config.api.useCreate();
  const [update] = config.api.useUpdate();

  useEffect(() => {
    if (target) {
      setValues(config.toForm(row));
      setExtra(undefined);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const [save, saving] = useAction(
    async () => {
      const body = config.toBody(values, row);
      if (row) return update(row.id, body as never);
      return create((config.withExtra ? config.withExtra(body, extra) : body) as never);
    },
    { success: row ? 'Cambios guardados' : `${config.createLabel.replace(/^Nuev[oa] /, '')} creado/a` },
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const missing = config.fields.find((fd) => fd.required && !values[fd.name]?.trim());
    if (missing) return setError(`Completá "${missing.label}".`);
    setError('');
    try {
      await save();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const formId = `master-form-${config.key}`;

  return (
    <Modal
      isOpen={!!target}
      onClose={onClose}
      title={row ? `Editar ${row.name}` : config.createLabel}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {row ? 'Guardar cambios' : 'Crear'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-4">
        <FormError>{error}</FormError>
        {config.fields.map((fd) => (
          <Field key={fd.name} label={fd.label} hint={fd.hint} required={fd.required} htmlFor={`${formId}-${fd.name}`}>
            {fd.type === 'textarea' ? (
              <Textarea
                id={`${formId}-${fd.name}`}
                value={values[fd.name] ?? ''}
                placeholder={fd.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [fd.name]: e.target.value }))}
              />
            ) : (
              <input
                id={`${formId}-${fd.name}`}
                className={inputClass}
                value={values[fd.name] ?? ''}
                placeholder={fd.placeholder}
                autoFocus={fd === config.fields[0]}
                onChange={(e) => setValues((v) => ({ ...v, [fd.name]: e.target.value }))}
              />
            )}
          </Field>
        ))}
        {!row && config.createExtra?.({ extra, setExtra })}
      </form>
    </Modal>
  );
}
