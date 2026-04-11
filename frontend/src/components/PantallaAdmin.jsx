import { useMemo, useCallback, useState, useEffect } from 'react';
import { useRooms } from '../hooks/useRooms';
import { useRoomSync } from '../hooks/useRoomSync';
import { ESTADO_CFG, TIPO_ICON, TIPOS_HABITACION } from '../constants';
import { FECHA, filtrarRooms, agruparPorPiso } from '../utils/helpers';
import RoomDetail from './RoomDetail';
import HotelTitle from './HotelTitle';
import PriceEditor from './PriceEditor';
import { Toast } from './RoomActions';

export default function PantallaAdmin({ onSalir }) {
  const { rooms, loading, refresh } = useRooms();
  const [toast, setToast] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [buscar, setBuscar] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [activeView, setActiveView] = useState(() => {
    const hash = window.location.hash.slice(1) || '';
    if (hash.includes('register')) return 'register';
    if (hash.includes('transactions')) return 'transactions';
    if (hash.includes('reservations')) return 'reservations';
    if (hash.includes('prices')) return 'prices';
    return 'rooms';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '';
      if (hash.includes('register')) setActiveView('register');
      else if (hash.includes('transactions')) setActiveView('transactions');
      else if (hash.includes('reservations')) setActiveView('reservations');
      else if (hash.includes('prices')) setActiveView('prices');
      else setActiveView('rooms');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  const selectRoom = useCallback((roomId) => {
    setSelectedRoomId(prev => prev === roomId ? null : roomId);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const filtradas = useMemo(
    () => filtrarRooms(rooms, filtro, buscar, tipo),
    [rooms, filtro, buscar, tipo]
  );

  const grupos = useMemo(() => agruparPorPiso(filtradas), [filtradas]);

  const stats = useMemo(
    () => ({
      total: rooms.length,
      ocupada: rooms.filter((r) => r.estado === 'ocupada').length,
      reservada: rooms.filter((r) => r.estado === 'reservada').length,
      disponible: rooms.filter((r) => r.estado === 'disponible').length,
      limpieza: rooms.filter((r) => r.estado === 'limpieza').length,
    }),
    [rooms]
  );

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  if (loading) {
    return (
      <div className="app-shell">
        <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
          <div className="topbar-left flex items-center gap-2">
            <span className="topbar-logo text-xl">🌿</span>
            <HotelTitle />
            <span className="topbar-badge admin text-xs">Admin</span>
          </div>
          <button className="btn-salir text-sm" onClick={onSalir}>Exit</button>
        </header>
        <div className="admin-content">
          <p style={{ textAlign: 'center', padding: '2rem' }}>🌱 Cargando habitaciones...</p>
        </div>
      </div>
    );
  }

  const roomListHeader = (
    <>
      <div className="admin-primary-actions flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <button
          className={`admin-primary-btn px-5 py-3.5 sm:px-6 text-sm sm:text-base font-medium ${activeView === 'rooms' ? 'activo' : ''}`}
          onClick={() => { setActiveView('rooms'); window.location.hash = '#/admin'; }}
        >
          🏠 Habitaciones
        </button>
        <button
          className={`admin-primary-btn admin-primary-btn-nav px-5 py-3.5 sm:px-6 text-sm sm:text-base font-medium ${activeView === 'register' ? 'activo' : ''}`}
          onClick={() => { setActiveView('register'); window.location.hash = '#/admin/register'; }}
        >
          📋 Registro
        </button>
        <button
          className={`admin-primary-btn admin-primary-btn-nav px-5 py-3.5 sm:px-6 text-sm sm:text-base font-medium ${activeView === 'transactions' ? 'activo' : ''}`}
          onClick={() => { setActiveView('transactions'); window.location.hash = '#/admin/transactions'; }}
        >
          💳 Transacciones
        </button>
        <button
          className={`admin-primary-btn admin-primary-btn-nav px-5 py-3.5 sm:px-6 text-sm sm:text-base font-medium ${activeView === 'reservations' ? 'activo' : ''}`}
          onClick={() => { setActiveView('reservations'); window.location.hash = '#/admin/reservations'; }}
        >
          📅 Reservas
        </button>
        <button
          className={`admin-primary-btn px-5 py-3.5 sm:px-6 text-sm sm:text-base font-medium ${activeView === 'prices' ? 'activo' : ''}`}
          onClick={() => { setActiveView('prices'); window.location.hash = '#/admin/prices'; }}
        >
          💰 Tarifas
        </button>
      </div>

      <div className="admin-stats flex flex-wrap gap-3 sm:gap-4 mb-6">
        <button className={`stat-pill total flex-1 min-w-[80px] sm:min-w-[100px] p-4 sm:p-5 ${filtro === 'todos' ? 'activo' : ''}`} onClick={() => setFiltro('todos')}>
          <span className="sp-num text-2xl sm:text-4xl font-bold">{stats.total}</span>
          <span className="sp-lbl text-xs sm:text-sm">Total</span>
        </button>
        <button className={`stat-pill ocupada flex-1 min-w-[80px] sm:min-w-[100px] p-4 sm:p-5 ${filtro === 'ocupada' ? 'activo' : ''}`} onClick={() => setFiltro('ocupada')}>
          <span className="sp-num text-2xl sm:text-4xl font-bold">{stats.ocupada}</span>
          <span className="sp-lbl text-xs sm:text-sm">Ocupadas</span>
        </button>
        <button className={`stat-pill reservada flex-1 min-w-[80px] sm:min-w-[100px] p-4 sm:p-5 ${filtro === 'reservada' ? 'activo' : ''}`} onClick={() => setFiltro('reservada')}>
          <span className="sp-num text-2xl sm:text-4xl font-bold">{stats.reservada}</span>
          <span className="sp-lbl text-xs sm:text-sm">Reservadas</span>
        </button>
        <button className={`stat-pill disponible flex-1 min-w-[80px] sm:min-w-[100px] p-4 sm:p-5 ${filtro === 'disponible' ? 'activo' : ''}`} onClick={() => setFiltro('disponible')}>
          <span className="sp-num text-2xl sm:text-4xl font-bold">{stats.disponible}</span>
          <span className="sp-lbl text-xs sm:text-sm">Disponibles</span>
        </button>
        <button className={`stat-pill limpieza flex-1 min-w-[80px] sm:min-w-[100px] p-4 sm:p-5 ${filtro === 'limpieza' ? 'activo' : ''}`} onClick={() => setFiltro('limpieza')}>
          <span className="sp-num text-2xl sm:text-4xl font-bold">{stats.limpieza}</span>
          <span className="sp-lbl text-xs sm:text-sm">Limpieza</span>
        </button>
      </div>

      <div className="admin-filtros flex flex-nowrap items-center gap-2 mb-4 overflow-x-auto pb-2">
        <input className="buscar-input flex-shrink-0 w-[180px] px-4 py-2.5 text-sm rounded-lg" placeholder="🔍 Buscar..." value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        <div className="filtro-tabs flex flex-nowrap gap-1.5">
          {['todos', 'ocupada', 'reservada', 'disponible', 'limpieza'].map((f) => (
            <button 
              key={f} 
              className={`ftab px-3 py-2 text-xs whitespace-nowrap ${filtro === f ? 'activo' : ''} ${f}`} 
              onClick={() => setFiltro(f)}
            >
              {f === 'todos' ? 'Todas' : ESTADO_CFG[f]?.label}
            </button>
          ))}
        </div>
        <select className="filtro-tipo flex-shrink-0 w-[140px] px-3 py-2 text-xs rounded-lg" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="todos">Tipos</option>
          {TIPOS_HABITACION.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
    </>
  );

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
                    {r.solicitudCheckout && (
                      <span className="rc-bell" title="Cliente solicita retirarse">🔔</span>
                    )}
                    <span className="rc-dot" style={{ background: cfg.dot }} />
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
          <button className="btn-salir text-sm" onClick={onSalir}>Exit</button>
        </header>

        <div className="admin-split flex flex-col lg:grid lg:grid-cols-[1fr_420px]">
          <div className="admin-left border-b lg:border-b-0 lg:border-r border-gray-200 max-h-[55vh] lg:max-h-none">
            {roomListHeader}
            <div className="admin-left-scroll">
              {roomGrid}
            </div>
          </div>

          <div className="admin-right">
            <div className="admin-right-inner">
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
          <button className="btn-salir text-sm" onClick={onSalir}>Exit</button>
        </header>

        <div className="admin-content admin-prices-view p-4 sm:p-6">
          <div className="admin-primary-actions flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
            <button
              className="admin-primary-btn px-4 py-3 sm:px-5 text-sm sm:text-base"
              onClick={() => setActiveView('rooms')}
            >
              Room List
            </button>
            <button
              className="admin-primary-btn activo px-4 py-3 sm:px-5 text-sm sm:text-base"
            >
              Rates & Pricing
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

  if (activeView === 'register') {
    return (
      <div className="app-shell">
        <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
          <div className="topbar-left flex items-center gap-2">
            <span className="topbar-logo text-xl">🏨</span>
            <HotelTitle />
            <span className="topbar-badge admin text-xs">Admin</span>
          </div>
          <button className="btn-salir text-sm" onClick={() => { setActiveView('rooms'); window.location.hash = '#/admin'; }}>← Volver</button>
        </header>
        <div className="admin-content p-4">
          <h2 className="text-xl font-bold mb-4">📋 Registro de Huéspedes</h2>
          <p className="text-gray-500">Usa el botón "Check-in" en cada habitación</p>
        </div>
      </div>
    );
  }

  if (activeView === 'transactions') {
    return (
      <div className="app-shell">
        <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
          <div className="topbar-left flex items-center gap-2">
            <span className="topbar-logo text-xl">🏨</span>
            <HotelTitle />
            <span className="topbar-badge admin text-xs">Admin</span>
          </div>
          <button className="btn-salir text-sm" onClick={() => { setActiveView('rooms'); window.location.hash = '#/admin'; }}>← Volver</button>
        </header>
        <div className="admin-content p-4">
          <h2 className="text-xl font-bold mb-4">💳 Transacciones</h2>
          <p className="text-gray-500">Historial de pagos y consumos</p>
        </div>
      </div>
    );
  }

  if (activeView === 'reservations') {
    return (
      <div className="app-shell">
        <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
          <div className="topbar-left flex items-center gap-2">
            <span className="topbar-logo text-xl">🏨</span>
            <HotelTitle />
            <span className="topbar-badge admin text-xs">Admin</span>
          </div>
          <button className="btn-salir text-sm" onClick={() => { setActiveView('rooms'); window.location.hash = '#/admin'; }}>← Volver</button>
        </header>
        <div className="admin-content p-4">
          <h2 className="text-xl font-bold mb-4">📅 Reservas</h2>
          <p className="text-gray-500">Gestión de reservas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
          <div className="topbar-left flex items-center gap-2">
            <span className="topbar-logo text-xl">🌿</span>
            <HotelTitle />
            <span className="topbar-badge admin text-xs">Admin</span>
          </div>
          <button className="btn-salir text-sm" onClick={onSalir}>← Salir</button>
      </header>

      <div className="admin-content p-4 sm:p-6 max-w-[1200px] mx-auto">
        {roomListHeader}
        {roomGrid}
      </div>
    </div>
  );
}