import { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast as sonnerToast } from 'sonner';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  LayoutDashboard, Home, ClipboardPen, CreditCard, Receipt, DollarSign,
  Check, Bed, Calendar, Clock, ChevronDown, Download, FileText,
  Search, DoorOpen, ClipboardList, Building2, Grid3X3, List,
  Users, Baby, Dog, X, Plus, Minus, ChevronRight,
  ChevronUp, ArrowRight, Filter, MapPin, TrendingDown, TrendingUp,
  BarChart3, UtensilsCrossed, Trash2, Tag, AlertTriangle, Loader,
  ChevronLeft, History, Package, Inbox, CircleDot, Circle, CheckCircle, Shield, Bell
} from 'lucide-react';
import { useRooms } from '../hooks/useRooms';
import { useRoomSync } from '../hooks/useRoomSync';
import { queryKeys } from '../hooks/useQueryKeys';
import { ESTADO_CFG, TIPO_ICON, TIPOS_HABITACION, CATEGORIAS_CONSUMO } from '../constants';
import { FECHA, filtrarRooms, agruparPorPiso, COP } from '../utils/helpers';
import { fetchHistory, fetchRooms, createConsumo, checkIn, fetchLastLogin, fetchLoginLogs, fetchStateHistory, fetchAccountingSummary, downloadAccountingReport, downloadLoginLogsCSV, fetchSecurityEvents, fetchUsers } from '../services/api';
import RoomDetail from './RoomDetail';
import HotelTitle from './HotelTitle';
import PriceEditor from './PriceEditor';
import { Toast } from './RoomActions';
import { AdminDashboard } from './AdminDashboard';
import SecurityDashboard from './SecurityDashboard';
import { Card, CardContent } from './ui/Card';
import PantallaCheckin from './PantallaCheckin';
import PantallaUsuarios from './PantallaUsuarios';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'rooms', label: 'Habitaciones', icon: Home },
  { key: 'register', label: 'Registrar', icon: ClipboardPen },
  { key: 'transactions', label: 'Transacciones', icon: CreditCard },
  { key: 'accounting', label: 'Contabilidad', icon: Receipt },
  { key: 'prices', label: 'Precios', icon: DollarSign },
  { key: 'users', label: 'Usuarios', icon: Users },
  { key: 'security', label: 'Seguridad', icon: Shield },
];

