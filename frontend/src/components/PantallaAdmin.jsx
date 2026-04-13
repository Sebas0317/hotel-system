import { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { useRooms } from '../hooks/useRooms';
import { useRoomSync } from '../hooks/useRoomSync';
import { ESTADO_CFG, TIPO_ICON, TIPOS_HABITACION, CATEGORIAS_CONSUMO, PRODUCTOS } from '../constants';
import { FECHA, filtrarRooms, agruparPorPiso, COP } from '../utils/helpers';
import { fetchHistory, fetchRooms, createConsumo } from '../services/api';
import RoomDetail from './RoomDetail';
import HotelTitle from './HotelTitle';
import PriceEditor from './PriceEditor';
import { Toast } from './RoomActions';

const NAV_ITEMS = [
  { key: 'rooms', label: 'Habitaciones', icon: '🏠' },
  { key: 'register', label: 'Registrar', icon: '📝' },
  { key: 'transactions', label: 'Transacciones', icon: '💰' },
  { key: 'reservations', label: 'Reservaciones', icon: '📅' },
  { key: 'prices', label: 'Precios', icon: '💲' },
  { key: 'history', label: 'Historial', icon: '📋' },
];

/** Memoized topbar — extracted from 8 duplicated instances */
const AdminTopbar = memo(function AdminTopbar({ onSalir }) {
  return (
    <header className="topbar flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <HotelTitle variant="topbar" />
        <span className="text-xs text-gray-400 uppercase tracking-wider hidden sm:inline">Admin</span>
      </div>
      <button className="btn-exit" onClick={onSalir} aria-label="Salir">🚪 Salir</button>
    </header>
  );
});

/** Memoized navigation — extracted from 6 duplicated instances */
const AdminNav = memo(function AdminNav({ activeView }) {
  return (
    <nav className="admin-nav">
      {NAV_ITEMS.map(item => (
        <button
          key={item.key}
          className={`nav-btn ${activeView === item.key ? 'activo' : ''}`}
          onClick={() => { window.location.hash = `/admin/${item.key === 'rooms' ? '' : item.key}`; }}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
});

/** Memoized stat pills */
const StatPills = memo(function StatPills({ stats, filtro, onFilter }) {
  const pills = [
    { key: 'todos', label: `Todas (${stats.total})`, icon: '📊' },
    { key: 'disponible', label: `Disponibles (${stats.disponible})`, icon: '✅' },
    { key: 'ocupada', label: `Ocupadas (${stats.ocupada})`, icon: '🔴' },
    { key: 'reservada', label: `Reservadas (${stats.reservada})`, icon: '🟡' },
    { key: 'limpieza', label: `Limpieza (${stats.limpieza})`, icon: '🧹' },
  ];
  return (
    <div className="stat-pills flex flex-wrap gap-2 mb-4">
      {pills.map(p => (
        <button
          key={p.key}
          className={`pill ${filtro === p.key ? 'active' : ''}`}
          onClick={() => onFilter(p.key)}
        >
          {p.icon} {p.label}
        </button>
      ))}
    </div>
  );
});

/** Memoized view mode toggle */
const ViewModeToggle = memo(function ViewModeToggle({ viewMode, onChange }) {
  return (
    <div className="view-toggle inline-flex rounded-lg overflow-hidden border border-gray-300 ml-auto">
      <button
        className={`px-3 py-1.5 text-sm ${viewMode === 'grid' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'}`}
        onClick={() => onChange('grid')}
      >
        ▦ Grid
      </button>
      <button
        className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-green-600 text-white' : 'bg-white text-gray-700'}`}
        onClick={() => onChange('list')}
      >
        ☰ Lista
      </button>
    </div>
  );
});

/** Memoized room list item */
const RoomListItem = memo(function RoomListItem({ room }) {
  const cfg = ESTADO_CFG[room.estado] || ESTADO_CFG.disponible;
  // Use stored noches or compute from checkOut - checkIn (pure, based on stored data only)
  const noches = room.noches || null;

  return (
    <tr className="room-row cursor-pointer hover:bg-gray-50">
      <td className="px-3 py-2 font-medium">{room.numero}</td>
      <td className="px-3 py-2 hidden sm:table-cell">{room.tipo}</td>
      <td className="px-3 py-2 hidden md:table-cell">{room.huesped || '—'}</td>
      <td className="px-3 py-2">
        <span className="status-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
          {cfg.label}
        </span>
      </td>
      <td className="px-3 py-2 text-right">{noches ? `${noches} noche${noches > 1 ? 's' : ''}` : '—'}</td>
    </tr>
  );
});

/** Memoized room card for grid view */
const RoomCard = memo(function RoomCard({ room, isSelected, onSelect }) {
  const cfg = ESTADO_CFG[room.estado] || ESTADO_CFG.disponible;
  const tipoIcon = TIPO_ICON[room.tipo] || '🚪';

  return (
    <div
      className={`room-card cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
      style={{ borderColor: cfg.border, background: cfg.bg || '#fff' }}
      onClick={() => onSelect(room.id)}
    >
      <div className="room-card-header flex items-start justify-between mb-2">
        <span className="room-number text-2xl font-bold">#{room.numero}</span>
        <span className="room-type-icon text-xl">{tipoIcon}</span>
      </div>
      <div className="room-card-body">
        <span className="room-status-label text-sm font-medium px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
          {cfg.label}
        </span>
        {room.huesped && <p className="room-guest text-xs text-gray-600 mt-1 truncate">{room.huesped}</p>}
        <p className="room-details text-xs text-gray-500 mt-1">{room.tipo} · {room.camas}</p>
      </div>
    </div>
  );
});

export default function PantallaAdmin({ onSalir }) {
  const { rooms, loading, refresh } = useRooms();
  const [toast, setToast] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [buscar, setBuscar] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [activeView, setActiveView] = useState(() => {
    const hash = window.location.hash.slice(1) || '';
    if (hash.includes('/admin/room/')) return 'rooms';
    if (hash.includes('register')) return 'register';
    if (hash.includes('transactions')) return 'transactions';
    if (hash.includes('reservations')) return 'reservations';
    if (hash.includes('prices')) return 'prices';
    if (hash.includes('history')) return 'history';
    return 'rooms';
  });

  const [viewMode, setViewMode] = useState('grid');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [allRooms, setAllRooms] = useState([]);
  const [expandedRoomId, setExpandedRoomId] = useState(null);

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

  // Single hash-change effect (merged two redundant effects)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '';
      if (hash.includes('/admin/room/')) {
        const match = hash.match(/\/admin\/room\/(.+)/);
        if (match) setSelectedRoomId(match[1]);
      } else {
        setSelectedRoomId(null);
      }
      if (hash.includes('register')) setActiveView('register');
      else if (hash.includes('transactions')) setActiveView('transactions');
      else if (hash.includes('reservations')) { setActiveView('reservations'); setSelectedRoomId(null); }
      else if (hash.includes('prices')) setActiveView('prices');
      else if (hash.includes('history')) { setActiveView('history'); setSelectedRoomId(null); }
      else setActiveView('rooms');
    };
    handleHashChange(); // Run on mount
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // History loading — fetch when history view is active
  useEffect(() => {
    if (activeView !== 'history') return;
    let cancelled = false;
    Promise.all([fetchHistory(), fetchRooms()])
      .then(([historyData, roomsData]) => {
        if (!cancelled) {
          const historyArray = historyData?.reservas || historyData || [];
          setHistory(historyArray);
          setAllRooms(roomsData);
        }
      })
      .catch(err => {
        if (!cancelled) console.error('Error loading history:', err);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeView]);

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
      return;
    }
    setTxn(prev => ({ ...prev, room, error: '' }));
  }, [rooms, txn.roomId, txn.pin]);

  const handleRegisterConsumo = useCallback(async () => {
    if (!txn.form.descripcion.trim() || !txn.form.precio) {
      setTxn(prev => ({ ...prev, error: 'Completa todos los campos' }));
      return;
    }
    setTxn(prev => ({ ...prev, loading: true, error: '' }));
    try {
      await createConsumo({
        roomId: txn.room.id,
        descripcion: txn.form.descripcion,
        precio: parseFloat(txn.form.precio),
        categoria: txn.cat,
      });
      setTxn(prev => ({
        ...prev,
        loading: false,
        exito: true,
        form: { descripcion: '', precio: '' },
      }));
      setTimeout(() => setTxn(prev => ({ ...prev, exito: false })), 2000);
    } catch {
      setTxn(prev => ({ ...prev, loading: false, error: 'Error al registrar consumo' }));
    }
  }, [txn.room, txn.form, txn.cat]);

  const handleResetTxn = useCallback(() => {
    setTxn({ room: null, roomId: '', pin: '', error: '', loading: false, cat: 'restaurante', form: { descripcion: '', precio: '' }, exito: false });
  }, []);

  // Memoize large JSX subtrees
  const roomListHeader = useMemo(() => (
    <div className="room-list-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
      <StatPills stats={stats} filtro={filtro} onFilter={setFiltro} />
      <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
    </div>
  ), [stats, filtro, viewMode]);

  const roomListView = useMemo(() => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2 hidden sm:table-cell">Tipo</th>
            <th className="px-3 py-2 hidden md:table-cell">Huésped</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2 text-right">Noches</th>
          </tr>
        </thead>
        <tbody>
          {reservadasUOcupadas.length === 0 ? (
            <tr><td colSpan="5" className="px-3 py-8 text-center text-gray-400">Sin habitaciones ocupadas o reservadas</td></tr>
          ) : (
            reservadasUOcupadas.map(room => (
              <RoomListItem key={room.id} room={room} />
            ))
          )}
        </tbody>
      </table>
    </div>
  ), [reservadasUOcupadas]);

  const roomGrid = useMemo(() => (
    <div className="room-grid">
      {Object.entries(grupos).map(([piso, roomsInPiso]) => (
        <div key={piso} className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {piso === '0' ? 'Cabañas' : `Piso ${piso}`}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {roomsInPiso.map(r => (
              <RoomCard
                key={r.id}
                room={r}
                isSelected={selectedRoomId === r.id}
                onSelect={selectRoom}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  ), [grupos, selectedRoomId, selectRoom]);

  // ── Selected room detail view ──
  if (selectedRoom) {
    return (
      <div className="admin-screen">
        <AdminTopbar onSalir={onSalir} />
        <div className="admin-content p-4">
          <button className="btn-back mb-4" onClick={() => { window.history.back(); }}>← Volver</button>
          {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
          <RoomDetail room={selectedRoom} onRefresh={handleRefresh} />
        </div>
      </div>
    );
  }

  // ── Main admin layout ──
  if (loading) {
    return (
      <div className="admin-screen">
        <AdminTopbar onSalir={onSalir} />
        <div className="admin-content flex items-center justify-center" style={{ minHeight: '60vh' }}>
          <p className="text-gray-400 text-lg">Cargando habitaciones...</p>
        </div>
      </div>
    );
  }

  // ── History view ──
  if (activeView === 'history') {
    const displayRooms = allRooms.length > 0 ? allRooms : rooms;
    return (
      <div className="admin-screen">
        <AdminTopbar onSalir={onSalir} />
        <AdminNav activeView="history" />
        <div className="admin-content p-4">
          <h2 className="text-xl font-bold mb-4">📋 Historial de Estados</h2>
          {historyLoading ? (
            <p className="text-center text-gray-400 py-8">Cargando historial...</p>
          ) : history.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Sin registros de historial</p>
          ) : (
            <div className="history-list space-y-4">
              {displayRooms.map(room => {
                const roomHistory = history.filter(h => h.numero === room.numero || h.roomId === room.id);
                if (roomHistory.length === 0) return null;
                const isExpanded = expandedRoomId === room.id;
                return (
                  <div key={room.id} className="history-room-card bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedRoomId(prev => prev === room.id ? null : room.id)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">#{room.numero}</span>
                        <span className="text-sm text-gray-500">{room.tipo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{roomHistory.length} cambio{roomHistory.length > 1 ? 's' : ''}</span>
                        <span className={`text-sm ${isExpanded ? 'rotate-180' : ''} transition-transform`}>▼</span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-2">
                        {roomHistory.slice(0, 10).map((h, i) => {
                          const cfg = ESTADO_CFG[h.estadoNuevo] || ESTADO_CFG.disponible;
                          return (
                            <div key={i} className="flex items-center gap-3 text-sm p-2 bg-white rounded-lg">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                                {h.estadoNuevo}
                              </span>
                              <span className="text-gray-500">{FECHA(h.timestamp)}</span>
                              {h.huesped && <span className="text-gray-700 font-medium">{h.huesped}</span>}
                            </div>
                          );
                        })}
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
      <div className="admin-screen">
        <AdminTopbar onSalir={onSalir} />
        <AdminNav activeView="prices" />
        <div className="admin-content p-4">
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
    return (
      <div className="admin-screen">
        <AdminTopbar onSalir={onSalir} />
        <AdminNav activeView="reservations" />
        <div className="admin-content p-4">
          <h2 className="text-xl font-bold mb-4">📅 Reservaciones</h2>
          {reservadasUOcupadas.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay reservaciones activas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Huésped</th>
                    <th className="px-3 py-2 hidden sm:table-cell">Check-in</th>
                    <th className="px-3 py-2 hidden sm:table-cell">Check-out</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {reservadasUOcupadas.map(room => {
                    const cfg = ESTADO_CFG[room.estado] || ESTADO_CFG.disponible;
                    return (
                      <tr key={room.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => selectRoom(room.id)}>
                        <td className="px-3 py-2 font-bold">{room.numero}</td>
                        <td className="px-3 py-2">{room.huesped || '—'}</td>
                        <td className="px-3 py-2 hidden sm:table-cell">{FECHA(room.checkIn)}</td>
                        <td className="px-3 py-2 hidden sm:table-cell">{room.checkOut ? FECHA(room.checkOut) : '—'}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Transactions view ──
  if (activeView === 'transactions') {
    return (
      <div className="admin-screen">
        <AdminTopbar onSalir={onSalir} />
        <AdminNav activeView="transactions" />
        <div className="admin-content p-4 max-w-lg mx-auto">
          <h2 className="text-xl font-bold mb-4">💰 Registrar Consumo</h2>
          {txn.exito && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              ✅ Consumo registrado exitosamente
            </div>
          )}
          {!txn.room ? (
            <div className="space-y-4">
              <select
                className="w-full p-3 border border-gray-300 rounded-lg"
                value={txn.roomId}
                onChange={e => setTxn(prev => ({ ...prev, roomId: e.target.value }))}
              >
                <option value="">Seleccionar habitación ocupada</option>
                {occupiedRooms.map(r => (
                  <option key={r.id} value={r.id}>#{r.numero} — {r.huesped}</option>
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
                <button className="btn-primary px-6" onClick={handleValidatePin}>Validar</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
                <button className="btn-primary flex-1" onClick={handleRegisterConsumo} disabled={txn.loading}>
                  {txn.loading ? 'Registrando...' : 'Registrar Consumo'}
                </button>
                <button className="btn-secondary px-4" onClick={handleResetTxn}>Cancelar</button>
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
    return (
      <div className="admin-screen">
        <AdminTopbar onSalir={onSalir} />
        <AdminNav activeView="register" />
        <div className="admin-content p-4">
          <h2 className="text-xl font-bold mb-4">📝 Registrar Huésped</h2>
          {disponibles.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay habitaciones disponibles</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {disponibles.map(r => (
                <button
                  key={r.id}
                  className="p-4 bg-green-50 border-2 border-green-300 rounded-xl hover:bg-green-100 transition-colors text-left"
                  onClick={() => { window.location.hash = `/admin/register?room=${r.id}`; }}
                >
                  <span className="text-lg font-bold">#{r.numero}</span>
                  <p className="text-xs text-gray-500">{r.tipo}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Default: rooms view ──
  return (
    <div className="admin-screen">
      <AdminTopbar onSalir={onSalir} />
      <AdminNav activeView="rooms" />
      <div className="admin-content p-4">
        <div className="flex items-center gap-4 mb-4">
          <input
            className="flex-1 max-w-xs p-2 border border-gray-300 rounded-lg"
            type="text"
            placeholder="🔍 Buscar habitación o huésped..."
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
          />
          <select
            className="p-2 border border-gray-300 rounded-lg"
            value={tipo}
            onChange={e => setTipo(e.target.value)}
          >
            <option value="todos">Todos los tipos</option>
            {TIPOS_HABITACION.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {roomListHeader}

        {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

        {viewMode === 'list' ? roomListView : roomGrid}
      </div>
    </div>
  );
}
