import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  CheckCircle,
  Key,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useMemo } from 'react';
import { FECHA } from '../utils/helpers';

const TYPE_CONFIG = {
  login: {
    label: 'Inicio sesion',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    icon: CheckCircle,
  },
  failed_login: {
    label: 'Intento fallido',
    color: 'text-red-600',
    bg: 'bg-red-50',
    icon: XCircle,
  },
  account_locked: {
    label: 'Cuenta bloqueada',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    icon: AlertTriangle,
  },
  rate_limit: {
    label: 'Límite excedido',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    icon: AlertTriangle,
  },
  checkin: {
    label: 'Check-in',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    icon: UserCheck,
  },
  checkout: {
    label: 'Check-out',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    icon: UserCheck,
  },
  register: {
    label: 'Registro',
    color: 'text-green-600',
    bg: 'bg-green-50',
    icon: UserCheck,
  },
};

export default function SecurityDashboard({
  events = [],
  users = [],
  rooms = [],
}) {
  const stats = useMemo(() => {
    const loginOK = events.filter((e) => e.type === 'login').length;
    const loginFailed = events.filter((e) => e.type === 'failed_login').length;
    const locked = events.filter((e) => e.type === 'account_locked').length;
    const rateLimited = events.filter((e) => e.type === 'rate_limit').length;
    const users2FA = users.filter((u) => u.twoFactorEnabled).length;
    const reservasActivas = rooms.filter(
      (r) => r.estado === 'reservada' || r.estado === 'ocupada'
    ).length;
    const checkins = events.filter((e) => e.type === 'checkin').length;
    const checkouts = events.filter((e) => e.type === 'checkout').length;
    return {
      loginOK,
      loginFailed,
      locked,
      rateLimited,
      users2FA,
      reservasActivas,
      checkins,
      checkouts,
    };
  }, [events, users, rooms]);

  const STAT_CARDS = [
    {
      label: 'Inicios de sesion exitosos',
      value: stats.loginOK,
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/80',
      ring: 'ring-emerald-200/50',
    },
    {
      label: 'Intentos fallidos',
      value: stats.loginFailed,
      icon: ShieldAlert,
      color: 'text-red-600',
      bg: 'bg-red-50/80',
      ring: 'ring-red-200/50',
    },
    {
      label: 'Cuentas bloqueadas',
      value: stats.locked,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50/80',
      ring: 'ring-orange-200/50',
    },
    {
      label: 'Usuarios con 2FA',
      value: stats.users2FA,
      icon: Key,
      color: 'text-violet-600',
      bg: 'bg-violet-50/80',
      ring: 'ring-violet-200/50',
    },
    {
      label: 'Reservas activas',
      value: stats.reservasActivas,
      icon: CalendarCheck,
      color: 'text-blue-600',
      bg: 'bg-blue-50/80',
      ring: 'ring-blue-200/50',
    },
    {
      label: 'Check-ins / Check-outs',
      value: `${stats.checkins} / ${stats.checkouts}`,
      icon: Activity,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50/80',
      ring: 'ring-cyan-200/50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className={`${card.bg} backdrop-blur-sm rounded-xl p-4 ring-1 ${card.ring} hover:shadow-md transition-all duration-300`}
          >
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <span className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">
            Eventos de auditoria recientes
          </h3>
          <span className="ml-auto text-xs text-gray-400">
            {events.length} eventos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detalle
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-gray-400"
                  >
                    Sin eventos registrados
                  </td>
                </tr>
              ) : (
                events.slice(0, 50).map((ev) => {
                  const cfg = TYPE_CONFIG[ev.type] || {
                    label: ev.type,
                    color: 'text-gray-600',
                    bg: 'bg-gray-50',
                    icon: Shield,
                  };
                  const Icon = cfg.icon;
                  return (
                    <tr
                      key={ev.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700 max-w-xs truncate">
                        {ev.detail || ev.action || '-'}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {ev.userId ? `${ev.userId.slice(0, 12)}...` : '-'}
                      </td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                        {ev.ip || '-'}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-400 text-xs whitespace-nowrap">
                        {FECHA(ev.timestamp)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
