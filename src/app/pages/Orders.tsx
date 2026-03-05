import { useState } from "react";
import { useNavigate } from "react-router";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Card } from "../components/Card";
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
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Modal } from "../components/Modal";
import { Label } from "../components/ui/label";
import { Autocomplete } from "../components/Autocomplete";
import { VariantSelector } from "../components/VariantSelector";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { mockOrders, mockProducts } from "../data/mockData";
import { formatCurrency, formatDateTime } from "../lib/utils";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { value: "mercado_pago", label: "Mercado Pago" },
  { value: "pedidos_ya", label: "Pedidos Ya" },
  { value: "debit", label: "Débito" },
  { value: "credit", label: "Crédito" },
  { value: "cash", label: "Efectivo" },
];

interface VariantItem {
  variantId: string;
  variantName: string;
  productName: string;
  unit: string;
  quantity: number;
  price?: number;
}

type ModalStep = "form" | "summary";

export default function Orders() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("form");
  const [bulkModalStep, setBulkModalStep] = useState<ModalStep>("form");
  const [confirmCancelCreate, setConfirmCancelCreate] = useState(false);
  const [confirmCancelBulk, setConfirmCancelBulk] = useState(false);

  // Single order form
  const [orderForm, setOrderForm] = useState<{
    selectedVariants: VariantItem[];
    paymentMethod: string;
  }>({
    selectedVariants: [],
    paymentMethod: "cash",
  });

  // Bulk order form
  const [bulkForm, setBulkForm] = useState<{
    selectedVariants: VariantItem[];
    paymentMethod: string;
  }>({
    selectedVariants: [],
    paymentMethod: "cash",
  });

  // Filter orders
  const filteredOrders = mockOrders.filter((order) => {
    if (filterStatus !== "all" && order.status !== filterStatus) return false;
    if (
      searchQuery &&
      !order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !order.customerName.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "danger" | "info"> =
      {
        delivered: "success",
        shipped: "info",
        pending: "warning",
        cancelled: "danger",
      };
    return (
      <Badge variant={variants[status] || "default"}>
        {status === "delivered" ? "Entregado" :
         status === "shipped" ? "Enviado" :
         status === "pending" ? "Pendiente" :
         status === "cancelled" ? "Cancelado" : status}
      </Badge>
    );
  };

  const handleCreateOrder = () => {
    if (orderForm.selectedVariants.length === 0) {
      toast.error("Debe seleccionar al menos una variante");
      return;
    }

    const invalidVariants = orderForm.selectedVariants.filter(v => !v.quantity || v.quantity <= 0);
    if (invalidVariants.length > 0) {
      toast.error("Todas las variantes deben tener una cantidad válida");
      return;
    }

    console.log("Creating order:", orderForm);
    toast.success("Orden creada correctamente");
    setShowCreateModal(false);
    setModalStep("form");
    setOrderForm({ selectedVariants: [], paymentMethod: "cash" });
  };

  const handleBulkCreate = () => {
    if (bulkForm.selectedVariants.length === 0) {
      toast.error("Debe seleccionar al menos una variante");
      return;
    }

    const invalidVariants = bulkForm.selectedVariants.filter(v => !v.quantity || v.quantity <= 0);
    if (invalidVariants.length > 0) {
      toast.error("Todas las variantes deben tener una cantidad válida");
      return;
    }

    console.log("Creating bulk orders:", bulkForm);
    toast.success(`Se crearon órdenes para ${bulkForm.selectedVariants.length} producto${bulkForm.selectedVariants.length > 1 ? 's' : ''}`);
    setShowBulkModal(false);
    setBulkModalStep("form");
    setBulkForm({ selectedVariants: [], paymentMethod: "cash" });
  };

  const handleCancelCreate = () => {
    if (orderForm.selectedVariants.length > 0 || modalStep === "summary") {
      setConfirmCancelCreate(true);
    } else {
      setShowCreateModal(false);
    }
  };

  const handleCancelBulk = () => {
    if (bulkForm.selectedVariants.length > 0 || bulkModalStep === "summary") {
      setConfirmCancelBulk(true);
    } else {
      setShowBulkModal(false);
    }
  };

  const getTotalAmount = (variants: VariantItem[]) => {
    return variants.reduce((sum, v) => {
      const variantData = mockProducts
        .flatMap(p => p.variants)
        .find(variant => variant.id === v.variantId);
      return sum + (variantData?.price || 0) * v.quantity;
    }, 0);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground mb-1">
              Órdenes
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestioná las órdenes de tus clientes
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBulkModal(true)}>
              <Upload className="w-5 h-5 mr-2" />
              Carga Masiva
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Nueva Orden
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4 border-b border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Buscar por número o cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: "all", label: "Todos los Estados" },
                  { value: "pending", label: "Pendiente" },
                  { value: "shipped", label: "Enviado" },
                  { value: "delivered", label: "Entregado" },
                  { value: "cancelled", label: "Cancelado" },
                ]}
              />
            </div>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número de Orden</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow
                  key={order.id}
                  onClick={() =>
                    navigate(`/dashboard/orders/${order.id}`)
                  }
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>{order.orderNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(order.date)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-foreground">
                        {order.customerName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.customerEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.status)}
                  </TableCell>
                  <TableCell className="text-center">
                    {order.items.length}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          `/dashboard/orders/${order.id}`,
                        );
                      }}
                    >
                      Detalles
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredOrders.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No se encontraron órdenes
            </div>
          )}
        </Card>

        {/* Create Order Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={handleCancelCreate}
          title={modalStep === "form" ? "Crear Nueva Orden" : "Resumen de Orden"}
          size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={handleCancelCreate}>
                Cancelar
              </Button>
              {modalStep === "form" ? (
                <Button 
                  onClick={() => {
                    if (orderForm.selectedVariants.length === 0) {
                      toast.error("Debe seleccionar al menos una variante");
                      return;
                    }
                    const invalidVariants = orderForm.selectedVariants.filter(v => !v.quantity || v.quantity <= 0);
                    if (invalidVariants.length > 0) {
                      toast.error("Todas las variantes deben tener una cantidad válida");
                      return;
                    }
                    setModalStep("summary");
                  }}
                >
                  Ver Resumen
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setModalStep("form")}>
                    Volver
                  </Button>
                  <Button onClick={handleCreateOrder}>
                    Confirmar y Crear
                  </Button>
                </>
              )}
            </>
          }
        >
          {modalStep === "form" ? (
            <div className="space-y-4">
              <Select
                label="Forma de Pago"
                options={PAYMENT_METHODS}
                value={orderForm.paymentMethod}
                onChange={(e) =>
                  setOrderForm({ ...orderForm, paymentMethod: e.target.value })
                }
              />

              <VariantSelector
                selectedVariants={orderForm.selectedVariants}
                onVariantsChange={(variants) => setOrderForm({ ...orderForm, selectedVariants: variants })}
                showPrice={false}
                quantityLabel="Cantidad"
                searchPlaceholder="Buscar variante por nombre..."
                label="Buscar variante"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg border border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Forma de Pago:</span>
                  <span className="text-sm font-medium">
                    {PAYMENT_METHODS.find(m => m.value === orderForm.paymentMethod)?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Total de Items:</span>
                  <span className="text-sm font-medium">{orderForm.selectedVariants.length}</span>
                </div>
                <div className="flex justify-between items-center border-t border-border pt-2 mt-2">
                  <span className="text-base font-semibold">Total:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(getTotalAmount(orderForm.selectedVariants))}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Productos a Ordenar:</Label>
                {orderForm.selectedVariants.map((variant, idx) => {
                  const variantData = mockProducts
                    .flatMap(p => p.variants)
                    .find(v => v.id === variant.variantId);
                  return (
                    <div key={idx} className="flex justify-between items-center p-3 bg-card rounded-lg border border-border">
                      <div>
                        <p className="text-sm font-medium">{variant.variantName}</p>
                        <p className="text-xs text-muted-foreground">{variant.productName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {variant.quantity} {variant.unit} × {formatCurrency(variantData?.price || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Subtotal: {formatCurrency((variantData?.price || 0) * variant.quantity)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Modal>

        {/* Bulk Create Modal */}
        <Modal
          isOpen={showBulkModal}
          onClose={handleCancelBulk}
          title={bulkModalStep === "form" ? "Carga Masiva de Órdenes" : "Resumen de Órdenes"}
          size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={handleCancelBulk}>
                Cancelar
              </Button>
              {bulkModalStep === "form" ? (
                <Button 
                  onClick={() => {
                    if (bulkForm.selectedVariants.length === 0) {
                      toast.error("Debe seleccionar al menos una variante");
                      return;
                    }
                    const invalidVariants = bulkForm.selectedVariants.filter(v => !v.quantity || v.quantity <= 0);
                    if (invalidVariants.length > 0) {
                      toast.error("Todas las variantes deben tener una cantidad válida");
                      return;
                    }
                    setBulkModalStep("summary");
                  }}
                >
                  Ver Resumen
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setBulkModalStep("form")}>
                    Volver
                  </Button>
                  <Button onClick={handleBulkCreate}>
                    Confirmar y Crear
                  </Button>
                </>
              )}
            </>
          }
        >
          {bulkModalStep === "form" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Seleccione las variantes y cantidades para crear múltiples órdenes automáticamente.
              </p>
              
              <Select
                label="Forma de Pago"
                options={PAYMENT_METHODS}
                value={bulkForm.paymentMethod}
                onChange={(e) =>
                  setBulkForm({ ...bulkForm, paymentMethod: e.target.value })
                }
              />

              <VariantSelector
                selectedVariants={bulkForm.selectedVariants}
                onVariantsChange={(variants) => setBulkForm({ ...bulkForm, selectedVariants: variants })}
                showPrice={false}
                quantityLabel="Cantidad"
                searchPlaceholder="Buscar variante por nombre..."
                label="Buscar variante"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg border border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Forma de Pago:</span>
                  <span className="text-sm font-medium">
                    {PAYMENT_METHODS.find(m => m.value === bulkForm.paymentMethod)?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Órdenes a Crear:</span>
                  <span className="text-sm font-medium">{bulkForm.selectedVariants.length}</span>
                </div>
                <div className="flex justify-between items-center border-t border-border pt-2 mt-2">
                  <span className="text-base font-semibold">Total General:</span>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(getTotalAmount(bulkForm.selectedVariants))}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Órdenes por Crear:</Label>
                {bulkForm.selectedVariants.map((variant, idx) => {
                  const variantData = mockProducts
                    .flatMap(p => p.variants)
                    .find(v => v.id === variant.variantId);
                  return (
                    <div key={idx} className="flex justify-between items-center p-3 bg-card rounded-lg border border-border">
                      <div>
                        <p className="text-sm font-medium">{variant.variantName}</p>
                        <p className="text-xs text-muted-foreground">{variant.productName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {variant.quantity} {variant.unit} × {formatCurrency(variantData?.price || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Subtotal: {formatCurrency((variantData?.price || 0) * variant.quantity)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Modal>

        {/* Confirm Cancel Create Dialog */}
        <ConfirmDialog
          isOpen={confirmCancelCreate}
          onClose={() => setConfirmCancelCreate(false)}
          onConfirm={() => {
            setShowCreateModal(false);
            setModalStep("form");
            setOrderForm({ selectedVariants: [], paymentMethod: "cash" });
            setConfirmCancelCreate(false);
            toast.info("Creación de orden cancelada");
          }}
          title="Cancelar Creación de Orden"
          message="¿Estás seguro de que deseas cancelar? Se perderán todos los datos ingresados."
          confirmText="Sí, cancelar"
          cancelText="Volver"
        />

        {/* Confirm Cancel Bulk Dialog */}
        <ConfirmDialog
          isOpen={confirmCancelBulk}
          onClose={() => setConfirmCancelBulk(false)}
          onConfirm={() => {
            setShowBulkModal(false);
            setBulkModalStep("form");
            setBulkForm({ selectedVariants: [], paymentMethod: "cash" });
            setConfirmCancelBulk(false);
            toast.info("Carga masiva cancelada");
          }}
          title="Cancelar Carga Masiva"
          message="¿Estás seguro de que deseas cancelar? Se perderán todos los datos ingresados."
          confirmText="Sí, cancelar"
          cancelText="Volver"
        />
      </div>
    </DashboardLayout>
  );
}
