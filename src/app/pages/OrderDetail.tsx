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
import { ConfirmDialog } from "../components/ConfirmDialog";
import { mockOrders, mockProducts } from "../data/mockData";
import { ArrowLeft, Ban, X } from "lucide-react";
import { formatCurrency, formatDateTime } from "../lib/utils";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showCancelDialog, setShowCancelDialog] =
    useState(false);
  const [showPartialCancelDialog, setShowPartialCancelDialog] =
    useState(false);
  const [selectedItemId, setSelectedItemId] = useState<
    string | null
  >(null);

  const order = mockOrders.find((o) => o.id === id);

  if (!order) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-foreground mb-4">
            Orden no encontrada
          </h2>
          <Button onClick={() => navigate("/dashboard/orders")}>
            Volver a órdenes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "success" | "warning" | "danger" | "info"
    > = {
      delivered: "success",
      shipped: "info",
      processing: "warning",
      pending: "warning",
      cancelled: "danger",
      completed: "success",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status}
      </Badge>
    );
  };

  const getProductName = (productId: string) => {
    return (
      mockProducts.find((p) => p.id === productId)?.name ||
      "Unknown Product"
    );
  };

  const getVariantName = (
    productId: string,
    variantId: string,
  ) => {
    const product = mockProducts.find(
      (p) => p.id === productId,
    );
    return (
      product?.variants.find((v) => v.id === variantId)?.name ||
      "-"
    );
  };

  const handlePartialCancel = (itemId: string) => {
    setSelectedItemId(itemId);
    setShowPartialCancelDialog(true);
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
              onClick={() => navigate("/dashboard/orders")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-foreground mb-1">
                {order.orderNumber}
              </h1>
              <p className="text-sm text-muted-foreground">
                Realizado el {formatDateTime(order.date)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowCancelDialog(true)}
              disabled={
                order.status === "cancelled" ||
                order.status === "delivered"
              }
            >
              <Ban className="w-4 h-4 mr-2" />
              Cancelar Orden
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle>Items de la orden</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Variante</TableHead>
                      <TableHead className="text-center">
                        Cantidad
                      </TableHead>
                      <TableHead className="text-right">
                        Precio
                      </TableHead>
                      <TableHead className="text-right">
                        Subtotal
                      </TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {getProductName(item.productId)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getVariantName(
                            item.productId,
                            item.variantId,
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(
                            item.price * item.quantity,
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(item.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.status !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handlePartialCancel(item.id)
                              }
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Total */}
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Subtotal
                        </span>
                        <span className="text-foreground">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Descuentos
                        </span>
                        <span className="text-foreground">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Envío
                        </span>
                        <span className="text-foreground">
                          {formatCurrency(0)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2">
                        <span className="text-foreground">
                          Total
                        </span>
                        <span className="text-foreground">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">
                      Nombre
                    </dt>
                    <dd className="text-foreground">
                      {order.customerName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">
                      Email
                    </dt>
                    <dd className="text-foreground">
                      {order.customerEmail}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground mb-1">
                      ID de Usuario
                    </dt>
                    <dd className="text-muted-foreground text-sm">
                      {order.customerId}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Estado Actual
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Fecha de la Orden
                    </div>
                    <div className="text-foreground">
                      {formatDateTime(order.date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">
                      ID de la Orden
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {order.id}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cancel Full Order Dialog */}
        <ConfirmDialog
          isOpen={showCancelDialog}
          onClose={() => setShowCancelDialog(false)}
          onConfirm={() => navigate("/dashboard/orders")}
          title="Cancel Order"
          message={`Are you sure you want to cancel order ${order.orderNumber}? This will cancel all items in the order.`}
          confirmText="Cancel Order"
        />

        {/* Cancel Item Dialog */}
        <ConfirmDialog
          isOpen={showPartialCancelDialog}
          onClose={() => {
            setShowPartialCancelDialog(false);
            setSelectedItemId(null);
          }}
          onConfirm={() => setSelectedItemId(null)}
          title="Cancelar Item"
          message="¿Estás seguro de querer cancelar este ítem?"
          confirmText="Cancelar Item"
          variant="warning"
        />
      </div>
    </DashboardLayout>
  );
}