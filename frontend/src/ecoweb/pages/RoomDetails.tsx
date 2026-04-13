import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { fetchRooms } from '../../services/api';
import { COP } from '../../utils/helpers';
import { ScrollToTop } from '../shared/ScrollToTop';
import { AdultsDropdown, CheckIn, CheckOut, KidsDropdown } from '../components';
import { hotelRules as originalHotelRules } from '../data';

// Amenity icons for ecoweb - consolidated with main app constants
const AMENIDADES = {
  jacuzzi_privado: { icono: '🛁', label: 'Jacuzzi Privado' },
  wifi: { icono: '📶', label: 'WiFi' },
  ac: { icono: '❄️', label: 'Aire Acondicionado' },
  balcon: { icono: '🌅', label: 'Balcón' },
  vista_bosque: { icono: '🌲', label: 'Vista al Bosque' },
  arquitectura_sostenible: { icono: '🌿', label: 'Arquitectura Sostenible' },
  orientacion_solar: { icono: '🌅', label: 'Orientación Solar' },
  vista_bosque_premium: { icono: '✨', label: 'Vista Premium' },
  ducha_exterior: { icono: '🚿', label: 'Ducha Exterior' },
  jardin_privado: { icono: '🌸', label: 'Jardín Privado' },
  terra_privada: { icono: '☀️', label: 'Terraza Privada' },
  tv: { icono: '📺', label: 'TV Pantalla Plana' },
  minibar: { icono: '🍷', label: 'Minibar' },
  caja_fuerte: { icono: '🔐', label: 'Caja Fuerte' },
  cocina: { icono: '🍳', label: 'Cocina Equipada' },
  chimenea: { icono: '🔥', label: 'Chimenea' },
  terraza: { icono: '🌿', label: 'Terraza' },
  room_service: { icono: '🛎️', label: 'Room Service' },
  mascota: { icono: '🐕', label: 'Mascotas Bienvenidas' },
  parking: { icono: '🅿️', label: 'Estacionamiento' },
  piscina: { icono: '🏊', label: 'Piscina' },
  spa: { icono: '💆', label: 'Spa' },
  Restaurante: { icono: '🍽️', label: 'Restaurante' },
  bar: { icono: '🍸', label: 'Bar' },
  lavanderia: { icono: '👕', label: 'Lavandería' },
  gym: { icono: '🏋️', label: 'Gimnasio' },
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
                  {amenidades.map((a, index) => {
                    const amenidad = AMENIDADES[a];
                    return (
                      <div 
                        key={index} 
                        className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/20"
                      >
                        <span className="text-2xl">{amenidad?.icono || '✓'}</span>
                        <span className="text-sm text-white/90">
                          {amenidad?.label || a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    );
                  })}
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