import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Card } from "../components/Card";
import {
  SortableTable,
  ColumnDef,
} from "../components/SortableTable";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Modal } from "../components/Modal";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Autocomplete } from "../components/Autocomplete";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { VariantSelector } from "../components/VariantSelector";
import { ProductEditForm } from "../components/ProductEditForm";
import {
  mockProducts,
  mockBrands,
  mockCategories,
  mockTags,
} from "../data/mockData";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Upload,
  PackagePlus,
} from "lucide-react";
import type { Product } from "../types";
import { toast } from "sonner";
import BaseService from "../service/baseService";

const UNITS = [
  { value: "u", label: "Unidad (u)" },
  { value: "kg", label: "Kilogramo (kg)" },
  { value: "g", label: "Gramo (g)" },
  { value: "l", label: "Litro (l)" },
  { value: "ml", label: "Mililitro (ml)" },
];

interface VariantItem {
  variantId: string;
  variantName: string;
  productName: string;
  unit: string;
  quantity: number;
  price?: number;
}

const productService = new BaseService<Product>("product");

export default function Products() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkStockModalOpen, setIsBulkStockModalOpen] =
    useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number>(0);
  const [confirmDelete, setConfirmDelete] = useState<
    string | null
  >(null);
  const [confirmCancelStock, setConfirmCancelStock] =
    useState(false);

  // Filter states
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk stock state
  const [stockVariants, setStockVariants] = useState<
    VariantItem[]
  >([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    brandId: 0,
    categoryId: 0,
    description: "",
    active: false,
    tags: [] as string[],
    unit: "u",

    // Initial variant data for creation
    variantName: "Estándar",
    variantPrice: "",
    variantStock: "",
    variantProfitMargin: "",
    variantUnit: "u",
    variantRequestTime: "",
    variantImages: [] as string[],
    variantContentAmount: "",
    variantPackagingOptions: ["", "", ""], // Up to 3 packaging options
    variantRoundingOption: "none" as
      | "none"
      | "tens"
      | "hundreds",
    isMix: false,
    mixComponents: [] as {
      variantId: string;
      variantName: string;
      quantity: number;
    }[],
  });

  const [productList, setProductList] = useState<
    Product[] | []
  >([]);

  const handleCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      name: "",
      brandId: mockBrands[0]?.id || "",
      categoryId: mockCategories[0]?.id || "",
      description: "",
      status: "activo",
      tags: [],
      unit: "u",
      variantName: "Estándar",
      variantPrice: "",
      variantStock: "",
      variantProfitMargin: "",
      variantUnit: "u",
      variantRequestTime: "",
      variantImages: [],
      variantContentAmount: "",
      variantPackagingOptions: ["", "", ""],
      variantRoundingOption: "none",
      isMix: false,
      mixComponents: [],
    });
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setIsEditing(true);
    setCurrentId(product.id);
    setFormData({
      name: product.name,
      brandId: product.brandId,
      categoryId: product.categoryId,
      description: product.description,
      active: product.active,
      tags: product.tags || [],
      unit: product.unit || "u",
      // We don't populate variant fields for edit main product modal
      variantName: "",
      variantPrice: "",
      variantStock: "",
      variantProfitMargin: "",
      variantUnit: "u",
      variantRequestTime: "",
      variantImages: [],
      variantContentAmount: "",
      variantPackagingOptions: ["", "", ""],
      variantRoundingOption: "none",
      isMix: false,
      mixComponents: [],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    // Validate
    if (
      !formData.name ||
      !formData.brandId ||
      !formData.categoryId
    )
      return;

    // For creation, validate variant
    if (!isEditing) {
      if (!formData.variantPrice || !formData.variantStock) {
        toast.error(
          "Debe agregar al menos una variante inicial (precio, stock)",
        );
        return;
      }
    }

    console.log("Submitting:", { id: currentId, ...formData });
    toast.success(
      isEditing
        ? "Producto actualizado correctamente"
        : "Producto creado correctamente",
    );
    setIsModalOpen(false);
  };

  const handleBulkStockSubmit = () => {
    if (stockVariants.length === 0) {
      toast.error("Debe seleccionar al menos una variante");
      return;
    }

    const invalidVariants = stockVariants.filter(
      (v) =>
        !v.quantity ||
        !v.price ||
        v.quantity <= 0 ||
        v.price <= 0,
    );
    if (invalidVariants.length > 0) {
      toast.error(
        "Todas las variantes deben tener cantidad y precio válidos",
      );
      return;
    }

    console.log("Submitting bulk stock:", stockVariants);
    toast.success(
      `Stock agregado correctamente a ${stockVariants.length} variante${stockVariants.length > 1 ? "s" : ""}`,
    );
    setIsBulkStockModalOpen(false);
    setStockVariants([]);
  };

  const handleCancelBulkStock = () => {
    if (stockVariants.length > 0) {
      setConfirmCancelStock(true);
    } else {
      setIsBulkStockModalOpen(false);
    }
  };

  // Filter products logic
  const filteredProducts = productList.filter(
    (product: Product) => {
      if (
        filterCategory !== "all" &&
        product.Category.name !== filterCategory
      )
        return false;
      if (
        filterBrand !== "all" &&
        product.Brand.name !== filterBrand
      )
        return false;
      if (
        filterStatus !== "all" &&
        product.active !== filterStatus
      )
        return false;
      if (
        searchQuery &&
        !product.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    },
  );

  const getStatusBadge = (active: boolean) => {
    return active ? (
      <Badge variant="success">Activo</Badge>
    ) : (
      <Badge variant="default">Inactivo</Badge>
    );
  };

  const getTotalStock = (product: Product) => {
    return product.variants.reduce(
      (sum, v) => sum + v.currentStock,
      0,
    );
  };

  const getBrandName = (brandId: string) => {
    return (
      mockBrands.find((b) => b.id === brandId)?.name || "-"
    );
  };

  const getCategoryName = (categoryId: string) => {
    return (
      mockCategories.find((c) => c.id === categoryId)?.name ||
      "-"
    );
  };

  // Define columns for sortable table
  const columns: ColumnDef<Product>[] = [
    {
      key: "name",
      label: "Nombre",
      sortable: true,
    },
    {
      key: "Brand",
      label: "Marca",
      sortable: true,
      render: (product) => product.Brand.name,
    },
    {
      key: "categoryId",
      label: "Categoría",
      sortable: true,
      render: (product) => product.Category.name,
    },
    {
      key: "variants",
      label: "Variantes",
      align: "center",
      sortable: true,
      render: (product) => product.variants.length,
    },
    {
      key: "stock",
      label: "Stock Total",
      align: "center",
      sortable: true,
      render: (product) => {
        const totalStock = getTotalStock(product);
        return (
          <Badge
            variant={totalStock < 50 ? "warning" : "success"}
          >
            {totalStock}
          </Badge>
        );
      },
    },
    {
      key: "status",
      label: "Estado",
      sortable: true,
      render: (product) => getStatusBadge(product.active),
    },
    {
      key: "actions",
      label: "Acciones",
      align: "right",
      render: (product) => (
        <div
          className="flex justify-end gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(product);
            }}
            tooltip="Editar Producto"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            tooltip="Eliminar Producto"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(product.id);
            }}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await productService.get({
          detalle: true,
          paginate: true,
        });
        console.log(response);
        if (response) setProductList(response.response.content);
      } catch (err) {}
    };

    fetchData();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground mb-1">Productos</h1>
            <p className="text-sm text-muted-foreground">
              Gestioná tu catálogo de productos
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsBulkStockModalOpen(true)}
            >
              <PackagePlus className="w-5 h-5 mr-2" />
              Carga Masiva de Stock
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="w-5 h-5 mr-2" />
              Crear Producto
            </Button>
          </div>
        </div>

        <Card>
          {/* Filters */}
          <div className="p-4 border-b border-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select
                value={filterCategory}
                onChange={(e) =>
                  setFilterCategory(e.target.value)
                }
                options={[
                  {
                    value: "all",
                    label: "Todas las Categorías",
                  },
                  ...mockCategories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
                ]}
              />
              <Select
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                options={[
                  { value: "all", label: "Todas las Marcas" },
                  ...mockBrands.map((b) => ({
                    value: b.id,
                    label: b.name,
                  })),
                ]}
              />
              <Select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value)
                }
                options={[
                  { value: "all", label: "Todos" },
                  { value: "activo", label: "Activo" },
                  { value: "inactivo", label: "Inactivo" },
                ]}
              />
            </div>
          </div>

          {/* Table */}
          <SortableTable
            data={filteredProducts}
            columns={columns}
            onRowClick={(product) =>
              navigate(`/dashboard/products/${product.id}`)
            }
            getRowKey={(product) => product.id}
            emptyMessage="No se encontraron productos"
          />
        </Card>

        {/* Bulk Stock Modal */}
        <Modal
          isOpen={isBulkStockModalOpen}
          onClose={handleCancelBulkStock}
          title="Carga Masiva de Stock"
          size="lg"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={handleCancelBulkStock}
              >
                Cancelar
              </Button>
              <Button onClick={handleBulkStockSubmit}>
                Agregar Stock
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Seleccione las variantes y defina la cantidad y
              precio de compra para cada una.
            </p>
            <VariantSelector
              selectedVariants={stockVariants}
              onVariantsChange={setStockVariants}
              showPrice={true}
              priceLabel="Precio Compra"
              quantityLabel="Cantidad"
              searchPlaceholder="Buscar variante por nombre..."
              label="Buscar variante"
            />
          </div>
        </Modal>

        {/* Confirm Cancel Stock Dialog */}
        <ConfirmDialog
          isOpen={confirmCancelStock}
          onClose={() => setConfirmCancelStock(false)}
          onConfirm={() => {
            setIsBulkStockModalOpen(false);
            setStockVariants([]);
            setConfirmCancelStock(false);
            toast.info("Carga de stock cancelada");
          }}
          title="Cancelar Carga de Stock"
          message="¿Estás seguro de que deseas cancelar? Se perderán todos los datos ingresados."
          confirmText="Sí, cancelar"
          cancelText="Volver"
        />

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            isEditing
              ? "Editar Producto"
              : "Crear Nuevo Producto"
          }
          size="lg"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {isEditing ? "Guardar" : "Crear"}
              </Button>
            </>
          }
        >
          {isEditing ? (
            <ProductEditForm
              product={
                mockProducts.find((p) => p.id === currentId)!
              }
            />
          ) : (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* General Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Información General
                </h3>
                <Input
                  label="Nombre del Producto"
                  placeholder="Ingresar nombre del producto"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                />
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Marca"
                    options={mockBrands
                      .filter(
                        (b) =>
                          b.status === "activo" ||
                          b.status === "active",
                      )
                      .map((b) => ({
                        value: b.id,
                        label: b.name,
                      }))}
                    value={formData.brandId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brandId: e.target.value,
                      })
                    }
                  />
                  <Select
                    label="Categoría"
                    options={mockCategories.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categoryId: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Unidad de Medida (Base)"
                    options={UNITS}
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unit: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label className="mb-2 block">
                    Etiquetas
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Busque y seleccione las etiquetas que desee
                    aplicar
                  </p>
                  <Autocomplete
                    items={mockTags.map((tag) => ({
                      id: tag.id,
                      label: tag.name,
                    }))}
                    selectedIds={formData.tags}
                    onSelectionChange={(ids) =>
                      setFormData({ ...formData, tags: ids })
                    }
                    placeholder="Buscar etiquetas..."
                    showBadges={true}
                    multiSelect={true}
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-foreground">
                    Descripción
                  </label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    rows={3}
                    placeholder="Ingresar la descripción del producto"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-foreground">
                    Estado
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.status === "activo"}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          status: checked
                            ? "activo"
                            : "inactivo",
                        })
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {formData.status === "activo"
                        ? "Activo"
                        : "Inactivo"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Initial Variant (Only for create) */}
              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                  Variante Inicial
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Input
                    label="Nombre Variante"
                    placeholder="ej: Estándar, Chocolate, Lata"
                    value={formData.variantName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        variantName: e.target.value,
                      })
                    }
                  />
                  <Select
                    label="Unidad (Variante)"
                    options={UNITS}
                    value={formData.variantUnit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        variantUnit: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <Input
                    label="Stock Inicial"
                    type="number"
                    placeholder="0"
                    value={formData.variantStock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        variantStock: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="Contenido (ej: 90ml)"
                    type="number"
                    placeholder="Opcional"
                    value={formData.variantContentAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        variantContentAmount: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="Tiempo Pedido (días)"
                    type="number"
                    placeholder="Opcional"
                    value={formData.variantRequestTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        variantRequestTime: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Input
                    label="Precio Compra ($)"
                    type="number"
                    placeholder="0.00"
                    value={formData.variantPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        variantPrice: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="Margen de Ganancia (%)"
                    type="number"
                    placeholder="Ej: 30"
                    value={formData.variantProfitMargin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        variantProfitMargin: e.target.value,
                      })
                    }
                  />
                </div>

                {/* Packaging Options for bulk products */}
                {(formData.variantUnit === "kg" ||
                  formData.variantUnit === "g") && (
                  <div className="mb-4 bg-muted/30 p-4 rounded-lg border border-border">
                    <Label className="mb-2 block">
                      Opciones de Empaque (Producto a granel)
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Ingrese hasta 3 opciones de empaque para
                      este producto a granel
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        placeholder="ej: 100"
                        type="number"
                        value={
                          formData.variantPackagingOptions[0]
                        }
                        onChange={(e) => {
                          const newOptions = [
                            ...formData.variantPackagingOptions,
                          ];
                          newOptions[0] = e.target.value;
                          setFormData({
                            ...formData,
                            variantPackagingOptions: newOptions,
                          });
                        }}
                      />
                      <Input
                        placeholder="ej: 250"
                        type="number"
                        value={
                          formData.variantPackagingOptions[1]
                        }
                        onChange={(e) => {
                          const newOptions = [
                            ...formData.variantPackagingOptions,
                          ];
                          newOptions[1] = e.target.value;
                          setFormData({
                            ...formData,
                            variantPackagingOptions: newOptions,
                          });
                        }}
                      />
                      <Input
                        placeholder="ej: 500"
                        type="number"
                        value={
                          formData.variantPackagingOptions[2]
                        }
                        onChange={(e) => {
                          const newOptions = [
                            ...formData.variantPackagingOptions,
                          ];
                          newOptions[2] = e.target.value;
                          setFormData({
                            ...formData,
                            variantPackagingOptions: newOptions,
                          });
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Rounding Option */}
                <div className="mb-4">
                  <Label className="mb-2 block">
                    Redondeo de Precios
                  </Label>
                  <Select
                    options={[
                      { value: "none", label: "Sin redondeo" },
                      {
                        value: "tens",
                        label: "Redondear a la decena",
                      },
                      {
                        value: "hundreds",
                        label: "Redondear a la centena",
                      },
                    ]}
                    value={formData.variantRoundingOption}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        variantRoundingOption: e.target
                          .value as
                          | "none"
                          | "tens"
                          | "hundreds",
                      })
                    }
                  />
                </div>

                <div className="mb-4">
                  <Label className="mb-2 block">
                    Imágenes de variante
                  </Label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    id="variant-images"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        // In a real app, you would upload these files and get URLs
                        const newImages = Array.from(files).map(
                          (f) => URL.createObjectURL(f),
                        );
                        setFormData((prev) => ({
                          ...prev,
                          variantImages: [
                            ...prev.variantImages,
                            ...newImages,
                          ],
                        }));
                      }
                    }}
                  />
                  <label htmlFor="variant-images">
                    <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-xs">
                        Haga clic para subir imágenes
                        (múltiples)
                      </span>
                    </div>
                  </label>
                  {formData.variantImages.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {formData.variantImages.map(
                        (img, idx) => (
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
                                setFormData((prev) => ({
                                  ...prev,
                                  variantImages:
                                    prev.variantImages.filter(
                                      (_, i) => i !== idx,
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
                  )}
                </div>

                {/* Mix Configuration */}
                <div className="bg-muted/30 p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label className="text-foreground">
                        ¿Es un Mix?
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Permite componer este producto de otros
                        productos existentes
                      </p>
                    </div>
                    <Switch
                      checked={formData.isMix}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          isMix: checked,
                        })
                      }
                    />
                  </div>

                  {formData.isMix && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <Label className="mb-2 block">
                          Buscar variante por nombre
                        </Label>
                        <Autocomplete
                          items={mockProducts
                            .flatMap((p) =>
                              p.variants.map((v) => ({
                                id: v.id,
                                label: v.name,
                                subtitle: p.name,
                              })),
                            )
                            .filter(
                              (v) =>
                                !formData.mixComponents.some(
                                  (c) => c.variantId === v.id,
                                ),
                            )}
                          selectedIds={[]}
                          onSelectionChange={(ids) => {
                            if (ids.length > 0) {
                              const selectedVariant =
                                mockProducts
                                  .flatMap((p) =>
                                    p.variants.map((v) => ({
                                      id: v.id,
                                      label: v.name,
                                      subtitle: p.name,
                                      unit: v.unit || "u",
                                    })),
                                  )
                                  .find((v) => v.id === ids[0]);
                              if (selectedVariant) {
                                setFormData((prev) => ({
                                  ...prev,
                                  mixComponents: [
                                    ...prev.mixComponents,
                                    {
                                      variantId:
                                        selectedVariant.id,
                                      variantName: `${selectedVariant.label} (${selectedVariant.unit})`,
                                      quantity: 0,
                                    },
                                  ],
                                }));
                              }
                            }
                          }}
                          placeholder="Buscar variantes para agregar..."
                          showBadges={false}
                          multiSelect={false}
                        />
                      </div>

                      {formData.mixComponents.length > 0 && (
                        <div className="space-y-2">
                          <Label className="block">
                            Variantes seleccionadas
                          </Label>
                          {formData.mixComponents.map(
                            (component, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border"
                              >
                                <span className="text-sm flex-1">
                                  {component.variantName}
                                </span>
                                <Input
                                  type="number"
                                  placeholder="Cant."
                                  value={
                                    component.quantity || ""
                                  }
                                  onChange={(e) => {
                                    const newComponents = [
                                      ...formData.mixComponents,
                                    ];
                                    newComponents[
                                      idx
                                    ].quantity =
                                      parseFloat(
                                        e.target.value,
                                      ) || 0;
                                    setFormData({
                                      ...formData,
                                      mixComponents:
                                        newComponents,
                                    });
                                  }}
                                  className="w-24"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      mixComponents:
                                        prev.mixComponents.filter(
                                          (_, i) => i !== idx,
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
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          isOpen={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            console.log(
              "Deleting product with ID:",
              confirmDelete,
            );
            toast.success("Producto eliminado correctamente");
            setConfirmDelete(null);
          }}
          title="Eliminar Producto"
          message="¿Estás seguro de que deseas eliminar este producto? Esta acción es irreversible y no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
        />
      </div>
    </DashboardLayout>
  );
}