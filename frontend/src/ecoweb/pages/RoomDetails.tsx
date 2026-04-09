import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { FaCheck } from 'react-icons/fa';
import { fetchRooms } from '../../services/api';
import { COP } from '../../utils/helpers';

const hotelRules = [
  { rules: 'Check-in: 3:00 PM - 9:00 PM' },
  { rules: 'Check-out: 10:30 AM' },
  { rules: 'No Smoking' },
  { rules: 'No Pet' },
];

const amenidadesLabels: Record<string, string> = {
  jacuzzi_privado: 'Jacuzzi Privado',
  wifi: 'WiFi',
  ac: 'Aire Acondicionado',
  balcon: 'Balcón',
  vista_bosque: 'Vista al Bosque',
  arquitectura_sostenible: 'Arquitectura Sostenible',
  orientacion_solar: 'Orientación Solar',
  vista_bosque_premium: 'Vista Premium',
  ducha_exterior: 'Ducha Exterior',
  jardin_privado: 'Jardín Privado',
  terra_privada: 'Terraza Privada',
  tv: 'TV Pantalla Plana',
  minibar: 'Minibar',
  caja_fuerte: 'Caja Fuerte',
};

export default function RoomDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms()
      .then((rooms) => {
        const found = rooms.find((r: any) => r.id === id || r.numero === id);
        setRoom(found);
      })
      .catch(() => setRoom(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <section>
        <div className="bg-room h-[300px] lg:h-[400px] relative flex justify-center items-center bg-cover bg-center">
          <div className="absolute w-full h-full bg-black/60" />
          <h1 className="text-4xl lg:text-6xl text-white z-20 font-primary text-center px-4">
            Cargando...
          </h1>
        </div>
      </section>
    );
  }

  if (!room) {
    return (
      <section>
        <div className="container mx-auto max-w-7xl py-24 text-center">
          <p className="text-2xl">Habitación no encontrada</p>
          <button 
            onClick={() => navigate('/')} 
            className="mt-4 text-accent hover:underline"
          >
            Volver a habitaciones
          </button>
        </div>
      </section>
    );
  }

  const { tipo, descripcion, capacidad, precio, tarifa, amenidades, numero, camas, estado } = room;
  const price = precio || tarifa || 0;

  return (
    <section>
      <div className="bg-room h-[300px] lg:h-[400px] relative flex justify-center items-center bg-cover bg-center">
        <div className="absolute w-full h-full bg-black/60" />
        <h1 className="text-4xl lg:text-6xl text-white z-20 font-primary text-center px-4">
          {tipo}
        </h1>
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-30 bg-white/20 hover:bg-white/40 text-white px-4 py-2 rounded backdrop-blur-sm"
        >
          ← Volver
        </button>
      </div>

      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex flex-col lg:flex-row lg:gap-x-8 py-8 lg:py-12">
          <div className="w-full text-justify">
            <h2 className="text-3xl lg:text-4xl font-primary mb-4">{tipo}</h2>
            <p className="mb-6 text-gray-700 leading-relaxed">{descripcion}</p>

            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3">Capacidad</h3>
              <p className="text-gray-600">{capacidad} personas</p>
            </div>

            {amenidades && amenidades.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Amenidades</h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {amenidades.map((amenidad: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <FaCheck className="text-accent text-sm" />
                      <span className="text-gray-700">
                        {amenidadesLabels[amenidad] || amenidad}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-full lg:max-w-xs mt-8 lg:mt-0">
            <div className="py-6 px-5 bg-amber-50 border border-amber-200 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Resumen</h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">{tipo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Número:</span>
                  <span className="font-medium">{numero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Camas:</span>
                  <span className="font-medium">{camas}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Capacidad:</span>
                  <span className="font-medium">{capacidad} personas</span>
                </div>
              </div>
              <div className="border-t border-amber-300 pt-3 mb-4">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Precio por noche:</span>
                  <span className="font-bold text-accent">{COP(price)}</span>
                </div>
              </div>
              {estado && (
                <div className="text-sm text-gray-500 mt-2">
                  Estado: <span className="capitalize font-medium">{estado}</span>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Normas del Hotel</h3>
              <ul className="flex flex-col gap-y-3">
                {hotelRules.map((rule, idx) => (
                  <li key={idx} className="flex items-center gap-x-3 text-gray-700">
                    <FaCheck className="text-accent text-sm" />
                    {rule.rules}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
