import { useMemo, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRooms } from '../hooks/useRooms';
import { useRoomSync } from '../hooks/useRoomSync';
import { useFilterSync } from '../hooks/useFilterSync';
import { ESTADO_CFG, TIPO_ICON, TIPOS_HABITACION } from '../constants';
import { FECHA, filtrarRooms, agruparPorPiso } from '../utils/helpers';
import RoomDetail from './RoomDetail';
import HotelTitle from './HotelTitle';
import PriceEditor from './PriceEditor';
import { Toast } from './RoomActions';

/**
 * Admin dashboard — two-column layout when a room is selected.
 *
 * Two primary views:
 *   - "rooms" — room list with filtering, searching, and detail panel
 *   - "prices" — price editor for room rates and consumables
 *
 * Real-time sync:
 *   - Polls backend every 5 seconds for room changes
 *   - Shows toast notification when another user modifies a room
 *   - Auto-refreshes room list and detail panel
 *
 * URL synchronization:
 *   - Filters: ?estado=ocupada&buscar=101 (via useFilterSync)
 *   - Selected room: ?room=1002
 *   - Active view: ?view=prices (defaults to "rooms")
 *   - All params are shareable and bookmarkable
 *   - Browser back/forward restores previous state
 */
export default function PantallaAdmin({ onSalir, onNav }) {
  const { rooms, loading, refresh } = useRooms();
  const { filtro, setFiltro, tipo, setTipo, buscar, setBuscar } = useFilterSync();
  const [searchParams, setSearchParams] = useSearchParams();
  const [toast, setToast] = useState(null);

  // Real-time sync: polls backend every 5s, shows toast on changes
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  useRoomSync({
    interval: 5000,
    enabled: true,
    onChange: (changes) => {
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

  // Active view: 'rooms' or 'prices' — derived from URL
  const activeView = searchParams.get('view') === 'prices' ? 'prices' : 'rooms';

  const setView = (view) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (view === 'prices') {
        next.set('view', 'prices');
      } else {
        next.delete('view');
      }
      return next;
    }, { replace: true });
  };

  // selectedRoomId is derived from URL — no local state, no circular deps
  const selectedRoomId = searchParams.get('room') || null;

  /**
   * Select a room to show its detail panel on the right.
   * Clicking the same room deselects it (closes the panel).
   * Updates the URL ?room= param directly.
   */
  const selectRoom = (roomId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const current = prev.get('room');
      if (current === roomId) {
        next.delete('room');
      } else {
        next.set('room', roomId);
      }
      return next;
    }, { replace: true });
  };

  /**
   * Callback passed to RoomDetail for refreshing data after actions
   */
  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  // Memoize filtering to avoid recomputation on every render
  const filtradas = useMemo(
    () => filtrarRooms(rooms, filtro, buscar, tipo),
    [rooms, filtro, buscar, tipo]
  );

  // Memoize grouping by floor
  const grupos = useMemo(() => agruparPorPiso(filtradas), [filtradas]);

  // Compute stats once from the full room list
  const stats = useMemo(
    () => ({
      total: rooms.length,
      ocupadas: rooms.filter((r) => r.estado === 'ocupada').length,
      reservadas: rooms.filter((r) => r.estado === 'reservada').length,
      disponibles: rooms.filter((r) => r.estado === 'disponible').length,
      operativas: rooms.filter((r) => ['limpieza', 'mantenimiento', 'fuera-servicio'].includes(r.estado)).length,
    }),
    [rooms]
  );

  // Find the currently selected room object for the detail panel
  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  if (loading) {
    return (
      <div className="app-shell">
        <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
          <div className="topbar-left flex items-center gap-2">
            <span className="topbar-logo text-xl">🏨</span>
            <HotelTitle />
            <span className="topbar-badge admin text-xs">Admin</span>
          </div>
          <button className="btn-salir text-sm" onClick={onSalir}>← Cerrar sesión</button>
        </header>
        <div className="admin-content">
          <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando habitaciones...</p>
        </div>
      </div>
    );
  }

  // Shared header for the room list column
  const roomListHeader = (
    <>
      {/* Primary action buttons */}
      <div className="admin-primary-actions flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
        <button
          className={`admin-primary-btn px-4 py-3 sm:px-5 text-sm sm:text-base ${activeView === 'rooms' ? 'activo' : ''}`}
          onClick={() => setView('rooms')}
        >
          🏠 Lista de Habitaciones
        </button>
        <button
          className={`admin-primary-btn px-4 py-3 sm:px-5 text-sm sm:text-base ${activeView === 'prices' ? 'activo' : ''}`}
          onClick={() => setView('prices')}
        >
          💰 Modificar Tarifas y Consumibles
        </button>
        <button
          className="admin-primary-btn admin-primary-btn-nav px-4 py-3 sm:px-5 text-sm sm:text-base"
          onClick={() => onNav('/admin/reservaciones')}
        >
          📋 Reservaciones
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats flex flex-wrap gap-2 sm:gap-3 mb-4">
        <div className="stat-pill total flex-1 min-w-[70px] sm:min-w-[90px] p-3 sm:p-4"><span className="sp-num text-xl sm:text-3xl">{stats.total}</span><span className="sp-lbl text-[10px] sm:text-xs">Total</span></div>
        <div className="stat-pill ocupada flex-1 min-w-[70px] sm:min-w-[90px] p-3 sm:p-4"><span className="sp-num text-xl sm:text-3xl">{stats.ocupadas}</span><span className="sp-lbl text-[10px] sm:text-xs">Ocupadas</span></div>
        <div className="stat-pill reservada flex-1 min-w-[70px] sm:min-w-[90px] p-3 sm:p-4"><span className="sp-num text-xl sm:text-3xl">{stats.reservadas}</span><span className="sp-lbl text-[10px] sm:text-xs">Reservadas</span></div>
        <div className="stat-pill disponible flex-1 min-w-[70px] sm:min-w-[90px] p-3 sm:p-4"><span className="sp-num text-xl sm:text-3xl">{stats.disponibles}</span><span className="sp-lbl text-[10px] sm:text-xs">Disponibles</span></div>
        <div className="stat-pill operativa flex-1 min-w-[70px] sm:min-w-[90px] p-3 sm:p-4"><span className="sp-num text-xl sm:text-3xl">{stats.operativas}</span><span className="sp-lbl text-[10px] sm:text-xs">Operativas</span></div>
      </div>

      {/* Filters */}
      <div className="admin-filtros flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
        <input className="buscar-input flex-1 min-w-[200px] px-4 py-2 text-sm" placeholder="🔍 Buscar habitación o huésped..." value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        <div className="filtro-tabs flex flex-wrap gap-1">
          {['todos', 'ocupada', 'reservada', 'disponible', 'limpieza', 'mantenimiento', 'fuera-servicio'].map((f) => (
            <button key={f} className={`ftab px-2 sm:px-4 py-2 text-xs sm:text-sm ${filtro === f ? 'activo' : ''} ${f}`} onClick={() => setFiltro(f)}>
              {f === 'todos' ? 'Todas' : ESTADO_CFG[f]?.label}
            </button>
          ))}
        </div>
        <select className="filtro-tipo w-full sm:w-auto px-3 py-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="todos">Todos los tipos</option>
          {TIPOS_HABITACION.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
    </>
  );

  // Shared room grid renderer
  const roomGrid = (
    <>
      {Object.keys(grupos).length === 0 ? (
        <div className="admin-empty-state">
          <span className="admin-empty-icon">🔍</span>
          <p className="admin-empty-title">No se encontraron habitaciones</p>
          <p className="admin-empty-desc">Intenta cambiando los filtros de búsqueda</p>
        </div>
      ) : (
        Object.entries(grupos).map(([piso, habitaciones]) => (
        <div key={piso} className="piso-grupo">
          <div className="piso-titulo">
            <span>{piso === 'Cabañas' ? '🏕️' : '🏢'} {piso}</span>
            <span className="piso-count">{habitaciones.length} habitaciones</span>
          </div>
          <div className="rooms-grid">
            {habitaciones.map((r) => {
              const cfg = ESTADO_CFG[r.estado] || ESTADO_CFG.disponible;
              const isSelected = selectedRoomId === r.id;
              return (
                <div
                  key={r.id}
                  className={`room-card ${isSelected ? 'selected' : ''}`}
                  style={{ borderColor: cfg.border, background: cfg.bg || '#fff' }}
                  onClick={() => selectRoom(r.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectRoom(r.id); }}
                >
                  <div className="rc-top">
                    <span className="rc-numero">#{r.numero}</span>
                    <span className="rc-dot" style={{ background: cfg.dot }} />
                    {/* Selection indicator */}
                    <span className={`rc-expand-icon ${isSelected ? 'open' : ''}`}>
                      {isSelected ? '◂' : '▸'}
                    </span>
                  </div>
                  <div className="rc-tipo">{TIPO_ICON[r.tipo] || '🛏️'} {r.tipo}</div>
                  <div className="rc-camas">🛌 {r.camas}</div>
                  <div className="rc-cap">👥 Capacidad: {r.capacidad} personas</div>

                  <div className="rc-estado" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    {cfg.label}
                  </div>

                  {r.estado === 'ocupada' && r.huesped && (
                    <div className="rc-huesped">
                      <span>👤 {r.huesped}</span>
                      <span className="rc-fecha">Desde {FECHA(r.checkIn)}</span>
                    </div>
                  )}
                  {r.estado === 'reservada' && r.huesped && (
                    <div className="rc-huesped reservada">
                      <span>📋 {r.huesped}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))
      )}
    </>
  );

  // Two-column layout when a room is selected
  if (selectedRoom) {
    return (
      <div className="app-shell">
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
        <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
          <div className="topbar-left flex items-center gap-2">
            <span className="topbar-logo text-xl">🏨</span>
            <HotelTitle />
            <span className="topbar-badge admin text-xs">Admin</span>
          </div>
          <button className="btn-salir text-sm" onClick={() => { setSearchParams({}, { replace: true }); onSalir(); }}>← Cerrar sesión</button>
        </header>

        {/* Two-column split: left = room list, right = detail panel */}
        <div className="admin-split flex flex-col lg:grid lg:grid-cols-[1fr_420px]">
          {/* LEFT COLUMN — scrollable room list */}
          <div className="admin-left border-b lg:border-b-0 lg:border-r border-gray-200 max-h-[55vh] lg:max-h-none">
            {roomListHeader}
            <div className="admin-left-scroll">
              {roomGrid}
            </div>
          </div>

          {/* RIGHT COLUMN — fixed detail panel */}
          <div className="admin-right">
            <div className="admin-right-inner">
              {/* Close button for the detail panel */}
              <div className="rd-close-bar flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <span className="rd-close-title font-semibold">Habitación #{selectedRoom.numero}</span>
                <button className="rd-close-btn bg-red-500 text-white px-3 py-1 rounded text-sm" onClick={() => selectRoom(selectedRoom.id)}>✕ Cerrar</button>
              </div>
              <RoomDetail room={selectedRoom} onRefresh={handleRefresh} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prices view
  if (activeView === 'prices') {
    return (
      <div className="app-shell">
        {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
        <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
          <div className="topbar-left flex items-center gap-2">
            <span className="topbar-logo text-xl">🏨</span>
            <HotelTitle />
            <span className="topbar-badge admin text-xs">Admin</span>
          </div>
          <button className="btn-salir text-sm" onClick={() => { setSearchParams({}, { replace: true }); onSalir(); }}>← Cerrar sesión</button>
        </header>

        <div className="admin-content admin-prices-view p-4 sm:p-6">
          {/* Primary action buttons */}
          <div className="admin-primary-actions flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
            <button
              className="admin-primary-btn px-4 py-3 sm:px-5 text-sm sm:text-base"
              onClick={() => setView('rooms')}
            >
              🏠 Lista de Habitaciones
            </button>
            <button
              className="admin-primary-btn activo px-4 py-3 sm:px-5 text-sm sm:text-base"
            >
              💰 Modificar Tarifas y Consumibles
            </button>
          </div>

          <PriceEditor
            onUpdate={() => refresh()}
            onNotify={(type, message) => setToast({ type, message })}
          />
        </div>
      </div>
    );
  }

  // Single-column layout — original full-width view
  return (
    <div className="app-shell">
      <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
        <div className="topbar-left flex items-center gap-2">
          <span className="topbar-logo text-xl">🏨</span>
          <HotelTitle />
          <span className="topbar-badge admin text-xs">Admin</span>
        </div>
        <button className="btn-salir text-sm" onClick={onSalir}>← Cerrar sesión</button>
      </header>

      <div className="admin-content p-4 sm:p-6 max-w-[1200px] mx-auto">
        {roomListHeader}
        {roomGrid}
      </div>
    </div>
  );
}
