import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { variantsApi } from '../../api/resources';
import type { Id, Product, ProductVariant } from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Segmented } from '../Filters';
import { AffixInput, FormSection } from '../Form';
import { VariantPicker, variantLabel } from '../CatalogPickers';
import { draftToInput, emptyVariant, validateVariant, VariantFields, type VariantDraft, type VariantErrors } from './VariantFields';

interface Component {
  id: Id | null;
  variant?: ProductVariant;
  quantity: string;
}

export function AddVariantModal({ product, isOpen, onClose }: { product: Product; isOpen: boolean; onClose: () => void }) {
  const [create] = variantsApi.useCreate();
  const [kind, setKind] = useState<'simple' | 'mix'>('simple');
  const [draft, setDraft] = useState<VariantDraft>(emptyVariant(product.measure));
  const [components, setComponents] = useState<Component[]>([{ id: null, quantity: '' }]);
  const [errors, setErrors] = useState<VariantErrors>({});
  const [compError, setCompError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setKind('simple');
    setDraft(emptyVariant(product.measure));
    setComponents([{ id: null, quantity: '' }]);
    setErrors({});
    setCompError('');
  }, [isOpen, product.measure]);

  const [run, busy] = useAction(
    () => {
      const base = draftToInput(draft);
      return create(
        kind === 'mix'
          ? {
              ...base,
              productId: product.id,
              price: 0,
              profitMargin: 0,
              hasComponents: components.map((c) => ({ productVariantId: c.id!, quantity: Number(c.quantity) })),
            }
          : { ...base, productId: product.id },
      );
    },
    { success: 'Variante creada', error: 'No se pudo crear la variante' },
  );

  const submit = () => {
    const e = validateVariant(draft, { requirePrice: kind === 'simple' });
    setErrors(e);
    let ce = '';
    if (kind === 'mix') {
      if (!components.length || components.some((c) => !c.id || !(Number(c.quantity) > 0))) {
        ce = 'Cada componente necesita una variante y una cantidad mayor a 0.';
      }
    }
    setCompError(ce);
    if (Object.keys(e).length || ce) return;
    run().then(onClose).catch(() => undefined);
  };

  const patchComp = (i: number, p: Partial<Component>) => setComponents((cs) => cs.map((c, j) => (j === i ? { ...c, ...p } : c)));

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={`Nueva variante · ${product.name}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={busy}>
            Crear variante
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'simple', label: 'Simple' },
            { value: 'mix', label: 'Mix (con receta)' },
          ]}
        />
        {kind === 'mix' && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            El precio del mix se calcula solo (suma del precio de venta de los componentes × cantidad). El stock inicial
            produce el mix consumiendo componentes; si no alcanza, el backend rechaza la operación.
          </p>
        )}

        <VariantFields draft={draft} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} errors={errors} hidePricing={kind === 'mix'} />

        {kind === 'mix' && (
          <FormSection
            title="Receta"
            description="Cantidad de cada componente (g si es KG, si no unidades) por cada kg/unidad del mix."
            actions={
              <Button variant="outline" size="sm" onClick={() => setComponents((cs) => [...cs, { id: null, quantity: '' }])}>
                <Plus className="w-4 h-4" /> Componente
              </Button>
            }
          >
            <div className="space-y-2">
              {components.map((c, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <VariantPicker
                      value={c.id}
                      selectedLabel={c.variant ? variantLabel(c.variant) : undefined}
                      onChange={(id, v) => patchComp(i, { id, variant: v })}
                      exclude={components.filter((_, j) => j !== i).map((x) => x.id).filter((x): x is Id => !!x)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-32">
                      <AffixInput
                        suffix={c.variant?.contentMeasure === 'KG' ? 'g' : 'u'}
                        type="number"
                        min={0}
                        placeholder="Cant."
                        value={c.quantity}
                        onChange={(e) => patchComp(i, { quantity: e.target.value })}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Quitar componente"
                      disabled={components.length === 1}
                      onClick={() => setComponents((cs) => cs.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {compError && <p className="text-xs text-destructive">{compError}</p>}
            </div>
          </FormSection>
        )}
      </div>
    </Modal>
  );
}
