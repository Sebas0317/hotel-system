import {
  Bed,
  Building2,
  Calendar,
  Check,
  Clock,
  Grid3X3,
  Home,
  LayoutDashboard,
  List,
  Search,
  X,
} from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ESTADO_CFG, TIPOS_HABITACION } from '../constants';
import { agruparPorPiso, FECHA, filtrarRooms } from '../utils/helpers';
import { Toast } from './RoomActions';
import RoomDetail from './RoomDetail';

const StatPills = memo(function StatPills({ stats, filtro, onFilter }) {
  const pills = [
    {
      key: 'todos',
      label: `Todas (${stats.total})`,
      icon: LayoutDashboard,
      cfg: null,
    },
    {
      key: 'disponible',
      label: `Disponibles (${stats.disponible})`,
      icon: Check,
      cfg: ESTADO_CFG.disponible,
    },
    {
      key: 'ocupada',
      label: `Ocupadas (${stats.ocupada})`,
      icon: Bed,
      cfg: ESTADO_CFG.ocupada,
    },
    {
      key: 'reservada',
      label: `Reservadas (${stats.reservada})`,
      icon: Calendar,
      cfg: ESTADO_CFG.reservada,
    },
    {
      key: 'limpieza',
      label: `Limpieza (${stats.limpieza})`,
      icon: Clock,
      cfg: ESTADO_CFG.limpieza,
    },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      {pills.map((p) => (
        <button
          key={p.key}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap min-w-0"
          style={
            p.cfg
              ? filtro === p.key
                ? {
                    background: p.cfg.bg,
                    borderColor: p.cfg.border,
                    color: p.cfg.color,
                  }
                : {
                    background: 'transparent',
                    borderColor: p.cfg.border,
                    color: p.cfg.color,
                  }
              : filtro === p.key
                ? {
                    background: '#2D5A3D',
                    borderColor: '#2D5A3D',
                    color: 'white',
                  }
                : {
                    background: 'transparent',
                    borderColor: '#d1d5db',
                    color: '#374151',
                  }
          }
          onClick={() => onFilter(p.key)}
        >
          {p.icon && <p.icon className="text-base" />}
          <span className="truncate">{p.label}</span>
        </button>
      ))}
    </div>
  );
});

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

