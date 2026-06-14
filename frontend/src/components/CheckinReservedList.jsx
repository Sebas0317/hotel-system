import { AlertTriangle, Bed, User, Users } from 'lucide-react';
import PantallaForm from './PantallaForm';

export default function CheckinReservedList({
  standalone,
  reservadas,
  roomsLoading,
  onSelectRoom,
  onBack,
}) {
  return (
    <PantallaForm
      standalone={standalone}
      titulo="Check-in con Reserva"
      desc="Selecciona la habitación reservada"
      onVolver={onBack}
    >
      <div className="mb-5 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
        <p className="text-sm font-semibold text-gray-700 mb-4">
          Habitaciones Reservadas
        </p>
        {roomsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Cargando...</p>
          </div>
        ) : reservadas.length === 0 ? (
          <div className="text-sm p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-center">
            <AlertTriangle className="w-5 h-5 inline mr-1" /> No hay
            habitaciones reservadas
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto">
            {reservadas.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group"
                onClick={() => onSelectRoom(r)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    #{r.numero}
                  </span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
                    Reservada
                  </span>
                </div>
                <p className="font-semibold text-gray-800 text-sm">{r.tipo}</p>
                {r.huesped && (
                  <p className="text-xs text-gray-500 mt-1">
                    <User className="w-3 h-3 inline mr-1" /> {r.huesped}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Bed className="w-3 h-3" /> {r.camas}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {r.capacidad} pers
                  </span>
                </div>
                <div className="mt-2 text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Check-in huésped →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PantallaForm>
  );
}
