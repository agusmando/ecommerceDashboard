import { useState } from "react";
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
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Label } from "../components/ui/label";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { mockSuppliers, mockBrands } from "../data/mockData";
import { Plus, Edit, Trash2, Eye, X } from "lucide-react";
import type { Supplier, Brand } from "../types";

export default function Suppliers() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  const getBrandsForSupplier = (supplierId: string) => {
    return mockBrands.filter(
      (b) => b.supplierId === supplierId,
    );
  };

  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailsModal(true);
  };

  const handleAddBrand = () => {
    if (!selectedSupplier || !newBrandName.trim()) return;
    console.log("Adding brand:", newBrandName, "to supplier:", selectedSupplier.id);
    setNewBrandName("");
    setShowAddBrandModal(false);
  };

  const handleDelete = (supplierId: string) => {
    console.log("Deleting supplier:", supplierId);
    setConfirmDelete(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground mb-1">
              Proveedores
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestioná tus proveedores
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-5 h-5 mr-2" />
            Agregar
          </Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-center">
                  Marcas Asociadas
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSuppliers.map((supplier) => {
                const brands = getBrandsForSupplier(
                  supplier.id,
                );
                return (
                  <TableRow key={supplier.id}>
                    <TableCell>{supplier.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="info">
                        {brands.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          supplier.status === "active"
                            ? "success"
                            : "default"
                        }
                      >
                        {supplier.status === "active" ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewDetails(supplier)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setConfirmDelete(supplier.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Create Supplier Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Agregar Nuevo Proveedor"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </Button>
              <Button onClick={() => setShowCreateModal(false)}>
                Crear
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Nombre"
              placeholder="Ingresá el nombre del proveedor"
            />
            <Select
              label="Estado"
              options={[
                { value: "active", label: "Activo" },
                { value: "inactive", label: "Inactivo" },
              ]}
            />
            <div>
              <label className="block mb-1.5 text-foreground">
                Información de Contacto
              </label>
              <Input
                placeholder="Email"
                type="email"
                className="mb-2"
              />
              <Input placeholder="Teléfono" type="tel" />
            </div>
          </div>
        </Modal>

        {/* Supplier Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={`Detalles: ${selectedSupplier?.name || ""}`}
          size="lg"
        >
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-lg font-semibold">Marcas Asociadas</Label>
                <Button 
                  size="sm" 
                  onClick={() => setShowAddBrandModal(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Marca
                </Button>
              </div>

              <div className="border border-border rounded-lg divide-y divide-border">
                {selectedSupplier && getBrandsForSupplier(selectedSupplier.id).length > 0 ? (
                  getBrandsForSupplier(selectedSupplier.id).map((brand) => (
                    <div
                      key={brand.id}
                      className="p-3 flex items-center justify-between hover:bg-muted/50"
                    >
                      <div>
                        <div className="font-medium">{brand.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {brand.status === "active" ? "Activa" : "Inactiva"}
                        </div>
                      </div>
                      <Badge
                        variant={
                          brand.status === "active" ? "success" : "default"
                        }
                      >
                        {brand.status === "active" ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No hay marcas asociadas a este proveedor
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>

        {/* Add Brand to Supplier Modal */}
        <Modal
          isOpen={showAddBrandModal}
          onClose={() => {
            setShowAddBrandModal(false);
            setNewBrandName("");
          }}
          title="Agregar Nueva Marca"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddBrandModal(false);
                  setNewBrandName("");
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleAddBrand}>Agregar</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Nombre de la Marca"
              placeholder="Ingresá el nombre de la marca"
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Esta marca será asociada a {selectedSupplier?.name}
            </p>
          </div>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
          title="Eliminar Proveedor"
          description="¿Estás seguro de que deseas eliminar este proveedor? Esta acción es irreversible y afectará a todas las marcas asociadas."
          confirmText="Eliminar"
          cancelText="Cancelar"
        />
      </div>
    </DashboardLayout>
  );
}
