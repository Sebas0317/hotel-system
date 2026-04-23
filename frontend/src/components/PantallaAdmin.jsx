import { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useRooms } from '../hooks/useRooms';
import { useRoomSync } from '../hooks/useRoomSync';
import { queryKeys } from '../hooks/useQueryKeys';
import { ESTADO_CFG, TIPO_ICON, TIPOS_HABITACION, CATEGORIAS_CONSUMO } from '../constants';
import { FECHA, filtrarRooms, agruparPorPiso, COP } from '../utils/helpers';
import { fetchHistory, fetchRooms, createConsumo, checkIn, fetchLastLogin, fetchLoginLogs, fetchStateHistory } from '../services/api';
import RoomDetail from './RoomDetail';
import HotelTitle from './HotelTitle';
import PriceEditor from './PriceEditor';
import { Toast } from './RoomActions';
import { AdminDashboard } from './AdminDashboard';
import { Card, CardContent } from './ui/Card';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'rooms', label: 'Habitaciones', icon: '🏠' },
  { key: 'register', label: 'Registrar', icon: '📝' },
  { key: 'transactions', label: 'Transacciones', icon: '💰' },
  { key: 'accounting', label: 'Contabilidad', icon: '🧾' },
  { key: 'prices', label: 'Precios', icon: '💲' },
];

