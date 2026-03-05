import { useState } from "react";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Card } from "../components/Card";
import { SortableTable, ColumnDef } from "../components/SortableTable";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { mockBrands, mockSuppliers } from "../data/mockData";
import { Plus, Edit, Trash2 } from "lucide-react";
import type { Brand } from "../types";
import { toast } from "sonner";

export default function Brands() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    supplierId: "",
    status: "active",
  });

  const getSupplierName = (supplierId: string) => {
    return (
      mockSuppliers.find((s) => s.id === supplierId)?.name || "-"
    );
  };

  const handleCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      name: "",
      supplierId: mockSuppliers[0]?.id || "",
      status: "active",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (brand: Brand) => {
    setIsEditing(true);
    setCurrentId(brand.id);
    setFormData({
      name: brand.name,
      supplierId: brand.supplierId,
      status: brand.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    // Here we would normally call an API
    console.log("Submitting:", { id: currentId, ...formData });
    setIsModalOpen(false);
    toast.success("Marca guardada exitosamente");
  };

  const handleDelete = () => {
    // Here we would normally call an API
    console.log("Deleting brand:", confirmDelete);
    setConfirmDelete(null);
    toast.success("Marca eliminada exitosamente");
  };

  const columns: ColumnDef<Brand>[] = [
    {
      key: "name",
      label: "Nombre",
      sortable: true,
    },
    {
      key: "supplierId",
      label: "Proveedor",
      sortable: true,
      render: (brand) => getSupplierName(brand.supplierId),
    },
    {
      key: "status",
      label: "Estado",
      sortable: true,
      render: (brand) => (
        <Badge
          variant={
            brand.status === "active" ? "success" : "default"
          }
        >
          {brand.status === "active" ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      align: "right",
      render: (brand) => (
        <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(brand);
            }}
            tooltip="Editar Marca"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(brand.id);
            }}
            tooltip="Eliminar Marca"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground mb-1">Marcas</h1>
            <p className="text-sm text-muted-foreground">
              Gestionar las marcas de los productos
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-5 h-5 mr-2" />
            Agregar
          </Button>
        </div>

        <Card>
          <SortableTable
            columns={columns}
            data={mockBrands}
            getRowKey={(brand) => brand.id}
            onRowClick={(brand) => handleEdit(brand)}
            emptyMessage="No hay marcas para mostrar"
          />
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isEditing ? "Editar Marca" : "Crear Nueva Marca"}
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {isEditing ? "Guardar Cambios" : "Crear"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Nombre de Marca"
              placeholder="Ingresar nombre de la marca"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <Select
              label="Proveedor"
              options={mockSuppliers.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              value={formData.supplierId}
              onChange={(e) =>
                setFormData({ ...formData, supplierId: e.target.value })
              }
            />
            
            <div className="flex flex-col gap-2">
                <Label className="text-foreground">Estado</Label>
                <div className="flex items-center gap-2">
                    <Switch 
                        checked={formData.status === 'active'}
                        onCheckedChange={(checked) => setFormData({...formData, status: checked ? 'active' : 'inactive'})}
                    />
                    <span className="text-sm text-muted-foreground">{formData.status === 'active' ? 'Activo' : 'Inactivo'}</span>
                </div>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
          title="Eliminar Marca"
          message="¿Estás seguro de que deseas eliminar esta marca? Esta acción es irreversible y no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
        />
      </div>
    </DashboardLayout>
  );
}