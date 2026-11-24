import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateProductMutation } from '../../api/resources';
import { getErrorMessage } from '../../api/client';
import { MEASURES, type Id, type Measure } from '../../api/types';
import { MEASURE_LABEL } from '../../lib/domain';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { FormError } from '../States';
import { Field, FormGrid, FormSection, inputClass, SwitchRow, Textarea } from '../Form';
import { BrandSelect, CategorySelect, TagMultiSelect } from '../CatalogPickers';
import { ImageInput } from './ImageInput';
import { draftToInput, emptyVariant, validateVariant, VariantFields, type VariantDraft, type VariantErrors } from './VariantFields';
import { useErrorModal } from '../ErrorProvider';

interface Errors {
  name?: string;
  categoryId?: string;
  brandId?: string;
  variants?: VariantErrors[];
}

export function CreateProductModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const showError = useErrorModal();
  const [create, { isLoading }] = useCreateProductMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [measure, setMeasure] = useState<Measure>('KG');
  const [categoryId, setCategoryId] = useState<Id | null>(null);
  const [brandId, setBrandId] = useState<Id | null>(null);
  const [isLocal, setIsLocal] = useState(false);
  const [tagIds, setTagIds] = useState<Id[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant('KG')]);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState('');

  const reset = () => {
    setName('');
    setDescription('');
    setMeasure('KG');
    setCategoryId(null);
    setBrandId(null);
    setIsLocal(false);
    setTagIds([]);
    setImages([]);
    setVariants([emptyVariant('KG')]);
    setErrors({});
    setServerError('');
  };

  const close = () => {
    if (isLoading) return;
    reset();
    onClose();
  };

  const changeMeasure = (m: Measure) => {
    // Las variantes que seguían la unidad del producto la acompañan.
    setVariants((vs) => vs.map((v) => (v.contentMeasure === measure ? { ...v, contentMeasure: m } : v)));
    setMeasure(m);
  };

  const patchVariant = (i: number, patch: Partial<VariantDraft>) =>
    setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  const submit = async () => {
    const e: Errors = {};
    if (!name.trim()) e.name = 'Ingresá un nombre';
    if (!categoryId) e.categoryId = 'Elegí una categoría';
    if (!brandId) e.brandId = 'Elegí una marca';
    const ve = variants.map((v) => validateVariant(v));
    if (ve.some((x) => Object.keys(x).length)) e.variants = ve;
    setErrors(e);
    if (Object.keys(e).length) return;

    setServerError('');
    try {
      const product = await create({
        name: name.trim(),
        description: description.trim() || undefined,
        measure,
        categoryId: categoryId!,
        brandId: brandId!,
        isLocal,
        Tags: tagIds.length ? tagIds.map((id) => ({ id })) : undefined,
        variants: variants.map(draftToInput),
        images,
      }).unwrap();
      toast.success(`Producto "${product.name}" creado`);
      reset();
      onClose();
      if (product?.id) navigate(`/dashboard/products/${product.id}`);
    } catch (err) {
      showError({ title: 'No se pudo crear el producto', description: getErrorMessage(err) });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Nuevo producto"
      description="El stock inicial de cada variante se registra como un ingreso de mercadería."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={isLoading}>
            Crear producto
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {serverError && <FormError>{serverError}</FormError>}

        <FormSection title="Datos generales">
          <FormGrid>
            <Field label="Nombre" required error={errors.name}>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Almendra" autoFocus />
            </Field>
            <Field label="Unidad de medida">
              <select className={inputClass} value={measure} onChange={(e) => changeMeasure(e.target.value as Measure)}>
                {MEASURES.map((m) => (
                  <option key={m} value={m}>
                    {MEASURE_LABEL[m]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Categoría" required error={errors.categoryId}>
              <CategorySelect value={categoryId} onChange={setCategoryId} />
            </Field>
            <Field label="Marca" required error={errors.brandId}>
              <BrandSelect value={brandId} onChange={setBrandId} />
            </Field>
          </FormGrid>
          <SwitchRow label="Productor local" description="Sin marca comercial: en la tienda se muestra «Productor local» en lugar de la marca y aparece en el filtro de productores locales. Cada variante puede cambiarlo." checked={isLocal} onChange={setIsLocal} />
          <Field label="Descripción">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Etiquetas">
            <TagMultiSelect value={tagIds} onChange={setTagIds} />
          </Field>
          <Field label="Imágenes" hint="Hasta 7. Se asignan a la primera variante.">
            <ImageInput files={images} onChange={setImages} />
          </Field>
        </FormSection>

        <FormSection
          title="Variantes"
          description="Al menos una. Precio y stock se manejan por variante."
          actions={
            <Button variant="outline" size="sm" onClick={() => setVariants((vs) => [...vs, emptyVariant(measure)])}>
              <Plus className="w-4 h-4" /> Agregar variante
            </Button>
          }
        >
          <div className="space-y-4">
            {variants.map((v, i) => (
              <div key={i} className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Variante {i + 1}</span>
                  {variants.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))}>
                      <Trash2 className="w-4 h-4" /> Quitar
                    </Button>
                  )}
                </div>
                <VariantFields draft={v} onChange={(p) => patchVariant(i, p)} errors={errors.variants?.[i]} productIsLocal={isLocal} />
              </div>
            ))}
          </div>
        </FormSection>
      </div>
    </Modal>
  );
}
