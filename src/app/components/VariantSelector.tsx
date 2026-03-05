import { useState } from "react";
import { Autocomplete } from "./Autocomplete";
import { Input } from "./Input";
import { Label } from "./ui/label";
import { Badge } from "./Badge";
import { X } from "lucide-react";
import { mockProducts } from "../data/mockData";

interface VariantItem {
  variantId: string;
  variantName: string;
  productName: string;
  unit: string;
  quantity: number;
  price?: number;
}

interface VariantSelectorProps {
  selectedVariants: VariantItem[];
  onVariantsChange: (variants: VariantItem[]) => void;
  showPrice?: boolean;
  priceLabel?: string;
  quantityLabel?: string;
  searchPlaceholder?: string;
  label?: string;
}

export function VariantSelector({
  selectedVariants,
  onVariantsChange,
  showPrice = false,
  priceLabel = "Precio ($)",
  quantityLabel = "Cantidad",
  searchPlaceholder = "Buscar variantes...",
  label = "Buscar variante por nombre",
}: VariantSelectorProps) {
  const [searchValue, setSearchValue] = useState("");

  // Get all available variants
  const allVariants = mockProducts.flatMap(p =>
    p.variants.map(v => ({
      id: v.id,
      label: v.name,
      subtitle: p.name,
      unit: v.unit || "u",
      productName: p.name,
    }))
  );

  // Filter out already selected variants
  const availableVariants = allVariants.filter(
    v => !selectedVariants.some(sv => sv.variantId === v.id)
  );

  const handleAddVariant = (ids: string[]) => {
    if (ids.length > 0) {
      const selectedVariant = allVariants.find(v => v.id === ids[0]);
      if (selectedVariant) {
        const newVariant: VariantItem = {
          variantId: selectedVariant.id,
          variantName: selectedVariant.label,
          productName: selectedVariant.productName,
          unit: selectedVariant.unit,
          quantity: 0,
          price: showPrice ? 0 : undefined,
        };
        onVariantsChange([...selectedVariants, newVariant]);
        setSearchValue("");
      }
    }
  };

  const handleUpdateVariant = (index: number, field: keyof VariantItem, value: any) => {
    const updated = [...selectedVariants];
    updated[index] = { ...updated[index], [field]: value };
    onVariantsChange(updated);
  };

  const handleRemoveVariant = (index: number) => {
    onVariantsChange(selectedVariants.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="mb-2 block">{label}</Label>
        <Autocomplete
          items={availableVariants}
          selectedIds={[]}
          onSelectionChange={handleAddVariant}
          placeholder={searchPlaceholder}
          showBadges={false}
          multiSelect={false}
        />
      </div>

      {selectedVariants.length > 0 && (
        <div className="space-y-2">
          <Label className="block">Variantes seleccionadas</Label>
          {selectedVariants.map((variant, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-card p-3 rounded-lg border border-border">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{variant.variantName}</span>
                  <Badge variant="info" className="text-xs">
                    {variant.unit}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{variant.productName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={quantityLabel}
                  value={variant.quantity || ""}
                  onChange={(e) => handleUpdateVariant(idx, "quantity", parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
                {showPrice && (
                  <Input
                    type="number"
                    placeholder={priceLabel}
                    value={variant.price || ""}
                    onChange={(e) => handleUpdateVariant(idx, "price", parseFloat(e.target.value) || 0)}
                    className="w-28"
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveVariant(idx)}
                  className="text-destructive hover:bg-destructive/10 p-2 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
