import React, { useEffect, useState } from "react";
import { useFieldArray, useForm, Controller} from "react-hook-form";
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

const UNITS = [
  { value: "U", label: "Unidad (u)" },
  { value: "KG", label: "Kilogramo (kg)" },
  { value: "G", label: "Gramo (g)" },
  { value: "L", label: "Litro (l)" },
  { value: "ML", label: "Mililitro (ml)" },
];

const VariantSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  currentStock: z.number().nonnegative(),
  price: z.number().nonnegative(),
  profitMargin: z.number().nonnegative().max(100).min(1),
  contentMeasure: z.string(),
  contentAmount: z.number().nonnegative().optional(),
  requestTime: z.number().nonnegative().optional(),
  stockThreshold: z.number().nonnegative().optional(),
  roundingOption: z.number().nonnegative(),
  packagingOptions: z.array(z.object({ value: z.string() })).optional(),
  hasComponents: z
    .array(
      z.object({
        // active: z.boolean(),
        mixVariantId: z.number(),
        productVariantId: z.number(),
        quantity: z.number(),
      }),
    )
    .optional(),
});

type VariantFormValues = z.infer<typeof VariantSchema>;

const VariantForm = (props: {
  initialVariantFormState: any;
  handleSave: (variantFormData: any) => void;
}) => {
  const [variantFormData, setVariantFormData] = useState(
    props.initialVariantFormState,
  );

  const {
    register,
    control,
    formState: { errors },
    handleSubmit,
    watch,
    setValue,
  } = useForm<VariantFormValues>({
    defaultValues: props.initialVariantFormState,
    resolver: zodResolver(VariantSchema),
  });

  // componentes del mix
  const {
    fields: componentsFields,
    append: appendComp,
    remove: removeComp,
    replace: replaceComp,
  } = useFieldArray({
    control,
    name: "hasComponents",
  });

  // packagingOptions como field array
  const {
    fields: packagingFields,
    append,
    remove,
    replace,
  } = useFieldArray({
    control,
    name: "packagingOptions",
  });

  const onsubmit = (data: VariantFormValues) => {
    console.log(data)
    props.handleSave(data);
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <form onSubmit={handleSubmit(onsubmit)}>
        <div className="grid grid-cols-2 gap-4">
          {/* <Controller 
            {control}
            name="name"
            render={({ field }) => (
              <Input
                {...field}
                label="Nombre Variante"
                placeholder="ej: Estándar, 500g, Pack x3"
                value={variantFormData.name}
                onChange={(e) =>
                  setVariantFormData({
                    ...variantFormData,
                    name: e.target.value,
                  })
                }
              />
            )}
          /> */}
          <Input
            label="Nombre Variante"
            placeholder="ej: Estándar, 500g, Pack x3"
            value={variantFormData.name}
            {...register("name")}
            onChange={(e) =>
              setVariantFormData({
                ...variantFormData,
                name: e.target.value,
              })
            }
          />
          <Controller
            control={control} 
            name="contentMeasure"  
            render={({ field }) => (
              <Select
                {...field}
                label="Unidad (Variante)"
                options={UNITS}
                value={variantFormData.contentMeasure}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Precio Compra ($)"
            type="number"
            {...register("price")}
            placeholder="0.00"
            value={variantFormData.price}
            onChange={(e) =>
              setVariantFormData({
                ...variantFormData,
                price: Number(e.target.value),
              })
            }
          />
          <Input
            label="Margen de Ganancia (%)"
            type="number"
            {...register("profitMargin")}
            placeholder="Ej: 30"
            value={variantFormData.profitMargin}
            onChange={(e) =>
              setVariantFormData({
                ...variantFormData,
                profitMargin: e.target.value,
              })
            }
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Stock Inicial"
            type="number"
            {...register("currentStock")}
            placeholder="0"
            value={variantFormData.currentStock}
            onChange={(e) =>
              setVariantFormData({
                ...variantFormData,
                currentStock: e.target.value,
              })
            }
          />
          <Input
            label="Stock bajo"
            type="number"
            {...register("stockThreshold")}
            placeholder="Opcional"
            value={variantFormData.stockThreshold}
            onChange={(e) =>
              setVariantFormData({
                ...variantFormData,
                stockThreshold: Number(e.target.value),
              })
            }
          />
          <Input
            label="Contenido (ej: 90ml)"
            type="number"
            placeholder="Opcional"
            {...register("contentAmount")}
            value={variantFormData.contentAmount}
            onChange={(e) =>
              setVariantFormData({
                ...variantFormData,
                contentAmount: e.target.value,
              })
            }
          />
        </div>

        {/* Packaging Options for bulk products */}
        {(variantFormData.contentMeasure === "KG" ||
          variantFormData.contentMeasure === "G") && (
          <div className="bg-muted/30 p-4 my-4 rounded-lg border border-border">
            <Label className="mb-2 block">
              Opciones de Empaque (Producto a granel)
            </Label>
            <p className="text-xs text-muted-foreground mb-3">
              Ingrese hasta 3 opciones de empaque para este producto a granel
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                placeholder="ej: 100"
                type="number"
                {...register("packagingOptions.0")}
                value={variantFormData.packagingOptions[0]}
                onChange={(e) => {
                  const newOptions = [...variantFormData.packagingOptions];
                  newOptions[0] = e.target.value;
                  setVariantFormData({
                    ...variantFormData,
                    packagingOptions: newOptions,
                  });
                }}
              />
              <Input
                placeholder="ej: 250"
                type="number"
                {...register("packagingOptions.1")}
                value={variantFormData.packagingOptions[1]}
                onChange={(e) => {
                  const newOptions = [...variantFormData.packagingOptions];
                  newOptions[1] = e.target.value;
                  setVariantFormData({
                    ...variantFormData,
                    packagingOptions: newOptions,
                  });
                }}
              />
              <Input
                placeholder="ej: 500"
                type="number"
                {...register("packagingOptions.2")}
                value={variantFormData.packagingOptions[2]}
                onChange={(e) => {
                  const newOptions = [...variantFormData.packagingOptions];
                  newOptions[2] = e.target.value;
                  setVariantFormData({
                    ...variantFormData,
                    packagingOptions: newOptions,
                  });
                }}
              />
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
                value={variantFormData.roundingOption}
                onChange={(e) => {
                  field.onChange(Number(e.target.value))
                  setVariantFormData({
                    ...variantFormData,
                    roundingOption: Number(e.target.value),
                  })}
                }
              />
            )}
          />

          <Input
            label="Tiempo Pedido (días)"
            type="number"
            {...register("requestTime")}
            placeholder="Opcional"
            value={variantFormData.requestTime}
          />
        </div>

        <div>
          <Label className="mb-2 block">Imágenes de variante</Label>
          <Controller 
            control={control}
            name="image"
            render={({ field }) => (
              <>
              <input
                type="file"
                multiple
                accept="image/*"
                id="add-variant-images"
                className="hidden"
                onChange={(e) => {
                  field.onChange(e.target.files)
                  const files = e.target.files;
                  if (files) {
                    const newImages = Array.from(files).map((f) =>
                      URL.createObjectURL(f),
                    );
                    setVariantFormData((prev: any) => ({
                      ...prev,
                      images: [...prev.images, ...newImages],
                    }));
                  }
                }}
                />
              </>
            )}
          />
          <label htmlFor="add-variant-images">
            <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 mb-2" />
              <span className="text-xs">
                Haga clic para subir imágenes (múltiples)
              </span>
            </div>
          </label>
          {variantFormData.images.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {variantFormData.images.map(
                (img: string | undefined, idx: number) => (
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
                        setVariantFormData((prev: any) => ({
                          ...prev,
                          images: prev.images.filter(
                            (_: any, i: number) => i !== idx,
                          ),
                        }));
                      }}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-1 rounded-bl-lg"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ),
              )}
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
            <Switch
              checked={variantFormData.isMix}
              onCheckedChange={(checked) =>
                setVariantFormData({
                  ...variantFormData,
                  isMix: checked,
                })
              }
            />
          </div>

          {variantFormData.isMix && (
            <div className="mt-4 space-y-3">
              <div>
                <Label className="mb-2 block">Buscar variante por nombre</Label>
                {/* <Autocomplete
                items={
                  product.variants
                    .map((v) => ({
                      id: v.id,
                      label: v.name,
                      subtitle: product.name,
                    }))
                    .filter(
                      (v) =>
                        !variantFormData.hasComponents.some(
                          (c) => c.productVariantId === v.id,
                        ),
                    ) as any
                }
                selectedIds={[]}
                onSelectionChange={(ids) => {
                  if (ids.length > 0) {
                    const selectedVariant = product.variants.find(
                      (v) => v.id === Number(ids[0]),
                    );
                    // if (selectedVariant) {
                    //   setVariantFormData((prev: any) => ({
                    //     ...prev,
                    //     hasComponents: [
                    //       ...prev.hasComponents,
                    //       {
                    //         mixVariantId: variantFormData.id,
                    //         productVariantId: selectedVariant.id,
                    //         name: selectedVariant.name,
                    //         quantity: 1,
                    //       },
                    //     ],
                    //   }));
                    // }
                  }
                }}
                placeholder="Buscar variantes para agregar..."
                showBadges={false}
                multiSelect={false}
              /> */}
              </div>

              {variantFormData.hasComponents.length > 0 ? (
                <div className="space-y-2">
                  <Label className="block">Variantes seleccionadas</Label>
                  {variantFormData.hasComponents.map(
                    (component: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border"
                      >
                        {/* <span className="text-sm flex-1">
                                  {component.name}
                                </span> */}
                        <Input
                          type="number"
                          placeholder="Cant."
                          value={component.quantity}
                          onChange={(e) => {
                            const newComponents = [
                              ...variantFormData.hasComponents,
                            ];
                            newComponents[idx].quantity =
                              parseInt(e.target.value) || 1;
                            setVariantFormData({
                              ...variantFormData,
                              hasComponents: newComponents,
                            });
                          }}
                          className="w-20"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setVariantFormData((prev: any) => ({
                              ...prev,
                              hasComponents: prev.hasComponents.filter(
                                (_: any, i: number) => i !== idx,
                              ),
                            }));
                          }}
                          className="text-destructive hover:bg-destructive/10 p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ),
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default VariantForm;
