import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Info } from 'lucide-react';
import { useCreateBannerMutation, useUpdateBannerMutation } from '../../api/resources';
import { getErrorMessage } from '../../api/client';
import {
  BANNER_SIZES,
  type Banner,
  type BannerFields,
  type BannerInput,
  type BannerPlacement,
  type BannerSize,
} from '../../api/types';
import { useAction } from '../../hooks/useAction';
import { BANNER_SIZE_LABEL, isoToLocalInput } from '../../lib/domain';
import { Button } from '../Button';
import { Modal } from '../Modal';
import { Field, FormGrid, FormSection, Textarea, inputClass } from '../Form';
import { Segmented } from '../Filters';
import { FormError } from '../States';
import { BannerImageField, EMPTY_SLOT, useSlotUrl, type ImageSlot } from './BannerImageField';
import { BannerPreview } from './BannerPreview';
import { PLACEMENT_FIELDS, formatDims, recommendedSize, usePlacementSpecs } from './bannerSpecs';

const TEXT_KEYS = ['name', 'eyebrow', 'headline', 'text', 'ctaLabel', 'linkUrl', 'backgroundColor', 'textColor'] as const;
type TextKey = (typeof TEXT_KEYS)[number];
type TextValues = Record<TextKey, string>;
const EMPTY_TEXT = Object.fromEntries(TEXT_KEYS.map((k) => [k, ''])) as TextValues;

const isValidColor = (v: string) => typeof CSS === 'undefined' || CSS.supports('color', v);
const isValidLink = (v: string) => v.startsWith('/') || /^https?:\/\/\S+$/i.test(v);

