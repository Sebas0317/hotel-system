import { useQuery } from '@tanstack/react-query';
import { CheckCircle, ClipboardList, XCircle } from 'lucide-react';
import { useState } from 'react';
import { fetchLoginLogs } from '../services/api';

export default function HistoryView() {
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState('todos');

  const {
    data: loginLogsData = [],
    isLoading: loginLogsLoading,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ['login-logs'],
    queryFn: () => fetchLoginLogs(500),
    staleTime: 1000 * 30,
  });

  const filteredLogs = loginLogsData.filter((l) => {
    if (logFilter === 'success' && !l.success) return false;
    if (logFilter === 'failed' && l.success) return false;
    if (logSearch) {
      const q = logSearch.toLowerCase();
      const matches =
        l.identifier?.toLowerCase().includes(q) ||
        l.ip?.toLowerCase().includes(q) ||
        l.userId?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">
            <ClipboardList className="w-5 h-5 inline mr-2" /> Historial de
            Accesos
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Registro completo de inicios de sesion en el sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {filteredLogs.length} registros
          </span>
          <button
            onClick={() => refetchLogs()}
            className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4 flex flex-wrap gap-2">
        <input
          className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200 min-w-[200px]"
          placeholder="Buscar por email, IP o ID..."
          value={logSearch}
          onChange={(e) => setLogSearch(e.target.value)}
        />
        <select
          className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
          value={logFilter}
          onChange={(e) => setLogFilter(e.target.value)}
        >
          <option value="todos">Todos</option>
          <option value="success">Exitosos</option>
          <option value="failed">Fallidos</option>
        </select>
        {(logSearch || logFilter !== 'todos') && (
          <button
            onClick={() => {
              setLogSearch('');
              setLogFilter('todos');
            }}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {loginLogsLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    #
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Fecha / Hora
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Email / Usuario
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Direccion IP
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Detalle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="h-4 w-8 animate-pulse bg-gray-200 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-40 animate-pulse bg-gray-200 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-48 animate-pulse bg-gray-200 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-32 animate-pulse bg-gray-200 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse bg-gray-200 rounded mx-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-36 animate-pulse bg-gray-200 rounded" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                    #
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                    Fecha / Hora
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                    Email / Usuario
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                    Direccion IP
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
                    Detalle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log, i) => (
                  <tr
                    key={log.id || i}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {filteredLogs.length - i}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleString('es-CO')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm text-gray-900">
                          {log.identifier || '—'}
                        </span>
                        {log.userId && (
                          <p className="text-xs text-gray-400 font-mono">
                            ID: {log.userId.slice(0, 12)}...
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {log.ip || '—'}
                    </td>
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
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                      {log.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