const RoomListItem = memo(function RoomListItem({
  room,
  isSelected,
  onSelect,
}) {
  const cfg = ESTADO_CFG[room.estado] || ESTADO_CFG.disponible;
  const noches = room.noches || null;

  return (
    <tr
      className={`cursor-pointer transition-all duration-200 border-l-4 ${
        isSelected
          ? 'bg-emerald-50/80 border-l-emerald-500 shadow-sm'
          : 'border-l-transparent hover:bg-gray-50/80 hover:shadow-sm'
      }`}
      onClick={() => onSelect(room.id)}
    >
      <td className="px-4 py-3 font-medium">{room.numero}</td>
      <td className="px-4 py-3 hidden sm:table-cell">{room.tipo}</td>
      <td className="px-4 py-3 hidden md:table-cell">{room.huesped || '—'}</td>
      <td className="px-4 py-3">
        <span
          className="status-badge px-2 py-0.5 rounded-full text-xs"
          style={{
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {cfg.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {noches ? `${noches} noche${noches > 1 ? 's' : ''}` : '—'}
      </td>
    </tr>
  );
});

const RoomCard = memo(function RoomCard({ room, isSelected, onSelect }) {
  const cfg = ESTADO_CFG[room.estado] || ESTADO_CFG.disponible;

  return (
    <button
      className={`w-full text-left cursor-pointer rounded-xl border-2 p-4 transition-all duration-300 bg-white/90 backdrop-blur-sm ${
        isSelected
          ? 'ring-2 ring-emerald-500 ring-offset-2 shadow-xl shadow-emerald-200/30'
          : 'hover:shadow-xl hover:border-emerald-300/30 hover:-translate-y-0.5 hover:bg-white'
      }`}
      style={{ borderColor: cfg.border }}
      onClick={() => onSelect(room.id)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl font-bold text-gray-900">{room.numero}</span>
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{
            color: cfg.color,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {cfg.label}
        </span>
      </div>

      <div className="space-y-1.5 text-sm">
        <p className="text-gray-700 font-medium truncate">{room.tipo}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{room.camas} camas</span>
          <span className="text-gray-300">|</span>
          <span>{room.capacidad} personas</span>
          <span className="text-gray-300">|</span>
          <span>Piso {room.piso}</span>
        </div>

        {room.huesped && (
          <div className="pt-2 mt-2 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 truncate">
              {room.huesped}
            </p>
            {room.checkIn && (
              <p className="text-xs text-gray-500">
                Check-in: {FECHA(room.checkIn)}
              </p>
            )}
          </div>
        )}

        {(room.estado === 'ocupada' || room.estado === 'reservada') &&
          room.pin && (
            <div className="pt-2 mt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                PIN:{' '}
                <span className="font-mono font-bold text-gray-900 tracking-wider">
                  {room.pin}
                </span>
              </p>
            </div>
          )}
      </div>
    </button>
  );
});

export default function RoomsView() {
  const {
    rooms,
    refresh,
    handleSelectRoom,
    selectedRoomId,
    inlineToast,
    setInlineToast,
  } = useOutletContext();

  const [filtro, setFiltro] = useState('todos');
  const [buscar, setBuscar] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [viewMode, setViewMode] = useState('grid');
  const [listFilter, setListFilter] = useState({
    numero: '',
    huesped: '',
    tipo: '',
    estado: 'todos',
  });

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleFilter = useCallback((newFiltro) => {
    setFiltro(newFiltro);
  }, []);
  const handleViewMode = useCallback((newMode) => {
    setViewMode(newMode);
  }, []);
  const handleClearFilters = useCallback(() => {
    setFiltro('todos');
    setBuscar('');
    setTipo('todos');
  }, []);

  const stats = useMemo(() => {
    const s = {
      total: 0,
      ocupada: 0,
      reservada: 0,
      disponible: 0,
      limpieza: 0,
    };
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

  const reservadasUOcupadas = useMemo(
    () =>
      filtradas.filter(
        (r) => r.estado === 'ocupada' || r.estado === 'reservada'
      ),
    [filtradas]
  );

  const filteredListView = useMemo(() => {
    return reservadasUOcupadas.filter((r) => {
      if (listFilter.numero && !r.numero.includes(listFilter.numero))
        return false;
      if (
        listFilter.huesped &&
        !r.huesped?.toLowerCase().includes(listFilter.huesped.toLowerCase())
      )
        return false;
      if (listFilter.tipo && r.tipo !== listFilter.tipo) return false;
      if (listFilter.estado !== 'todos' && r.estado !== listFilter.estado)
        return false;
      return true;
    });
  }, [reservadasUOcupadas, listFilter]);

  const roomListView = useMemo(
    () => (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-2">
          <input
            className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
            placeholder="Numero..."
            value={listFilter.numero}
            onChange={(e) =>
              setListFilter((f) => ({ ...f, numero: e.target.value }))
            }
          />
          <input
            className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
            placeholder="Huesped..."
            value={listFilter.huesped}
            onChange={(e) =>
              setListFilter((f) => ({ ...f, huesped: e.target.value }))
            }
          />
          <select
            className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
            value={listFilter.tipo}
            onChange={(e) =>
              setListFilter((f) => ({ ...f, tipo: e.target.value }))
            }
          >
            <option value="">Todos los tipos</option>
            {TIPOS_HABITACION.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
            value={listFilter.estado}
            onChange={(e) =>
              setListFilter((f) => ({ ...f, estado: e.target.value }))
            }
          >
            <option value="todos">Todos los estados</option>
            <option value="ocupada">Ocupada</option>
            <option value="reservada">Reservada</option>
          </select>
          {(listFilter.numero ||
            listFilter.huesped ||
            listFilter.tipo ||
            listFilter.estado !== 'todos') && (
            <button
              onClick={() =>
                setListFilter({
                  numero: '',
                  huesped: '',
                  tipo: '',
                  estado: 'todos',
                })
              }
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              ✕ Limpiar
            </button>
          )}
          <span className="text-xs text-gray-500 ml-auto self-center">
            {filteredListView.length} resultados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr className="text-left text-gray-500 border-b border-gray-200/60">
                <th className="px-4 py-2 font-semibold">#</th>
                <th className="px-4 py-2 font-semibold hidden sm:table-cell">
                  Tipo
                </th>
                <th className="px-4 py-2 font-semibold hidden md:table-cell">
                  Huesped
                </th>
                <th className="px-4 py-2 font-semibold">Estado</th>
                <th className="px-4 py-2 font-semibold text-right">Noches</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredListView.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    Sin habitaciones ocupadas o reservadas
                  </td>
                </tr>
              ) : (
                filteredListView.map((room) => (
                  <RoomListItem
                    key={room.id}
                    room={room}
                    isSelected={selectedRoomId === room.id}
                    onSelect={handleSelectRoom}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    ),
    [filteredListView, listFilter, selectedRoomId, handleSelectRoom]
  );

  const roomGrid = useMemo(
    () => (
      <div>
        {Object.entries(grupos).map(([piso, roomsInPiso]) => (
          <div key={piso} className="mb-8">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-gradient-to-r from-gray-300/60 to-transparent inline-block"></span>
              {piso === '0' ? (
                <>
                  <Home className="w-4 h-4 inline mr-1" /> Cabanas
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 inline mr-1" /> Piso {piso}
                </>
              )}
              <span className="w-8 h-0.5 bg-gradient-to-r from-gray-300/60 to-transparent inline-block"></span>
              <span className="text-xs text-gray-400 font-normal">
                ({roomsInPiso.length})
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {roomsInPiso.map((r) => (
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
    ),
    [grupos, selectedRoomId, handleSelectRoom]
  );

  return (
    <div className="relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-300/15 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <span className="flex items-center">
            <Home className="w-4 h-4 inline mr-1" /> Admin
          </span>
          <span>›</span>
          <span className="text-gray-900 font-medium">Habitaciones</span>
          {filtro !== 'todos' && (
            <>
              <span>›</span>
              <span className="text-green-600 font-medium">
                {ESTADO_CFG[filtro]?.label || filtro}
              </span>
            </>
          )}
          {selectedRoomId && (
            <>
              <span>›</span>
              <span className="text-green-600 font-medium">
                Habitacion seleccionada
              </span>
            </>
          )}
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-6">
          <div className="px-4 py-3 flex flex-wrap items-center gap-4">
            {viewMode === 'grid' && (
              <div className="flex flex-wrap items-center gap-2">
                <StatPills
                  stats={stats}
                  filtro={filtro}
                  onFilter={handleFilter}
                />
              </div>
            )}

            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200/60 rounded-xl text-sm bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300"
                type="text"
                placeholder="Buscar..."
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
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

            <select
              className="px-3 py-2.5 border border-gray-200/60 rounded-xl text-sm bg-gray-50/50 hover:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-300"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="todos">Todos los tipos</option>
              {TIPOS_HABITACION.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <ViewModeToggle viewMode={viewMode} onChange={handleViewMode} />
          </div>

          {(filtro !== 'todos' || tipo !== 'todos' || buscar) && (
            <div className="px-4 py-2.5 border-t border-gray-200/60 bg-gray-50/40 flex items-center gap-2 flex-wrap backdrop-blur-sm">
              <span className="text-sm text-gray-500">Filtros:</span>
              {filtro !== 'todos' && (
                <button
                  onClick={() => setFiltro('todos')}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100/80 text-emerald-700 rounded-full text-sm border-none cursor-pointer hover:bg-emerald-200/80 font-medium transition-all"
                >
                  {ESTADO_CFG[filtro]?.label}{' '}
                  <span className="text-green-900">✕</span>
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

        {inlineToast && (
          <Toast
            message={inlineToast.message}
            type={inlineToast.type}
            onDismiss={() => setInlineToast(null)}
          />
        )}

        <div
          className={`flex gap-6 transition-all duration-300 ${selectedRoomId ? 'lg:grid lg:grid-cols-1 lg:xl:grid-cols-[1fr_400px]' : ''}`}
        >
          <div className={selectedRoomId ? 'min-w-0' : 'w-full'}>
            {viewMode === 'list' ? roomListView : roomGrid}
          </div>

          {selectedRoomId && selectedRoom && (
            <div className="hidden xl:block">
              <div className="sticky top-[130px] bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/60 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900">
                    Habitacion #{selectedRoom.numero}
                  </h3>
                  <button
                    onClick={() => handleSelectRoom(selectedRoomId)}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    aria-label="Cerrar detalle"
                  >
                    <svg
                      className="w-5 h-5 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                  <RoomDetail room={selectedRoom} onRefresh={handleRefresh} />
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedRoomId && selectedRoom && (
          <div
            className="xl:hidden fixed inset-0 z-[200] bg-black/50"
            onClick={() => handleSelectRoom(selectedRoomId)}
          >
            <div
              className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white z-10">
                <h3 className="font-semibold text-gray-900">
                  Habitacion #{selectedRoom.numero}
                </h3>
                <button
                  onClick={() => handleSelectRoom(selectedRoomId)}
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-label="Cerrar detalle"
                >
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <RoomDetail room={selectedRoom} onRefresh={handleRefresh} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
