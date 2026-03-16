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
import BaseService from "../service/baseService";
import { Product, ProductVariant } from "../types";
import VariantForm, { VariantFormValues } from "../components/VariantForm";

const productService = new BaseService<Product>("product");
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const initialVariantFormState = {
    name: "",
    price: 0,
    currentStock: 0,
    profitMargin: 0,
    contentMeasure: "U",
    requestTime: 0,
    images: [] as string[],
    contentAmount: 0,
    stockThreshold: 0,
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
  };
  const [variantFormStatus, setVariantFormStatus] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState(false);

  // Variant form state

  const [activeTab, setActiveTab] = useState<
    "variants" | "info" | "currentStock" | "offers"
  >("variants");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [product, setProduct] = useState<Product>();
  type variantFormData = {
    id?: number;
    name: string;
    contentMeasure: string;
    currentStock: number;
    contentAmount?: number;
    requestTime?: number;
    stockThreshold: number;
    roundingOption: number;
    profitMargin: number;
    price: number;
    images: string[];
    packagingOptions: string[];
    isComponentOf: {
      active: boolean;
      mixVariantId: number;
      productVariantId: number;
      quantity: number;
    }[];
    hasComponents: {
      active: boolean;
      mixVariantId: number;
      productVariantId: number;
      quantity: number;
    }[];
    isMix: boolean;
  };

  const [showMixDependencies, setShowMixDependencies] = useState<
    string | null
  >();
  const [datosAEditar, setDatosAEditar] = useState<variantFormData>(
    initialVariantFormState,
  );

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
    { id: "variants", label: "Variantes" },
    { id: "info", label: "Información" },
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

  const handleEditVariant = (productVariant: ProductVariant) => {
    setIsEditing(true);
    // setCurrentId(productVariant.id);
    setDatosAEditar({
      name: productVariant.name,
      contentMeasure: productVariant.contentMeasure.toString(),
      currentStock: productVariant.currentStock,
      contentAmount: productVariant.contentAmount
        ? productVariant.contentAmount
        : 0,
      requestTime: productVariant.requestTime ? productVariant.requestTime : 0,
      stockThreshold: productVariant.stockThreshold || 0,
      roundingOption: productVariant.roundingOption || 10,
      profitMargin: productVariant.profitMargin
        ? productVariant.profitMargin
        : 0,
      price: productVariant.finalPrice || 0,
      images: productVariant.images || [],
      packagingOptions: productVariant.packagingOptions
        ? productVariant.packagingOptions.map((p) => p.toString())
        : ["", "", ""],
      isComponentOf: productVariant.isComponentOf
        ? productVariant.isComponentOf.map((c) => ({
            ...c,
            active: (c as any).active ?? true,
          }))
        : [],
      hasComponents: productVariant.hasComponents
        ? productVariant.hasComponents.map((c) => ({
            ...c,
            active: (c as any).active ?? true,
          }))
        : [],
      isMix: productVariant.hasComponents?.length > 0,
    });
    setShowVariantModal(true);
  };

  const handleCloseVariant = () => {
    setShowVariantModal(false);
    // setVariantFormData(initialVariantFormState);
  };

  const handleSubmitVariant = (data: VariantFormValues) => {
    console.log("Creating variant:", { data });
    setIsEditing(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id === undefined || id === null) return;
        const response = await productService.getOne(Number(id));
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditVariant(variant)}
                              >
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
                setDatosAEditar(initialVariantFormState);
              }}
              title="Agregar Variante"
              size="lg"
              footer={
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowVariantModal(false);
                      setDatosAEditar(initialVariantFormState);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    disabled={!variantFormStatus}
                    type="submit"
                    form="variant-form"
                  >
                    Crear
                  </Button>
                </>
              }
            >
              <VariantForm
                setVariantFormStatus={setVariantFormStatus}
                initialVariantFormState={datosAEditar}
                handleSave={(data: VariantFormValues) => {
                  handleSubmitVariant(data)
                  setShowVariantModal(false)
                }}
              />
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
