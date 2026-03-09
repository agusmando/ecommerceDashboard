import React, { useEffect, useState } from "react";
import { Input } from "./Input";
import { Select } from "./Select";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Autocomplete } from "./Autocomplete";
import { Upload, X } from "lucide-react";

const UNITS = [
  { value: "U", label: "Unidad (u)" },
  { value: "KG", label: "Kilogramo (kg)" },
  { value: "G", label: "Gramo (g)" },
  { value: "L", label: "Litro (l)" },
  { value: "ML", label: "Mililitro (ml)" },
];

const VariantForm = (props: {
  initialVariantFormState: any;
  handleSave: (variantFormData: any) => void;
}) => {
  const [variantFormData, setVariantFormData] = useState(
    props.initialVariantFormState,
  );
  
  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nombre Variante"
          placeholder="ej: Estándar, 500g, Pack x3"
          value={variantFormData.name}
          required={true}
          onChange={(e) =>
            setVariantFormData({
              ...variantFormData,
              name: e.target.value,
            })
          }
        />
        <Select
          label="Unidad (Variante)"
          options={UNITS}
          value={variantFormData.contentMeasure}
          onChange={(e) =>
            setVariantFormData({
              ...variantFormData,
              contentMeasure: e.target.value,
            })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Precio Compra ($)"
          type="number"
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
        <div className="bg-muted/30 p-4 rounded-lg border border-border">
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
        <Select
          label="Redondeo de Precios"
          options={[
            { value: "10", label: "Redondear a la decena" },
            { value: "100", label: "Redondear a la centena" },
          ]}
          value={variantFormData.roundingOption}
          onChange={(e) =>
            setVariantFormData({
              ...variantFormData,
              roundingOption: Number(e.target.value),
            })
          }
        />

        <Input
          label="Tiempo Pedido (días)"
          type="number"
          placeholder="Opcional"
          value={variantFormData.requestTime}
          onChange={(e) =>
            setVariantFormData({
              ...variantFormData,
              requestTime: e.target.value,
            })
          }
        />
      </div>

      <div>
        <Label className="mb-2 block">Imágenes de variante</Label>
        <input
          type="file"
          multiple
          accept="image/*"
          id="add-variant-images"
          className="hidden"
          onChange={(e) => {
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
            {variantFormData.images.map((img: string | undefined, idx: number) => (
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
                      images: prev.images.filter((_: any, i: number) => i !== idx),
                    }));
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
                {variantFormData.hasComponents.map((component: any, idx: number) => (
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
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default VariantForm;