/** Memoized topbar with last login and logs dropdown */
const AdminTopbar = memo(function AdminTopbar({ onSalir, onNavigate }) {
  const [lastLogin, setLastLogin] = useState(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch last login info
  useEffect(() => {
    fetchLastLogin().then(r => {
      if (r && r.lastLogin) setLastLogin(r.lastLogin);
    }).catch(() => {});
  }, []);

  // Fetch logs when dropdown opens
  useEffect(() => {
    if (logsOpen && logs.length === 0) {
      setLogsLoading(true);
      fetchLoginLogs(50).then(data => {
        setLogs(data || []);
      }).catch(() => {}).finally(() => setLogsLoading(false));
    }
  }, [logsOpen]);

  const formatTimeAgo = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 h-[58px] flex items-center justify-between sticky top-0 z-[100] shadow-sm">
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
        {/* Logs Dropdown */}
        <div className="relative">
          <button
            onClick={() => setLogsOpen(!logsOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span>📋</span>
            <span className="hidden sm:inline">Logs</span>
            <span className={`text-xs transition-transform ${logsOpen ? 'rotate-180' : ''}`}>▼</span>
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
                      📥 CSV
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
                    📋 Historial
                  </button>
                  <button
                    onClick={() => { setLogsOpen(false); onNavigate('reservations'); }}
                    className="text-xs px-2 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-center"
                  >
                    📅 Reservaciones
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={onSalir}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          aria-label="Salir"
        >
          <span>🚪</span>
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
});

/** Memoized navigation — extracted from 6 duplicated instances */
const AdminNav = memo(function AdminNav({ activeView, onNavigate }) {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-[58px] z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeView === item.key
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="text-lg">{item.icon}</span>
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
    { key: 'todos', label: `Todas (${stats.total})`, icon: '📊', cfg: null },
    { key: 'disponible', label: `Disponibles (${stats.disponible})`, icon: '✅', cfg: ESTADO_CFG.disponible },
    { key: 'ocupada', label: `Ocupadas (${stats.ocupada})`, icon: '🛏️', cfg: ESTADO_CFG.ocupada },
    { key: 'reservada', label: `Reservadas (${stats.reservada})`, icon: '📅', cfg: ESTADO_CFG.reservada },
    { key: 'limpieza', label: `Limpieza (${stats.limpieza})`, icon: '🧹', cfg: ESTADO_CFG.limpieza },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      {pills.map(p => (
        <button
          key={p.key}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 hover:shadow-md whitespace-nowrap min-w-0"
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
          <span className="text-base">{p.icon}</span>
          <span className="truncate">{p.label}</span>
        </button>
      ))}
    </div>
  );
});

/** Memoized view mode toggle */
const ViewModeToggle = memo(function ViewModeToggle({ viewMode, onChange }) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-gray-300 ml-auto">
      <button
        className={`px-3 py-1.5 text-sm ${viewMode === 'grid' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        onClick={() => onChange('grid')}
      >
        ▦ Grid
      </button>
      <button
        className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        onClick={() => onChange('list')}
      >
        ☰ Lista
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
      className={`cursor-pointer transition-colors border-l-4 ${
        isSelected ? 'bg-green-50 border-l-green-500' : 'border-l-transparent hover:bg-gray-50'
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
    <motion.button
      className={`w-full text-left cursor-pointer rounded-xl border-2 p-4 transition-all bg-white ${
        isSelected ? 'ring-2 ring-green-500 ring-offset-2 shadow-lg' : 'hover:shadow-lg'
      }`}
      style={{ borderColor: cfg.border }}
      onClick={() => onSelect(room.id)}
      whileHover={{ scale: 1.02, y: -4, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      layout
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
          <span>{room.camas}</span>
          <span>·</span>
          <span>{room.capacidad} personas</span>
          <span>·</span>
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
    </motion.button>
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
      <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-500 rounded-2xl">
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
              <span className="text-green-700">👨 Adultos × {form.noches} noche{form.noches > 1 ? 's' : ''}</span>
              <span className="text-green-800 font-medium">{precioTotal.toLocaleString('es-CO')} COP</span>
            </div>
            {form.ninos > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-700">👶 Niños × {form.noches} noche{form.noches > 1 ? 's' : ''}</span>
                <span className="text-green-800 font-medium">{precioNinos.toLocaleString('es-CO')} COP</span>
              </div>
            )}
            {form.tieneMascota && (
              <div className="flex justify-between text-sm">
                <span className="text-green-700">🐾 Mascota</span>
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
            <span>✕</span>
            <span>Cancelar</span>
          </button>
        </div>

        {/* Guest selectors */}
        <div className="mt-6 pt-4 border-t border-green-200">
          <label className="text-xs uppercase font-semibold text-green-700 tracking-wide block mb-3">Huéspedes</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-green-600 font-medium">👨 Adultos</label>
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
              <label className="text-xs text-green-600 font-medium">👶 Niños (0-12 años)</label>
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
            <span className="text-sm text-green-700 font-medium">🐾 Traer mascota (perro o gato)</span>
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
          <p className="text-sm font-bold text-green-800 mb-3">👤 Huésped Principal (Reserva)</p>

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
              ❌ {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Registrando...' : '✅ Confirmar Check-in'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default function PantallaAdmin({ onSalir, onNav }) {
  const { rooms, loading, refresh } = useRooms();
  const [toast, setToast] = useState(null);

  // ── Initialize all state from URL hash ──────────────────
  const getInitialState = () => {
    const hash = window.location.hash || '';
    // Extract path from hash (everything after #)
    const hashPath = hash.startsWith('#') ? hash.slice(1) : hash;
    // Remove query string for path matching
    const pathOnly = hashPath.split('?')[0] || '';
    const queryString = hashPath.includes('?') ? hashPath.split('?')[1] : '';
    const params = new URLSearchParams(queryString);

    // Determine view from hash path
    let view = 'dashboard';
    if (pathOnly.includes('/admin/dashboard')) view = 'dashboard';
    else if (pathOnly === '/admin' || pathOnly === '/admin/' || pathOnly === '') view = 'rooms';
    else if (pathOnly.includes('/admin/room/')) view = 'rooms';
    else if (pathOnly.includes('/admin/register')) view = 'register';
    else if (pathOnly.includes('/admin/transactions')) view = 'transactions';
    else if (pathOnly.includes('/admin/reservations') || pathOnly.includes('/admin/reservaciones')) view = 'reservations';
    else if (pathOnly.includes('/admin/accounting')) view = 'accounting';
    else if (pathOnly.includes('/admin/prices')) view = 'prices';
    else if (pathOnly.includes('/admin/history')) view = 'history';
    else if (pathOnly.includes('/admin')) view = 'rooms';

    // Extract room ID from hash path
    const roomMatch = pathOnly.match(/\/admin\/room\/(.+?)(?:\?|$)/);
    const selectedRoomId = roomMatch ? roomMatch[1] : null;

    return {
      activeView: view,
      selectedRoomId,
      filtro: params.get('filtro') || 'todos',
      buscar: params.get('buscar') || '',
      tipo: params.get('tipo') || 'todos',
      viewMode: params.get('viewMode') || 'grid',
    };
  };

  const initial = getInitialState();
  const [activeView, setActiveView] = useState(initial.activeView);
  const [selectedRoomId, setSelectedRoomId] = useState(initial.selectedRoomId);
  const [filtro, setFiltro] = useState(initial.filtro);
  const [buscar, setBuscar] = useState(initial.buscar);
  const [tipo, setTipo] = useState(initial.tipo);
  const [viewMode, setViewMode] = useState(initial.viewMode);

  /** Update URL hash with current state */
  const updateUrl = useCallback((updates = {}) => {
    const currentHash = window.location.hash.slice(1) || '';
    const basePath = currentHash.split('?')[0] || '/admin';
    const params = new URLSearchParams(currentHash.includes('?') ? currentHash.split('?')[1] : '');

    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'todos' && value !== 'grid') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    const queryString = params.toString();
    const newHash = queryString ? `${basePath}?${queryString}` : basePath;
    window.location.hash = newHash;
  }, []);

  /** Navigate to a different view using React Router */
  const navigateTo = useCallback((view, extraParams = {}) => {
    const paths = {
      dashboard: '/admin/dashboard',
      rooms: '/admin',
      register: '/admin/register',
      transactions: '/admin/transactions',
      reservations: '/admin/reservations',
      accounting: '/admin/accounting',
      prices: '/admin/prices',
      history: '/admin/history',
    };

    const basePath = paths[view] || '/admin';
    const params = new URLSearchParams();

    Object.entries(extraParams).forEach(([key, value]) => {
      if (value && value !== 'todos' && value !== 'grid') {
        params.set(key, value);
      }
    });

    const queryString = params.toString();
    const fullPath = queryString ? `${basePath}?${queryString}` : basePath;
    
    // Use React Router navigate if available, fallback to hash
    if (onNav) {
      onNav(fullPath);
    } else {
      window.location.hash = fullPath;
    }
  }, [onNav]);

  // Sync state to URL whenever it changes
  useEffect(() => {
    if (activeView === 'rooms') {
      updateUrl({ filtro, buscar, tipo, viewMode });
    }
  }, [filtro, buscar, tipo, viewMode, activeView, updateUrl]);

  // Listen to browser back/forward (hash changes)
  useEffect(() => {
    const handleHashSync = () => {
      const state = getInitialState();
      setActiveView(state.activeView);
      setSelectedRoomId(state.selectedRoomId);
      setFiltro(state.filtro);
      setBuscar(state.buscar);
      setTipo(state.tipo);
      setViewMode(state.viewMode);
    };

    handleHashSync(); // Run on mount to sync initial URL state
    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, []);

  const [history, setHistory] = useState([]);
  const [reservationHistory, setReservationHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [allRooms, setAllRooms] = useState([]);
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
    setToast({ type, message });
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

  // Compute derived state from query data
  const accountingData = accData || accData;

  // History loading — using TanStack Query
  const { data: historyData } = useQuery({
    queryKey: queryKeys.history,
    queryFn: () => Promise.all([fetchStateHistory(), fetchRooms(), fetchHistory()]),
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: activeView === 'history',
  });

  // Extract history data when available
  useEffect(() => {
    if (historyData && activeView === 'history') {
      const [stateHistoryData, roomsData, resData] = historyData;
      setHistory(stateHistoryData || []);
      setAllRooms(roomsData);
      setReservationHistory(resData?.reservas || resData || []);
      setHistoryLoading(false);
    }
  }, [historyData, activeView]);

  const selectRoom = useCallback((roomId) => {
    setSelectedRoomId(prev => prev === roomId ? null : roomId);
  }, []);

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

  const disponibles = useMemo(
    () => rooms.filter(r => r.estado === 'disponible'),
    [rooms]
  );

  // Transaction handlers — always called, not conditionally
  const handleValidatePin = useCallback(() => {
    const room = rooms.find(r => r.id === txn.roomId);
    if (!room || room.pin !== txn.pin) {
      setTxn(prev => ({ ...prev, error: 'PIN incorrecto' }));
      toast.error('❌ PIN incorrecto');
      return;
    }
    setTxn(prev => ({ ...prev, room, error: '' }));
    toast.success('✅ Habitación encontrada');
  }, [rooms, txn.roomId, txn.pin]);

  const handleRegisterConsumo = useCallback(async () => {
    if (!txn.form.descripcion.trim() || !txn.form.precio) {
      setTxn(prev => ({ ...prev, error: 'Completa todos los campos' }));
      toast.error('⚠️ Completa todos los campos');
      return;
    }
    setTxn(prev => ({ ...prev, loading: true, error: '' }));
    const loadingToast = toast.loading('📝 Registrando consumo...');
    
    try {
      await createConsumo({
        roomId: txn.room.id,
        descripcion: txn.form.descripcion,
        precio: parseFloat(txn.form.precio),
        categoria: txn.cat,
      });
      
      toast.dismiss(loadingToast);
      toast.success('✅ Consumo registrado exitosamente', {
        duration: 3000,
      });
      
      setTxn(prev => ({
        ...prev,
        loading: false,
        exito: true,
        form: { descripcion: '', precio: '' },
      }));
      setTimeout(() => setTxn(prev => ({ ...prev, exito: false })), 2000);
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('❌ Error al registrar consumo');
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
    setSelectedRoomId(prev => prev === roomId ? null : roomId);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFiltro('todos');
    setBuscar('');
    setTipo('todos');
  }, []);

  // Memoize large JSX subtrees
  const roomListHeader = useMemo(() => null, []);

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Table Filters */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2">
        <input
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="🔍 Número..."
          value={listFilter.numero}
          onChange={e => setListFilter(f => ({ ...f, numero: e.target.value }))}
        />
        <input
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          placeholder="🔍 Huésped..."
          value={listFilter.huesped}
          onChange={e => setListFilter(f => ({ ...f, huesped: e.target.value }))}
        />
        <select
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          value={listFilter.tipo}
          onChange={e => setListFilter(f => ({ ...f, tipo: e.target.value }))}
        >
          <option value="">Todos los tipos</option>
          {TIPOS_HABITACION.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500 border-b">
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
  ), [reservadasUOcupadas, selectedRoomId, handleSelectRoom]);

  const roomGrid = useMemo(() => (
    <div>
      {Object.entries(grupos).map(([piso, roomsInPiso]) => (
        <div key={piso} className="mb-8">
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-8 h-0.5 bg-gray-300 inline-block"></span>
            {piso === '0' ? '🏡 Cabañas' : `🏢 Piso ${piso}`}
            <span className="w-8 h-0.5 bg-gray-300 inline-block"></span>
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
      <div className="min-h-screen bg-gray-50">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} />
        <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
          <p className="text-gray-400 text-lg">Cargando habitaciones...</p>
        </div>
      </div>
    );
  }

  // ── History view ──
  if (activeView === 'history') {
    // Group state changes by room
    const roomStateMap = {};
    history.forEach(entry => {
      const roomId = entry.roomId || entry.numero;
      if (!roomStateMap[roomId]) {
        roomStateMap[roomId] = {
          roomId,
          numero: entry.numero,
          room: allRooms.find(r => r.id === roomId || r.numero === entry.numero),
          entries: [],
        };
      }
      roomStateMap[roomId].entries.push(entry);
    });

    // All rooms with history (for counter)
    const roomsWithHistory = Object.values(roomStateMap)
      .filter(r => r.entries.length > 0);

    // Filtered rooms by room number or state
    const filteredRoomsHistory = roomsWithHistory
      .filter(r => {
        if (histFilter.room && !r.numero.includes(histFilter.room)) return false;
        if (histFilter.estado !== 'todos') {
          const hasState = r.entries.some(e => e.estadoNuevo === histFilter.estado || e.estadoAnterior === histFilter.estado);
          if (!hasState) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aLatest = a.entries[0]?.timestamp || '';
        const bLatest = b.entries[0]?.timestamp || '';
        return bLatest.localeCompare(aLatest);
      });

    return (
      <div className="min-h-screen bg-gray-50">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">📋 Historial de Estados</h2>
            <span className="text-sm text-gray-500">{filteredRoomsHistory.length} de {roomsWithHistory.length} habitaciones</span>
          </div>

          {/* Table Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4 flex flex-wrap gap-2">
            <input
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="🔍 Habitación..."
              value={histFilter.room}
              onChange={e => setHistFilter(f => ({ ...f, room: e.target.value }))}
            />
            <select
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              value={histFilter.estado}
              onChange={e => setHistFilter(f => ({ ...f, estado: e.target.value }))}
            >
              <option value="todos">Todos los estados</option>
              <option value="disponible">Disponible</option>
              <option value="ocupada">Ocupada</option>
              <option value="reservada">Reservada</option>
              <option value="limpieza">Limpieza</option>
              <option value="mantenimiento">Mantenimiento</option>
            </select>
            {(histFilter.room || histFilter.estado !== 'todos') && (
              <button
                onClick={() => setHistFilter({ room: '', estado: 'todos' })}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              >
                ✕ Limpiar
              </button>
            )}
          </div>

          {historyLoading ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-2">⏳</div>
              <p>Cargando historial...</p>
            </div>
          ) : filteredRoomsHistory.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-2">📭</div>
              <p>Sin registros de historial</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRoomsHistory.map(roomData => {
                const isExpanded = expandedRoomId === roomData.roomId;
                return (
                  <div key={roomData.roomId} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedRoomId(prev => prev === roomData.roomId ? null : roomData.roomId)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-900">{roomData.numero}</span>
                        {roomData.room && <span className="text-sm text-gray-500">{roomData.room.tipo}</span>}
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                          {roomData.entries.length} cambios
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        {/* Timeline */}
                        <div className="p-4 space-y-0">
                          {roomData.entries.map((entry, i) => {
                            const cfg = ESTADO_CFG[entry.estadoNuevo] || ESTADO_CFG.disponible;
                            const prevCfg = ESTADO_CFG[entry.estadoAnterior] || null;
                            const wasOccupied = entry.estadoAnterior === 'ocupada';

                            // Use saved reservation data from the entry (stored when state changed)
                            // Or fall back to finding in reservationHistory
                            let reservation = entry.reserva || null;
                            if (!reservation && wasOccupied) {
                              reservation = reservationHistory.find(r =>
                                (r.roomId === entry.roomId || r.numero === entry.numero) &&
                                r.tipo !== 'cambio_estado' &&
                                r.huesped &&
                                r.huesped !== ''
                              );
                            }

                            // Also check if entry has huesped data directly
                            const hasGuestData = reservation?.huesped || entry.huesped;

                            return (
                              <div key={entry.id} className="relative flex gap-4 pb-4">
                                {/* Timeline line */}
                                {i < roomData.entries.length - 1 && (
                                  <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200"></div>
                                )}
                                {/* Timeline dot */}
                                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2`} style={{ borderColor: cfg.border, background: cfg.bg }}>
                                  <span className="text-sm">{cfg.icon || '📍'}</span>
                                </div>
                                {/* Content */}
                                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {prevCfg && (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold line-through opacity-60" style={{ background: prevCfg.bg, color: prevCfg.color }}>
                                        {entry.estadoAnterior}
                                      </span>
                                    )}
                                    <span className="text-gray-400">→</span>
                                    <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                                      {entry.estadoNuevo}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-auto">{FECHA(entry.timestamp)}</span>
                                  </div>

                                  {/* Guest name from entry if no full reservation */}
                                  {!reservation && entry.huesped && entry.huesped !== '' && (
                                    <div className="mt-2 text-sm text-gray-600">
                                      <span className="font-medium">Huésped:</span> {entry.huesped}
                                    </div>
                                  )}

                                  {/* Complete reservation data when available */}
                                  {reservation && (
                                    <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">📋 Datos de la Reservación</span>
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                                        {reservation.huesped && (
                                          <div className="col-span-2 sm:col-span-3">
                                            <span className="text-gray-500">Huésped:</span>
                                            <p className="font-semibold text-gray-900 text-sm">{reservation.huesped}</p>
                                          </div>
                                        )}
                                        {reservation.documento && (
                                          <div>
                                            <span className="text-gray-500">Documento:</span>
                                            <p className="font-medium text-gray-900">{reservation.documento}</p>
                                          </div>
                                        )}
                                        {reservation.email && (
                                          <div>
                                            <span className="text-gray-500">Email:</span>
                                            <p className="font-medium text-gray-900 truncate" title={reservation.email}>{reservation.email}</p>
                                          </div>
                                        )}
                                        {reservation.telefono && (
                                          <div>
                                            <span className="text-gray-500">Teléfono:</span>
                                            <p className="font-medium text-gray-900">{reservation.telefono}</p>
                                          </div>
                                        )}
                                        {reservation.checkIn && (
                                          <div>
                                            <span className="text-gray-500">Check-in:</span>
                                            <p className="font-medium text-gray-900">{FECHA(reservation.checkIn)}</p>
                                          </div>
                                        )}
                                        {reservation.checkOut && (
                                          <div>
                                            <span className="text-gray-500">Check-out:</span>
                                            <p className="font-medium text-gray-900">{FECHA(reservation.checkOut)}</p>
                                          </div>
                                        )}
                                        {reservation.noches && (
                                          <div>
                                            <span className="text-gray-500">Noches:</span>
                                            <p className="font-medium text-gray-900">{reservation.noches}</p>
                                          </div>
                                        )}
                                        {reservation.tarifa && (
                                          <div>
                                            <span className="text-gray-500">Tarifa/noche:</span>
                                            <p className="font-semibold text-green-700">{COP(reservation.tarifa)}</p>
                                          </div>
                                        )}
                                        <div>
                                          <span className="text-gray-500">Adultos:</span>
                                          <p className="font-medium text-gray-900">{reservation.adultos || 1}</p>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Niños:</span>
                                          <p className="font-medium text-gray-900">{reservation.ninos || 0}</p>
                                        </div>
                                        {reservation.tieneMascota && (
                                          <div>
                                            <span className="text-gray-500">Mascota:</span>
                                            <p className="font-medium text-gray-900">🐾 {reservation.nombreMascota || 'Sí'}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Prices view ──
  if (activeView === 'prices') {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
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
    const filteredReservations = useMemo(() => {
      return allReservations.filter(r => {
        if (resFilter.numero && !String(r.numero).includes(resFilter.numero)) return false;
        if (resFilter.huesped && !r.huesped?.toLowerCase().includes(resFilter.huesped.toLowerCase())) return false;
        return true;
      });
    }, [allReservations, resFilter]);

    return (
      <div className="min-h-screen bg-gray-50">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">📅 Reservaciones</h2>
            <span className="text-sm text-gray-500">{filteredReservations.length} de {allReservations.length} registros</span>
          </div>
          {allReservations.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-2">📭</div>
              <p>No hay reservaciones registradas</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Table Filters */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2">
                <input
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="🔍 Habitación..."
                  value={resFilter.numero}
                  onChange={e => setResFilter(f => ({ ...f, numero: e.target.value }))}
                />
                <input
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="🔍 Huésped..."
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
      <div className="min-h-screen bg-gray-50">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-xl font-bold mb-4">💰 Registrar Consumo</h2>
          {txn.exito && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              ✅ Consumo registrado exitosamente
            </div>
          )}
          {!txn.room ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
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
                <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium" onClick={handleValidatePin}>Validar</button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
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
                <button className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400" onClick={handleRegisterConsumo} disabled={txn.loading}>
                  {txn.loading ? 'Registrando...' : 'Registrar Consumo'}
                </button>
                <button className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium" onClick={handleResetTxn}>Cancelar</button>
              </div>
            </div>
          )}
          {txn.error && <p className="text-red-500 text-sm mt-2">{txn.error}</p>}
        </div>
      </div>
    );
  }

  // ── Register view ──
  if (activeView === 'register') {
    // Check if a room is selected via URL param
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const selectedRoomIdForRegister = urlParams.get('room');
    const roomToRegister = rooms.find(r => r.id === selectedRoomIdForRegister);

    return (
      <div className="min-h-screen bg-gray-50">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-xl font-bold mb-6">📝 Registrar Huésped</h2>

          {!roomToRegister ? (
            // Room selection
            disponibles.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="text-4xl mb-2">🏠</div>
                <p>No hay habitaciones disponibles</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-4">Selecciona una habitación disponible para registrar un huésped</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {disponibles.map(r => (
                    <a
                      key={r.id}
                      href={`#/admin/register?room=${r.id}`}
                      className="block p-4 bg-green-50 border-2 border-green-300 rounded-xl hover:bg-green-100 hover:shadow-md hover:border-green-400 transition-all text-left no-underline"
                    >
                      <span className="text-lg font-bold text-gray-900">{r.numero}</span>
                      <p className="text-xs text-gray-500 mt-1">{r.tipo}</p>
                      <p className="text-xs text-gray-400 mt-1">{r.camas}</p>
                    </a>
                  ))}
                </div>
              </div>
            )
          ) : (
            // Check-in form for selected room
            <div className="flex justify-center">
              <div className="w-full max-w-3xl">
                <div className="mb-4">
                  <a href="#/admin/register" className="text-green-600 hover:text-green-700 text-sm font-medium no-underline">
                    ← Volver a habitaciones disponibles
                  </a>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                  {/* Room info header */}
                  <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-5 border-b-2 border-green-300">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-extrabold text-green-900">{roomToRegister.numero}</span>
                      <div>
                        <p className="font-bold text-green-800 text-lg">{roomToRegister.tipo}</p>
                        <p className="text-sm text-green-600">{roomToRegister.camas} · Capacidad: {roomToRegister.capacidad} personas</p>
                      </div>
                    </div>
                  </div>

                  {/* Check-in form */}
                  <CheckinForm
                    room={roomToRegister}
                    onSuccess={() => {
                      handleNavigate('rooms');
                      toast.success('✅ Check-in realizado exitosamente');
                    }}
                    onCancel={() => {
                      window.location.hash = '/admin/register';
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Accounting view ──
  if (activeView === 'accounting') {
    console.log('>>> Rendering accounting view, accData:', accData);
    const handleExport = () => {
      setExporting(true);
      downloadAccountingReport();
      setTimeout(() => setExporting(false), 2000);
    };

    const formatM = (v) => {
      if (!v) return '$0';
      if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
      if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
      return `$${v}`;
    };

    // Chart colors for accounting
    const ACC_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    const STATUS_COLORS = {
      disponible: '#22c55e',
      ocupda: '#f59e0b',
      reservada: '#3b82f6',
      limpieza: '#8b5cf6',
      mantenimiento: '#ef4444',
    };

    // Prepare pie chart data for room status
    const statusData = accData ? [
      { name: 'Ocupadas', value: accData.summary.occupied, color: '#f59e0b' },
      { name: 'Disponibles', value: accData.summary.available, color: '#22c55e' },
      { name: 'Reservadas', value: accData.summary.reserved, color: '#3b82f6' },
    ].filter(d => d.value > 0) : [];

    return (
      <div className="min-h-screen bg-gray-50">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🧾 Contabilidad</h1>
              <p className="text-sm text-gray-500 mt-1">Resumen financiero y reportes</p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:bg-gray-400"
            >
              {exporting ? <span>⏳ Generando...</span> : <span>📥 Descargar Excel</span>}
            </button>
          </div>

          {accLoading ? (
            <div className="text-center py-12 text-gray-400">Cargando datos contables...</div>
          ) : accError ? (
            <div className="text-center py-12 text-red-600">Error: {accError?.message || accError}</div>
          ) : accData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Tasa de Ocupación', value: `${accData.summary.occupancyRate}%`, icon: '📊', color: 'text-green-600' },
                  { label: 'Revenue Actual', value: formatM(accData.summary.currentRevenue), icon: '💰', color: 'text-blue-600' },
                  { label: 'Revenue Histórico', value: formatM(accData.summary.historicalRevenue), icon: '📈', color: 'text-yellow-600' },
                  { label: 'Estadías Completadas', value: accData.completedStays || 0, icon: '🏨', color: 'text-purple-600' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      </div>
                      <span className="text-2xl">{s.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Room Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">🏠 Habitaciones Actuales</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Total', value: accData.summary.totalRooms, color: 'text-gray-900' },
                      { label: 'Ocupadas', value: accData.summary.occupied, color: 'text-green-600' },
                      { label: 'Disponibles', value: accData.summary.available, color: 'text-blue-600' },
                      { label: 'Reservadas', value: accData.summary.reserved, color: 'text-yellow-600' },
                      { label: 'Tarifa Promedio/Día', value: COP(accData.summary.avgDailyRate), color: 'text-green-700' },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.label}</span>
                        <span className={`font-bold ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue by Room Type - Bar Chart */}
                {accData.revenueByType && accData.revenueByType.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">💰 Revenue por Habitación</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={accData.revenueByType} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" fontSize={11} tickFormatter={(v) => `$${v/1000}k`} />
                        <YAxis type="category" dataKey="tipo" stroke="#6b7280" fontSize={10} width={100} />
                        <Tooltip formatter={(v) => COP(v)} />
                        <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Room Status Pie Chart */}
                {statusData.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">🏠 Estado de Habitaciones</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Revenue by Service */}
              {accData.revenueByService && accData.revenueByService.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">🍽️ Ingresos por Servicio</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {accData.revenueByService.map((s, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-sm text-gray-500 capitalize">{s.categoria}</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{COP(s.total)}</p>
                        <p className="text-xs text-gray-400">{s.count} transacciones</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    );
  }

  // ── Dashboard view ──
  if (activeView === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} />
        <AdminNav activeView={activeView} onNavigate={handleNavigate} />
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

  // ── Default: rooms view ──
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} />
      <AdminNav activeView={activeView} onNavigate={handleNavigate} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <button onClick={() => handleNavigate('dashboard')} className="text-gray-500 hover:text-gray-900 bg-transparent border-none cursor-pointer">🏠 Admin</button>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* StatPills only shown in grid view */}
          {viewMode === 'grid' && (
            <div className="px-4 py-3 border-b border-gray-100">
              <StatPills stats={stats} filtro={filtro} onFilter={handleFilter} />
            </div>
          )}

          {/* Row 2: Search + Type + ViewMode */}
          <div className="px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
              <input
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                type="text"
                placeholder="Buscar habitación o huésped..."
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
              />
              {buscar && (
                <button
                  onClick={() => setBuscar('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Type dropdown */}
            <select
              className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
              value={tipo}
              onChange={e => setTipo(e.target.value)}
            >
              <option value="todos">🏨 Todos los tipos</option>
              {TIPOS_HABITACION.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* View mode toggle */}
            <ViewModeToggle viewMode={viewMode} onChange={handleViewMode} />
          </div>

          {/* Active filters display */}
          {(filtro !== 'todos' || tipo !== 'todos' || buscar) && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Filtros:</span>
              {filtro !== 'todos' && (
                <button
                  onClick={() => setFiltro('todos')}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm border-none cursor-pointer hover:bg-green-200 font-medium"
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

        {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

        {/* Two-column layout: rooms list/grid + side panel */}
        <div className={`flex gap-6 transition-all duration-300 ${selectedRoomId ? 'lg:grid lg:grid-cols-1 lg:xl:grid-cols-[1fr_400px]' : ''}`}>
          {/* Left: rooms list/grid */}
          <div className={selectedRoomId ? 'min-w-0' : 'w-full'}>
            {viewMode === 'list' ? roomListView : roomGrid}
          </div>

          {/* Right: room detail side panel */}
          {selectedRoomId && selectedRoom && (
            <div className="hidden xl:block">
              <div className="sticky top-[130px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
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
