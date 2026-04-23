import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAccountingSummary, downloadAccountingReport } from '../services/api';
import { COP, FECHA } from '../utils/helpers';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import {
  Receipt, XCircle, Loader, Download, TrendingUp,
  Percent, DollarSign, TrendingBar, CheckCircle2,
  Home, Building2, Utensils, FileSpreadsheet
} from 'lucide-react';

const SERVICE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function AccountingView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAccountingSummary()
      .then(result => {
        if (!cancelled) setData(result);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Error al cargar datos contables');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleExport = () => {
    setExporting(true);
    downloadAccountingReport();
    setTimeout(() => setExporting(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Receipt className="w-12 h-12 mx-auto mb-2 text-green-600" />
          <p className="text-gray-500">Cargando datos contables...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <XCircle className="w-12 h-12 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const { summary, revenueByType, revenueByService, completedStays } = data || {};
  if (!summary) return null;

  // Format large numbers
  const formatM = (v) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
    return `$${v}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - same style as other views */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Receipt className="w-8 h-8 inline mr-2" /> Contabilidad</h1>
            <p className="text-sm text-gray-500 mt-1">Resumen financiero y reportes descargables</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:bg-gray-400"
          >
            {exporting ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Descargar Excel</span>
              </>
            )}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Tasa de Ocupación</p>
                  <p className="text-2xl font-bold text-green-600">{summary.occupancyRate}%</p>
                </div>
                <TrendingUp className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Revenue Actual</p>
                  <p className="text-xl font-bold text-blue-600">{formatM(summary.currentRevenue)}</p>
                </div>
                <DollarSign className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Revenue Histórico</p>
                  <p className="text-xl font-bold text-yellow-600">{formatM(summary.historicalRevenue)}</p>
                </div>
                <TrendingBar className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Estadías Completadas</p>
                  <p className="text-2xl font-bold text-purple-600">{completedStays || 0}</p>
                </div>
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Room Occupancy Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <Home className="w-4 h-4 inline mr-1" /> Habitaciones Actuales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Habitaciones</span>
                  <span className="font-bold">{summary.totalRooms}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Ocupadas</span>
                  <span className="font-bold text-green-600">{summary.occupied}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">Disponibles</span>
                  <span className="font-bold text-blue-600">{summary.available}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">Reservadas</span>
                  <span className="font-bold text-yellow-600">{summary.reserved}</span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">Tarifa Promedio/Día</span>
                    <span className="font-bold text-green-700">{COP(summary.avgDailyRate)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Room Type Chart */}
          <Card>
            <CardHeader>
              <DollarSign className="w-4 h-4 inline mr-1" /> Revenue por Tipo de Habitacion</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueByType || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="tipo" stroke="#6b7280" fontSize={10} />
                  <YAxis stroke="#6b7280" fontSize={10} tickFormatter={(v) => formatM(v)} />
                  <Tooltip formatter={(v) => COP(v)} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Service */}
        {revenueByService && revenueByService.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <UtensilsCrossed className="w-4 h-4 inline mr-1" /> Ingresos por Servicio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={revenueByService}
                      dataKey="total"
                      nameKey="categoria"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ categoria, percent }) => `${categoria} ${(percent * 100).toFixed(0)}%`}
                    >
                      {revenueByService.map((entry, index) => (
                        <Cell key={index} fill={SERVICE_COLORS[index % SERVICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => COP(v)} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Detalle por Categoría</h4>
                  {revenueByService.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: SERVICE_COLORS[i % SERVICE_COLORS.length] }} />
                        <span className="text-sm font-medium capitalize">{s.categoria}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{COP(s.total)}</p>
                        <p className="text-xs text-gray-500">{s.count} transacciones</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Download info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Download className="w-5 h-5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Reporte Descargable</p>
              <p className="text-xs text-blue-700 mt-1">
                El archivo Excel incluye 3 hojas: Resumen Financiero, Habitaciones Ocupadas (detalle completo), 
                e Historial de Reservaciones. Compatible con Excel, Google Sheets y LibreOffice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
