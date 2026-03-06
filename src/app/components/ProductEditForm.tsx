import { useState } from "react";
import { Input } from "./Input";
import { Select } from "./Select";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Autocomplete } from "./Autocomplete";
import { mockBrands, mockCategories, mockTags } from "../data/mockData";
import type { Product } from "../types";

const UNITS = [
  { value: "u", label: "Unidad (u)" },
  { value: "kg", label: "Kilogramo (kg)" },
  { value: "g", label: "Gramo (g)" },
  { value: "l", label: "Litro (l)" },
  { value: "ml", label: "Mililitro (ml)" },
];

interface ProductEditFormProps {
  product: Product;
}

export function ProductEditForm({ product }: ProductEditFormProps) {
  console.log(product)

  const [formData, setFormData] = useState({
    name: product.name,
    brandId: product.brandId,
    categoryId: product.categoryId,
    description: product.description,
    active: product.active,
    tags: product.Tags || [],
    measure: product.measure || "u",
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <Input
        label="Nombre del Producto"
        placeholder="Ingresar nombre del producto"
        value={formData.name}
        onChange={(e) => handleChange("name", e.target.value)}
      />
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Marca"
          options={mockBrands
            .filter((b) => b.active)
            .map((b) => ({ value: b.id, label: b.name }))}
          value={formData.brandId}
          onChange={(e) => handleChange("brandId", e.target.value)}
        />
        <Select
          label="Categoría"
          options={mockCategories.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
          value={formData.categoryId}
          onChange={(e) => handleChange("categoryId", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Unidad de Medida (Base)"
          options={UNITS}
          value={formData.measure}
          onChange={(e) => handleChange("measure", e.target.value)}
        />
      </div>

      <div>
        <Label className="mb-2 block">Etiquetas</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Busque y seleccione las etiquetas que desee aplicar
        </p>
        <Autocomplete
          items={mockTags.map((tag) => ({ id: tag.id, label: tag.name }) as any)}
          selectedIds={formData.tags.map((tag) => tag.name)}
          onSelectionChange={(ids) => handleChange("tags", ids)}
          placeholder="Buscar etiquetas..."
          showBadges={true}
          multiSelect={true}
        />
      </div>

      <div>
        <label className="block mb-1.5 text-foreground">Descripción</label>
        <textarea
          className="w-full px-3 py-2 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          rows={3}
          placeholder="Ingresar la descripción del producto"
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-foreground">Estado</Label>
        <div className="flex items-center gap-2">
          <Switch
            checked={formData.active}
            onCheckedChange={(checked) =>
              handleChange("active", checked ? "activo" : "inactivo")
            }
          />
          <span className="text-sm text-muted-foreground">
            {formData.active
              ? "Activo"
              : "Inactivo"}
          </span>
        </div>
      </div>
    </div>
  );
}