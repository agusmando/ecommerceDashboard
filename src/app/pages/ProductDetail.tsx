import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeftRight,
  Boxes,
  DollarSign,
  ExternalLink,
  Globe,
  ImageIcon,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Settings2,
  Soup,
  X,
} from 'lucide-react';
import { productsApi, variantsApi } from '../api/resources';
import type { Id, Offer, ProductVariant } from '../api/types';
import { useAppDispatch } from '../store';
import { patchFilters } from '../store/filtersSlice';
import { useActiveToggle } from '../hooks/useActiveToggle';
import { useAction } from '../hooks/useAction';
import { describeOffer, formatQty, isMix, MEASURE_LABEL, offerState, stockLevel } from '../lib/domain';
import { formatCurrency, formatDate } from '../lib/utils';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Card, CardHeader, CardTitle } from '../components/Card';
import { DataTable, type Column } from '../components/DataTable';
import { ActiveBadge, Badge, OfferStateBadge } from '../components/Badge';
import { RowActions } from '../components/RowActions';
import { ErrorState, Skeleton } from '../components/States';
import { TagMultiSelect } from '../components/CatalogPickers';
import { EditProductModal } from '../components/products/EditProductModal';
import { AddVariantModal } from '../components/products/AddVariantModal';
import { PackagingChips, useVariantModals } from '../components/products/VariantModals';
import { VariantPrice } from '../components/VariantPrice';
import { ProductReviewsCard } from '../components/reviews/ProductReviewsCard';

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{children}</span>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const productId = Number(id) || null;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { data: product, isLoading, error, refetch, isFetching } = productsApi.useOne(productId);
  const [setProductActive] = productsApi.useSetActive();
  const [setVariantActive] = variantsApi.useSetActive();
  const [changeTags] = productsApi.useTags();
  const toggleProduct = useActiveToggle(setProductActive, 'el producto');
  const toggleVariant = useActiveToggle(setVariantActive, 'la variante');
  const modals = useVariantModals();

  const [editing, setEditing] = useState(false);
  const [addingVariant, setAddingVariant] = useState(false);
  const [newTags, setNewTags] = useState<Id[]>([]);

  const [addTags, addingTags] = useAction((ids: Id[]) => changeTags(productId!, ids, true), {
    success: 'Etiquetas agregadas',
    error: 'No se pudieron agregar las etiquetas',
  });
  const [removeTag, removingTag] = useAction((tagId: Id) => changeTags(productId!, [tagId], false), {
    success: 'Etiqueta quitada',
    error: 'No se pudo quitar la etiqueta',
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <>
        <PageHeader title="Producto" backTo="/dashboard/products" backLabel="Productos" />
        <Card>
          <ErrorState error={error ?? new Error('El producto no existe.')} onRetry={refetch} />
        </Card>
      </>
    );
  }

  const variants = product.variants ?? [];
  const tags = product.Tags ?? [];

  const showMovements = (v: ProductVariant) => {
    dispatch(patchFilters({ key: 'movements', patch: { productVariantId: v.id, page: 1 } }));
    navigate('/dashboard/movements');
  };

  const columns: Column<ProductVariant>[] = [
    {
      key: 'name',
      header: 'Variante',
      cell: (v) => (
        <div className="flex items-center gap-3">
          {v.images?.[0] ? (
            <img src={v.images[0].secure_url} alt="" className="h-10 w-10 rounded-md object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="truncate">{v.name}</span>
              {isMix(v) && <Badge tone="violet">Mix</Badge>}
            </div>
            <PackagingChips variant={v} />
          </div>
        </div>
      ),
    },
    {
      key: 'cost',
      header: 'Costo',
      align: 'right',
      hideOnMobile: true,
      cell: (v) => (
        <span className="tabular-nums text-muted-foreground">
          {formatCurrency(v.price)}
          <span className="block text-xs">{Math.round((v.profitMargin ?? 0) * 1000) / 10} % margen</span>
        </span>
      ),
    },
    {
      key: 'final',
      header: 'Precio',
      align: 'right',
      cell: (v) => <VariantPrice variant={v} />,
    },
    {
      key: 'stock',
      header: 'Stock',
      cell: (v) => {
        const l = stockLevel(v);
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="tabular-nums">{formatQty(v.currentStock, v.contentMeasure)}</span>
            {l.tone !== 'success' && <Badge tone={l.tone}>{l.label}</Badge>}
          </div>
        );
      },
    },
    {
      key: 'channels',
      header: 'Canales',
      hideOnMobile: true,
      cell: (v) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={v.availableWeb ? 'info' : 'default'}>{v.availableWeb ? 'Web' : 'Sin web'}</Badge>
          <Badge tone={v.availablePedidosYa ? 'info' : 'default'}>{v.availablePedidosYa ? 'PedidosYa' : 'Sin PY'}</Badge>
        </div>
      ),
    },
    { key: 'active', header: 'Estado', cell: (v) => <ActiveBadge active={v.active} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (v) => (
        <RowActions
          actions={[
            { label: 'Editar precio', icon: <DollarSign className="w-4 h-4" />, onClick: () => modals.show('price', v) },
            { label: 'Ajustar stock', icon: <Boxes className="w-4 h-4" />, onClick: () => modals.show('stock', v) },
            {
              label: 'Disponibilidad y presentaciones',
              icon: <Settings2 className="w-4 h-4" />,
              onClick: () => modals.show('availability', v),
            },
            { label: 'Receta', icon: <Soup className="w-4 h-4" />, onClick: () => modals.show('recipe', v), hidden: !isMix(v) },
            { label: 'Imágenes', icon: <ImageIcon className="w-4 h-4" />, onClick: () => modals.show('images', v) },
            { label: 'Ver movimientos', icon: <ArrowLeftRight className="w-4 h-4" />, onClick: () => showMovements(v) },
            {
              label: v.active ? 'Desactivar' : 'Activar',
              icon: v.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />,
              onClick: () => toggleVariant(v.id, v.name, v.active),
              danger: v.active,
              separator: true,
            },
          ]}
        />
      ),
    },
  ];

  // Ofertas del producto + de cada variante (sin duplicados).
  const offerMap = new Map<Id, { offer: Offer; target: string; measure?: string }>();
  (product.offers ?? []).forEach((o) => offerMap.set(o.id, { offer: o, target: 'Todo el producto', measure: product.measure }));
  variants.forEach((v) =>
    (v.offers ?? []).forEach((o) => offerMap.set(o.id, { offer: o, target: v.name, measure: v.contentMeasure })),
  );
  const offers = [...offerMap.values()].sort(
    (a, b) => new Date(b.offer.startTime).getTime() - new Date(a.offer.startTime).getTime(),
  );

  return (
    <>
      <PageHeader
        backTo="/dashboard/products"
        backLabel="Productos"
        title={
          <span className="flex items-center gap-3">
            {product.name}
            <ActiveBadge active={product.active} />
          </span>
        }
        description={product.description || undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4" /> Editar
            </Button>
            <Button
              variant={product.active ? 'outline' : 'primary'}
              onClick={() => toggleProduct(product.id, product.name, product.active)}
              tooltip="Requiere rol ADMIN"
            >
              {product.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
              {product.active ? 'Desactivar' : 'Activar'}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <div className="divide-y divide-border">
            <InfoRow label="Categoría">{product.Category?.name ?? '—'}</InfoRow>
            <InfoRow label="Marca">{product.Brand?.name ?? '—'}</InfoRow>
            <InfoRow label="Medida">{MEASURE_LABEL[product.measure] ?? product.measure}</InfoRow>
            <InfoRow label="Variantes">
              {variants.filter((v) => v.active).length} activas de {variants.length}
            </InfoRow>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Etiquetas</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {tags.length === 0 && <span className="text-sm text-muted-foreground">Sin etiquetas</span>}
              {tags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                >
                  {t.name}
                  <button
                    type="button"
                    aria-label={`Quitar ${t.name}`}
                    disabled={removingTag}
                    onClick={() => removeTag(t.id).catch(() => undefined)}
                    className="rounded hover:bg-primary/20"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <TagMultiSelect value={newTags} onChange={setNewTags} exclude={tags.map((t) => t.id)} />
              </div>
              <Button
                variant="outline"
                disabled={!newTags.length}
                loading={addingTags}
                onClick={() =>
                  addTags(newTags)
                    .then(() => setNewTags([]))
                    .catch(() => undefined)
                }
              >
                Agregar
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Ofertas</CardTitle>
            <Link to="/dashboard/offers" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Gestionar <ExternalLink className="w-3 h-3" />
            </Link>
          </CardHeader>
          {offers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay ofertas para este producto.</p>
          ) : (
            <ul className="divide-y divide-border">
              {offers.map(({ offer, target, measure }) => (
                <li key={offer.id} className="flex items-start justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{describeOffer(offer, measure)}</div>
                    <div className="text-xs text-muted-foreground">
                      {target} · {formatDate(offer.startTime)} → {formatDate(offer.finishTime)}
                    </div>
                  </div>
                  <OfferStateBadge state={offerState(offer)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Variantes</h2>
            <p className="text-sm text-muted-foreground">Precio, stock, disponibilidad y recetas por variante.</p>
          </div>
          <Button onClick={() => setAddingVariant(true)}>
            <Plus className="w-4 h-4" /> Agregar variante
          </Button>
        </div>
        <DataTable
          columns={columns}
          rows={variants}
          rowKey={(v) => v.id}
          fetching={isFetching}
          rowClassName={(v) => (v.active ? undefined : 'opacity-60')}
          empty={{
            icon: <Globe className="w-6 h-6" />,
            title: 'Sin variantes',
            description: 'Agregá una variante para poder venderlo.',
          }}
        />
      </div>

      <ProductReviewsCard product={product} />

      <EditProductModal product={product} isOpen={editing} onClose={() => setEditing(false)} />
      <AddVariantModal product={product} isOpen={addingVariant} onClose={() => setAddingVariant(false)} />
      {modals.element}
    </>
  );
}