/** Color: selector nativo + texto libre (cualquier color CSS). */
function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff';
  return (
    <Field label={label} htmlFor={id} hint="Opcional. Ej. #fdf0dc">
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label} (selector)`}
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-input-background p-1"
        />
        <input id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Por defecto" />
      </div>
    </Field>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  banner?: Banner | null;
  /** Ubicación preseleccionada para el alta. */
  defaultPlacement?: BannerPlacement;
}

export function BannerFormModal({ isOpen, onClose, banner, defaultPlacement = 'HOME_HERO' }: Props) {
  const editing = !!banner;
  const { specs, order } = usePlacementSpecs();
  const [createBanner] = useCreateBannerMutation();
  const [updateBanner] = useUpdateBannerMutation();

  const [placement, setPlacement] = useState<BannerPlacement>(defaultPlacement);
  const [values, setValues] = useState<TextValues>(EMPTY_TEXT);
  const [size, setSize] = useState<BannerSize>('SQUARE');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [desktop, setDesktop] = useState<ImageSlot>(EMPTY_SLOT);
  const [mobile, setMobile] = useState<ImageSlot>(EMPTY_SLOT);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setDesktop(EMPTY_SLOT);
    setMobile(EMPTY_SLOT);
    setDevice('desktop');
    if (banner) {
      setPlacement(banner.placement);
      setValues(Object.fromEntries(TEXT_KEYS.map((k) => [k, banner[k] ?? ''])) as TextValues);
      setSize(banner.size ?? 'SQUARE');
      setStartsAt(isoToLocalInput(banner.startsAt));
      setEndsAt(isoToLocalInput(banner.endsAt));
    } else {
      setPlacement(defaultPlacement);
      setValues(EMPTY_TEXT);
      setSize('SQUARE');
      setStartsAt('');
      setEndsAt('');
    }
  }, [isOpen, banner, defaultPlacement]);

  const spec = specs[placement];
  const fields = PLACEMENT_FIELDS[placement];
  const set = (k: TextKey) => (v: string) => setValues((s) => ({ ...s, [k]: v }));
  const onInput = (k: TextKey) => (e: { target: { value: string } }) => set(k)(e.target.value);

  const desktopUrl = useSlotUrl(desktop, banner?.desktopImageUrl);
  const mobileUrl = useSlotUrl(mobile, banner?.mobileImageUrl);
  const recDesktop = recommendedSize(spec, 'desktop', size);
  const recMobile = recommendedSize(spec, 'mobile', size);
  const hasDesktop = fields.desktop && !!desktopUrl;

  /** Campos que usa la ubicación elegida (el resto se limpia al editar). */
  const relevant = useMemo(() => {
    const r = new Set<TextKey>(['name', 'linkUrl', ...fields.copy]);
    if (fields.colors) {
      r.add('backgroundColor');
      r.add('textColor');
    }
    return r;
  }, [fields]);

  const validate = (): string => {
    const v = (k: TextKey) => values[k].trim();
    if (!v('name')) return 'Ingresá un nombre interno.';
    if (fields.size && !size) return 'Elegí el tamaño de la tarjeta.';
    if (spec.textRequired && !v('text')) return 'Ingresá el texto del banner.';
    if (spec.imageRequired && !hasDesktop) return 'Esta ubicación requiere una imagen.';
    if (v('linkUrl') && !isValidLink(v('linkUrl'))) return 'El link debe ser una ruta interna (“/productos…”) o una URL que empiece con http(s)://.';
    if (relevant.has('ctaLabel') && v('ctaLabel') && !v('linkUrl')) return 'El botón necesita un link.';
    for (const k of ['backgroundColor', 'textColor'] as const) {
      if (relevant.has(k) && v(k) && !isValidColor(v(k))) return `El color “${v(k)}” no es válido.`;
    }
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) return 'La fecha de fin debe ser posterior al inicio.';
    return '';
  };

  const buildBody = (): BannerInput => {
    const body: BannerInput = { placement };
    TEXT_KEYS.forEach((k) => {
      const v = values[k].trim();
      if (relevant.has(k) && v) body[k as keyof BannerFields] = v as never;
      // '' borra el campo al editar (también los que no usa la nueva ubicación).
      else if (editing && banner![k]) body[k as keyof BannerFields] = '' as never;
    });
    if (fields.size) body.size = size;
    else if (editing && banner!.size) body.size = '';

    const start = startsAt ? new Date(startsAt).toISOString() : '';
    const end = endsAt ? new Date(endsAt).toISOString() : '';
    if (start || (editing && banner!.startsAt)) body.startsAt = start;
    if (end || (editing && banner!.endsAt)) body.endsAt = end;

    if (fields.desktop && desktop.file) body.desktopImage = desktop.file;
    else if (editing && banner!.desktopImageUrl && (desktop.removed || !fields.desktop)) body.removeDesktopImage = true;
    if (fields.mobile && mobile.file) body.mobileImage = mobile.file;
    else if (editing && banner!.mobileImageUrl && (mobile.removed || !fields.mobile)) body.removeMobileImage = true;
    return body;
  };

  const [submit, busy] = useAction(
    async () => {
      const body = buildBody();
      return editing ? updateBanner({ id: banner!.id, body }).unwrap() : createBanner(body).unwrap();
    },
    { success: editing ? 'Banner actualizado' : 'Banner creado', error: 'No se pudo guardar el banner' },
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    setError(v);
    if (v) return;
    try {
      await submit();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const previewUrl = device === 'mobile' && fields.mobile ? mobileUrl ?? (fields.desktop ? desktopUrl : null) : fields.desktop ? desktopUrl : null;
  const previewDims = device === 'mobile' ? recMobile : recDesktop;
  const hasPreviewDevices = fields.mobile;

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onClose}
      title={editing ? `Editar banner · ${banner!.name}` : 'Nuevo banner'}
      description="Las imágenes se suben a Cloudinary. Los campos dependen de la ubicación."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form="banner-form" loading={busy}>
            {editing ? 'Guardar cambios' : 'Crear banner'}
          </Button>
        </>
      }
    >
      <form id="banner-form" onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {error && <FormError>{error}</FormError>}

          <FormGrid>
            <Field label="Ubicación" htmlFor="bn-placement" required hint={spec.description}>
              <select
                id="bn-placement"
                className={inputClass}
                value={placement}
                onChange={(e) => setPlacement(e.target.value as BannerPlacement)}
              >
                {order.map((p) => (
                  <option key={p} value={p}>
                    {specs[p].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nombre interno" htmlFor="bn-name" required hint="También se usa como texto alternativo de la imagen.">
              <input id="bn-name" className={inputClass} value={values.name} onChange={onInput('name')} maxLength={120} />
            </Field>
          </FormGrid>

          {fields.size && (
            <Field label="Tamaño" required>
              <Segmented
                value={size}
                onChange={setSize}
                options={BANNER_SIZES.map((s) => ({
                  value: s,
                  label: `${BANNER_SIZE_LABEL[s]}${spec.sizes?.[s] ? ` · ${formatDims(spec.sizes[s])}` : ''}`,
                }))}
              />
            </Field>
          )}

          {(fields.copy.length > 0 || fields.colors) && (
            <FormSection title="Contenido" description={placement === 'HOME_HERO' ? 'Se recomienda un título. Sin imagen, la web muestra el texto sobre un degradé.' : undefined}>
              {fields.copy.includes('eyebrow') && (
                <Field label="Antetítulo" htmlFor="bn-eyebrow" hint="Texto chico arriba del título. Ej. “Nuevo”">
                  <input id="bn-eyebrow" className={inputClass} value={values.eyebrow} onChange={onInput('eyebrow')} maxLength={60} />
                </Field>
              )}
              {fields.copy.includes('headline') && (
                <Field label="Título" htmlFor="bn-headline">
                  <input id="bn-headline" className={inputClass} value={values.headline} onChange={onInput('headline')} maxLength={120} />
                </Field>
              )}
              {fields.copy.includes('text') && (
                <Field label={placement === 'ANNOUNCEMENT_BAR' ? 'Texto del anuncio' : 'Texto'} htmlFor="bn-text" required={spec.textRequired}>
                  {placement === 'ANNOUNCEMENT_BAR' ? (
                    <input
                      id="bn-text"
                      className={inputClass}
                      value={values.text}
                      onChange={onInput('text')}
                      maxLength={200}
                      placeholder="Envío gratis en Mendoza desde $30.000"
                    />
                  ) : (
                    <Textarea id="bn-text" value={values.text} onChange={onInput('text')} maxLength={300} rows={2} />
                  )}
                </Field>
              )}
              {fields.copy.includes('ctaLabel') && (
                <Field label="Texto del botón" htmlFor="bn-cta" hint="Ej. “Ver productos”. Requiere link.">
                  <input id="bn-cta" className={inputClass} value={values.ctaLabel} onChange={onInput('ctaLabel')} maxLength={40} />
                </Field>
              )}
              {fields.colors && (
                <FormGrid>
                  <ColorField id="bn-bg" label="Color de fondo" value={values.backgroundColor} onChange={set('backgroundColor')} />
                  <ColorField id="bn-fg" label="Color del texto" value={values.textColor} onChange={set('textColor')} />
                </FormGrid>
              )}
            </FormSection>
          )}

          <Field label="Link" htmlFor="bn-link" hint="Ruta interna (/productos?categoria=frutos-secos) o URL completa. Opcional.">
            <input id="bn-link" className={inputClass} value={values.linkUrl} onChange={onInput('linkUrl')} placeholder="/productos" />
          </Field>

          {(fields.desktop || fields.mobile) && (
            <FormSection title="Imágenes">
              <FormGrid>
                {fields.desktop && (
                  <BannerImageField
                    label={fields.mobile ? 'Imagen de escritorio' : 'Imagen'}
                    required={spec.imageRequired}
                    recommended={recDesktop}
                    existingUrl={banner?.desktopImageUrl}
                    url={desktopUrl}
                    slot={desktop}
                    onChange={setDesktop}
                    hint={fields.size ? 'En celulares se usa la misma imagen, recortada.' : undefined}
                  />
                )}
                {fields.mobile && (
                  <BannerImageField
                    label="Imagen para celular"
                    recommended={recMobile}
                    existingUrl={banner?.mobileImageUrl}
                    url={mobileUrl}
                    slot={mobile}
                    onChange={setMobile}
                    hint="Opcional: si no hay, se usa la de escritorio."
                  />
                )}
              </FormGrid>
            </FormSection>
          )}

          <FormSection title="Vigencia" description="Opcional. Sin fechas, el banner se muestra mientras esté activo.">
            <FormGrid>
              <Field label="Desde" htmlFor="bn-start">
                <input id="bn-start" type="datetime-local" className={inputClass} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </Field>
              <Field label="Hasta" htmlFor="bn-end">
                <input id="bn-end" type="datetime-local" className={inputClass} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </Field>
            </FormGrid>
          </FormSection>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start" aria-label="Vista previa">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Vista previa</h3>
            {hasPreviewDevices && (
              <Segmented
                value={device}
                onChange={setDevice}
                options={[
                  { value: 'desktop', label: 'PC' },
                  { value: 'mobile', label: 'Celular' },
                ]}
              />
            )}
          </div>
          <BannerPreview
            placement={placement}
            dims={previewDims}
            imageUrl={previewUrl}
            device={hasPreviewDevices ? device : 'desktop'}
            content={{
              eyebrow: values.eyebrow,
              headline: values.headline,
              text: values.text,
              ctaLabel: values.ctaLabel,
              backgroundColor: fields.colors ? values.backgroundColor : undefined,
              textColor: fields.colors ? values.textColor : undefined,
              name: values.name,
            }}
          />
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 w-3.5 h-3.5 shrink-0" />
            Es una aproximación: tipografías y recortes finales dependen de la web.
          </p>
        </aside>
      </form>
    </Modal>
  );
}
