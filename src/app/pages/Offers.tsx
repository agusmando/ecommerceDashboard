import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card } from '../components/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/Table';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { mockOffers, mockProducts } from '../data/mockData';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../lib/utils';
import type { Offer } from '../types';

const OFFER_TYPES = [
  { value: 'PERCENTAGE', label: 'Porcentual' },
  { value: 'FIXED', label: 'Monto Fijo' },
  { value: 'BUY_ONE_GET_MORE', label: 'Compra 1 y lleva más (2x1, 3x2)' },
  { value: 'BUY_MORE_GET_MORE', label: 'Compra X y lleva Y gratis' },
  { value: 'BUY_MORE_GET_DISCOUNT', label: 'Compra X y obtén % descuento' },
  { value: 'BUY_MORE_GET_FIXED_DISCOUNT', label: 'Compra X y obtén $ descuento' },
];

export default function Offers() {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<Offer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'PERCENTAGE',
    value: '', // General value for percentage/fixed
    startDate: '',
    endDate: '',
    targetType: 'variant', // 'product' | 'variant'
    selectedIds: [] as string[], // IDs of selected products or variants
    isActive: true,
    
    // Advanced fields
    discountQuantity: '',
    discountValue: '',
    quantityToGet: '',
    stockThreshold: '',
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
      active: 'success',
      inactive: 'default',
      scheduled: 'info',
      expired: 'warning',
    };
    const labels: Record<string, string> = {
      active: 'Activa',
      inactive: 'Inactiva',
      scheduled: 'Programada',
      expired: 'Expirada',
    };
    return <Badge variant={variants[status]}>{labels[status] || status}</Badge>;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'PERCENTAGE',
      value: '',
      startDate: '',
      endDate: '',
      targetType: 'variant',
      selectedIds: [],
      isActive: true,
      discountQuantity: '',
      discountValue: '',
      quantityToGet: '',
      stockThreshold: '',
    });
  };

  const handleCreate = () => {
    setIsEditing(false);
    setCurrentOffer(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (offer: Offer) => {
    setIsEditing(true);
    setCurrentOffer(offer);
    
    // Populate form with offer data
    const targetType = offer.productIds && offer.productIds.length > 0 ? 'product' : 'variant';
    const selectedIds = targetType === 'product' ? (offer.productIds || []) : (offer.variantIds || []);
    
    setFormData({
      name: offer.name,
      type: offer.type,
      value: offer.value.toString(),
      startDate: new Date(offer.startDate).toISOString().slice(0, 16),
      endDate: new Date(offer.endDate).toISOString().slice(0, 16),
      targetType,
      selectedIds,
      isActive: offer.status === 'active',
      discountQuantity: offer.discountQuantity?.toString() || '',
      discountValue: offer.discountValue?.toString() || '',
      quantityToGet: offer.quantityToGet?.toString() || '',
      stockThreshold: offer.stockThreshold?.toString() || '',
    });
    
    setShowModal(true);
  };

  const handleSubmit = () => {
    console.log('Submitting offer:', { isEditing, currentOffer: currentOffer?.id, ...formData });
    setShowModal(false);
  };

  const handleDelete = (offerId: string) => {
    console.log('Deleting offer:', offerId);
    setConfirmDelete(null);
  };

  const toggleSelection = (id: string) => {
    setFormData(prev => ({
      ...prev,
      selectedIds: prev.selectedIds.includes(id)
        ? prev.selectedIds.filter(item => item !== id)
        : [...prev.selectedIds, id]
    }));
  };

  // Helper to determine which fields to show
  const showField = (field: string) => {
    const type = formData.type;
    switch (field) {
      case 'value':
        return type === 'PERCENTAGE' || type === 'FIXED';
      case 'discountQuantity':
        return ['BUY_ONE_GET_MORE', 'BUY_MORE_GET_MORE', 'BUY_MORE_GET_DISCOUNT', 'BUY_MORE_GET_FIXED_DISCOUNT'].includes(type);
      case 'discountValue':
        return ['BUY_ONE_GET_MORE', 'BUY_MORE_GET_MORE', 'BUY_MORE_GET_DISCOUNT', 'BUY_MORE_GET_FIXED_DISCOUNT'].includes(type);
      case 'quantityToGet':
        return ['BUY_MORE_GET_MORE', 'BUY_MORE_GET_DISCOUNT', 'BUY_MORE_GET_FIXED_DISCOUNT'].includes(type);
      default:
        return false;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground mb-1">Ofertas</h1>
            <p className="text-sm text-muted-foreground">Gestionar ofertas promocionales</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-5 h-5 mr-2" />
            Agregar
          </Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Cant. Compra</TableHead>
                <TableHead>Cant. Gratis</TableHead>
                <TableHead className="text-center">Alcance</TableHead>
                <TableHead>Fecha inicio</TableHead>
                <TableHead>Fecha fin</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockOffers.map(offer => (
                <TableRow key={offer.id}>
                  <TableCell>{offer.name}</TableCell>
                  <TableCell><Badge>{offer.type.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>
                    {offer.type === 'PERCENTAGE' ? `${offer.value}%` : 
                     offer.type === 'FIXED' ? formatCurrency(offer.value) : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {offer.quantityToGet ? offer.quantityToGet : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {offer.discountQuantity ? offer.discountQuantity : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {offer.productIds && offer.productIds.length > 0 
                        ? `${offer.productIds.length} Productos` 
                        : `${offer.variantIds ? offer.variantIds.length : 0} Variantes`}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDateTime(offer.startDate)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDateTime(offer.endDate)}</TableCell>
                  <TableCell>{getStatusBadge(offer.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(offer)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setConfirmDelete(offer.id)}
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

        {/* Create/Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={isEditing ? "Editar oferta" : "Crear nueva oferta"}
          size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>{isEditing ? 'Guardar Cambios' : 'Crear'}</Button>
            </>
          }
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            <Input 
                label="Nombre de la oferta" 
                placeholder="ej: Descuentos por día del amigo" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Tipo de Oferta"
                options={OFFER_TYPES}
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              />
              
              {showField('value') && (
                  <Input 
                    label={formData.type === 'PERCENTAGE' ? "Porcentaje (%)" : "Monto ($)"} 
                    type="number" 
                    placeholder="0"
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: e.target.value})}
                  />
              )}
            </div>

            {/* Dynamic Fields for Complex Offers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showField('quantityToGet') && (
                    <Input 
                        label="Cantidad a Comprar (X)" 
                        type="number" 
                        placeholder="Ej: 3"
                        value={formData.quantityToGet}
                        onChange={(e) => setFormData({...formData, quantityToGet: e.target.value})}
                    />
                )}
                {showField('discountQuantity') && (
                    <Input 
                        label="Cantidad Bonificada (Y)" 
                        type="number" 
                        placeholder="Ej: 1"
                        value={formData.discountQuantity}
                        onChange={(e) => setFormData({...formData, discountQuantity: e.target.value})}
                    />
                )}
                {showField('discountValue') && (
                    <Input 
                        label="Valor del Descuento" 
                        type="number" 
                        placeholder="Ej: 50 (para 50%)"
                        value={formData.discountValue}
                        onChange={(e) => setFormData({...formData, discountValue: e.target.value})}
                    />
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input 
                label="Stock Mínimo Requerido" 
                type="number" 
                placeholder="0"
                value={formData.stockThreshold}
                onChange={(e) => setFormData({...formData, stockThreshold: e.target.value})}
              />
              <Input 
                label="Fecha de inicio" 
                type="datetime-local" 
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              />
              <Input 
                label="Fecha de finalización" 
                type="datetime-local" 
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              />
            </div>

            {/* Active Status (only in edit mode) */}
            {isEditing && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <Label className="text-foreground">Estado de la Oferta</Label>
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
            )}

            {/* Target Selection */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-4">
                  <Label className="text-foreground">Aplicar a:</Label>
                  <div className="flex bg-muted rounded-lg p-1">
                      <button
                        className={`px-3 py-1 text-xs rounded-md transition-all ${formData.targetType === 'variant' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
                        onClick={() => setFormData({...formData, targetType: 'variant', selectedIds: []})}
                      >
                        Variantes Específicas
                      </button>
                      <button
                        className={`px-3 py-1 text-xs rounded-md transition-all ${formData.targetType === 'product' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
                        onClick={() => setFormData({...formData, targetType: 'product', selectedIds: []})}
                      >
                        Productos Completos
                      </button>
                  </div>
              </div>

              <div className="border border-border rounded-lg p-3 max-h-60 overflow-y-auto bg-background/50">
                {mockProducts.map(product => (
                  <div key={product.id} className="mb-2">
                    {formData.targetType === 'product' ? (
                        <div 
                            className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted/50 ${formData.selectedIds.includes(product.id) ? 'bg-primary/5' : ''}`}
                            onClick={() => toggleSelection(product.id)}
                        >
                             <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.selectedIds.includes(product.id) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                {formData.selectedIds.includes(product.id) && <div className="w-2 h-2 bg-primary-foreground rounded-full" />}
                             </div>
                             <span className="text-sm font-medium">{product.name}</span>
                        </div>
                    ) : (
                        <div className="mb-3">
                            <div className="text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted/30 rounded mb-1">
                                {product.name}
                            </div>
                            {product.variants.map(variant => (
                                <div 
                                    key={variant.id} 
                                    className={`flex items-center gap-3 py-1.5 px-3 hover:bg-muted/50 rounded cursor-pointer ${formData.selectedIds.includes(variant.id) ? 'bg-primary/5' : ''}`}
                                    onClick={() => toggleSelection(variant.id)}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.selectedIds.includes(variant.id) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                                        {formData.selectedIds.includes(variant.id) && <div className="w-2 h-2 bg-primary-foreground rounded-full" />}
                                    </div>
                                    <span className="text-sm">{variant.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-muted-foreground text-right">
                {formData.selectedIds.length} seleccionados
              </div>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
          title="Eliminar Oferta"
          description="¿Estás seguro de que deseas eliminar esta oferta? Esta acción es irreversible y no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
        />
      </div>
    </DashboardLayout>
  );
}
