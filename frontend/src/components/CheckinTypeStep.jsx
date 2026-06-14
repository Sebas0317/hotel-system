import { ArrowLeft, CheckCircle, User } from 'lucide-react';
import PantallaForm from './PantallaForm';

export default function CheckinTypeStep({
  standalone,
  onNav,
  onSelectCheckin,
  onSelectNew,
}) {
  return (
    <PantallaForm
      standalone={standalone}
      titulo="Registrar Huesped"
      desc="Selecciona el tipo de registro"
      onVolver={() => onNav('menu')}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onSelectCheckin}
          className="p-6 rounded-xl border-2 border-blue-200 bg-white hover:bg-blue-50 hover:border-blue-400 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <ArrowLeft className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            Realizar Check-in
          </h3>
          <p className="text-sm text-gray-500">
            Huéspedes con reserva previa confirmada
          </p>
          <div className="mt-3 text-xs text-blue-600 font-medium">
            Ver habitaciones reservadas →
          </div>
        </button>

        <button
          onClick={onSelectNew}
          className="p-6 rounded-xl border-2 border-green-200 bg-white hover:bg-green-50 hover:border-green-400 hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-green-600" />
            </div>
            <ArrowLeft className="w-5 h-5 text-green-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            Registro Nuevo
          </h3>
          <p className="text-sm text-gray-500">Registro sin reserva previa</p>
          <div className="mt-3 text-xs text-green-600 font-medium">
            Ver habitaciones disponibles →
          </div>
        </button>
      </div>
    </PantallaForm>
  );
}
