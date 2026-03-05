import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { KPICard } from '../components/KPICard';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/Table';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { mockKPIs, mockSalesChartData, mockOrders, mockProducts } from '../data/mockData';
import { formatCurrency, formatDate } from '../lib/utils';
import { AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState<'día' | 'semana' | 'mes' | 'año'>('semana');

  // Get chart data based on selected period
  const chartData = mockSalesChartData[chartPeriod] || mockSalesChartData['semana'];

  // Get latest orders
  const latestOrders = mockOrders.slice(0, 5);

  // Get low stock products (stock < 10)
  const lowStockProducts = mockProducts.flatMap(product => 
    product.variants
      .filter(v => v.stock < 10)
      .map(v => ({ product, variant: v }))
  ).slice(0, 5);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      delivered: 'success',
      shipped: 'info',
      processing: 'warning',
      pending: 'warning',
      cancelled: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-foreground mb-1">Panel de administración</h1>
          <p className="text-sm text-muted-foreground">
            ¡Bienvenido de vuelta! Esto es lo que está pasando con tu aplicación
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockKPIs.map((kpi, index) => (
            <KPICard key={index} kpi={kpi} />
          ))}
        </div>

        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Descripción general de ventas</CardTitle>
              <div className="flex gap-2">
                {(['día', 'semana', 'mes', 'año'] as const).map(period => (
                  <Button
                    key={period}
                    variant={chartPeriod === period ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setChartPeriod(period)}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--color-muted-foreground)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="var(--color-muted-foreground)"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="var(--color-chart-1)" 
                    strokeWidth={2}
                    dot={{ fill: 'var(--color-chart-1)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latest Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Últimas órdenes</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/dashboard/orders')}
                >
                  Ver todas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Órdenes</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestOrders.map(order => (
                    <TableRow 
                      key={order.id}
                      onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                    >
                      <TableCell>{order.orderNumber}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  Alerta de stock bajo
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/dashboard/products')}
                >
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Variante</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map(({ product, variant }) => (
                    <TableRow 
                      key={variant.id}
                      onClick={() => navigate(`/dashboard/products/${product.id}`)}
                    >
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{variant.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={variant.stock < 5 ? 'danger' : 'warning'}>
                          {variant.stock}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
