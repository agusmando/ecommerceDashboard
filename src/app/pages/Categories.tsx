import { useState } from "react";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Card } from "../components/Card";
import { SortableTable, ColumnDef } from "../components/SortableTable";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { mockCategories } from "../data/mockData";
import { Plus, Edit, Trash2 } from "lucide-react";
import type { Category } from "../types";
import { toast } from "sonner";

export default function Categories() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ name: "", description: "" });
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setIsEditing(true);
    setCurrentId(category.id);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    console.log("Submitting:", { id: currentId, ...formData });
    setIsModalOpen(false);
    toast.success("Categoría guardada exitosamente");
  };

  const handleDelete = (id: string) => {
    setConfirmDelete(id);
  };

  const confirmDeleteCategory = () => {
    if (confirmDelete) {
      console.log("Deleting category with id:", confirmDelete);
      setConfirmDelete(null);
      toast.success("Categoría eliminada exitosamente");
    }
  };

  const columns: ColumnDef<Category>[] = [
    {
      key: "name",
      label: "Nombre",
      sortable: true,
      render: (category) => (
        <span className="font-medium">{category.name}</span>
      ),
    },
    {
      key: "description",
      label: "Descripción",
      sortable: true,
      render: (category) => (
        <span className="text-muted-foreground">
          {category.description || "-"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      align: "right",
      render: (category) => (
        <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(category);
            }}
            tooltip="Editar Categoría"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(category.id);
            }}
            tooltip="Eliminar Categoría"
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
            <h1 className="text-foreground mb-1">Categorías</h1>
            <p className="text-sm text-muted-foreground">
              Organiza tus productos en categorías
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-5 h-5 mr-2" />
            Agregar
          </Button>
        </div>

        <Card>
          <SortableTable 
            data={mockCategories} 
            columns={columns}
            getRowKey={(category) => category.id}
            onRowClick={(category) => handleEdit(category)}
            emptyMessage="No hay categorías para mostrar"
          />
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isEditing ? "Editar Categoría" : "Agregar nueva Categoría"}
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
          <div className="space-y-4">
            <Input
              label="Nombre"
              placeholder="Ingresar nombre de categoría"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Descripción"
              placeholder="Ingresar una descripción (opcional)"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteCategory}
          title="Eliminar Categoría"
          message="¿Estás seguro de que deseas eliminar esta categoría? Esta acción es irreversible y no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
        />
      </div>
    </DashboardLayout>
  );
}