import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { DashboardLayout } from "../layouts/DashboardLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/Table";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ProductEditForm } from "../components/ProductEditForm";
import {
  mockProducts,
  mockBrands,
  mockCategories,
  mockTags,
  mockStockMovements,
  mockOffers,
} from "../data/mockData";
import { ArrowLeft, Edit, Trash2, Plus, Upload, X, Eye } from "lucide-react";
import { formatCurrency, formatDateTime } from "../lib/utils";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Autocomplete } from "../components/Autocomplete";
import { toast } from "sonner";

const UNITS = [
  { value: "u", label: "Unidad (u)" },
  { value: "kg", label: "Kilogramo (kg)" },
  { value: "g", label: "Gramo (g)" },
  { value: "l", label: "Litro (l)" },
  { value: "ml", label: "Mililitro (ml)" },
];

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "info" | "variants" | "stock" | "offers"
  >("info");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMixDependencies, setShowMixDependencies] = useState<string | null>(null);

  // Variant form state
  const [variantFormData, setVariantFormData] = useState({
    variantName: "",
    variantPrice: "",
    variantStock: "",
    variantProfitMargin: "",
    variantUnit: "u",
    variantRequestTime: "",
    variantImages: [] as string[],
    variantContentAmount: "",
    variantPackagingOptions: ["", "", ""],
    variantRoundingOption: "none" as "none" | "tens" | "hundreds",
    isMix: false,
    mixComponents: [] as { variantId: string; variantName: string; quantity: number }[],
  });

  const product = mockProducts.find((p) => p.id === id);

  if (!product) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-foreground mb-4">
            Producto no encontrado
          </h2>
          <Button
            onClick={() => navigate("/dashboard/products")}
          >
            Volver a Productos
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const brand = mockBrands.find(
    (b) => b.id === product.brandId,
  );
  const category = mockCategories.find(
    (c) => c.id === product.categoryId,
  );
  const productTags = mockTags.filter((t) =>
    product.tags.includes(t.id),
  );
  const stockMovements = mockStockMovements.filter(
    (m) => m.productId === product.id,
  );
  const relatedOffers = mockOffers.filter((o) =>
    product.variants.some((v) => o.variantIds?.includes(v.id)),
  );

  const tabs = [
    { id: "info", label: "Información" },
    { id: "variants", label: "Variantes" },
    { id: "stock", label: "Movimientos de Stock" },
    { id: "offers", label: "Ofertas" },
  ] as const;

  const getVariantTypeBadge = (type: string) => {
    return type === "mix" ? (
      <Badge variant="info">Mix</Badge>
    ) : (
      <Badge>Normal</Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "default"> = {
      activo: "success",
      inactivo: "default",
      active: "success",
      inactive: "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getMovementTypeBadge = (type: string) => {
    const variants: Record<
      string,
      "success" | "danger" | "info" | "warning"
    > = {
      sale: "danger",
      purchase: "success",
      adjustment: "warning",
      return: "info",
    };
    return <Badge variant={variants[type]}>{type}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard/products")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-foreground mb-1">
                {product.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {brand?.name} • {category?.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditModal(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Borrar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">
                      Nombre
                    </dt>
                    <dd className="text-foreground">
                      {product.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">
                      Descripción
                    </dt>
                    <dd className="text-foreground">
                      {product.description}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">
                      Marca
                    </dt>
                    <dd className="text-foreground">
                      {brand?.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">
                      Categoría
                    </dt>
                    <dd className="text-foreground">
                      {category?.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">
                      Estatus
                    </dt>
                    <dd>{getStatusBadge(product.status)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">
                      Etiquetas
                    </dt>
                    <dd className="flex flex-wrap gap-2">
                      {productTags.map((tag) => (
                        <Badge key={tag.id} variant="info">
                          {tag.name}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metadatos</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">
                      Creado
                    </dt>
                    <dd className="text-foreground">
                      {formatDateTime(product.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">
                      Última Actualización
                    </dt>
                    <dd className="text-foreground">
                      {formatDateTime(product.updatedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">
                      Cantidad de Variantes
                    </dt>
                    <dd className="text-foreground">
                      {product.variants.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">
                      Stock Total
                    </dt>
                    <dd className="text-foreground">
                      {product.variants.reduce(
                        (sum, v) => sum + v.stock,
                        0,
                      )}{" "}
                      unidades
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "variants" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Variantes de Producto</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowVariantModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell>{variant.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {variant.id}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(variant.price)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            variant.stock < 10
                              ? "danger"
                              : variant.stock < 50
                                ? "warning"
                                : "success"
                          }
                        >
                          {variant.stock}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getVariantTypeBadge(variant.type)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(variant.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {variant.type === "mix" && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setShowMixDependencies(variant.id)}
                              tooltip="Ver dependencias del mix"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === "stock" && (
          <Card>
            <CardHeader>
              <CardTitle>Movimientos de Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Variante</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">
                      Cantidad
                    </TableHead>
                    <TableHead>Referencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMovements.map((movement) => {
                    const variant = product.variants.find(
                      (v) => v.id === movement.variantId,
                    );
                    return (
                      <TableRow key={movement.id}>
                        <TableCell>
                          {formatDateTime(movement.date)}
                        </TableCell>
                        <TableCell>
                          {variant?.name || "-"}
                        </TableCell>
                        <TableCell>
                          {getMovementTypeBadge(movement.type)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${movement.quantity > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {movement.quantity > 0 ? "+" : ""}
                          {movement.quantity}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {movement.reference}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {stockMovements.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No hay registro de movimientos de stock
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "offers" && (
          <Card>
            <CardHeader>
              <CardTitle>Ofertas Asociadas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedOffers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell>{offer.name}</TableCell>
                      <TableCell>
                        <Badge>{offer.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {offer.type === "PERCENTAGE"
                          ? `${offer.value}%`
                          : formatCurrency(offer.value)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(offer.startDate)} -{" "}
                        {formatDateTime(offer.endDate)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            offer.status === "activo"
                              ? "success"
                              : "default"
                          }
                        >
                          {offer.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {relatedOffers.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No hay ofertas asociadas a este producto
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Editar Producto"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setShowEditModal(false)}
              >
                Cancelar
              </Button>
              <Button onClick={() => setShowEditModal(false)}>
                Guardar
              </Button>
            </>
          }
        >
          <ProductEditForm product={product} />
        </Modal>

        {/* Add Variant Modal - Complete with all new fields */}
        <Modal
          isOpen={showVariantModal}
          onClose={() => {
            setShowVariantModal(false);
            setVariantFormData({
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
          }}
          title="Agregar Variante"
          size="lg"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setShowVariantModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  console.log("Creating variant:", variantFormData);
                  setShowVariantModal(false);
                }}
              >
                Crear
              </Button>
            </>
          }
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nombre Variante"
                placeholder="ej: Estándar, 500g, Pack x3"
                value={variantFormData.variantName}
                onChange={(e) => setVariantFormData({...variantFormData, variantName: e.target.value})}
              />
              <Select
                label="Unidad (Variante)"
                options={UNITS}
                value={variantFormData.variantUnit}
                onChange={(e) => setVariantFormData({...variantFormData, variantUnit: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Stock Inicial"
                type="number"
                placeholder="0"
                value={variantFormData.variantStock}
                onChange={(e) => setVariantFormData({...variantFormData, variantStock: e.target.value})}
              />
              <Input
                label="Contenido (ej: 90ml)"
                type="number"
                placeholder="Opcional"
                value={variantFormData.variantContentAmount}
                onChange={(e) => setVariantFormData({...variantFormData, variantContentAmount: e.target.value})}
              />
              <Input
                label="Tiempo Pedido (días)"
                type="number"
                placeholder="Opcional"
                value={variantFormData.variantRequestTime}
                onChange={(e) => setVariantFormData({...variantFormData, variantRequestTime: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Precio Compra ($)"
                type="number"
                placeholder="0.00"
                value={variantFormData.variantPrice}
                onChange={(e) => setVariantFormData({...variantFormData, variantPrice: e.target.value})}
              />
              <Input
                label="Margen de Ganancia (%)"
                type="number"
                placeholder="Ej: 30"
                value={variantFormData.variantProfitMargin}
                onChange={(e) => setVariantFormData({...variantFormData, variantProfitMargin: e.target.value})}
              />
            </div>

            {/* Packaging Options for bulk products */}
            {(variantFormData.variantUnit === 'kg' || variantFormData.variantUnit === 'g') && (
              <div className="bg-muted/30 p-4 rounded-lg border border-border">
                <Label className="mb-2 block">Opciones de Empaque (Producto a granel)</Label>
                <p className="text-xs text-muted-foreground mb-3">Ingrese hasta 3 opciones de empaque para este producto a granel</p>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="ej: 100"
                    type="number"
                    value={variantFormData.variantPackagingOptions[0]}
                    onChange={(e) => {
                      const newOptions = [...variantFormData.variantPackagingOptions];
                      newOptions[0] = e.target.value;
                      setVariantFormData({...variantFormData, variantPackagingOptions: newOptions});
                    }}
                  />
                  <Input
                    placeholder="ej: 250"
                    type="number"
                    value={variantFormData.variantPackagingOptions[1]}
                    onChange={(e) => {
                      const newOptions = [...variantFormData.variantPackagingOptions];
                      newOptions[1] = e.target.value;
                      setVariantFormData({...variantFormData, variantPackagingOptions: newOptions});
                    }}
                  />
                  <Input
                    placeholder="ej: 500"
                    type="number"
                    value={variantFormData.variantPackagingOptions[2]}
                    onChange={(e) => {
                      const newOptions = [...variantFormData.variantPackagingOptions];
                      newOptions[2] = e.target.value;
                      setVariantFormData({...variantFormData, variantPackagingOptions: newOptions});
                    }}
                  />
                </div>
              </div>
            )}

            {/* Rounding Option */}
            <div>
              <Label className="mb-2 block">Redondeo de Precios</Label>
              <Select
                options={[
                  { value: "none", label: "Sin redondeo" },
                  { value: "tens", label: "Redondear a la decena" },
                  { value: "hundreds", label: "Redondear a la centena" },
                ]}
                value={variantFormData.variantRoundingOption}
                onChange={(e) => setVariantFormData({...variantFormData, variantRoundingOption: e.target.value as "none" | "tens" | "hundreds"})}
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
                    const newImages = Array.from(files).map(f => URL.createObjectURL(f));
                    setVariantFormData(prev => ({...prev, variantImages: [...prev.variantImages, ...newImages]}));
                  }
                }}
              />
              <label htmlFor="add-variant-images">
                <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 mb-2" />
                  <span className="text-xs">Haga clic para subir imágenes (múltiples)</span>
                </div>
              </label>
              {variantFormData.variantImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {variantFormData.variantImages.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                      <img src={img} alt={`Imagen ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setVariantFormData(prev => ({
                            ...prev,
                            variantImages: prev.variantImages.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-1 rounded-bl-lg"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mix Configuration */}
            <div className="bg-muted/30 p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-foreground">¿Es un Mix?</Label>
                  <p className="text-xs text-muted-foreground">Permite componer este producto de otros productos existentes</p>
                </div>
                <Switch
                  checked={variantFormData.isMix}
                  onCheckedChange={(checked) => setVariantFormData({...variantFormData, isMix: checked})}
                />
              </div>

              {variantFormData.isMix && (
                <div className="mt-4 space-y-3">
                  <div>
                    <Label className="mb-2 block">Buscar variante por nombre</Label>
                    <Autocomplete
                      items={mockProducts.flatMap(p =>
                        p.variants.map(v => ({
                          id: v.id,
                          label: v.name,
                          subtitle: p.name
                        }))
                      ).filter(v => !variantFormData.mixComponents.some(c => c.variantId === v.id))}
                      selectedIds={[]}
                      onSelectionChange={(ids) => {
                        if (ids.length > 0) {
                          const selectedVariant = mockProducts.flatMap(p =>
                            p.variants.map(v => ({
                              id: v.id,
                              label: v.name,
                              subtitle: p.name
                            }))
                          ).find(v => v.id === ids[0]);
                          if (selectedVariant) {
                            setVariantFormData(prev => ({
                              ...prev,
                              mixComponents: [...prev.mixComponents, { variantId: selectedVariant.id, variantName: selectedVariant.label, quantity: 1 }]
                            }));
                          }
                        }
                      }}
                      placeholder="Buscar variantes para agregar..."
                      showBadges={false}
                      multiSelect={false}
                    />
                  </div>

                  {variantFormData.mixComponents.length > 0 && (
                    <div className="space-y-2">
                      <Label className="block">Variantes seleccionadas</Label>
                      {variantFormData.mixComponents.map((component, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border">
                          <span className="text-sm flex-1">{component.variantName}</span>
                          <Input
                            type="number"
                            placeholder="Cant."
                            value={component.quantity}
                            onChange={(e) => {
                              const newComponents = [...variantFormData.mixComponents];
                              newComponents[idx].quantity = parseInt(e.target.value) || 1;
                              setVariantFormData({...variantFormData, mixComponents: newComponents});
                            }}
                            className="w-20"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setVariantFormData(prev => ({
                                ...prev,
                                mixComponents: prev.mixComponents.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="text-destructive hover:bg-destructive/10 p-1 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Modal>

        {/* Mix Dependencies Modal */}
        {showMixDependencies && (
          <Modal
            isOpen={true}
            onClose={() => setShowMixDependencies(null)}
            title="Dependencias del Mix"
          >
            <div className="space-y-3">
              {product.variants.find(v => v.id === showMixDependencies)?.mixComponents?.map((comp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{comp.variantName || `Variante ${comp.variantId}`}</p>
                    <p className="text-xs text-muted-foreground">ID: {comp.variantId}</p>
                  </div>
                  <Badge>Cantidad: {comp.quantity}</Badge>
                </div>
              )) || <p className="text-muted-foreground">No hay componentes definidos</p>}
            </div>
          </Modal>
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={() => navigate("/dashboard/products")}
          title="Dar de baja producto"
          message={`Estás seguro de querer dar de baja "${product.name}"?`}
          confirmText="Dar de baja"
        />
      </div>
    </DashboardLayout>
  );
}