/** Memoized topbar with last login, logs dropdown, and notification bell */
const AdminTopbar = memo(function AdminTopbar({ onSalir, onNavigate, rooms = [], onRoomSelect }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [lastLogin, setLastLogin] = useState(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [nowMs, setNowMs] = useState(0);

  // Fetch last login info
  useEffect(() => {
    fetchLastLogin().then(r => {
      if (r && r.lastLogin) setLastLogin(r.lastLogin);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const updateNow = () => setNowMs(new Date().getTime());
    updateNow();
    const timer = setInterval(updateNow, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleLogs = useCallback(() => {
    const opening = !logsOpen;
    setLogsOpen(opening);
    if (opening && logs.length === 0) {
      setLogsLoading(true);
      fetchLoginLogs(50)
        .then(data => setLogs(data || []))
        .catch(() => {})
        .finally(() => setLogsLoading(false));
    }
  }, [logsOpen, logs.length]);

  const formatTimeAgo = (ts) => {
    if (!ts) return '';
    const diff = nowMs - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  };

  const notifications = useMemo(() => {
    const items = [];
    const now = new Date();
    const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    for (const r of rooms) {
      if (r.solicitudCheckout) {
        items.push({
          id: `checkout-${r.id}`,
          type: 'checkout_request',
          roomId: r.id,
          numero: r.numero,
          label: `Check-out solicitado`,
          detail: `Habitación #${r.numero} — ${r.huesped || 'Sin huésped'}`,
          time: r.solicitudCheckout.hora,
          icon: '🔔',
          color: 'text-amber-600',
          bg: 'bg-amber-50',
        });
      }
      if (r.estado === 'ocupada' && r.checkOut) {
        const co = new Date(r.checkOut);
        if (co <= soon && co > now) {
          items.push({
            id: `prox-checkout-${r.id}`,
            type: 'prox_checkout',
            roomId: r.id,
            numero: r.numero,
            label: `Check-out próximo`,
            detail: `Habitación #${r.numero} — ${r.huesped || 'Sin huésped'}`,
            time: r.checkOut,
            icon: '⏰',
            color: 'text-orange-600',
            bg: 'bg-orange-50',
          });
        }
      }
      if (r.estado === 'reservada' && r.checkIn) {
        const ci = new Date(r.checkIn);
        if (ci <= soon && ci > now) {
          items.push({
            id: `prox-reserva-${r.id}`,
            type: 'prox_reserva',
            roomId: r.id,
            numero: r.numero,
            label: `Reserva próxima`,
            detail: `Habitación #${r.numero} — ${r.huesped || 'Sin huésped'}`,
            time: r.checkIn,
            icon: '📅',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          });
        }
      }
    }
    items.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
    return items;
  }, [rooms]);

  const handleNotifClick = (notif) => {
    setNotifOpen(false);
    if (onRoomSelect) onRoomSelect(notif.roomId);
  };

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 px-6 h-[58px] flex items-center justify-between sticky top-0 z-[100] shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <HotelTitle variant="topbar" />
        </button>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:inline bg-gray-100 px-2 py-1 rounded">Admin</span>
        {lastLogin && (
          <span className="text-xs text-gray-400 hidden lg:inline">
            Último acceso: {formatTimeAgo(lastLogin.timestamp)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100/80 hover:text-gray-700 rounded-xl transition-all duration-200"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-200/50">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
                  {notifications.length > 0 && (
                    <span className="text-xs text-gray-400">{notifications.length} pendiente{notifications.length !== 1 ? 's' : ''}</span>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Sin notificaciones</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-start gap-3 border-none cursor-pointer"
                      >
                        <span className="text-lg shrink-0 mt-0.5">{n.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-semibold ${n.color}`}>{n.label}</div>
                          <div className="text-sm text-gray-900 truncate">{n.detail}</div>
                          {n.time && (
                            <div className="text-[11px] text-gray-400 mt-0.5">{formatTimeAgo(n.time)}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="p-2 border-t border-gray-100">
                  <button
                    onClick={() => { setNotifOpen(false); onNavigate('rooms'); }}
                    className="w-full text-xs py-2 text-gray-600 hover:bg-gray-100 rounded text-center"
                  >
                    Ver todas las habitaciones
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Logs Dropdown */}
        <div className="relative">
          <button
            onClick={handleToggleLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100/80 hover:text-gray-700 rounded-xl transition-all duration-200"
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Logs</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${logsOpen ? 'rotate-180' : ''}`} />
          </button>

          {logsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLogsOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Registro de Accesos</h3>
                  {logs.length > 0 && (
                    <button
                      onClick={() => downloadLoginLogsCSV(logs)}
                      className="text-xs text-green-600 hover:text-green-700 font-medium"
                    >
                      <Download className="w-4 h-4 inline mr-1" /> CSV
                    </button>
                  )}
                </div>

                {logsLoading ? (
                  <div className="p-4 text-center text-gray-400 text-sm">Cargando...</div>
                ) : logs.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">Sin registros</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {logs.map((log, i) => (
                      <div key={log.id || i} className="p-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-900">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString('es-CO') : ''}
                          </span>
                          {i === 0 && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Actual</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 font-mono">{log.ip || 'N/A'}</div>
                        <div className="text-xs text-gray-400 truncate mt-0.5">{log.country || ''}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick nav links */}
                <div className="p-2 border-t border-gray-100 grid grid-cols-2 gap-1">
                  <button
                    onClick={() => { setLogsOpen(false); onNavigate('history'); }}
                    className="text-xs px-2 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-center"
                  >
                    <ClipboardList className="w-3 h-3 inline" /> Historial
                  </button>
                  <button
                    onClick={() => { setLogsOpen(false); onNavigate('reservations'); }}
                    className="text-xs px-2 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-center"
                  >
                    <Calendar className="w-3 h-3 inline" /> Reservaciones
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onSalir}
          className="flex items-center gap-2 px-4 py-2 bg-red-50/80 text-red-600 rounded-xl hover:bg-red-100/80 hover:shadow-md hover:shadow-red-200/30 transition-all duration-300 text-sm font-medium"
          aria-label="Salir"
        >
          <DoorOpen className="w-4 h-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
});

/** Memoized navigation — extracted from 6 duplicated instances */
const AdminNav = memo(function AdminNav({ activeView, onNavigate }) {
  return (
    <nav className="bg-white/90 backdrop-blur-lg border-b border-gray-200/50 sticky top-[58px] z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                activeView === item.key
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-200/50'
                  : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-800 hover:shadow-sm'
              }`}
              onClick={() => onNavigate(item.key)}
            >
                {item.icon && <item.icon className="text-lg" />}
                <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
});

/** Memoized stat pills with URL-sync via onFilter callback */
const StatPills = memo(function StatPills({ stats, filtro, onFilter }) {
  const pills = [
    { key: 'todos', label: `Todas (${stats.total})`, icon: LayoutDashboard, cfg: null },
    { key: 'disponible', label: `Disponibles (${stats.disponible})`, icon: Check, cfg: ESTADO_CFG.disponible },
    { key: 'ocupada', label: `Ocupadas (${stats.ocupada})`, icon: Bed, cfg: ESTADO_CFG.ocupada },
    { key: 'reservada', label: `Reservadas (${stats.reservada})`, icon: Calendar, cfg: ESTADO_CFG.reservada },
    { key: 'limpieza', label: `Limpieza (${stats.limpieza})`, icon: Clock, cfg: ESTADO_CFG.limpieza },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      {pills.map(p => (
        <button
          key={p.key}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap min-w-0"
          style={p.cfg ? (
            filtro === p.key 
              ? { background: p.cfg.bg, borderColor: p.cfg.border, color: p.cfg.color }
              : { background: 'transparent', borderColor: p.cfg.border, color: p.cfg.color }
          ) : (
            filtro === p.key
              ? { background: '#2D5A3D', borderColor: '#2D5A3D', color: 'white' }
              : { background: 'transparent', borderColor: '#d1d5db', color: '#374151' }
          )}
          onClick={() => onFilter(p.key)}
        >
          {p.icon && <p.icon className="text-base" />}
          <span className="truncate">{p.label}</span>
        </button>
      ))}
    </div>
  );
});

/** Memoized view mode toggle */
const ViewModeToggle = memo(function ViewModeToggle({ viewMode, onChange }) {
  return (
    <div className="inline-flex rounded-xl overflow-hidden border border-gray-200/60 shadow-sm ml-auto">
      <button
        className={`px-3 py-1.5 text-sm transition-all duration-200 ${viewMode === 'grid' ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md' : 'bg-white/80 text-gray-600 hover:bg-gray-100'}`}
        onClick={() => onChange('grid')}
      >
        <Grid3X3 className="w-4 h-4" />
      </button>
      <button
        className={`px-3 py-1.5 text-sm transition-all duration-200 ${viewMode === 'list' ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md' : 'bg-white/80 text-gray-600 hover:bg-gray-100'}`}
        onClick={() => onChange('list')}
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
});

/** Memoized room list item */
const RoomListItem = memo(function RoomListItem({ room, isSelected, onSelect }) {
  const cfg = ESTADO_CFG[room.estado] || ESTADO_CFG.disponible;
  const noches = room.noches || null;

  return (
    <tr
      className={`cursor-pointer transition-all duration-200 border-l-4 ${
        isSelected ? 'bg-emerald-50/80 border-l-emerald-500 shadow-sm' : 'border-l-transparent hover:bg-gray-50/80 hover:shadow-sm'
      }`}
      onClick={() => onSelect(room.id)}
    >
      <td className="px-4 py-3 font-medium">{room.numero}</td>
      <td className="px-4 py-3 hidden sm:table-cell">{room.tipo}</td>
      <td className="px-4 py-3 hidden md:table-cell">{room.huesped || '—'}</td>
      <td className="px-4 py-3">
        <span className="status-badge px-2 py-0.5 rounded-full text-xs" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
          {cfg.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right">{noches ? `${noches} noche${noches > 1 ? 's' : ''}` : '—'}</td>
    </tr>
  );
});

/** Memoized room card for grid view with hover animations */
const RoomCard = memo(function RoomCard({ room, isSelected, onSelect }) {
  const cfg = ESTADO_CFG[room.estado] || ESTADO_CFG.disponible;

  return (
    <button
      className={`w-full text-left cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 bg-white/90 backdrop-blur-sm ${
        isSelected ? 'ring-2 ring-emerald-500 ring-offset-2 shadow-xl shadow-emerald-200/30' : 'hover:shadow-xl hover:border-emerald-300/30 hover:-translate-y-0.5 hover:bg-white'
      }`}
      style={{ borderColor: cfg.border }}
      onClick={() => onSelect(room.id)}
    >
      {/* Header: Room number + Status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl font-bold text-gray-900">{room.numero}</span>
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
          {cfg.label}
        </span>
      </div>

      {/* Room type + capacity */}
      <div className="space-y-1.5 text-sm">
        <p className="text-gray-700 font-medium truncate">{room.tipo}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{room.camas} camas</span>
          <span className="text-gray-300">|</span>
          <span>{room.capacidad} personas</span>
          <span className="text-gray-300">|</span>
          <span>Piso {room.piso}</span>
        </div>

        {/* Guest info (if occupied) */}
        {room.huesped && (
          <div className="pt-2 mt-2 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 truncate">{room.huesped}</p>
            {room.checkIn && (
              <p className="text-xs text-gray-500">Check-in: {FECHA(room.checkIn)}</p>
            )}
          </div>
        )}

        {/* PIN (masked for security - only show when occupied/reserved) */}
        {(room.estado === 'ocupada' || room.estado === 'reservada') && room.pin && (
          <div className="pt-2 mt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">PIN: <span className="font-mono font-bold text-gray-900 tracking-wider">{room.pin}</span></p>
          </div>
        )}
      </div>
    </button>
  );
});

/**
 * Check-in form component — matches the original PantallaCheckin design
 */
function CheckinForm({ room, onSuccess, onCancel }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    huesped: '',
    email: '',
    telefono: '',
    documento: '',
    adultos: 1,
    ninos: 0,
    tieneMascota: false,
    nombreMascota: '',
    noches: 1,
    checkIn: today,
    observaciones: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkOutDate = useMemo(() => {
    if (form.checkIn && form.noches > 0) {
      const d = new Date(form.checkIn + 'T00:00:00');
      d.setDate(d.getDate() + form.noches);
      return d.toISOString().split('T')[0];
    }
    return '';
  }, [form.checkIn, form.noches]);

  const precioTotal = room?.tarifa ? room.tarifa * form.noches * form.adultos : 0;
  const precioNinos = form.ninos > 0 ? 80000 * form.noches * form.ninos : 0;
  const precioMascota = form.tieneMascota ? 50000 * form.noches : 0;
  const granTotal = precioTotal + precioNinos + precioMascota;
  const totalPersonas = form.adultos + form.ninos;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.huesped.trim()) return setError('Nombre del huésped requerido');
    if (!form.documento.trim()) return setError('Documento requerido');
    if (!form.telefono.trim()) return setError('Teléfono requerido');

    setLoading(true);
    setError('');
    try {
      await checkIn({
        roomId: room.id,
        ...form,
        checkOut: checkOutDate,
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al realizar check-in');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="p-6">
      {/* Room Info Card - Green themed */}
      <div className="mb-6 p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/80 border-2 border-emerald-400/60 rounded-2xl shadow-lg shadow-emerald-200/20">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-bold text-green-600 uppercase">Habitación</p>
            <p className="text-3xl font-extrabold text-green-900">{room.numero}</p>
            <p className="text-lg font-bold text-green-700">{room.tipo}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-green-600">{room?.tarifa?.toLocaleString('es-CO') || '0'}</p>
            <p className="text-sm text-green-500">COP/noche</p>
          </div>
        </div>

        {/* Dates and Nights */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold text-green-700 uppercase block mb-1">Check-in</label>
            <input
              type="date"
              value={form.checkIn}
              onChange={e => updateField('checkIn', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-green-300 focus:border-green-500 bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-green-700 uppercase block mb-1">Noches</label>
            <input
              type="number"
              min="1"
              max="30"
              value={form.noches}
              onChange={e => updateField('noches', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-lg border-2 border-green-300 focus:border-green-500 bg-white"
            />
          </div>
        </div>

        {checkOutDate && (
          <div className="text-sm text-green-700 mb-3">
            <span className="font-medium">Check-out:</span> {FECHA(checkOutDate)}
          </div>
        )}

        {/* Price Breakdown */}
        <div className="mt-4 pt-3 border-t border-green-300">
          <div className="flex justify-between items-center mb-2">
            <span className="text-lg font-bold text-green-800">Total estadía:</span>
            <span className="text-2xl font-extrabold text-green-600">{granTotal.toLocaleString('es-CO')} COP</span>
          </div>
          <div className="bg-white/60 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-green-700">Adultos x {form.noches} noche{form.noches > 1 ? 's' : ''}</span>
              <span className="text-green-800 font-medium">{precioTotal.toLocaleString('es-CO')} COP</span>
            </div>
            {form.ninos > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Ninos x {form.noches} noche{form.noches > 1 ? 's' : ''}</span>
                <span className="text-green-800 font-medium">{precioNinos.toLocaleString('es-CO')} COP</span>
              </div>
            )}
            {form.tieneMascota && (
              <div className="flex justify-between text-sm">
                <span className="text-green-700"><Dog className="w-4 h-4 inline mr-1" /> Mascota</span>
                <span className="text-green-800 font-medium">{precioMascota.toLocaleString('es-CO')} COP</span>
              </div>
            )}
          </div>
        </div>

        {/* Cancel button */}
        <div className="mt-4 flex justify-start">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300 transition-all text-sm font-medium"
          >
            <X className="w-4 h-4" />
            <span>Cancelar</span>
          </button>
        </div>

        {/* Guest selectors */}
        <div className="mt-6 pt-4 border-t border-green-200">
          <label className="text-xs uppercase font-semibold text-green-700 tracking-wide block mb-3">Huéspedes</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-green-600 font-medium">Adultos</label>
              <select
                value={form.adultos}
                onChange={e => updateField('adultos', parseInt(e.target.value))}
                className="w-full mt-1 px-3 py-2.5 text-base rounded-lg border-2 border-green-300 focus:border-green-500 bg-white"
              >
                {[1,2,3,4,5,6,7,8].map(n => (
                  <option key={n} value={n}>{n} adulto{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-green-600 font-medium">Ninos (0-12 anos)</label>
              <select
                value={form.ninos}
                onChange={e => updateField('ninos', parseInt(e.target.value))}
                className="w-full mt-1 px-3 py-2.5 text-base rounded-lg border-2 border-green-300 focus:border-green-500 bg-white"
              >
                {[0,1,2,3,4,5,6].map(n => (
                  <option key={n} value={n}>{n === 0 ? 'Sin niños' : `${n} niño${n > 1 ? 's' : ''}`}</option>
                ))}
              </select>
            </div>
          </div>
          {totalPersonas > 0 && (
            <p className="mt-2 text-sm text-green-700 font-medium">
              Total: {totalPersonas} persona{totalPersonas > 1 ? 's' : ''} ({form.adultos} adulto{form.adultos > 1 ? 's' : ''}{form.ninos > 0 ? `, ${form.ninos} niño${form.ninos > 1 ? 's' : ''}` : ''})
            </p>
          )}
        </div>

        {/* Pet Section */}
        <div className="mt-4 pt-4 border-t border-green-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.tieneMascota}
              onChange={e => updateField('tieneMascota', e.target.checked)}
              className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
            />
            <Dog className="w-4 h-4 inline mr-1" /> Traer mascota (perro o gato)
          </label>
          {form.tieneMascota && (
            <div className="mt-3 ml-8">
              <input
                type="text"
                placeholder="Nombre de la mascota"
                value={form.nombreMascota}
                onChange={e => updateField('nombreMascota', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border-2 border-green-200 focus:border-green-500 text-sm"
              />
              <p className="mt-1 text-xs text-green-600">$50,000 COP/noche</p>
            </div>
          )}
        </div>

        {/* Main Guest Info */}
        <div className="mt-5 bg-white p-4 rounded-xl border border-green-200">
          <p className="text-sm font-bold text-green-800 mb-3"><User className="w-4 h-4 inline mr-1" /> Huesped Principal (Reserva)</p>

          <div className="form-group">
            <label className="text-xs uppercase font-semibold text-green-600 block mb-1">Nombre completo</label>
            <input
              type="text"
              placeholder="Ej: Juan García"
              value={form.huesped}
              onChange={e => updateField('huesped', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-green-200 focus:border-green-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="text-xs uppercase font-semibold text-green-600 block mb-1">Documento</label>
              <input
                type="text"
                placeholder="Cédula"
                value={form.documento}
                onChange={e => updateField('documento', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-green-200 focus:border-green-500"
              />
            </div>
            <div>
              <label className="text-xs uppercase font-semibold text-green-600 block mb-1">Teléfono</label>
              <input
                type="tel"
                placeholder="310 123 4567"
                value={form.telefono}
                onChange={e => updateField('telefono', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-green-200 focus:border-green-500"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="text-xs uppercase font-semibold text-green-600 block mb-1">Correo electrónico</label>
            <input
              type="email"
              placeholder="juan@email.com"
              value={form.email}
              onChange={e => updateField('email', e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-green-200 focus:border-green-500"
            />
          </div>
        </div>

        {/* Observations */}
        <div className="mt-4">
          <label className="text-xs uppercase font-semibold text-green-600 block mb-1">Observaciones (opcional)</label>
          <textarea
            placeholder="Notas especiales..."
            value={form.observaciones}
            onChange={e => updateField('observaciones', e.target.value)}
            className="w-full px-4 py-3 rounded-lg border-2 border-green-200 focus:border-green-500"
            rows={2}
          />
        </div>

        {/* Submit Button */}
        <div className="mt-6 pt-4 border-t border-green-200">
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <XCircle className="w-4 h-4 inline mr-1" /> {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Confirmar Check-in'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default function PantallaAdmin({ onSalir, onNav }) {
  const { rooms, loading, refresh } = useRooms();
  const [inlineToast, setInlineToast] = useState(null);

  // ── Derive view state from React Router pathname ──
  function getViewFromPath(pathname) {
    const path = pathname.split('?')[0];
    if (path.includes('/admin/dashboard')) return 'dashboard';
    if (path === '/admin' || path === '/admin/' || path === '') return 'rooms';
    if (path.includes('/admin/room/')) return 'rooms';
    if (path.includes('/admin/register')) return 'register';
    if (path.includes('/admin/transactions')) return 'transactions';
    if (path.includes('/admin/reservations') || path.includes('/admin/reservaciones')) return 'reservations';
    if (path.includes('/admin/accounting')) return 'accounting';
    if (path.includes('/admin/prices')) return 'prices';
    if (path.includes('/admin/users')) return 'users';
    if (path.includes('/admin/security')) return 'security';
    if (path.includes('/admin/history')) return 'history';
    if (path.includes('/admin')) return 'rooms';
    return 'dashboard';
  }

  function getRoomIdFromPath(pathname) {
    const m = pathname.match(/\/admin\/room\/(.+?)(?:\/|$)/);
    return m ? m[1] : null;
  }

  const location = useLocation();
  const routerNavigate = useNavigate();
  const navigateFn = onNav || routerNavigate;
  const activeView = getViewFromPath(location.pathname);
  const selectedRoomId = getRoomIdFromPath(location.pathname);

  const [filtro, setFiltro] = useState('todos');
  const [buscar, setBuscar] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [viewMode, setViewMode] = useState('grid');

  /** Navigate to a different admin view */
  const navigateTo = useCallback((view) => {
    const paths = {
      dashboard: '/admin/dashboard',
      rooms: '/admin',
      register: '/admin/register',
      transactions: '/admin/transactions',
      reservations: '/admin/reservations',
      accounting: '/admin/accounting',
      prices: '/admin/prices',
      users: '/admin/users',
      history: '/admin/history',
      security: '/admin/security',
    };
    navigateFn(paths[view] || '/admin');
  }, [navigateFn]);

  // ── Document title sync ──
  const VIEW_TITLES = {
    dashboard: 'Dashboard',
    rooms: 'Habitaciones',
    register: 'Registro',
    transactions: 'Transacciones',
    reservations: 'Reservaciones',
    accounting: 'Contabilidad',
    prices: 'Precios',
    users: 'Usuarios',
    history: 'Historial',
    security: 'Seguridad',
  };
  useEffect(() => {
    document.title = `${VIEW_TITLES[activeView] || 'Admin'} | EcoBosque Hotel`;
  }, [activeView]);

  // ── Breadcrumbs ──
  const breadcrumbs = useMemo(() => {
    const items = [{ label: 'Admin', path: '/admin' }];
    if (activeView === 'dashboard') items.push({ label: 'Dashboard', path: '/admin/dashboard' });
    else if (activeView === 'rooms') items.push({ label: 'Habitaciones', path: '/admin' });
    else if (activeView === 'register') items.push({ label: 'Registro', path: '/admin/register' });
    else if (activeView === 'transactions') items.push({ label: 'Transacciones', path: '/admin/transactions' });
    else if (activeView === 'reservations') items.push({ label: 'Reservaciones', path: '/admin/reservations' });
    else if (activeView === 'accounting') items.push({ label: 'Contabilidad', path: '/admin/accounting' });
    else if (activeView === 'prices') items.push({ label: 'Precios', path: '/admin/prices' });
    else if (activeView === 'users') items.push({ label: 'Usuarios', path: '/admin/users' });
    else if (activeView === 'history') items.push({ label: 'Historial', path: '/admin/history' });
    else if (activeView === 'security') items.push({ label: 'Seguridad', path: '/admin/security' });
    if (selectedRoomId) items.push({ label: `Habitacion #${selectedRoomId}`, path: `/admin/room/${selectedRoomId}` });
    return items;
  }, [activeView, selectedRoomId]);

  const renderBreadcrumbs = () => (
    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 px-1">
      {breadcrumbs.map((crumb, i) => (
        <span key={crumb.path + '-' + i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
          {i < breadcrumbs.length - 1 ? (
            <button
              onClick={() => navigateFn(crumb.path)}
              className="hover:text-green-600 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              {crumb.label}
            </button>
          ) : (
            <span className="text-gray-900 font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </div>
  );

  const [expandedRoomId, setExpandedRoomId] = useState(null);

  // Table filter states
  const [listFilter, setListFilter] = useState({ numero: '', huesped: '', tipo: '', estado: 'todos' });
  const [resFilter, setResFilter] = useState({ numero: '', huesped: '' });
  const [histFilter, setHistFilter] = useState({ room: '', estado: 'todos' });

  // Excel export state
  const [exporting, setExporting] = useState(false);

  // Grouped transaction state — single setState instead of 6 separate ones
  const [txn, setTxn] = useState({
    room: null, roomId: '', pin: '', error: '', loading: false,
    cat: 'restaurante', form: { descripcion: '', precio: '' }, exito: false,
  });

  const showToast = useCallback((type, message) => {
    setInlineToast({ type, message });
  }, []);

  useRoomSync({
    interval: 15000,
    enabled: false,
    onChange: (changes) => {
      if (!changes?.length) return;
      refresh();
      changes.forEach((change) => {
        const labels = {
          status: `Habitación #${change.room.numero}: ${ESTADO_CFG[change.from]?.label || change.from} → ${ESTADO_CFG[change.to]?.label || change.to}`,
          guest: `Habitación #${change.room.numero}: huésped actualizado`,
          added: `Nueva habitación #${change.room.numero} registrada`,
        };
        showToast('info', labels[change.type] || 'Habitación actualizada');
      });
    },
  });

  // Accounting data - using TanStack Query for automatic caching
  const { data: accData, isLoading: accLoading, error: accError } = useQuery({
    queryKey: queryKeys.accounting,
    queryFn: fetchAccountingSummary,
    staleTime: 1000 * 60, // 1 minute
    enabled: activeView === 'accounting', // Only fetch when on accounting view
  });

  // History loading — using TanStack Query
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: queryKeys.history,
    queryFn: () => Promise.all([fetchStateHistory(), fetchRooms(), fetchHistory()]),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: activeView === 'history' || activeView === 'reservations',
  });

  const history = historyData?.[0] || [];
  const allRooms = historyData?.[1] || [];
  const reservationHistory = historyData?.[2]?.reservas || historyData?.[2] || [];

  const { data: loginLogsData = [], isLoading: loginLogsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['login-logs'],
    queryFn: () => fetchLoginLogs(500),
    staleTime: 1000 * 30,
    enabled: activeView === 'history',
  });

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // ── ALL HOOKS ABOVE THIS LINE — no early returns before here ──

  // Single-pass stats computation (was 5 separate .filter() calls)
  const stats = useMemo(() => {
    const s = { total: 0, ocupada: 0, reservada: 0, disponible: 0, limpieza: 0 };
    for (const r of rooms) {
      s.total++;
      if (s[r.estado] !== undefined) s[r.estado]++;
    }
    return s;
  }, [rooms]);

  const filtradas = useMemo(
    () => filtrarRooms(rooms, filtro, buscar, tipo),
    [rooms, filtro, buscar, tipo]
  );

  const grupos = useMemo(() => agruparPorPiso(filtradas), [filtradas]);

  // Compute once and reuse (was duplicated .filter() on lines 278 and 312)
  const reservadasUOcupadas = useMemo(
    () => filtradas.filter(r => r.estado === 'ocupada' || r.estado === 'reservada'),
    [filtradas]
  );

  const occupiedRooms = useMemo(
    () => rooms.filter(r => r.estado === 'ocupada'),
    [rooms]
  );

  const selectedRoom = useMemo(
    () => rooms.find(r => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  // Transaction handlers — always called, not conditionally
  const handleValidatePin = useCallback(() => {
    const room = rooms.find(r => r.id === txn.roomId);
    if (!room || room.pin !== txn.pin) {
      setTxn(prev => ({ ...prev, error: 'PIN incorrecto' }));
      sonnerToast.error('PIN incorrecto');
      return;
    }
    setTxn(prev => ({ ...prev, room, error: '' }));
    sonnerToast.success('Habitacion encontrada');
  }, [rooms, txn.roomId, txn.pin]);

  const handleRegisterConsumo = useCallback(async () => {
    if (!txn.form.descripcion.trim() || !txn.form.precio) {
      setTxn(prev => ({ ...prev, error: 'Completa todos los campos' }));
      sonnerToast.error('Completa todos los campos');
      return;
    }
    setTxn(prev => ({ ...prev, loading: true, error: '' }));
    const loadingToast = sonnerToast.loading('Registrando consumo...');
    
    try {
      await createConsumo({
        roomId: txn.room.id,
        descripcion: txn.form.descripcion,
        precio: parseFloat(txn.form.precio),
        categoria: txn.cat,
      });
      
      sonnerToast.dismiss(loadingToast);
      sonnerToast.success('Consumo registrado exitosamente', {
        duration: 3000,
      });
      
      setTxn(prev => ({
        ...prev,
        loading: false,
        exito: true,
        form: { descripcion: '', precio: '' },
      }));
      setTimeout(() => setTxn(prev => ({ ...prev, exito: false })), 2000);
    } catch {
      sonnerToast.dismiss(loadingToast);
      sonnerToast.error('Error al registrar consumo');
      setTxn(prev => ({ ...prev, loading: false, error: 'Error al registrar consumo' }));
    }
  }, [txn.room, txn.form, txn.cat]);

  const handleResetTxn = useCallback(() => {
    setTxn({ room: null, roomId: '', pin: '', error: '', loading: false, cat: 'restaurante', form: { descripcion: '', precio: '' }, exito: false });
  }, []);

  // Create callback functions that update both state AND URL
  const handleNavigate = useCallback((view) => {
    navigateTo(view);
  }, [navigateTo]);

  const handleFilter = useCallback((newFiltro) => {
    setFiltro(newFiltro);
  }, []);

  const handleViewMode = useCallback((newMode) => {
    setViewMode(newMode);
  }, []);

  const handleSelectRoom = useCallback((roomId) => {
    const current = getRoomIdFromPath(window.location.pathname);
    navigateFn(current === roomId ? '/admin' : `/admin/room/${roomId}`);
  }, [navigateFn]);

  const handleClearFilters = useCallback(() => {
    setFiltro('todos');
    setBuscar('');
    setTipo('todos');
  }, []);

  // Filtered list view data
  const filteredListView = useMemo(() => {
    return reservadasUOcupadas.filter(r => {
      if (listFilter.numero && !r.numero.includes(listFilter.numero)) return false;
      if (listFilter.huesped && !r.huesped?.toLowerCase().includes(listFilter.huesped.toLowerCase())) return false;
      if (listFilter.tipo && r.tipo !== listFilter.tipo) return false;
      if (listFilter.estado !== 'todos' && r.estado !== listFilter.estado) return false;
      return true;
    });
  }, [reservadasUOcupadas, listFilter]);

  const roomListView = useMemo(() => (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Table Filters */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2">
        <input
          className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
          placeholder="Numero..."
          value={listFilter.numero}
          onChange={e => setListFilter(f => ({ ...f, numero: e.target.value }))}
        />
        <input
          className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
          placeholder="Huesped..."
          value={listFilter.huesped}
          onChange={e => setListFilter(f => ({ ...f, huesped: e.target.value }))}
        />
        <select
          className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
          value={listFilter.tipo}
          onChange={e => setListFilter(f => ({ ...f, tipo: e.target.value }))}
        >
          <option value="">Todos los tipos</option>
          {TIPOS_HABITACION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
          value={listFilter.estado}
          onChange={e => setListFilter(f => ({ ...f, estado: e.target.value }))}
        >
          <option value="todos">Todos los estados</option>
          <option value="ocupada">Ocupada</option>
          <option value="reservada">Reservada</option>
        </select>
        {(listFilter.numero || listFilter.huesped || listFilter.tipo || listFilter.estado !== 'todos') && (
          <button
            onClick={() => setListFilter({ numero: '', huesped: '', tipo: '', estado: 'todos' })}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
          >
            ✕ Limpiar
          </button>
        )}
        <span className="text-xs text-gray-500 ml-auto self-center">{filteredListView.length} resultados</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50/80">
            <tr className="text-left text-gray-500 border-b border-gray-200/60">
              <th className="px-4 py-2 font-semibold">#</th>
              <th className="px-4 py-2 font-semibold hidden sm:table-cell">Tipo</th>
              <th className="px-4 py-2 font-semibold hidden md:table-cell">Huésped</th>
              <th className="px-4 py-2 font-semibold">Estado</th>
              <th className="px-4 py-2 font-semibold text-right">Noches</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredListView.length === 0 ? (
              <tr><td colSpan="5" className="px-4 py-12 text-center text-gray-400">Sin habitaciones ocupadas o reservadas</td></tr>
            ) : (
              filteredListView.map(room => (
                <RoomListItem key={room.id} room={room} isSelected={selectedRoomId === room.id} onSelect={handleSelectRoom} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  ), [filteredListView, listFilter, selectedRoomId, handleSelectRoom]);

  const roomGrid = useMemo(() => (
    <div>
      {Object.entries(grupos).map(([piso, roomsInPiso]) => (
        <div key={piso} className="mb-8">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-8 h-0.5 bg-gradient-to-r from-gray-300/60 to-transparent inline-block"></span>
            {piso === '0' ? <><Home className="w-4 h-4 inline mr-1" /> Cabañas</> : <><Building2 className="w-4 h-4 inline mr-1" /> Piso {piso}</>}
            <span className="w-8 h-0.5 bg-gradient-to-r from-gray-300/60 to-transparent inline-block"></span>
            <span className="text-xs text-gray-400 font-normal">({roomsInPiso.length})</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {roomsInPiso.map(r => (
              <RoomCard
                key={r.id}
                room={r}
                isSelected={selectedRoomId === r.id}
                onSelect={handleSelectRoom}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  ), [grupos, selectedRoomId, handleSelectRoom]);

  // ── Main admin layout ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} rooms={rooms} onRoomSelect={handleSelectRoom} />
        <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
          <p className="text-gray-400 text-lg">Cargando habitaciones...</p>
        </div>
      </div>
    );
  }

  // ── History view (login access logs) ──
  if (activeView === 'history') {
    const [logSearch, setLogSearch] = useState('');
    const [logFilter, setLogFilter] = useState('todos');

    const filteredLogs = loginLogsData.filter(l => {
      if (logFilter === 'success' && !l.success) return false;
      if (logFilter === 'failed' && l.success) return false;
      if (logSearch) {
        const q = logSearch.toLowerCase();
        const matches = (l.identifier?.toLowerCase().includes(q)) ||
          (l.ip?.toLowerCase().includes(q)) ||
          (l.userId?.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} rooms={rooms} onRoomSelect={handleSelectRoom} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
          {renderBreadcrumbs()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold"><ClipboardList className="w-5 h-5 inline mr-2" /> Historial de Accesos</h2>
              <p className="text-sm text-gray-500 mt-1">Registro completo de inicios de sesion en el sistema</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{filteredLogs.length} registros</span>
              <button
                onClick={() => refetchLogs()}
                className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Actualizar
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4 flex flex-wrap gap-2">
            <input
              className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200 min-w-[200px]"
              placeholder="Buscar por email, IP o ID..."
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
            />
            <select
              className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
              value={logFilter}
              onChange={e => setLogFilter(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="success">Exitosos</option>
              <option value="failed">Fallidos</option>
            </select>
            {(logSearch || logFilter !== 'todos') && (
              <button
                onClick={() => { setLogSearch(''); setLogFilter('todos'); }}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                ✕ Limpiar
              </button>
            )}
          </div>

          {loginLogsLoading ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-2">⏳</div>
              <p>Cargando historial de accesos...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-2">📭</div>
              <p>Sin registros de acceso</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Fecha / Hora</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Email / Usuario</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Direccion IP</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Estado</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLogs.map((log, i) => (
                      <tr key={log.id || i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{filteredLogs.length - i}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString('es-CO') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <span className="text-sm text-gray-900">{log.identifier || '—'}</span>
                            {log.userId && <p className="text-xs text-gray-400 font-mono">ID: {log.userId.slice(0, 12)}...</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{log.ip || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {log.success ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                              <CheckCircle className="w-3 h-3" /> Exitoso
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                              <XCircle className="w-3 h-3" /> Fallido
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{log.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Prices view ──
  if (activeView === 'users') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} rooms={rooms} onRoomSelect={handleSelectRoom} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
          {renderBreadcrumbs()}
        <PantallaUsuarios />
      </div>
    );
  }

  if (activeView === 'prices') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} rooms={rooms} onRoomSelect={handleSelectRoom} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
          {renderBreadcrumbs()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <PriceEditor
            onUpdate={() => showToast('success', 'Precios actualizados')}
            onNotify={showToast}
          />
        </div>
      </div>
    );
  }

  // ── Reservations view ──
  if (activeView === 'reservations') {
    // Get all reservations (current + historical)
    const allReservations = reservationHistory.length > 0 ? reservationHistory : reservadasUOcupadas.map(r => ({
      id: r.id,
      roomId: r.id,
      numero: r.numero,
      tipo: 'actual',
      huesped: r.huesped,
      email: r.email,
      telefono: r.telefono,
      documento: r.documento,
      adultos: r.adultos,
      ninos: r.ninos || 0,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      noches: r.noches,
      tarifa: r.tarifa,
      pago: r.pago,
      createdAt: r.checkIn,
    }));

    // Filtered reservations
    const filteredReservations = allReservations.filter(r => {
      if (resFilter.numero && !String(r.numero).includes(resFilter.numero)) return false;
      if (resFilter.huesped && !r.huesped?.toLowerCase().includes(resFilter.huesped.toLowerCase())) return false;
      return true;
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} rooms={rooms} onRoomSelect={handleSelectRoom} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
          {renderBreadcrumbs()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold"><Calendar className="w-5 h-5 inline mr-2" /> Reservaciones</h2>
            <span className="text-sm text-gray-500">{filteredReservations.length} de {allReservations.length} registros</span>
          </div>
          {allReservations.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-2">📭</div>
              <p>No hay reservaciones registradas</p>
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300">
              {/* Table Filters */}
<div className="px-4 py-3 bg-gray-50/60 border-b border-gray-200/60 flex flex-wrap gap-2">
                <input
                  className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
                  placeholder="Habitacion..."
                  value={resFilter.numero}
                  onChange={e => setResFilter(f => ({ ...f, numero: e.target.value }))}
                />
                <input
                  className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
                  placeholder="Huesped..."
                  value={resFilter.huesped}
                  onChange={e => setResFilter(f => ({ ...f, huesped: e.target.value }))}
                />
                {(resFilter.numero || resFilter.huesped) && (
                  <button
                    onClick={() => setResFilter({ numero: '', huesped: '' })}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    ✕ Limpiar
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-4 py-3 font-semibold">#</th>
                      <th className="px-4 py-3 font-semibold">Huésped</th>
                      <th className="px-4 py-3 font-semibold hidden sm:table-cell">Documento</th>
                      <th className="px-4 py-3 font-semibold hidden md:table-cell">Check-in</th>
                      <th className="px-4 py-3 font-semibold hidden md:table-cell">Check-out</th>
                      <th className="px-4 py-3 font-semibold text-right">Tarifa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredReservations.map((res, i) => (
                      <tr key={res.id || i} className="hover:bg-gray-50 cursor-pointer" onClick={() => { if (res.roomId) handleSelectRoom(res.roomId); }}>
                        <td className="px-4 py-3 font-bold">{res.numero || '—'}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{res.huesped || '—'}</p>
                            {res.email && <p className="text-xs text-gray-500">{res.email}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">{res.documento || '—'}</td>
                        <td className="px-4 py-3 hidden md:table-cell">{res.checkIn ? FECHA(res.checkIn) : '—'}</td>
                        <td className="px-4 py-3 hidden md:table-cell">{res.checkOut ? FECHA(res.checkOut) : '—'}</td>
                        <td className="px-4 py-3 text-right font-medium">{res.tarifa ? COP(res.tarifa) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Transactions view ──
  if (activeView === 'transactions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} rooms={rooms} onRoomSelect={handleSelectRoom} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
          {renderBreadcrumbs()}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-xl font-bold"><CreditCard className="w-5 h-5 inline mr-2" /> Registrar Consumo</h2>
          {txn.exito && (
            <div className="mb-4 p-3 bg-emerald-50/80 border border-emerald-200/60 rounded-xl text-emerald-700 backdrop-blur-sm">
              <CheckCircle className="w-5 h-5 inline mr-1 text-emerald-500" /> Consumo registrado exitosamente
            </div>
          )}
          {!txn.room ? (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 p-6 space-y-4">
              <select
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={txn.roomId}
                onChange={e => setTxn(prev => ({ ...prev, roomId: e.target.value }))}
              >
                <option value="">Seleccionar habitación ocupada</option>
                {occupiedRooms.map(r => (
                  <option key={r.id} value={r.id}>{r.numero} — {r.huesped}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  className="flex-1 p-3 border border-gray-300 rounded-lg"
                  type="text"
                  placeholder="PIN de la habitación"
                  value={txn.pin}
                  onChange={e => setTxn(prev => ({ ...prev, pin: e.target.value }))}
                  maxLength={4}
                />
                <button className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200/30 font-medium transition-all duration-300" onClick={handleValidatePin}>Validar</button>
              </div>
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 p-6 space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="font-bold">#{txn.room.numero} — {txn.room.huesped}</p>
                <p className="text-sm text-gray-500">{txn.room.tipo}</p>
              </div>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={txn.cat}
                onChange={e => setTxn(prev => ({ ...prev, cat: e.target.value }))}
              >
                {CATEGORIAS_CONSUMO.map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <input
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Descripción del consumo"
                value={txn.form.descripcion}
                onChange={e => setTxn(prev => ({ ...prev, form: { ...prev.form, descripcion: e.target.value } }))}
              />
              <input
                className="w-full p-3 border border-gray-300 rounded-lg"
                type="number"
                placeholder="Precio"
                value={txn.form.precio}
                onChange={e => setTxn(prev => ({ ...prev, form: { ...prev.form, precio: e.target.value } }))}
              />
              <div className="flex gap-2">
                <button className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200/30 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleRegisterConsumo} disabled={txn.loading}>
                  {txn.loading ? 'Registrando...' : 'Registrar Consumo'}
                </button>
                <button className="px-4 py-3 bg-gray-100/80 text-gray-600 rounded-xl hover:bg-gray-200/80 hover:text-gray-800 font-medium transition-all duration-200" onClick={handleResetTxn}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Accounting view ──
  if (activeView === 'accounting') {
    const handleExport = async () => {
      setExporting(true);
      try {
        await downloadAccountingReport();
        sonnerToast.success('Reporte descargado');
      } catch (err) {
        sonnerToast.error(err.message || 'Error al descargar el reporte');
      } finally {
        setExporting(false);
      }
    };

    const statusData = accData ? [
      { name: 'Ocupadas', value: accData.summary.occupied, color: '#f59e0b' },
      { name: 'Disponibles', value: accData.summary.available, color: '#22c55e' },
      { name: 'Reservadas', value: accData.summary.reserved, color: '#3b82f6' },
    ].filter(d => d.value > 0) : [];

    const serviceData = accData?.revenueByService?.map(s => ({
      name: s.categoria === 'restaurante' ? 'Restaurante' : s.categoria === 'bar' ? 'Bar' : 'Servicios',
      value: s.total,
      count: s.count,
    })) || [];

    const totalRevenue = (accData?.summary?.currentRevenue || 0) + (accData?.summary?.historicalRevenue || 0);
    const avgConsumo = accData?.revenueByService?.reduce((sum, s) => sum + s.total, 0) / (accData?.revenueByService?.reduce((sum, s) => sum + s.count, 0) || 1) || 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} rooms={rooms} onRoomSelect={handleSelectRoom} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
          {renderBreadcrumbs()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Receipt className="w-6 h-6 inline mr-2" /> Contabilidad
              </h1>
              <p className="text-sm text-gray-500 mt-1">Resumen financiero del hotel</p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200/30 font-medium transition-all duration-300 disabled:opacity-50"
            >
              {exporting ? <><Loader className="w-4 h-4 animate-spin inline mr-1" /> Generando...</> : <><Download className="w-4 h-4 inline mr-1" /> Descargar Excel</>}
            </button>
          </div>

          {accLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : accError ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertTriangle className="w-5 h-5 inline mr-2" />{accError.message || 'Error loading accounting data'}
            </div>
          ) : accData ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl shadow-lg shadow-emerald-200/30 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div><p className="text-green-100 text-sm">Revenue Total</p><p className="text-2xl font-bold">{COP(totalRevenue)}</p></div>
                    <DollarSign className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div><p className="text-blue-100 text-sm">Ocupación</p><p className="text-2xl font-bold">{accData.summary.occupancyRate}%</p></div>
                    <BarChart3 className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-md p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div><p className="text-yellow-100 text-sm">Tarifa Promedio</p><p className="text-2xl font-bold">{COP(accData.summary.avgDailyRate)}</p></div>
                    <Tag className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div><p className="text-purple-100 text-sm">Estadías</p><p className="text-2xl font-bold">{accData.completedStays || 0}</p></div>
                    <Building2 className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 p-4 hover:shadow-lg transition-all duration-300">
                  <p className="text-sm text-gray-500">Revenue Actual</p>
                  <p className="text-xl font-bold text-green-600">{COP(accData.summary.currentRevenue)}</p>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 p-4 hover:shadow-lg transition-all duration-300">
                  <p className="text-sm text-gray-500">Revenue Histórico</p>
                  <p className="text-xl font-bold text-blue-600">{COP(accData.summary.historicalRevenue)}</p>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 p-4 hover:shadow-lg transition-all duration-300">
                  <p className="text-sm text-gray-500">Ingreso/Servicio</p>
                  <p className="text-xl font-bold text-yellow-600">{COP(avgConsumo)}</p>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 p-4 hover:shadow-lg transition-all duration-300">
                  <p className="text-sm text-gray-500">Total Habitaciones</p>
                  <p className="text-xl font-bold text-gray-900">{accData.summary.totalRooms}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {statusData.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4"><Home className="w-5 h-5 inline mr-2" /> Distribucion</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {serviceData.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4"><UtensilsCrossed className="w-5 h-5 inline mr-2" /> Servicios</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={serviceData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          <Cell fill="#3b82f6" /><Cell fill="#f59e0b" /><Cell fill="#8b5cf6" />
                        </Pie>
                        <Tooltip formatter={(v) => COP(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4"><DollarSign className="w-5 h-5 inline mr-2" /> Revenue por Tipo</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={accData.revenueByType || []} layout="vertical" margin={{ left: 30, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${v/1000}k`} />
                    <YAxis type="category" dataKey="tipo" stroke="#6b7280" fontSize={10} width={120} />
                    <Tooltip formatter={(v) => COP(v)} />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3><BarChart3 className="w-5 h-5 inline mr-2" /> Habitaciones</h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
{ label: 'Total', value: accData.summary.totalRooms, bg: 'bg-gray-100', color: 'text-gray-900', icon: Building2 },
    { label: 'Ocupadas', value: accData.summary.occupied, bg: 'bg-yellow-100', color: 'text-yellow-700', icon: CircleDot },
    { label: 'Disponibles', value: accData.summary.available, bg: 'bg-green-100', color: 'text-green-700', icon: CheckCircle },
    { label: 'Reservadas', value: accData.summary.reserved, bg: 'bg-blue-100', color: 'text-blue-700', icon: Calendar },
    { label: 'Tarifa/Dia', value: COP(accData.summary.avgDailyRate), bg: 'bg-purple-100', color: 'text-purple-700', icon: DollarSign },
                  ].map((item, i) => (
                    <div key={i} className={`${item.bg} rounded-lg p-4 text-center`}>
                      <span className="text-2xl block mb-1 flex justify-center">{item.icon && <item.icon className="w-6 h-6" />}</span>
                      <span className={`text-lg font-bold ${item.color} block`}>{item.value}</span>
                      <span className="text-xs text-gray-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  // ── Register view (check-in form) - show check-in flow with calendar
  if (activeView === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} rooms={rooms} onRoomSelect={handleSelectRoom} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
          {renderBreadcrumbs()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-6">
            <div className="px-5 py-4 border-b border-gray-100/60 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nueva Reserva / Check-in</h2>
                <p className="text-xs text-gray-500 mt-0.5">Registrar huesped y asignar habitacion</p>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-green-600" />
                <HotelTitle variant="inline" />
              </div>
            </div>
          </div>
          <PantallaCheckin standalone={false} onNav={(action) => {
            if (action === 'menu' || action === 'volver') {
              setActiveView('rooms');
            }
          }} />
        </div>
      </div>
    );
  }

  // ── Dashboard view ──
  if (activeView === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} rooms={rooms} onRoomSelect={handleSelectRoom} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
          {renderBreadcrumbs()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AdminDashboard
            rooms={rooms}
            stateHistory={history}
            consumos={[]}
          />
        </div>
      </div>
    );
  }

  // ── Security view ──
  if (activeView === 'security') {
    const { data: secEvents } = useQuery({
      queryKey: queryKeys.securityEvents,
      queryFn: () => fetchSecurityEvents(200),
      staleTime: 1000 * 60,
      enabled: activeView === 'security',
    });
    const { data: secUsers } = useQuery({
      queryKey: ['users-list'],
      queryFn: () => fetchUsers(),
      staleTime: 1000 * 60 * 5,
      enabled: activeView === 'security',
    });
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} rooms={rooms} onRoomSelect={handleSelectRoom} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
          {renderBreadcrumbs()}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <SecurityDashboard
            events={secEvents || []}
            users={secUsers || []}
            rooms={rooms}
          />
        </div>
      </div>
    );
  }

  // ── Default: rooms view ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-300/15 rounded-full blur-3xl" />
      </div>
      <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} rooms={rooms} onRoomSelect={handleSelectRoom} />
      <AdminNav activeView={activeView} onNavigate={handleNavigate} />
        {renderBreadcrumbs()}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <span className="flex items-center"><Home className="w-4 h-4 inline mr-1" /> Admin</span>
          <span>›</span>
          <span className="text-gray-900 font-medium">Habitaciones</span>
          {filtro !== 'todos' && (
            <>
              <span>›</span>
              <span className="text-green-600 font-medium">{ESTADO_CFG[filtro]?.label || filtro}</span>
            </>
          )}
          {selectedRoomId && (
            <>
              <span>›</span>
              <span className="text-green-600 font-medium">Habitación seleccionada</span>
            </>
          )}
        </div>

        {/* Unified filter bar */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-6">
          <div className="px-4 py-3 flex flex-wrap items-center gap-4">
            {/* StatPills */}
            {viewMode === 'grid' && (
              <div className="flex flex-wrap items-center gap-2">
                <StatPills stats={stats} filtro={filtro} onFilter={handleFilter} />
              </div>
            )}

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200/60 rounded-xl text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300"
                type="text"
                placeholder="Buscar..."
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
              />
              {buscar && (
                <button
                  onClick={() => setBuscar('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Type dropdown */}
            <select
              className="px-3 py-2.5 border border-gray-200/60 rounded-xl text-sm bg-gray-50/50 hover:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300"
              value={tipo}
              onChange={e => setTipo(e.target.value)}
            >
              <option value="todos">Todos los tipos</option>
              {TIPOS_HABITACION.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* ViewMode toggle */}
            <ViewModeToggle viewMode={viewMode} onChange={handleViewMode} />
          </div>

          {/* Active filters display */}
          {(filtro !== 'todos' || tipo !== 'todos' || buscar) && (
            <div className="px-4 py-2.5 border-t border-gray-200/60 bg-gray-50/40 flex items-center gap-2 flex-wrap backdrop-blur-sm">
              <span className="text-sm text-gray-500">Filtros:</span>
              {filtro !== 'todos' && (
                <button
                  onClick={() => setFiltro('todos')}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100/80 text-emerald-700 rounded-full text-sm border-none cursor-pointer hover:bg-emerald-200/80 font-medium transition-all"
                >
                  {ESTADO_CFG[filtro]?.label} <span className="text-green-900">✕</span>
                </button>
              )}
              {tipo !== 'todos' && (
                <button
                  onClick={() => setTipo('todos')}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm border-none cursor-pointer hover:bg-blue-200 font-medium"
                >
                  {tipo} <span className="text-blue-900">✕</span>
                </button>
              )}
              {buscar && (
                <button
                  onClick={() => setBuscar('')}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm border-none cursor-pointer hover:bg-gray-300 font-medium"
                >
                  "{buscar}" <span className="text-gray-900">✕</span>
                </button>
              )}
              <button
                onClick={handleClearFilters}
                className="text-sm text-green-600 hover:text-green-700 bg-transparent border-none cursor-pointer font-medium ml-auto"
              >
                Limpiar todo
              </button>
            </div>
          )}
        </div>

        {inlineToast && <Toast message={inlineToast.message} type={inlineToast.type} onDismiss={() => setInlineToast(null)} />}

        {/* Two-column layout: rooms list/grid + side panel */}
        <div className={`flex gap-6 transition-all duration-300 ${selectedRoomId ? 'lg:grid lg:grid-cols-1 lg:xl:grid-cols-[1fr_400px]' : ''}`}>
          {/* Left: rooms list/grid */}
          <div className={selectedRoomId ? 'min-w-0' : 'w-full'}>
            {viewMode === 'list' ? roomListView : roomGrid}
          </div>

          {/* Right: room detail side panel */}
          {selectedRoomId && selectedRoom && (
            <div className="hidden xl:block">
              <div className="sticky top-[130px] bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/60 overflow-hidden">
                {/* Close button */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900">Habitación #{selectedRoom.numero}</h3>
                  <button
                    onClick={() => handleSelectRoom(selectedRoomId)}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    aria-label="Cerrar detalle"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Room detail content */}
                <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                  <RoomDetail room={selectedRoom} onRefresh={handleRefresh} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile/tablet room detail overlay */}
        {selectedRoomId && selectedRoom && (
          <div className="xl:hidden fixed inset-0 z-[200] bg-black/50" onClick={() => handleSelectRoom(selectedRoomId)}>
            <div
              className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white z-10">
                <h3 className="font-semibold text-gray-900">Habitación #{selectedRoom.numero}</h3>
                <button
                  onClick={() => handleSelectRoom(selectedRoomId)}
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-label="Cerrar detalle"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Room detail content */}
              <RoomDetail room={selectedRoom} onRefresh={handleRefresh} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
