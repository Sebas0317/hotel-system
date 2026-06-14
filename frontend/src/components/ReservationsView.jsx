import { useQuery } from '@tanstack/react-query';
import { Calendar } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { queryKeys } from '../hooks/useQueryKeys';
import { fetchHistory, fetchRooms, fetchStateHistory } from '../services/api';
import { COP, FECHA } from '../utils/helpers';

export default function ReservationsView() {
  const { rooms, handleSelectRoom } = useOutletContext();
  const [resFilter, setResFilter] = useState({ numero: '', huesped: '' });

  const { data: historyData } = useQuery({
    queryKey: queryKeys.history,
    queryFn: () =>
      Promise.all([fetchStateHistory(), fetchRooms(), fetchHistory()]),
    staleTime: 1000 * 60 * 10,
  });

  const reservationHistory =
    historyData?.[2]?.reservas || historyData?.[2] || [];

  const reservadasUOcupadas = useMemo(
    () =>
      rooms.filter((r) => r.estado === 'ocupada' || r.estado === 'reservada'),
    [rooms]
  );

  const allReservations =
    reservationHistory.length > 0
      ? reservationHistory
      : reservadasUOcupadas.map((r) => ({
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

  const filteredReservations = allReservations.filter((r) => {
    if (resFilter.numero && !String(r.numero).includes(resFilter.numero))
      return false;
    if (
      resFilter.huesped &&
      !r.huesped?.toLowerCase().includes(resFilter.huesped.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">
          <Calendar className="w-5 h-5 inline mr-2" /> Reservaciones
        </h2>
        <span className="text-sm text-gray-500">
          {filteredReservations.length} de {allReservations.length} registros
        </span>
      </div>
      {allReservations.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-4xl mb-2">📭</div>
          <p>No hay reservaciones registradas</p>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="px-4 py-3 bg-gray-50/60 border-b border-gray-200/60 flex flex-wrap gap-2">
            <input
              className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
              placeholder="Habitacion..."
              value={resFilter.numero}
              onChange={(e) =>
                setResFilter((f) => ({ ...f, numero: e.target.value }))
              }
            />
            <input
              className="px-3 py-1.5 border border-gray-300/60 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-200"
              placeholder="Huesped..."
              value={resFilter.huesped}
              onChange={(e) =>
                setResFilter((f) => ({ ...f, huesped: e.target.value }))
              }
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
                  <th className="px-4 py-3 font-semibold">Huesped</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">
                    Documento
                  </th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">
                    Check-in
                  </th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">
                    Check-out
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">Tarifa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReservations.map((res, i) => (
                  <tr
                    key={res.id || i}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      if (res.roomId) handleSelectRoom(res.roomId);
                    }}
                  >
                    <td className="px-4 py-3 font-bold">{res.numero || '—'}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {res.huesped || '—'}
                        </p>
                        {res.email && (
                          <p className="text-xs text-gray-500">{res.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {res.documento || '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {res.checkIn ? FECHA(res.checkIn) : '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {res.checkOut ? FECHA(res.checkOut) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {res.tarifa ? COP(res.tarifa) : '—'}
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
