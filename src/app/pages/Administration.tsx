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
import { mockUsers } from "../data/mockData";
import { Plus, Edit, Trash2, Shield } from "lucide-react";

export default function Administration() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground mb-1">
              Administración
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestionar usuarios y permisos
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
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <span className="text-sm">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <span>{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === "Admin"
                          ? "info"
                          : "default"
                      }
                    >
                      {user.role === "Admin" && (
                        <Shield className="w-3 h-3 mr-1" />
                      )}
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={user.role === "Admin"}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Agregar un nuevo usuario"
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
              label="Nombre completo"
              placeholder="Ingresar nombre completo"
            />
            <Input
              label="Email"
              type="email"
              placeholder="usuario@ejemplo.com"
            />
            <Select
              label="Rol"
              options={[
                { value: "Staff", label: "Personal" },
                { value: "Admin", label: "Administrador" },
              ]}
            />
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                El usuario recibirá una invitación por mail para
                configurar su contraseña.
              </p>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}