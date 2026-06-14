import { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useRooms } from '../hooks/useRooms';
import { useRoomSync } from '../hooks/useRoomSync';
import { ESTADO_CFG } from '../constants';
import { fetchLastLogin, fetchLoginLogs, downloadLoginLogsCSV } from '../services/api';
import HotelTitle from './HotelTitle';
import {
  LayoutDashboard, Home, ClipboardPen, CreditCard, Receipt, DollarSign,
  Calendar, ChevronDown, Download,
  DoorOpen, ClipboardList, Users, ChevronRight, Bell, History, Shield
} from 'lucide-react';

function getNavItems(rol) {
  const all = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'rooms', label: 'Habitaciones', icon: Home },
    { key: 'register', label: 'Registrar', icon: ClipboardPen },
    { key: 'transactions', label: 'Transacciones', icon: CreditCard },
    { key: 'reservations', label: 'Reservaciones', icon: Calendar },
    { key: 'accounting', label: 'Contabilidad', icon: Receipt },
    { key: 'prices', label: 'Precios', icon: DollarSign },
    { key: 'users', label: 'Usuarios', icon: Users },
    { key: 'history', label: 'Historial', icon: History },
    { key: 'security', label: 'Seguridad', icon: Shield },
  ];
  if (rol === 'analyst') {
    return all.filter(i => i.key === 'dashboard' || i.key === 'accounting');
  }
  if (rol === 'operator') {
    return all.filter(i => ['dashboard', 'rooms', 'register', 'transactions', 'reservations', 'prices', 'history'].includes(i.key));
  }
  return all;
}

const NAV_ITEMS = getNavItems('admin');

const AdminTopbar = memo(function AdminTopbar({ onSalir, onNavigate, rooms = [], onRoomSelect }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [lastLogin, setLastLogin] = useState(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [nowMs, setNowMs] = useState(0);

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
          label: 'Check-out solicitado',
          detail: `Habitacion #${r.numero} — ${r.huesped || 'Sin huesped'}`,
          time: r.solicitudCheckout.hora,
          icon: '\uD83D\uDD14',
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
            label: 'Check-out proximo',
            detail: `Habitacion #${r.numero} — ${r.huesped || 'Sin huesped'}`,
            time: r.checkOut,
            icon: '\u23F0',
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
            label: 'Reserva proxima',
            detail: `Habitacion #${r.numero} — ${r.huesped || 'Sin huesped'}`,
            time: r.checkIn,
            icon: '\uD83D\uDCC5',
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
            Ultimo acceso: {formatTimeAgo(lastLogin.timestamp)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
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

const AdminNav = memo(function AdminNav({ activeView, onNavigate, items = NAV_ITEMS }) {
  return (
    <nav className="bg-white/90 backdrop-blur-lg border-b border-gray-200/50 sticky top-[58px] z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
          {items.map(item => (
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

export default function AdminShell({ rol = 'admin', onSalir }) {
  const { rooms, loading, refresh } = useRooms();
  const location = useLocation();
  const navigate = useNavigate();
  const [inlineToast, setInlineToast] = useState(null);

  function getViewFromPath(pathname) {
    const path = pathname.split('?')[0];
    if (path.includes('/admin/dashboard')) return 'dashboard';
    if (path === '/admin' || path === '/admin/') return 'rooms';
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

  const activeView = getViewFromPath(location.pathname);
  const selectedRoomId = getRoomIdFromPath(location.pathname);
  const navItems = useMemo(() => getNavItems(rol), [rol]);

  useEffect(() => {
    const titles = {
      dashboard: 'Dashboard', rooms: 'Habitaciones', register: 'Registro',
      transactions: 'Transacciones', reservations: 'Reservaciones',
      accounting: 'Contabilidad', prices: 'Precios', users: 'Usuarios',
      history: 'Historial', security: 'Seguridad',
    };
    document.title = `${titles[activeView] || 'Admin'} | EcoBosque Hotel`;
  }, [activeView]);

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

  const navigateTo = useCallback((view) => {
    const paths = {
      dashboard: '/admin/dashboard', rooms: '/admin', register: '/admin/register',
      transactions: '/admin/transactions', reservations: '/admin/reservations',
      accounting: '/admin/accounting', prices: '/admin/prices', users: '/admin/users',
      history: '/admin/history', security: '/admin/security',
    };
    navigate(paths[view] || '/admin');
  }, [navigate]);

  const handleNavigate = useCallback((view) => { navigateTo(view); }, [navigateTo]);

  const handleSelectRoom = useCallback((roomId) => {
    const current = getRoomIdFromPath(window.location.pathname);
    navigate(current === roomId ? '/admin' : `/admin/room/${roomId}`);
  }, [navigate]);

  useRoomSync({
    interval: 15000,
    enabled: false,
    onChange: (changes) => {
      if (!changes?.length) return;
      refresh();
      changes.forEach((change) => {
        const labels = {
          status: `Habitacion #${change.room.numero}: ${ESTADO_CFG[change.from]?.label || change.from} \u2192 ${ESTADO_CFG[change.to]?.label || change.to}`,
          guest: `Habitacion #${change.room.numero}: huesped actualizado`,
          added: `Nueva habitacion #${change.room.numero} registrada`,
        };
        setInlineToast({ type: 'info', message: labels[change.type] || 'Habitacion actualizada' });
      });
    },
  });

  const renderBreadcrumbs = () => (
    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 px-1">
      {breadcrumbs.map((crumb, i) => (
        <span key={crumb.path + '-' + i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
          {i < breadcrumbs.length - 1 ? (
            <button
              onClick={() => navigate(crumb.path)}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/40">
      <AdminTopbar onSalir={onSalir} onNavigate={handleNavigate} rooms={rooms} onRoomSelect={handleSelectRoom} />
      <AdminNav activeView={activeView} onNavigate={handleNavigate} items={navItems} />
      {renderBreadcrumbs()}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet context={{ rooms, loading, refresh, rol, onSalir, handleNavigate, handleSelectRoom, selectedRoomId, inlineToast, setInlineToast }} />
      </div>
    </div>
  );
}
