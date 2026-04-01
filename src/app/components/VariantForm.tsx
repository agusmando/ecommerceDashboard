import React, { useEffect, useState } from "react";
import { useFieldArray, useForm, Controller, Resolver } from "react-hook-form";
import { Input } from "./Input";
import { Select } from "./Select";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Autocomplete } from "./Autocomplete";
import { Upload, X } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { ConfirmDialog } from "./ConfirmDialog";
import { toast } from "sonner";
import { Product, ProductVariant } from "../types";
import BaseService from "../service/baseService";

const UNITS = [
  { value: "U", label: "Unidad (u)" },
  { value: "KG", label: "Kilogramo (kg)" },
  { value: "G", label: "Gramo (g)" },
  { value: "L", label: "Litro (l)" },
  { value: "ML", label: "Mililitro (ml)" },
];

const VariantSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  currentStock: z.coerce.number().nonnegative(),
  price: z.coerce.number().nonnegative(),
  profitMargin: z.coerce.number().nonnegative().max(100).min(0),
  contentMeasure: z.string().min(1, "Seleccione una unidad"),
  contentAmount: z.coerce.number().nonnegative().optional(),
  requestTime: z.coerce.number().nonnegative().optional(),
  stockThreshold: z.coerce.number().nonnegative().optional(),
  roundingOption: z.coerce.number().nonnegative(),
  packagingOptions: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  isMix: z.boolean().default(false),
  hasComponents: z
    .array(
      z.object({
        name: z.string().optional(),
        productVariantId: z.coerce.number(),
        quantity: z.coerce.number().min(1),
      }),
    )
    .default([]),
});

const productService = new BaseService<Product>("product");
export type VariantFormValues = z.infer<typeof VariantSchema>;

interface VariantFormProps {
  setVariantFormStatus: (isValid: boolean) => void;
  initialVariantFormState: Partial<VariantFormValues>;
  handleSave: (data: VariantFormValues) => void;
  onValuesChange?: (values: VariantFormValues) => void;
}

