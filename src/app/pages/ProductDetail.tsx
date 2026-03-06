import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "../components/Card";
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
import BaseService from "../service/baseService";
import { Product, ProductVariant } from "../types";

const UNITS = [
  { value: "u", label: "Unidad (u)" },
  { value: "kg", label: "Kilogramo (kg)" },
  { value: "g", label: "Gramo (g)" },
  { value: "l", label: "Litro (l)" },
  { value: "ml", label: "Mililitro (ml)" },
];

const productService = new BaseService<Product>("product");
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "info" | "variants" | "currentStock" | "offers"
  >("info");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [product, setProduct] = useState<Product>();
  const [showMixDependencies, setShowMixDependencies] = useState<
    string | null
  >();

  // Variant form state
  const [variantFormData, setVariantFormData] = useState({
    name: "",
    finalPrice: "",
    currentStock: "",
    profitMargin: "",
    contentMeasure: "U",
    requestTime: "",
    images: [] as string[],
    contentAmount: "",
    packagingOptions: ["", "", ""],
    roundingOption: 10,
    isComponentOf: [] as {
      active: boolean;
      mixVariantId: number;
      productVariantId: number;
      quantity: number;
    }[],
    hasComponents: [] as {
      active: boolean;
      mixVariantId: number;
      productVariantId: number;
      quantity: number;
    }[],
    isMix: false,
  });

  const brand = mockBrands.find((b) => b.id === product?.brandId);
  const category = mockCategories.find((c) => c.id === product?.categoryId);
  const productTags = product?.Tags || [];
  const stockMovements = mockStockMovements.filter(
    (m) => m.productId === product?.id,
  );
  const relatedOffers = mockOffers.filter((o) =>
    product?.variants.some((v) => o.variantId?.includes(v.id)),
  );

  const tabs = [
    { id: "info", label: "Información" },
    { id: "variants", label: "Variantes" },
    { id: "currentStock", label: "Movimientos de stock" },
    { id: "offers", label: "Ofertas" },
  ] as const;

  const getVariantTypeBadge = (variant: ProductVariant) => {
    return variant.hasComponents.length > 0 ? (
      <Badge variant="info">Mix</Badge>
    ) : variant.isComponentOf.length > 0 ? (
      <Badge variant="info">Normal - Ingrediente</Badge>
    ) : (
      <Badge>Normal</Badge>
    );
  };

  const getStatusBadge = (active: boolean) => {
    return (
      <Badge variant={active ? "success" : "default"}>
        {active ? "Activo" : "Inactivo"}
      </Badge>
    );
  };

  const getMovementTypeBadge = (type: string) => {
    const variants: Record<string, "success" | "danger" | "info" | "warning"> =
      {
        sale: "danger",
        purchase: "success",
        adjustment: "warning",
        return: "info",
      };
    return <Badge variant={variants[type]}>{type}</Badge>;
  };

  const showDependenciesModal = (id: number) => {
    const variant = product?.variants.find((v) => v.id === id);

    if (
      variant &&
      (variant.hasComponents.length > 0 || variant?.isComponentOf.length > 0)
    ) {
      const hasComp = variant.hasComponents.length > 0;
      const isComp = variant.isComponentOf.length > 0;

      const list = hasComp ? variant.hasComponents : variant.isComponentOf;

      return (
        <Modal
          isOpen={true}
          onClose={() => setShowMixDependencies(null)}
          title={hasComp ? "Componentes del Mix" : "Mix al que pertenece"}
        >
          <div className="space-y-3">
            {list.map((comp, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium">
                    {comp.name || `Variante ${comp.mixVariantId}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ID: {comp.productVariantId}
                  </p>
                </div>
                <Badge>Cantidad: {comp.quantity}</Badge>
              </div>
            ))}
          </div>
        </Modal>
      );
    } else {
      return (
        <p className="text-muted-foreground">No hay componentes definidos</p>
      );
    }
  };

  useEffect(() => {
    console.log("is this even on?");
    const fetchData = async () => {
      try {
        if (id === undefined || id === null) return;
        const response = await productService.getOne(Number(id));
        console.log(response);
        if (response) setProduct(response.response);
      } catch (err) {}
    };

    fetchData();
  }, []);

  return (
    <>
      {!product ? (
        <DashboardLayout>
          <div className="text-center py-12">
            <h2 className="text-foreground mb-4">Producto no encontrado</h2>
            <Button onClick={() => navigate("/dashboard/products")}>
              Volver a Productos
            </Button>
          </div>
        </DashboardLayout>
      ) : (
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
                  <h1 className="text-foreground mb-1">{product.name}</h1>
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
                        <dd className="text-foreground">{product.name}</dd>
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
                        <dd className="text-foreground">{brand?.name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground mb-1">
                          Categoría
                        </dt>
                        <dd className="text-foreground">{category?.name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-muted-foreground mb-1">
                          Estatus
                        </dt>
                        <dd>{getStatusBadge(product.active)}</dd>
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
                      {/* <div>
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
                      </div> */}
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
                            (sum, v) => sum + v.currentStock,
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
                    <Button size="sm" onClick={() => setShowVariantModal(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Stock Actual</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Contenido</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.variants.map((variant) => (
                        <TableRow key={variant.id}>
                          <TableCell className="text-muted-foreground">
                            {variant.id}
                          </TableCell>
                          <TableCell>{variant.name}</TableCell>
                          <TableCell>
                            {variant.finalPrice
                              ? formatCurrency(variant.finalPrice)
                              : variant.price
                                ? formatCurrency(variant.price)
                                : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                variant.currentStock == 0
                                  ? "danger"
                                  : variant.currentStock <=
                                      variant.stockThreshold
                                    ? "warning"
                                    : "success"
                              }
                            >
                              {variant.contentMeasure == "KG"
                                ? variant.currentStock / 1000
                                : variant.currentStock}{" "}
                              {variant.contentMeasure}
                            </Badge>
                          </TableCell>
                          <TableCell>{getVariantTypeBadge(variant)}</TableCell>
                          <TableCell>
                            {variant.contentAmount
                              ? `${variant.contentAmount} ${variant.contentMeasure}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(variant.active)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {(variant.hasComponents.length > 0 ||
                                variant.isComponentOf.length > 0) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setShowMixDependencies(
                                      variant.id.toString(),
                                    )
                                  }
                                  tooltip="Ver componentes del mix"
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

            {activeTab === "currentStock" && (
              <Card>
                <CardHeader>
                  <CardTitle>Movimientos de stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Variante</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
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
                            <TableCell>{variant?.name || "-"}</TableCell>
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
                  {/* {stockMovements.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No hay registro de movimientos de stock
                    </div>
                  )} */}
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
                              variant={offer.active ? "success" : "default"}
                            >
                              {offer.active}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* {relatedOffers.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      No hay ofertas asociadas a este producto
                    </div>
                  )} */}
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
                  name: "",
                  finalPrice: "",
                  currentStock: "",
                  profitMargin: "",
                  contentMeasure: "U",
                  requestTime: "",
                  images: [],
                  contentAmount: "",
                  packagingOptions: ["", "", ""],
                  roundingOption: 10,
                  isComponentOf: [],
                  hasComponents: [],
                  isMix: false,
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
                    value={variantFormData.name}
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

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Precio Compra ($)"
                    type="number"
                    placeholder="0.00"
                    value={variantFormData.finalPrice}
                    onChange={(e) =>
                      setVariantFormData({
                        ...variantFormData,
                        finalPrice: e.target.value,
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

                {/* Packaging Options for bulk products */}
                {(variantFormData.contentMeasure === "kg" ||
                  variantFormData.contentMeasure === "g") && (
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <Label className="mb-2 block">
                      Opciones de Empaque (Producto a granel)
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Ingrese hasta 3 opciones de empaque para este producto a
                      granel
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        placeholder="ej: 100"
                        type="number"
                        value={variantFormData.packagingOptions[0]}
                        onChange={(e) => {
                          const newOptions = [
                            ...variantFormData.packagingOptions,
                          ];
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
                          const newOptions = [
                            ...variantFormData.packagingOptions,
                          ];
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
                          const newOptions = [
                            ...variantFormData.packagingOptions,
                          ];
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
                <div>
                  <Label className="mb-2 block">Redondeo de Precios</Label>
                  <Select
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
                        setVariantFormData((prev) => ({
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
                      {variantFormData.images.map((img, idx) => (
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
                              setVariantFormData((prev) => ({
                                ...prev,
                                images: prev.images.filter((_, i) => i !== idx),
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
                        Permite componer este producto de otros productos
                        existentes
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
                        <Label className="mb-2 block">
                          Buscar variante por nombre
                        </Label>
                        <Autocomplete
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
                              //   setVariantFormData((prev) => ({
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
                        />
                      </div>

                      {variantFormData.hasComponents.length > 0 ? (
                        <div className="space-y-2">
                          <Label className="block">
                            Variantes seleccionadas
                          </Label>
                          {variantFormData.hasComponents.map(
                            (component, idx) => (
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
                                    setVariantFormData((prev) => ({
                                      ...prev,
                                      hasComponents: prev.hasComponents.filter(
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
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </Modal>

            {/* Mix Dependencies Modal */}
            {showMixDependencies &&
              showDependenciesModal(Number(showMixDependencies))}

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
      )}
    </>
  );
}
