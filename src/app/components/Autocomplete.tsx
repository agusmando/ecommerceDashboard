import { useState, useRef, useEffect } from "react";
import { RefreshCw, X } from "lucide-react";
import { Input } from "./Input";
import { Badge } from "./Badge";

interface AutocompleteItem {
  id: string;
  label: string;
  subtitle?: string;
}

interface AutocompleteProps {
  items: AutocompleteItem[];
  isSearching: boolean;
  setSearchTerm: (string: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  placeholder?: string;
  label?: string;
  showBadges?: boolean;
  multiSelect?: boolean;
}

export function Autocomplete({
  items,
  isSearching = false,
  setSearchTerm,
  selectedIds,
  onSelectionChange,
  placeholder = "Buscar...",
  label,
  showBadges = true,
  multiSelect = true,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  let searchCount = 0;

  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSelection = (id: string) => {
    if (multiSelect) {
      const newSelection = selectedIds.includes(id)
        ? selectedIds.filter((item) => item !== id)
        : [...selectedIds, id];
      onSelectionChange(newSelection);
    } else {
      onSelectionChange([id]);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    console.log("items", items)
  }, [items])

  const removeSelection = (id: string) => {
    onSelectionChange(selectedIds.filter((item) => item !== id));
  };

  return (
    <div ref={wrapperRef} className="relative">

      {isSearching && isOpen && (
        <RefreshCw className="absolute top-2 right-2 w-4 h-4 animate-spin" />
      )}

      {label && <label className="block mb-1.5 text-sm font-medium text-foreground">{label}</label>}
      
      <Input
        placeholder={placeholder}
        // value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          searchCount = 1;
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
      />

      {isOpen && items.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {items.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleSelection(item.id)}
                className={`px-3 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    {item.subtitle && (
                      <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {isOpen && !isSearching && searchCount > 0 && items.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="px-3 py-2 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">No se encontró ninguna coincidencia.</div>
              </div>
            </div>
          </div>
        </div>  
      )

      }

      {showBadges && selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedItems.map((item) => (
            <Badge key={item.id} variant="default" className="flex items-center gap-1">
              {item.label}
              <button
                onClick={() => removeSelection(item.id)}
                className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {/* {items.length === 0 && <p className="text-muted-foreground text-sm mt-2">No se encontró ninguna coincidencia.</p>} */}
    </div>
  );
}