const VariantForm = ({
  setVariantFormStatus,
  initialVariantFormState,
  handleSave,
  onValuesChange,
}: VariantFormProps) => {
  const [confirmCreatingMix, setConfirmCreatingMix] = useState(false);
  const [confirmRemoveExistingMix, setConfirmRemoveExistingMix] =
    useState(false);

  // Autocomplete aplicado a productos
  const [isSearchingProduct, setIsSearchingProduct] = useState<boolean>(false);
  const [searchTermProduct, setSearchTermProduct] = useState<string>("");
  const [foundProductList, setFoundProductList] = useState<
    {
      id: string;
      label: string;
      subtitle?: string;
    }[]
  >([]);

  const {
    register,
    control,
    formState: { isSubmitting, isValid, isLoading, errors },
    handleSubmit,
    watch,
    setValue,
  } = useForm<VariantFormValues>({
    defaultValues: {
      ...initialVariantFormState,
    },
    resolver: zodResolver(VariantSchema) as Resolver<VariantFormValues>,
    mode: "onChange",
  });

  // componentes del mix
  const {
    fields: componentsFields,
    append: appendComp,
    remove: removeComp,
  } = useFieldArray({
    control,
    name: "hasComponents",
  });

  // Observamos TODOS los valores del formulario
  const allValues = watch();

  // Notificamos al padre cuando CUALQUIER valor cambie
  useEffect(() => {
    if (onValuesChange) {
      onValuesChange(allValues);
    }
  }, [allValues, onValuesChange]);

  // Observamos cambios en valores específicos
  const contentMeasure = watch("contentMeasure");
  const isMix = watch("isMix");
  const images = watch("images") || [];
  const hasComponents = watch("hasComponents") || [];
  const idVariant = watch("id");

  useEffect(() => {
    if (contentMeasure != "KG" && contentMeasure != "G") {
      setValue("packagingOptions", undefined);
    } else {
      if (allValues.packagingOptions == null) {
        setValue("packagingOptions", ["", "", ""]);
      }
    }
  }, [contentMeasure]);

  // Asegúrate de incluir todas las dependencias necesarias en el useEffect
  useEffect(() => {
    // Notificamos al padre si el formulario es válido y NO se está enviando ya.
    setVariantFormStatus(isValid && !isSubmitting);
  }, [isValid, isSubmitting, setVariantFormStatus]);

  useEffect(() => {
    if (searchTermProduct !== "" && searchTermProduct.length > 2) {
      setIsSearchingProduct(true);
    } else {
      setFoundProductList([]);
    }
  }, [searchTermProduct]);

  useEffect(() => {
    async function searchingVariantFunction(
      searchParams: { key: string; value: any }[],
    ) {
      return await productService.get({
        searchParams,
        paginate: true,
        amountPerPage: 5,
        detalle: true,
      });
    }
    if (isSearchingProduct) {
      setTimeout(() => {
        searchingVariantFunction([{ key: "name", value: searchTermProduct }])
          .then((response) => {
            const filteredProducts = response.response.content.flatMap((product) =>
              (product.variants || [])
                .filter((variant) => variant?.id !== idVariant) // excluye la variante actual
                .map((variant) => ({
                  id: String(variant?.id ?? product.id ?? ""),
                  label: variant?.name ?? "",
                  subtitle: product.name ?? "",
                })),
            );

            setFoundProductList(filteredProducts);
          })
          .catch((err) => {
            console.error(err);
          })
          .finally(() => {
            setIsSearchingProduct(false);
          });
      }, 300);
    } else {
      setIsSearchingProduct(false);
    }
  }, [isSearchingProduct]);

  const onFormSubmit = (data: VariantFormValues) => {
    handleSave(data);
  };

  useEffect(() => {
    // if () {
      
    // }    
  }, [])

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <form
        id="variant-form"
        onSubmit={handleSubmit(onFormSubmit)}
        className="space-y-4 "
      >
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nombre Variante"
            placeholder="ej: Estándar, 500g, Pack x3"
            {...register("name")}
            error={errors.name?.message}
          />
          <Controller
            control={control}
            name="contentMeasure"
            render={({ field }) => (
              <Select
                {...field}
                label="Unidad (Variante)"
                options={UNITS}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Precio Compra ($)"
            type="number"
            disabled={isMix}
            {...register("price")}
            placeholder="0.00"
            error={errors.price?.message}
          />
          <Input
            label="Margen de Ganancia (%)"
            disabled={isMix}
            type="number"
            {...register("profitMargin")}
            placeholder="Ej: 30"
            error={errors.profitMargin?.message}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Stock Inicial"
            type="number"
            {...register("currentStock")}
            placeholder="0"
            error={errors.currentStock?.message}
          />
          <Input
            label="Stock bajo"
            type="number"
            {...register("stockThreshold")}
            placeholder="Opcional"
            error={errors.currentStock?.message}
          />
          <Input
            label="Contenido (ej: 90ml)"
            type="number"
            placeholder="Opcional"
            {...register("contentAmount")}
            error={errors.contentAmount?.message}
          />
        </div>

        {/* Packaging Options for bulk products */}
        {(contentMeasure === "KG" || contentMeasure === "G") && (
          <div className="bg-muted/30 p-4 my-4 rounded-lg border border-border">
            <Label className="mb-2 block">
              Opciones de Empaque (Producto a granel)
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Ingrese hasta 3 opciones de empaque para este producto a granel
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((index) => (
                <Input
                  placeholder={`ej: ${index + 1}00g`}
                  type="number"
                  key={index}
                  {...register(`packagingOptions.${index}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Rounding Option */}
        <div className="grid grid-cols-2 gap-4">
          <Controller
            control={control}
            name="roundingOption"
            render={({ field }) => (
              <Select
                {...field}
                label="Redondeo de Precios"
                options={[
                  { value: "10", label: "Redondear a la decena" },
                  { value: "100", label: "Redondear a la centena" },
                ]}
                onChange={(e) => {
                  field.onChange(Number(e.target.value));
                }}
              />
            )}
          />

          <Input
            label="Tiempo Pedido (días)"
            type="number"
            {...register("requestTime")}
            placeholder="Opcional"
            error={errors.requestTime?.message}
          />
        </div>

        <div>
          <Controller
            control={control}
            name="images"
            render={({ field }) => (
              <>
                <Label className="mb-2 block text-base">
                  Imágenes de variante
                </Label>
                <label htmlFor="add-variant-images">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-xs">
                      Haga clic para subir imágenes (múltiples)
                    </span>
                  </div>
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  id="add-variant-images"
                  className="hidden"
                  onChange={(e) => {
                    field.onChange(e.target.files);
                    const files = e.target.files;
                    if (files) {
                      const newUrls = Array.from(files).map((f) =>
                        URL.createObjectURL(f),
                      );
                      setValue("images", [...images, ...newUrls], {
                        shouldValidate: true,
                      });
                    }
                  }}
                />
              </>
            )}
          />
          {images.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((img: string | undefined, idx: number) => (
                <div
                  key={idx}
                  className="relative w-20 h-20 rounded-lg overflow-hidden border border-border"
                >
                  <img
                    src={img}
                    alt={`Imagen ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setValue(
                        "images",
                        images.filter((_, i) => i !== idx),
                      );
                    }}
                    className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-1 rounded-bl-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Mix Configuration */}
        <div className="bg-muted/30 p-4 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label className="text-foreground">¿Es un Mix?</Label>
              <p className="text-xs text-muted-foreground">
                Permite componer este producto de otros productos existentes
              </p>
            </div>
            <Controller
              control={control}
              name="isMix"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      return setConfirmCreatingMix(true);
                    } else {
                      if (
                        allValues.hasComponents &&
                        allValues.hasComponents.length > 0
                      ) {
                        return setConfirmRemoveExistingMix(true);
                      }
                    }
                    field.onChange(checked);
                  }}
                />
              )}
            />
          </div>

          {isMix && (
            <div className="mt-4 space-y-3">
              <div>
                <Label className="mb-2 block">Buscar producto por nombre</Label>
                <Autocomplete
                  items={foundProductList}
                  isSearching={isSearchingProduct}
                  setSearchTerm={setSearchTermProduct}
                  selectedIds={[]}
                  onSelectionChange={(ids) => {
                    console.log(ids);
                    if (ids.length > 0) {
                      const alreadySelected = hasComponents.find(
                        (v) => v.productVariantId === Number(ids[0]),
                      )
                      if (alreadySelected) return;
                      const selectedVariant = foundProductList.find(
                        (v) => v.id === ids[0],
                      );
                      console.log(foundProductList, selectedVariant);
                      if (selectedVariant) {
                        setValue("hasComponents", [
                          ...hasComponents,
                          {
                            name: selectedVariant.label,
                            productVariantId: Number(selectedVariant.id),
                            quantity: 1,
                          },
                        ]);
                      }
                    }
                  }}
                  placeholder="Buscar productos para agregar..."
                  showBadges={false}
                  multiSelect={false}
                />
              </div>

              {hasComponents.length > 0 ? (
                <div className="space-y-2">
                  <Label className="block">Productos seleccionados</Label>
                  {hasComponents.map((component: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 bg-card p-2 rounded-lg border border-border"
                    >
                      <span className="text-sm flex-1 ml-2">{component.name || component.componentProduct.name}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Cant."
                          value={component.quantity}
                          onChange={(e) => {
                            const newComponents = [...hasComponents];
                            newComponents[idx].quantity =
                              parseInt(e.target.value) || 1;
                            setValue("hasComponents", newComponents);
                          }}
                          className="w-20"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setValue(
                              "hasComponents",
                              hasComponents.filter(
                                (_: any, i: number) => i !== idx,
                              ),
                            );
                          }}
                          className="text-destructive hover:bg-destructive/10 p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </form>
      {/* Confirm creating mix Dialog */}
      <ConfirmDialog
        isOpen={confirmCreatingMix}
        onClose={() => setConfirmCreatingMix(false)}
        onConfirm={() => {
          setValue("isMix", true);
          setValue("hasComponents", []);
          setValue("price", 0);
          setValue("profitMargin", 0);

          setConfirmCreatingMix(false);
        }}
        title="Crear mix"
        message="¿Desea crear un mix? El precio de la variante dependerá de los componentes del mix."
        confirmText="Aceptar"
        cancelText="Cancelar"
      />

      {/* Confirm removing existing mix */}
      <ConfirmDialog
        isOpen={confirmRemoveExistingMix}
        onClose={() => setConfirmRemoveExistingMix(false)}
        onConfirm={() => {
          setValue("isMix", false);
          setValue("hasComponents", []);
          setConfirmRemoveExistingMix(false);
        }}
        title="Atención"
        message="¿Desea deshabilitar la opción de mix? Se eliminarán los componentes del mix."
        confirmText="Aceptar"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default VariantForm;
