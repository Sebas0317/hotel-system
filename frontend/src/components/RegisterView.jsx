import { Building2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import HotelTitle from './HotelTitle';
import PantallaCheckin from './PantallaCheckin';

export default function RegisterView() {
  const { handleNavigate } = useOutletContext();

  return (
    <>
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 overflow-hidden hover:shadow-lg transition-shadow duration-300 mb-6">
        <div className="px-5 py-4 border-b border-gray-100/60 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Nueva Reserva / Check-in
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Registrar huesped y asignar habitacion
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-green-600" />
            <HotelTitle variant="inline" />
          </div>
        </div>
      </div>
      <PantallaCheckin
        standalone={false}
        onNav={(action) => {
          if (action === 'menu' || action === 'volver') {
            handleNavigate('rooms');
          }
        }}
      />
    </>
  );
}
