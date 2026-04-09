import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { FaCheck } from 'react-icons/fa';
import { fetchRooms } from '../../services/api';
import { COP } from '../../utils/helpers';
import { ScrollToTop } from '../shared/ScrollToTop';
import { AdultsDropdown, CheckIn, CheckOut, KidsDropdown } from '../components';
import { hotelRules as originalHotelRules } from '../data';

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
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms()
      .then((rooms) => {
        const index = parseInt(id) - 1;
        const found = rooms.find((r, i) => 
          i === index ||
          r.id === id || 
          r.numero === id ||
          r.tipo.toLowerCase().replace(/ /g, '-') === id.toLowerCase()
        );
        setRoom(found);
      })
      .catch(() => setRoom(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <section>
        <ScrollToTop />
        <div className="bg-room h-[560px] relative flex justify-center items-center bg-cover bg-center">
          <div className="absolute w-full h-full bg-black/70" />
          <h1 className="text-6xl text-white z-20 font-primary text-center">
            Cargando...
          </h1>
        </div>
      </section>
    );
  }

  if (!room) {
    return (
      <section>
        <ScrollToTop />
        <div className="container mx-auto max-w-7xl py-24 text-center">
          <p className="text-2xl">Habitación no encontrada</p>
          <button 
            onClick={() => navigate('/landing')} 
            className="mt-4 text-accent hover:underline"
          >
            Volver a habitaciones
          </button>
        </div>
      </section>
    );
  }

  const { tipo, descripcion, capacidad, precio, tarifa, amenidades, numero, camas } = room;
  const price = precio || tarifa || 0;

  return (
    <section>
      <ScrollToTop />
      <div className="bg-room h-[560px] relative flex justify-center items-center bg-cover bg-center">
        <div className="absolute w-full h-full bg-black/70" />
        <h1 className="text-6xl text-white z-20 font-primary text-center">
          {tipo} Details
        </h1>
      </div>

      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row lg:gap-x-8 h-full py-24">
          <div className="w-full h-full text-justify">
            <h2 className="h2">{tipo}</h2>
            <p className="mb-8">{descripcion}</p>
            
            <div className="mt-12">
              <h3 className="h3 mb-3"></h3>
              <p className="mb-12">
                Disfruta de una experiencia única en nuestra {tipo}. 
                Con todas las comodidades que necesitas para una estadía inolvidable.
              </p>
              
              {amenidades && amenidades.length > 0 && (
                <div className="grid grid-cols-3 gap-6 mb-12">
                  {amenidades.map((amenidad, index) => (
                    <div key={index} className="flex items-center gap-x-3 flex-1">
                      <div className="text-3xl text-accent">
                        <FaCheck />
                      </div>
                      <div className="text-base">
                        {amenidadesLabels[amenidad] || amenidad}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:max-w-xs h-full">
            <div className="py-8 px-6 bg-accent/20 mb-12 w-full">
              <div className="flex flex-col space-y-4 mb-4 w-full">
                <h3>Your Reservation</h3>
                <div className="h-[60px] w-full">
                  <CheckIn popperPlacement="bottom-end" popperFullWidth />
                </div>
                <div className="h-[60px] w-full">
                  <CheckOut popperPlacement="bottom-end" popperFullWidth />
                </div>
                <div className="h-[60px] w-full">
                  <AdultsDropdown />
                </div>
                <div className="h-[60px] w-full">
                  <KidsDropdown />
                </div>
              </div>
              <button type="button" className="btn btn-lg btn-primary w-full">
                book now for {COP(price)}
              </button>
            </div>

            <div>
              <h3 className="h3">Hotel Rules</h3>
              <p className="mb-6 text-justify">
                Por favor respeta las normas del hotel durante tu estadía para garantizar una experiencia agradable para todos.
              </p>
              <ul className="flex flex-col gap-y-4">
                {originalHotelRules.map(({ rules }, idx) => (
                  <li key={idx} className="flex items-center gap-x-4">
                    <FaCheck className="text-accent" />
                    {rules}
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

  if (!room) {
    return (
      <section>
        <div className="container mx-auto max-w-7xl py-24 text-center">
          <p className="text-2xl">Habitación no encontrada</p>
          <button 
            onClick={() => navigate('/landing')} 
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
      <ScrollToTop />
      <div className="bg-room h-[560px] relative flex justify-center items-center bg-cover bg-center">
        <div className="absolute w-full h-full bg-black/70" />
        <h1 className="text-6xl text-white z-20 font-primary text-center">
          {tipo} Details
        </h1>
        <button
          onClick={() => navigate('/landing')}
          className="absolute top-4 left-4 z-30 bg-white/20 hover:bg-white/40 text-white px-4 py-2 rounded backdrop-blur-sm"
        >
          ← Volver
        </button>
      </div>

      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row lg:gap-x-8 h-full py-24">
          <div className="w-full h-full text-justify">
            <h2 className="h2">{tipo}</h2>
            <p className="mb-8">{descripcion}</p>
            
            {amenidades && amenidades.length > 0 && (
              <div className="mt-12">
                <h3 className="h3 mb-3">Amenidades</h3>
                <div className="grid grid-cols-3 gap-6 mb-12">
                  {amenidades.map((amenidad, index) => (
                    <div key={index} className="flex items-center gap-x-3 flex-1">
                      <div className="text-3xl text-accent">
                        <FaCheck />
                      </div>
                      <div className="text-base">
                        {amenidadesLabels[amenidad] || amenidad}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-full lg:max-w-xs h-full">
            <div className="py-8 px-6 bg-accent/20 mb-12 w-full">
              <h3 className="text-lg font-semibold mb-4">Tu Reserva</h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Habitación:</span>
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
                {estado && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <span className="capitalize font-medium">{estado}</span>
                  </div>
                )}
              </div>
              <button type="button" className="btn btn-lg btn-primary w-full">
                book now for {COP(price)}
              </button>
            </div>

            <div>
              <h3 className="h3">Normas del Hotel</h3>
              <p className="mb-6 text-justify">
                Por favor respeta las normas del hotel durante tu estadía.
              </p>
              <ul className="flex flex-col gap-y-4">
                {hotelRules.map((rule, idx) => (
                  <li key={idx} className="flex items-center gap-x-4">
                    <FaCheck className="text-accent" />
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
