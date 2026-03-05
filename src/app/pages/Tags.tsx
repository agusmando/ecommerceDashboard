import { useState } from "react";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { Card } from "../components/Card";
import { SortableTable, ColumnDef } from "../components/SortableTable";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { Input } from "../components/Input";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { mockTags } from "../data/mockData";
import { Plus, Edit, Trash2 } from "lucide-react";
import type { Tag } from "../types";
import { toast } from "sonner";

export default function Tags() {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTag, setCurrentTag] = useState<Tag | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "" });

  const handleCreate = () => {
    setIsEditing(false);
    setCurrentTag(null);
    setFormData({ name: "" });
    setShowModal(true);
  };

  const handleEdit = (tag: Tag) => {
    setIsEditing(true);
    setCurrentTag(tag);
    setFormData({ name: tag.name });
    setShowModal(true);
  };

  const handleSubmit = () => {
    console.log("Submitting tag:", { isEditing, tagId: currentTag?.id, ...formData });
    setShowModal(false);
    toast.success(isEditing ? "Etiqueta actualizada exitosamente" : "Etiqueta creada exitosamente");
  };

  const handleDelete = (tagId: string) => {
    console.log("Deleting tag:", tagId);
    setConfirmDelete(null);
    toast.success("Etiqueta eliminada exitosamente");
  };

  const columns: ColumnDef<Tag>[] = [
    {
      key: "name",
      label: "Nombre",
      sortable: true,
      render: (tag) => (
        <span className="font-medium">{tag.name}</span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      align: "right",
      render: (tag) => (
        <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(tag);
            }}
            tooltip="Editar Etiqueta"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(tag.id);
            }}
            tooltip="Eliminar Etiqueta"
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
            <h1 className="text-foreground mb-1">Etiquetas</h1>
            <p className="text-sm text-muted-foreground">
              Clasifica y filtra productos con etiquetas
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-5 h-5 mr-2" />
            Agregar
          </Button>
        </div>

        <Card>
          <SortableTable
            data={mockTags}
            columns={columns}
            getRowKey={(tag) => tag.id}
            onRowClick={(tag) => handleEdit(tag)}
            emptyMessage="No hay etiquetas para mostrar"
          />
        </Card>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={isEditing ? "Editar Etiqueta" : "Crear Nueva Etiqueta"}
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowModal(false)}>
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
              label="Nombre de Etiqueta"
              placeholder="Ingresar nombre de etiqueta"
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
            />
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete!)}
          title="Eliminar Etiqueta"
          message="¿Estás seguro de que deseas eliminar esta etiqueta? Esta acción es irreversible y no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
        />
      </div>
    </DashboardLayout>
  );
}