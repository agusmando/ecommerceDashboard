import { useEffect, useState } from 'react';
import { productsApi } from '../../api/resources';
import { MEASURES, type Id, type Measure, type Product } from '../../api/types';
import { MEASURE_LABEL } from '../../lib/domain';
import { useAction } from '../../hooks/useAction';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Field, FormGrid, inputClass, Textarea } from '../Form';
import { BrandSelect, CategorySelect } from '../CatalogPickers';

export function EditProductModal({ product, isOpen, onClose }: { product: Product; isOpen: boolean; onClose: () => void }) {
  const [update] = productsApi.useUpdate();
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? '');
  const [measure, setMeasure] = useState<Measure>(product.measure);
  const [categoryId, setCategoryId] = useState<Id | null>(product.categoryId);
  const [brandId, setBrandId] = useState<Id | null>(product.brandId);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName(product.name);
    setDescription(product.description ?? '');
    setMeasure(product.measure);
    setCategoryId(product.categoryId);
    setBrandId(product.brandId);
    setError('');
  }, [isOpen, product]);

  const [save, busy] = useAction(
    () =>
      update(product.id, {
        name: name.trim(),
        description: description.trim(),
        measure,
        categoryId: categoryId ?? undefined,
        brandId: brandId ?? undefined,
      }),
    { success: 'Producto actualizado', error: 'No se pudo actualizar el producto' },
  );

  const submit = async () => {
    if (!name.trim()) return setError('Ingresá un nombre');
    await save().then(onClose).catch(() => undefined);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title="Editar producto"
      description="Precio y stock se cambian desde cada variante."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={busy}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre" required error={error}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Descripción">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <FormGrid>
          <Field label="Categoría">
            <CategorySelect value={categoryId} onChange={setCategoryId} />
          </Field>
          <Field label="Marca">
            <BrandSelect value={brandId} onChange={setBrandId} />
          </Field>
        </FormGrid>
        <Field label="Unidad de medida">
          <select className={inputClass} value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>
            {MEASURES.map((m) => (
              <option key={m} value={m}>
                {MEASURE_LABEL[m]}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}
