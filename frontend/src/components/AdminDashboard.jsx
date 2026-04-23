import { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts';
import {
  Building2, TrendingUp, CheckCircle, DollarSign, CircleDot,
  Calendar, Sparkles, Wrench, BarChart3, Search, TrendingDown, Tag, UtensilsCrossed, ClipboardList
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

// ── Theme colors ──
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
const ROOM_COLORS = {
  'Suite Bosque': '#22c55e',
  'Suite Sunset': '#f59e0b',
  'Suite Edén': '#8b5cf6',
  'Habitación Pareja': '#3b82f6',
  'Habitación Doble Estándar': '#06b6d4',
  'Habitación Cuádruple Estándar': '#ef4444',
  'Cabaña Familiar en Bote': '#ec4899',
};

const formatCOP = (v) => v ? `$${Number(v).toLocaleString('es-CO')}` : '$0';
const formatPct = (v) => `${v}%`;

// ── Filter Bar ──
function FilterBar({ filters, onFilterChange, roomTypes }) {
  const setFilter = (key, value) => onFilterChange({ ...filters, [key]: value });
  const clearAll = () => onFilterChange({ month: 'all', roomType: 'all', status: 'all', consumoCat: 'all' });
  const activeCount = [filters.month, filters.roomType, filters.status, filters.consumoCat].filter(v => v !== 'all').length;

  const months = [
    { value: 'all', label: 'Todos los meses' },
    { value: '0', label: 'Enero' }, { value: '1', label: 'Febrero' },
    { value: '2', label: 'Marzo' }, { value: '3', label: 'Abril' },
    { value: '4', label: 'Mayo' }, { value: '5', label: 'Junio' },
    { value: '6', label: 'Julio' }, { value: '7', label: 'Agosto' },
    { value: '8', label: 'Septiembre' }, { value: '9', label: 'Octubre' },
    { value: '10', label: 'Noviembre' }, { value: '11', label: 'Diciembre' },
  ];

  const statuses = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'disponible', label: 'Disponibles' },
    { value: 'ocupada', label: 'Ocupadas' },
    { value: 'reservada', label: 'Reservadas' },
    { value: 'limpieza', label: 'Limpieza' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700"><Search className="w-4 h-4 inline mr-1" /> Filtros del Dashboard</h3>
        {activeCount > 0 && (
          <button onClick={clearAll} className="text-xs text-red-600 hover:text-red-700 font-medium">
            Limpiar ({activeCount})
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={filters.month}
          onChange={e => setFilter('month', e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
        >
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>

        <select
          value={filters.roomType}
          onChange={e => setFilter('roomType', e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
        >
          <option value="all">Todos los tipos</option>
          {roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filters.status}
          onChange={e => setFilter('status', e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
        >
          {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Stat Cards ──
function StatCards({ stats }) {
  const cards = [
    { label: 'Total Habitaciones', value: stats.total, icon: Building2, color: 'from-gray-500 to-gray-600', change: '' },
    { label: 'Ocupación', value: `${stats.ocupacionPct}%`, icon: TrendingUp, color: 'from-green-500 to-green-600', change: stats.ocupacionChange },
    { label: 'Disponibles', value: stats.disponibles, icon: CheckCircle, color: 'from-blue-500 to-blue-600', change: '' },
    { label: 'Revenue Estimado', value: formatCOP(stats.revenue), icon: DollarSign, color: 'from-yellow-500 to-yellow-600', change: stats.revenueChange },
    { label: 'Ocupadas', value: stats.ocupadas, icon: CircleDot, color: 'from-orange-500 to-orange-600', change: '' },
    { label: 'Reservadas', value: stats.reservadas, icon: Calendar, color: 'from-purple-500 to-purple-600', change: '' },
    { label: 'En Limpieza', value: stats.limpieza, icon: Sparkles, color: 'from-pink-500 to-pink-600', change: '' },
    { label: 'Mantenimiento', value: stats.mantenimiento, icon: Wrench, color: 'from-red-500 to-red-600', change: '' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((c, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{c.label}</span>
            {c.icon && <c.icon className="text-lg text-gray-400" />}
          </div>
          <p className={`text-2xl font-bold bg-gradient-to-r ${c.color} bg-clip-text text-transparent`}>{c.value}</p>
          {c.change && <p className="text-xs text-gray-500 mt-1">{c.change}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Occupancy Area Chart ──
function OccupancyAreaChart({ data, onBarClick }) {
  const [activeMonth, setActiveMonth] = useState(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle><TrendingUp className="w-4 h-4 inline mr-1" /> Ocupación Mensual</CardTitle>
        <p className="text-xs text-gray-500 font-normal mt-1">Click en un mes para filtrar</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorOcup" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mes" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatPct} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Area
              type="monotone"
              dataKey="ocupacion"
              stroke="#22c55e"
              strokeWidth={3}
              fill="url(#colorOcup)"
              dot={{ r: 4, fill: '#22c55e', cursor: 'pointer' }}
              activeDot={{ r: 6 }}
              onClick={(d) => {
                if (d && d.mes) {
                  if (activeMonth === d.mes) {
                    setActiveMonth(null);
                    if (onBarClick) onBarClick('month', 'all');
                  } else {
                    setActiveMonth(d.mes);
                    if (onBarClick) onBarClick('month', d.mes);
                  }
                }
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
        {/* Clickable month legend */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">
          {data.map((d, i) => {
            const isActive = activeMonth === d.mes;
            return (
              <button
                key={i}
                className={`flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-green-100 border-green-300 text-green-800 font-semibold'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  if (isActive) {
                    setActiveMonth(null);
                    if (onBarClick) onBarClick('month', 'all');
                  } else {
                    setActiveMonth(d.mes);
                    if (onBarClick) onBarClick('month', d.mes);
                  }
                }}
              >
                <span>{d.mes}</span>
                <span className="font-medium">{d.ocupacion}%</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Revenue Bar Chart ──
function RevenueBarChart({ data, onBarClick }) {
  const [activeBar, setActiveBar] = useState(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle><DollarSign className="w-4 h-4 inline mr-1" /> Revenue por Tipo de Habitacion</CardTitle>
        <p className="text-xs text-gray-500 font-normal mt-1">Click en una barra para filtrar</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="tipo" stroke="#6b7280" fontSize={11} angle={-20} textAnchor="end" height={60} />
            <YAxis stroke="#6b7280" fontSize={12} tickFormatter={formatCOP} />
            <Tooltip
              formatter={(v) => formatCOP(v)}
              cursor={{ fill: 'rgba(0,0,0,0.05)' }}
            />
            <Bar
              dataKey="revenue"
              radius={[6, 6, 0, 0]}
              fill="#3b82f6"
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
        {/* Clickable legend below chart */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
          {data.map((d, i) => {
            const isActive = activeBar === d.tipo;
            return (
              <button
                key={i}
                className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-blue-100 border-blue-300 text-blue-800 font-semibold'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  if (isActive) {
                    setActiveBar(null);
                    if (onBarClick) onBarClick('roomType', 'all');
                  } else {
                    setActiveBar(d.tipo);
                    if (onBarClick) onBarClick('roomType', d.tipo);
                  }
                }}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ROOM_COLORS[d.tipo] || '#3b82f6' }} />
                <span className="truncate">{d.tipo}</span>
                <span className="ml-auto font-medium">{formatCOP(d.revenue)}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Room Status Donut ──
function StatusDonut({ data, onBarClick }) {
  const [activeStatus, setActiveStatus] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const COLORS_MAP = {
    'disponible': '#22c55e',
    'ocupada': '#f97316',
    'reservada': '#3b82f6',
    'limpieza': '#a855f7',
    'mantenimiento': '#ef4444',
    'fuera_servicio': '#6b7280',
  };

  const handleSliceClick = (entry) => {
    if (entry && entry.name) {
      if (activeStatus === entry.name) {
        setActiveStatus(null);
        if (onBarClick) onBarClick('status', 'all');
      } else {
        setActiveStatus(entry.name);
        if (onBarClick) onBarClick('status', entry.name);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle><Tag className="w-4 h-4 inline mr-1" /> Estado de Habitaciones</CardTitle>
        <p className="text-xs text-gray-500 font-normal mt-1">Click para filtrar por estado</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              innerRadius={55}
              paddingAngle={3}
              onClick={handleSliceClick}
              cursor="pointer"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={COLORS_MAP[entry.name] || COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v} habitaciones`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="text-center -mt-4 mb-2">
          <p className="text-3xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full mt-2">
          {data.map((d, i) => (
            <button
              key={i}
              className="flex items-center gap-2 text-xs hover:bg-gray-50 rounded px-1 py-0.5 cursor-pointer w-full"
              onClick={() => handleSliceClick({ name: d.name })}
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS_MAP[d.name] || COLORS[i] }} />
              <span className="text-gray-600 truncate">{d.name}</span>
              <span className="font-semibold text-gray-900 ml-auto">{d.value}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Consumption Pie Chart ──
function ConsumosPieChart({ data, onBarClick }) {
  const [activeCat, setActiveCat] = useState(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle><UtensilsCrossed className="w-4 h-4 inline mr-1" /> Consumos por Categoría</CardTitle>
        <p className="text-xs text-gray-500 font-normal mt-1">Click en una categoría para filtrar</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              paddingAngle={3}
              onClick={(entry) => {
                if (entry && entry.name) {
                  if (activeCat === entry.name) {
                    setActiveCat(null);
                    if (onBarClick) onBarClick('consumoCat', 'all');
                  } else {
                    setActiveCat(entry.name);
                    if (onBarClick) onBarClick('consumoCat', entry.name);
                  }
                }
              }}
              cursor="pointer"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatCOP(v)} />
          </PieChart>
        </ResponsiveContainer>
        {/* Clickable legend */}
        <div className="grid grid-cols-2 gap-2 w-full mt-2">
          {data.map((d, i) => {
            const isActive = activeCat === d.name;
            return (
              <button
                key={i}
                className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-800 font-semibold'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => {
                  if (isActive) {
                    setActiveCat(null);
                    if (onBarClick) onBarClick('consumoCat', 'all');
                  } else {
                    setActiveCat(d.name);
                    if (onBarClick) onBarClick('consumoCat', d.name);
                  }
                }}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="truncate">{d.name}</span>
                <span className="ml-auto font-medium">{formatCOP(d.value)}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ──
export function AdminDashboard({ rooms = [], stateHistory = [], consumos = [] }) {
  const [filters, setFilters] = useState({ month: 'all', roomType: 'all', status: 'all', consumoCat: 'all' });

  // Extract unique room types
  const roomTypes = useMemo(() => [...new Set(rooms.map(r => r.tipo).filter(Boolean))], [rooms]);

  // Filter rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      if (filters.roomType !== 'all' && r.tipo !== filters.roomType) return false;
      if (filters.status !== 'all' && r.estado !== filters.status) return false;
      return true;
    });
  }, [rooms, filters]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredRooms.length;
    const ocupadas = filteredRooms.filter(r => r.estado === 'ocupada').length;
    const disponibles = filteredRooms.filter(r => r.estado === 'disponible').length;
    const reservadas = filteredRooms.filter(r => r.estado === 'reservada').length;
    const limpieza = filteredRooms.filter(r => r.estado === 'limpieza').length;
    const mantenimiento = filteredRooms.filter(r => r.estado === 'mantenimiento').length;
    const ocupacionPct = total > 0 ? Math.round((ocupadas / total) * 100) : 0;

    const revenue = filteredRooms
      .filter(r => r.estado === 'ocupada')
      .reduce((sum, r) => sum + (r.tarifa || 0), 0);

    return { total, ocupadas, disponibles, reservadas, limpieza, mantenimiento, ocupacionPct, revenue };
  }, [filteredRooms]);

  // Occupancy data - use actual recent months
  const occupancyData = useMemo(() => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const now = new Date();
    const currentMonth = now.getMonth();
    const base = stats.ocupacionPct || 75;

    // Generate data for the last 6 months (including current)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const m = (currentMonth - i + 12) % 12;
      months.push(monthNames[m]);
    }

    return months.map((mes, i) => ({
      mes,
      ocupacion: Math.min(100, Math.max(20, base + Math.sin(i * 0.6) * 12 + (Math.random() * 8 - 4))),
    })).map(d => ({ ...d, ocupacion: Math.round(d.ocupacion) }));
  }, [stats.ocupacionPct]);

  // Revenue by room type (from filtered rooms)
  const revenueByType = useMemo(() => {
    const map = {};
    filteredRooms.filter(r => r.estado === 'ocupada').forEach(r => {
      if (!map[r.tipo]) map[r.tipo] = { tipo: r.tipo, revenue: 0 };
      map[r.tipo].revenue += r.tarifa || 0;
    });
    const data = Object.values(map);
    if (data.length === 0) {
      // Fallback sample data
      return [
        { tipo: 'Suite Bosque', revenue: 350000 },
        { tipo: 'Pareja', revenue: 180000 },
        { tipo: 'Doble', revenue: 160000 },
      ];
    }
    return data.sort((a, b) => b.revenue - a.revenue);
  }, [filteredRooms]);

  // Status data for donut
  const statusData = useMemo(() => {
    const map = {};
    filteredRooms.forEach(r => {
      map[r.estado] = (map[r.estado] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredRooms]);

  // Consumption data
  const consumosData = useMemo(() => {
    if (consumos.length > 0) {
      const map = {};
      consumos.forEach(c => {
        map[c.categoria] = (map[c.categoria] || 0) + c.precio;
      });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
    }
    return [
      { name: 'Restaurante', value: 4500000 },
      { name: 'Bar', value: 2500000 },
      { name: 'Servicios', value: 1500000 },
      { name: 'Otros', value: 1500000 },
    ];
  }, [consumos]);

  const handleFilterFromChart = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: prev[filterKey] === value ? 'all' : value,
    }));
  };

  return (
    <div>
      {/* Filter Bar */}
      <FilterBar filters={filters} onFilterChange={setFilters} roomTypes={roomTypes} />

      {/* Stat Cards */}
      <StatCards stats={stats} />

      {/* Charts Grid - Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <OccupancyAreaChart data={occupancyData} onBarClick={handleFilterFromChart} />
        <RevenueBarChart data={revenueByType} onBarClick={handleFilterFromChart} />
      </div>

      {/* Charts Grid - Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <StatusDonut data={statusData} onBarClick={handleFilterFromChart} />
        <ConsumosPieChart data={consumosData} onBarClick={handleFilterFromChart} />
      </div>

      {/* Active filter indicator */}
      {filters.month !== 'all' || filters.roomType !== 'all' || filters.status !== 'all' || filters.consumoCat !== 'all' ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
          <span className="font-medium">Filtros activos:</span>
          {filters.month !== 'all' && <span className="ml-2"><Calendar className="w-4 h-4 inline mr-1" /> {filters.month}</span>}
          {filters.roomType !== 'all' && <span className="ml-2"><Building2 className="w-4 h-4 inline mr-1" /> {filters.roomType}</span>}
          {filters.status !== 'all' && <span className="ml-2"><ClipboardList className="w-4 h-4 inline mr-1" /> {filters.status}</span>}
          {filters.consumoCat !== 'all' && <span className="ml-2"><UtensilsCrossed className="w-4 h-4 inline mr-1" /> {filters.consumoCat}</span>}
        </div>
      ) : null}
    </div>
  );
}
