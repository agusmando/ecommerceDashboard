import { useState } from "react";
import { DashboardLayout } from "../layouts/DashboardLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/Card";
import { Button } from "../components/Button";
import { Select } from "../components/Select";
import { Input } from "../components/Input";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  mockSalesChartData,
  mockProducts,
} from "../data/mockData";
import { formatCurrency } from "../lib/utils";
import { Calendar, Download, TrendingDown, TrendingUp, DollarSign, ChevronDown } from "lucide-react";

export default function Statistics() {
  const [dateRange, setDateRange] = useState("week");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [costAnalysisProduct, setCostAnalysisProduct] = useState("");
  const [costAnalysisQuantity, setCostAnalysisQuantity] = useState("");
  const [priceHistorySearch, setPriceHistorySearch] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Map the dateRange to the keys in mockSalesChartData
  const getChartDataKey = (range: string): 'día' | 'semana' | 'mes' | 'año' => {
    switch (range) {
      case 'today': return 'día';
      case 'week': return 'semana';
      case 'month': return 'mes';
      case 'year': return 'año';
      default: return 'semana';
    }
  };

  const chartData = mockSalesChartData[getChartDataKey(dateRange)] || mockSalesChartData['semana'];

  // Cost Analysis Data - Extended with dates
  const costAnalysisData = [
    { product: "Arroz Integral", supplier: "Granos SA", lastPrice: 1250, currentPrice: 1320, change: 5.6, trend: "up", lastPurchaseDate: "2026-01-15" },
    { product: "Quinoa Orgánica", supplier: "NaturalCo", lastPrice: 2500, currentPrice: 2400, change: -4.0, trend: "down", lastPurchaseDate: "2026-02-10" },
    { product: "Lentejas Premium", supplier: "Legumbres del Sur", lastPrice: 890, currentPrice: 920, change: 3.4, trend: "up", lastPurchaseDate: "2026-02-05" },
    { product: "Granola Artesanal", supplier: "Cereales Naturales", lastPrice: 780, currentPrice: 780, change: 0, trend: "stable", lastPurchaseDate: "2026-01-28" },
    { product: "Harina de Almendras", supplier: "Frutos del Norte", lastPrice: 2300, currentPrice: 2500, change: 8.7, trend: "up", lastPurchaseDate: "2026-02-12" },
    { product: "Aceite de Oliva Extra Virgen", supplier: "Olivos del Sur", lastPrice: 1800, currentPrice: 1750, change: -2.8, trend: "down", lastPurchaseDate: "2026-02-08" },
    { product: "Miel Orgánica", supplier: "Apiarios Naturales", lastPrice: 1200, currentPrice: 1300, change: 8.3, trend: "up", lastPurchaseDate: "2026-01-20" },
    { product: "Pasta Integral", supplier: "Molinos del Valle", lastPrice: 450, currentPrice: 470, change: 4.4, trend: "up", lastPurchaseDate: "2026-02-01" },
    { product: "Té Verde Premium", supplier: "Importadora Oriental", lastPrice: 3200, currentPrice: 3100, change: -3.1, trend: "down", lastPurchaseDate: "2026-02-14" },
    { product: "Cacao en Polvo", supplier: "Chocolates del Caribe", lastPrice: 1650, currentPrice: 1780, change: 7.9, trend: "up", lastPurchaseDate: "2026-01-30" },
  ];

  // Filter price history data
  const filteredPriceHistory = costAnalysisData.filter(item =>
    priceHistorySearch === "" ||
    item.product.toLowerCase().includes(priceHistorySearch.toLowerCase()) ||
    item.supplier.toLowerCase().includes(priceHistorySearch.toLowerCase())
  );

  const displayedPriceHistory = showAllHistory
    ? filteredPriceHistory
    : filteredPriceHistory.slice(0, 4);

  const calculatePurchaseCost = () => {
    if (!costAnalysisProduct || !costAnalysisQuantity) return null;
    const product = mockProducts.find(p => p.id === costAnalysisProduct);
    if (!product || !product.variants[0]) return null;
    
    const quantity = parseFloat(costAnalysisQuantity);
    const unitPrice = product.variants[0].price;
    const totalCost = unitPrice * quantity;
    const profitMargin = product.variants[0].profitMargin || 30;
    const suggestedSalePrice = totalCost * (1 + profitMargin / 100);
    
    return {
      productName: product.name,
      quantity,
      unitPrice,
      totalCost,
      profitMargin,
      suggestedSalePrice,
    };
  };

  const purchaseCostResult = calculatePurchaseCost();

  const movementTypeData = [
    {
      name: "Ventas",
      value: 450,
      color: "var(--color-chart-1)",
    },
    {
      name: "Compras",
      value: 280,
      color: "var(--color-chart-2)",
    },
    {
      name: "Ajustes",
      value: 45,
      color: "var(--color-chart-3)",
    },
    {
      name: "Devoluciones",
      value: 32,
      color: "var(--color-chart-4)",
    },
    {
      name: "Producción",
      value: 32,
      color: "var(--color-chart-4)",
    },
  ];

  const paymentMethodsData = [
    {
      name: "Mercado Pago",
      value: 320,
      percentage: 35.3,
      color: "var(--color-chart-1)",
    },
    {
      name: "Efectivo",
      value: 245,
      percentage: 27.0,
      color: "var(--color-chart-2)",
    },
    {
      name: "Crédito",
      value: 180,
      percentage: 19.8,
      color: "var(--color-chart-3)",
    },
    {
      name: "Débito",
      value: 120,
      percentage: 13.2,
      color: "var(--color-chart-4)",
    },
    {
      name: "Pedidos Ya",
      value: 43,
      percentage: 4.7,
      color: "var(--color-chart-5)",
    },
  ];

  const monthlyComparison = [
    { month: "Ene", sales: 45000, orders: 120 },
    { month: "Feb", sales: 52000, orders: 145 },
    { month: "Mar", sales: 48000, orders: 135 },
    { month: "Abr", sales: 61000, orders: 167 },
    { month: "May", sales: 55000, orders: 152 },
    { month: "Jun", sales: 67000, orders: 189 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground mb-1">
              Estadísticas
            </h1>
            <p className="text-sm text-muted-foreground">
              Análisis avanzados y perspectivas de ventas
            </p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar Reporte
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Date Range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={[
                { value: "today", label: "Hoy" },
                { value: "week", label: "Esta Semana" },
                { value: "month", label: "Este Mes" },
                { value: "quarter", label: "Este Trimestre" },
                { value: "year", label: "Este Año" },
              ]}
            />
            <Select
              label="Producto"
              value={selectedProduct}
              onChange={(e) =>
                setSelectedProduct(e.target.value)
              }
              options={[
                { value: "all", label: "Todos" },
                ...mockProducts
                  .slice(0, 5)
                  .map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <Select
              label="Tipo de movimiento"
              options={[
                { value: "all", label: "Todos" },
                { value: "sale", label: "Ventas" },
                { value: "purchase", label: "Compras" },
                { value: "adjustment", label: "Ajustes" },
                { value: "production", label: "Producción" },
              ]}
            />
          </div>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Ventas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="var(--color-muted-foreground)"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      style={{ fontSize: "12px" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      name="Sales ($)"
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="var(--color-chart-2)"
                      strokeWidth={2}
                      name="Orders"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Movement Types */}
          <Card>
            <CardHeader>
              <CardTitle>
                Movimientos de Stock por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={movementTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {movementTypeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Comparison */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Comparación Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyComparison}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                    />
                    <XAxis
                      dataKey="month"
                      stroke="var(--color-muted-foreground)"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      style={{ fontSize: "12px" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="sales"
                      fill="var(--color-chart-1)"
                      name="Sales ($)"
                    />
                    <Bar
                      dataKey="orders"
                      fill="var(--color-chart-2)"
                      name="Orders"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Medio de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) =>
                        `${name}: ${percentage}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodsData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle por Medio de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentMethodsData.map((method, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: method.color }}
                      />
                      <span className="text-sm font-medium">{method.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{method.value} órdenes</div>
                      <div className="text-xs text-muted-foreground">{method.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">
                Ganancia total
              </div>
              <div className="text-2xl font-semibold text-foreground">
                {formatCurrency(328000)}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                +12.5% vs último periodo
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">
                Órdenes Totales
              </div>
              <div className="text-2xl font-semibold text-foreground">
                908
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                +8.2% vs último periodo
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">
                Valor Promedio de Orden{" "}
              </div>
              <div className="text-2xl font-semibold text-foreground">
                {formatCurrency(361)}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                +4.1% vs último periodo
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground mb-1">
                Radio de Conversión
              </div>
              <div className="text-2xl font-semibold text-foreground">
                3.2%
              </div>
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                -0.3% vs último periodo
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Cost Analysis Section */}
        <div className="border-t border-border pt-6 mt-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Análisis de Precio de Costo (Compras)
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Analice los costos de compra de insumos o productos para planificar su inversión y optimizar precios de venta
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Calculator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Calculadora de Costos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select
                    label="Seleccionar Producto"
                    value={costAnalysisProduct}
                    onChange={(e) => setCostAnalysisProduct(e.target.value)}
                    options={[
                      { value: "", label: "Seleccionar..." },
                      ...mockProducts.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                  />
                  <Input
                    label="Cantidad a Comprar"
                    type="number"
                    placeholder="Ej: 50"
                    value={costAnalysisQuantity}
                    onChange={(e) => setCostAnalysisQuantity(e.target.value)}
                  />

                  {purchaseCostResult && (
                    <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Producto:</span>
                        <span className="text-sm font-medium">{purchaseCostResult.productName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Precio Unitario:</span>
                        <span className="text-sm font-medium">{formatCurrency(purchaseCostResult.unitPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Cantidad:</span>
                        <span className="text-sm font-medium">{purchaseCostResult.quantity} unidades</span>
                      </div>
                      <div className="border-t border-border pt-3 flex justify-between items-center">
                        <span className="text-base font-semibold text-foreground">Costo Total:</span>
                        <span className="text-lg font-bold text-foreground">{formatCurrency(purchaseCostResult.totalCost)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Margen de Ganancia:</span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">{purchaseCostResult.profitMargin}%</span>
                      </div>
                      <div className="flex justify-between items-center bg-primary/10 p-2 rounded">
                        <span className="text-sm font-medium text-foreground">Precio Venta Sugerido:</span>
                        <span className="text-sm font-bold text-primary">{formatCurrency(purchaseCostResult.suggestedSalePrice)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Price History & Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Historial de Precios de Compra
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Input
                    label="Buscar Producto o Proveedor"
                    type="text"
                    placeholder="Ej: Arroz Integral"
                    value={priceHistorySearch}
                    onChange={(e) => setPriceHistorySearch(e.target.value)}
                  />
                  {displayedPriceHistory.map((item, index) => (
                    <div key={index} className="p-3 bg-muted/30 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.product}</p>
                          <p className="text-xs text-muted-foreground">{item.supplier}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(item.lastPurchaseDate).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          item.trend === "up" 
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            : item.trend === "down"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                        }`}>
                          {item.trend === "up" && <TrendingUp className="w-3 h-3" />}
                          {item.trend === "down" && <TrendingDown className="w-3 h-3" />}
                          {item.change !== 0 ? `${item.change > 0 ? "+" : ""}${item.change}%` : "Sin cambios"}
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Precio Anterior</p>
                          <p className="text-sm font-medium line-through">{formatCurrency(item.lastPrice)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Precio Actual</p>
                          <p className="text-sm font-bold text-foreground">{formatCurrency(item.currentPrice)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredPriceHistory.length > 4 && (
                    <div className="text-center mt-3">
                      <Button
                        variant="link"
                        onClick={() => setShowAllHistory(!showAllHistory)}
                      >
                        {showAllHistory ? "Ver menos" : `Ver más (${filteredPriceHistory.length - 4} más)`}
                        <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAllHistory ? "rotate-180" : ""}`} />
                      </Button>
                    </div>
                  )}
                  {filteredPriceHistory.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron resultados
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}