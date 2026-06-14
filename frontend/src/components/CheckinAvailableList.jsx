import { AlertTriangle, Bed, Users } from 'lucide-react';
import PantallaForm from './PantallaForm';

export default function CheckinAvailableList({
  standalone,
  disponibles,
  roomsLoading,
  onSelectRoom,
  onBack,
}) {
  return (
    <PantallaForm
      standalone={standalone}
      titulo="Registro Nuevo"
      desc="Selecciona una habitacion disponible"
      onVolver={onBack}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
        {roomsLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Cargando...</p>
          </div>
        ) : disponibles.length === 0 ? (
          <div className="col-span-full text-sm p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
            <AlertTriangle className="w-5 h-5 inline mr-1" /> No hay
            habitaciones disponibles
          </div>
        ) : (
          disponibles.map((r) => (
            <div
              key={r.id}
              className="p-6 rounded-xl border border-gray-200 bg-white hover:bg-green-50 hover:border-green-400 hover:shadow-md cursor-pointer transition-all group"
              onClick={() => onSelectRoom(r)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  #{r.numero}
                </span>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                  Disponible
                </span>
              </div>
              <p className="font-semibold text-gray-800 text-sm">{r.tipo}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Bed className="w-3 h-3" /> {r.camas}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {r.capacidad} pers
                </span>
              </div>
              <p className="text-lg font-bold text-green-600 mt-2">
                {r.tarifa?.toLocaleString('es-CO')}{' '}
                <span className="text-xs font-normal text-gray-500">
                  COP/noche
                </span>
              </p>
              <div className="mt-2 text-xs text-green-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Click para seleccionar →
              </div>
            </div>
          ))
        )}
      </div>
    </PantallaForm>
  );
}
