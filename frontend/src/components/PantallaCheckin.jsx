import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkIn, fetchRooms } from '../services/api';
import { TIPOS_HABITACION, AMENIDADES } from '../constants';
import PantallaForm from './PantallaForm';
import RoomCalendar from './RoomCalendar';
import { ConfirmModal } from './ConfirmModal.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui';
import {
  Leaf, AlertTriangle, Bed, Users, Dog, User, X, CheckCircle,
  KeyRound, Bell, ArrowLeft, Calendar, DollarSign
} from 'lucide-react';

/**
 * Check-in screen — Register a new guest and assign room.
 * Flow: Select room → Guest info → Additional guests → Confirm
 */
export default function PantallaCheckin({ onNav, standalone = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [step, setStep] = useState(1); // 1: Type, 1.5: Reserved, 2: Available, 3: Guest info, 4: Confirm

  // Sync step with URL on mount
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/checkin')) setStep(1.5);
    else if (path.includes('/new')) setStep(2);
    else setStep(1);
  }, [location.pathname]);

  // Navigation helper
  const goToStep = useCallback((newStep, path) => {
    setStep(newStep);
    if (path) navigate(path, { replace: true });
  }, [navigate]);
  const [form, setForm] = useState({ 
    numero: '', 
    huesped: '', 
    tipo: 'estándar', 
    numeroHabitacion: '',
    email: '',
    telefono: '',
    documento: '',
    noches: 1,
    checkIn: '',
    checkOut: '',
    adultos: 1,
    ninos: 0,
    tieneMascota: false,
    nombreMascota: '',
    observaciones: '',
usarMismoContacto: true,
    personasAdicionales: []
  });
   
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRooms()
      .then((data) => { if (!cancelled) setRooms(data); })
      .finally(() => { if (!cancelled) setRoomsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const disponibles = useMemo(
    () => rooms.filter((r) => r.estado === 'disponible'),
    [rooms]
  );

  const reservadas = useMemo(
    () => rooms.filter((r) => r.estado === 'reservada'),
    [rooms]
  );

  const habitacionSeleccionada = useMemo(() => {
    return rooms.find(r => r.id === form.numero);
  }, [rooms, form.numero]);

  // Calculate check-out date based on nights
  useEffect(() => {
    if (form.checkIn && form.noches > 0) {
      const checkInDate = new Date(form.checkIn);
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + form.noches);
      setForm(prev => ({ ...prev, checkOut: checkOutDate.toISOString().split('T')[0] }));
    }
  }, [form.checkIn, form.noches]);

  const TARIFA_NINO = 80000; // Tarifa por noche para niño
  const TARIFA_MASCOTA = 50000;

  const precioAdultos = habitacionSeleccionada ? habitacionSeleccionada.tarifa * form.noches * form.adultos : 0;
  const precioNinos = form.ninos > 0 ? TARIFA_NINO * form.noches * form.ninos : 0;
  const precioMascota = form.tieneMascota ? TARIFA_MASCOTA * form.noches : 0;
  const precioTotal = precioAdultos + precioNinos + precioMascota;
  const totalPersonas = form.adultos + form.ninos;

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCalendarSelect = useCallback(({ checkIn, checkOut }) => {
    const checkInStr = new Date(checkIn).toISOString().split('T')[0];
    const checkOutStr = new Date(checkOut).toISOString().split('T')[0];
    const noches = Math.max(
      1,
      Math.ceil((new Date(checkOutStr) - new Date(checkInStr)) / (1000 * 60 * 60 * 24))
    );

    setForm(prev => ({
      ...prev,
      checkIn: checkInStr,
      checkOut: checkOutStr,
      noches,
    }));
  }, []);

  const selectedCalendarRange = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return { from: undefined, to: undefined };
    return { from: new Date(form.checkIn), to: new Date(form.checkOut) };
  }, [form.checkIn, form.checkOut]);

  const handleRoomSelect = useCallback((roomId) => {
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      const today = new Date().toISOString().split('T')[0];
      const checkOutDate = new Date(today);
      checkOutDate.setDate(checkOutDate.getDate() + 1);
      setForm({ 
        numero: roomId, 
        huesped: '', 
        tipo: room.tipo, 
        numeroHabitacion: room.numero,
        email: '',
        telefono: '',
        documento: '',
        noches: 1,
        checkIn: today,
        checkOut: checkOutDate.toISOString().split('T')[0],
        adultos: 1,
        ninos: 0,
        tieneMascota: false,
        nombreMascota: '',
        observaciones: '',
        usarMismoContacto: true,
        personasAdicionales: []
});
      setStep(3);
    }
  }, [rooms]);

  const _agregarPersonaAdicional = () => {
    setForm(prev => ({
      ...prev,
      personasAdicionales: [
        ...prev.personasAdicionales,
        { nombre: '', documento: '' }
      ]
    }));
  };

  const actualizarPersonaAdicional = (index, field, value) => {
    setForm(prev => {
      const nuevas = [...prev.personasAdicionales];
      nuevas[index] = { ...nuevas[index], [field]: value };
      return { ...prev, personasAdicionales: nuevas };
    });
  };

  // Security: Input sanitization to prevent XSS
  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    return input
      .replace(/[<>]/g, '') // Remove < and > characters
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  };

  const safeErrorMessage = (err, fallback = 'Error al realizar check-in') => {
    if (!err) return fallback;
    if (typeof err === 'string') return err;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
    try {
      const serialized = JSON.stringify(err);
      return serialized && serialized !== '{}' ? serialized : fallback;
    } catch {
      return fallback;
    }
  };

  // Security: Validate email format
  const isValidEmail = (email) => {
    if (!email) return true; // Optional fields are valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Security: Validate phone format
  const isValidPhone = (phone) => {
    if (!phone) return true;
    const phoneRegex = /^[\d\s\-+()]{7,20}$/;
    return phoneRegex.test(phone);
  };

  // Security: Validate document format
  const isValidDocument = (doc) => {
    if (!doc) return false;
    return doc.replace(/\D/g, '').length >= 5; // At least 5 digits
  };

  const handleSubmit = async () => {
    // Security: Validate required fields
    if (!form.numero || !form.huesped.trim()) {
      return setError('Selecciona una habitación y completa el nombre del huésped principal');
    }
    
    const sanitizedHuesped = sanitizeInput(form.huesped);
    if (sanitizedHuesped.length < 3) {
      return setError('El nombre debe tener al menos 3 caracteres');
    }
    
    if (!isValidDocument(form.documento)) {
      return setError('Ingresa un número de documento válido (mínimo 5 dígitos)');
    }
    
    if (!isValidPhone(form.telefono)) {
      return setError('Ingresa un número de teléfono válido');
    }
    
    if (!form.checkIn) {
      return setError('Selecciona la fecha de check-in');
    }
    
    // Security: Validate additional people emails if not using same contact
    if (!form.usarMismoContacto && form.personasAdicionales.length > 0) {
      for (let i = 0; i < form.personasAdicionales.length; i++) {
        const p = form.personasAdicionales[i];
        if (p.email && !isValidEmail(p.email)) {
          return setError(`Correo inválido en persona ${i + 2}`);
        }
      }
    }
    
    setLoading(true);
    setError('');
    try {
      // Security: Sanitize all inputs before sending
      const sanitizedForm = {
        numero: form.numeroHabitacion || form.numero,
        huesped: sanitizeInput(form.huesped),
        tipo: sanitizeInput(form.tipo),
        noches: parseInt(form.noches) || 1,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        email: sanitizeInput(form.email) || '',
        telefono: sanitizeInput(form.telefono),
        documento: sanitizeInput(form.documento),
        observaciones: sanitizeInput(form.observaciones) || '',
        adultos: parseInt(form.adultos) || 1,
        ninos: parseInt(form.ninos) || 0,
        tieneMascota: form.tieneMascota,
        nombreMascota: sanitizeInput(form.nombreMascota) || '',
        personasAdicionales: form.personasAdicionales.map(p => ({
          nombre: sanitizeInput(p.nombre) || '',
          documento: sanitizeInput(p.documento) || '',
          email: sanitizeInput(p.email) || '',
          telefono: sanitizeInput(p.telefono) || ''
        }))
      };
      
      const data = await checkIn(sanitizedForm);
      setResultado(data);
    } catch (e) {
      setError(safeErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const _handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) handleSubmit();
  };

  // Step 1: Choose registration type
  if (step === 1) {
    return (
      <PantallaForm standalone={standalone} titulo="Registrar Huesped" desc="Selecciona el tipo de registro" onVolver={() => onNav('menu')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Check-in (existing reservation) */}
          <button
            onClick={() => goToStep(1.5, '/admin/register/checkin')}
            className="p-6 rounded-xl border-2 border-blue-200 bg-white hover:bg-blue-50 hover:border-blue-400 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <ArrowLeft className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Realizar Check-in</h3>
            <p className="text-sm text-gray-500">Huéspedes con reserva previa confirmada</p>
            <div className="mt-3 text-xs text-blue-600 font-medium">Ver habitaciones reservadas →</div>
          </button>

          {/* New registration */}
          <button
            onClick={() => goToStep(2, '/admin/register/new')}
            className="p-6 rounded-xl border-2 border-green-200 bg-white hover:bg-green-50 hover:border-green-400 hover:shadow-md transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <ArrowLeft className="w-5 h-5 text-green-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Registro Nuevo</h3>
            <p className="text-sm text-gray-500">Registro sin reserva previa</p>
            <div className="mt-3 text-xs text-green-600 font-medium">Ver habitaciones disponibles →</div>
          </button>
        </div>
      </PantallaForm>
    );
  }

  // Step 1.5: List reserved rooms for check-in
  if (step === 1.5) {
    return (
      <PantallaForm standalone={standalone} titulo="Check-in con Reserva" desc="Selecciona la habitación reservada" onVolver={() => goToStep(1, '/admin/register')}>
        <div className="mb-5 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-4">Habitaciones Reservadas</p>
          {roomsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Cargando...</p>
            </div>
          ) : reservadas.length === 0 ? (
            <div className="text-sm p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-center">
              <AlertTriangle className="w-5 h-5 inline mr-1" /> No hay habitaciones reservadas
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto">
              {reservadas.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setForm(prev => ({
                      ...prev,
                      numero: r.id,
                      huesped: r.huesped || '',
                      tipo: r.tipo,
                      numeroHabitacion: r.numero,
                      email: r.email || '',
                      telefono: r.telefono || '',
                      documento: r.documento || '',
                      noches: 1,
                      checkIn: today,
                      checkOut: today,
                      adultos: 1,
                      ninos: 0,
                      tieneMascota: false,
                      nombreMascota: '',
                      observaciones: '',
                      personasAdicionales: []
                    }));
                    setStep(3);
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl font-bold text-gray-900">#{r.numero}</span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">Reservada</span>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">{r.tipo}</p>
                  {r.huesped && (
                    <p className="text-xs text-gray-500 mt-1"><User className="w-3 h-3 inline mr-1" /> {r.huesped}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Bed className="w-3 h-3" /> {r.camas}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.capacidad} pers</span>
                  </div>
                  <div className="mt-2 text-xs text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Check-in huésped →</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PantallaForm>
    );
  }

  // Step 2: Room Selection (available rooms)
  if (step === 2) {
    return (
      <PantallaForm standalone={standalone} titulo="Registro Nuevo" desc="Selecciona una habitacion disponible" onVolver={() => goToStep(1, '/admin/register')}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
          {roomsLoading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Cargando...</p>
            </div>
          ) : disponibles.length === 0 ? (
            <div className="col-span-full text-sm p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
              <AlertTriangle className="w-5 h-5 inline mr-1" /> No hay habitaciones disponibles
            </div>
          ) : (
            disponibles.map((r) => (
              <div
                key={r.id}
                className="p-6 rounded-xl border border-gray-200 bg-white hover:bg-green-50 hover:border-green-400 hover:shadow-md cursor-pointer transition-all group"
                onClick={() => handleRoomSelect(r.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-2xl font-bold text-gray-900">#{r.numero}</span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">Disponible</span>
                </div>
                <p className="font-semibold text-gray-800 text-sm">{r.tipo}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Bed className="w-3 h-3" /> {r.camas}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {r.capacidad} pers</span>
                </div>
                <p className="text-lg font-bold text-green-600 mt-2">
                  {r.tarifa?.toLocaleString('es-CO')} <span className="text-xs font-normal text-gray-500">COP/noche</span>
                </p>
                <div className="mt-2 text-xs text-green-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Click para seleccionar →</div>
              </div>
            ))
          )}
        </div>
      </PantallaForm>
    );
  }

// Step 3: Guest Information Form (with room list on side)
  if (step === 3) {
    return (
      <PantallaForm standalone={standalone} titulo="Registrar Huesped" desc="Completa los datos del huesped y la estadia" onVolver={() => {
            const path = location.pathname;
            if (path.includes('/checkin')) {
              goToStep(1.5, '/admin/register/checkin');
            } else {
              goToStep(2, '/admin/register/new');
            }
          }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Room List - Left Side (smaller) */}
          <div className="md:col-span-1 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-4">Habitación Seleccionada</p>
            <div className="p-4 rounded-xl border-2 border-green-400 bg-green-50">
              <div className="flex justify-between items-start mb-2">
                <span className="text-3xl font-bold text-gray-900">#{habitacionSeleccionada?.numero}</span>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">Seleccionada</span>
              </div>
              <p className="font-semibold text-gray-800">{habitacionSeleccionada?.tipo}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Bed className="w-3 h-3" /> {habitacionSeleccionada?.camas}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {habitacionSeleccionada?.capacidad} pers</span>
              </div>
              <p className="text-xl font-bold text-green-600 mt-2">
                {habitacionSeleccionada?.tarifa?.toLocaleString('es-CO')} <span className="text-xs font-normal text-gray-500">COP/noche</span>
              </p>
              
              {/* Amenidades */}
              {habitacionSeleccionada?.amenidades && habitacionSeleccionada.amenidades.length > 0 && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <div className="flex flex-wrap gap-1.5">
                    {habitacionSeleccionada.amenidades.slice(0, 5).map((a, i) => {
                      const amenidad = AMENIDADES[a];
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-xs bg-white/80 backdrop-blur text-green-700 px-2 py-1 rounded-full border border-green-200"
                        >
                          <CheckCircle className="w-3 h-3" />
                          {amenidad?.label || a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      );
                    })}
                    {habitacionSeleccionada.amenidades.length > 5 && (
                      <span className="text-xs text-green-600">+{habitacionSeleccionada.amenidades.length - 5}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                const path = location.pathname;
                if (path.includes('/checkin')) {
                  goToStep(1.5, '/admin/register/checkin');
                } else {
                  goToStep(2, '/admin/register/new');
                }
              }}
              className="mt-4 w-full py-2 text-sm text-green-600 hover:text-green-700 font-medium border border-green-300 rounded-lg hover:bg-green-50"
            >
              ← Cambiar habitación
            </button>
          </div>

          {/* Guest Form - Right Side (wider) */}
          <div className="md:col-span-3 space-y-6">
            {/* Dates Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Fechas de la Estadía
                </CardTitle>
                <CardDescription>
                  Selecciona check-in, número de noches y revisa el calendario de disponibilidad de la habitación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Check-in</label>
                    <input
                      type="date"
                      value={form.checkIn}
                      onChange={(e) => updateField('checkIn', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Noches</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={form.noches}
                      onChange={(e) => updateField('noches', parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Check-out</label>
                    <div className="px-4 py-3 bg-green-50 border-2 border-green-200 rounded-lg text-green-800 font-semibold">
                      {form.checkOut || '—'}
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <RoomCalendar
                    roomId={form.numero}
                    roomNumero={habitacionSeleccionada?.numero}
                    modo="range"
                    initialDates={selectedCalendarRange}
                    onSelectDates={handleCalendarSelect}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Guests Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Cantidad de Personas
                </CardTitle>
                <CardDescription>Define el número de adultos y niños</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Adultos</label>
                    <select
                      value={form.adultos}
                      onChange={(e) => updateField('adultos', parseInt(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                    >
                      {[1,2,3,4,5,6,7,8].map(n => (
                        <option key={n} value={n}>{n} adulto{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Niños (0-12)</label>
                    <select
                      value={form.ninos}
                      onChange={(e) => updateField('ninos', parseInt(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                    >
                      {[0,1,2,3,4,5,6].map(n => (
                        <option key={n} value={n}>{n === 0 ? 'Sin niños' : `${n} niño${n > 1 ? 's' : ''}`}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {totalPersonas > 0 && (
                  <p className="text-green-600 font-semibold bg-green-50 px-4 py-2 rounded-lg inline-block">
                    Total: {totalPersonas} persona{totalPersonas > 1 ? 's' : ''}
                  </p>
                )}

                {/* Pet Section */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.tieneMascota}
                      onChange={(e) => updateField('tieneMascota', e.target.checked)}
                      className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                    />
                    <span className="flex items-center gap-2 text-gray-700"><Dog className="w-5 h-5" /> Mascota (sin costo)</span>
                  </label>
                  {form.tieneMascota && (
                    <div className="mt-3 ml-8">
                      <input
                        type="text"
                        placeholder="Nombre de la mascota"
                        value={form.nombreMascota}
                        onChange={(e) => updateField('nombreMascota', e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Guest Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  Datos del Huésped
                </CardTitle>
                <CardDescription>Completa la información del huésped principal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Nombre completo</label>
                    <input
                      type="text"
                      placeholder="Ej: Juan García"
                      value={form.huesped}
                      onChange={(e) => updateField('huesped', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">Documento</label>
                      <input
                        type="text"
                        placeholder="Cédula"
                        value={form.documento}
                        onChange={(e) => updateField('documento', e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">Teléfono</label>
                      <input
                        type="tel"
                        placeholder="310 123 4567"
                        value={form.telefono}
                        onChange={(e) => updateField('telefono', e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Correo electrónico</label>
                    <input
                      type="email"
                      placeholder="juan@email.com"
                      value={form.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Observaciones</label>
                    <textarea
                      placeholder="Notas especiales..."
                      value={form.observaciones}
                      onChange={(e) => updateField('observaciones', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional People Card - After Guest Info */}
            {totalPersonas > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    Datos de personas adicionales
                  </CardTitle>
                  <CardDescription>Información de las demás personas en la habitación</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Same Contact Info Toggle - Inside the card, after header */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.usarMismoContacto}
                        onChange={(e) => updateField('usarMismoContacto', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Usar el mismo correo y teléfono del huésped principal</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-end mb-4">
                    <button
                      type="button"
                      onClick={_agregarPersonaAdicional}
                      className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                    >
                      <span className="text-lg">+</span> Agregar persona
                    </button>
                  </div>
                  
                  {form.personasAdicionales.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Haz clic en "Agregar persona" para registrar más personas
                    </p>
                  ) : (
                    form.personasAdicionales.map((persona, i) => (
                      <div key={i} className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-xs font-bold text-green-600 uppercase">Persona {i + 2}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setForm(prev => ({
                                ...prev,
                                personasAdicionales: prev.personasAdicionales.filter((_, idx) => idx !== i)
                              }));
                            }}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Nombre completo"
                            value={persona.nombre || ''}
                            onChange={(e) => actualizarPersonaAdicional(i, 'nombre', e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Documento"
                            value={persona.documento || ''}
                            onChange={(e) => actualizarPersonaAdicional(i, 'documento', e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-sm"
                          />
                        </div>
                        
                        {/* Contact for additional person */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-2">Datos de contacto (opcional)</p>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="email"
                              placeholder="Correo electrónico"
                              value={persona.email || ''}
                              onChange={(e) => actualizarPersonaAdicional(i, 'email', e.target.value)}
                              disabled={form.usarMismoContacto}
                              className="px-3 py-2 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                            />
                            <input
                              type="tel"
                              placeholder="Teléfono"
                              value={persona.telefono || ''}
                              onChange={(e) => actualizarPersonaAdicional(i, 'telefono', e.target.value)}
                              disabled={form.usarMismoContacto}
                              className="px-3 py-2 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

          {/* Price Summary Card */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <DollarSign className="w-5 h-5" />
                  Resumen de Tarifa
                </CardTitle>
                <CardDescription className="text-green-600">Desglose de costos de la estadía</CardDescription>
              </CardHeader>
              <CardContent>
<div className="flex justify-between">
                  <span className="text-green-700">Adultos ({form.adultos}) × {form.noches} noche{form.noches > 1 ? 's' : ''}</span>
                  <span className="font-medium text-green-800">{precioAdultos.toLocaleString('es-CO')} COP</span>
                </div>
                {form.ninos > 0 && (
                  <div className="flex justify-between">
                    <span className="text-green-700">Niños ({form.ninos}) × {form.noches} noche{form.noches > 1 ? 's' : ''}</span>
                    <span className="font-medium text-green-800">{precioNinos.toLocaleString('es-CO')} COP</span>
                  </div>
                )}
                {form.tieneMascota && (
                  <div className="flex justify-between">
                    <span className="text-green-700"><Dog className="w-3 h-3 inline mr-1" /> Mascota</span>
                    <span className="font-medium text-green-800">Gratis</span>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-green-200 space-y-1">
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Por noche adulto:</span>
                    <span>{habitacionSeleccionada?.tarifa?.toLocaleString('es-CO') || '350.000'} COP</span>
                  </div>
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Por noche niño:</span>
                    <span>{TARIFA_NINO.toLocaleString('es-CO')} COP</span>
                  </div>
                </div>
              </CardContent>
              <div className="px-6 pb-6">
                <div className="pt-4 border-t border-green-200 flex justify-between items-center">
                  <span className="text-lg font-semibold text-green-800">Total Estadía</span>
                  <span className="text-3xl font-bold text-green-600">{precioTotal.toLocaleString('es-CO')} COP</span>
                </div>
              </div>
            </Card>

            {/* Submit */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {error}
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-5 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-green-600/30 hover:shadow-green-700/40 text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3"><span className="animate-spin">⟳</span> Registrando...</span>
) : (
                <span className="flex items-center justify-center gap-3"><CheckCircle className="w-6 h-6" /> Confirmar Check-in</span>
              )}
            </button>
          </div>
        </div>
      </PantallaForm>
    );
  }

  // Success Screen
  if (resultado) {
    return (
      <PantallaForm standalone={standalone} titulo="Check-in Exitoso" onVolver={() => onNav('menu')}>
        <div className="exito-box">
          <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
          <h3 className="text-xl font-bold text-green-700 mb-4">¡Huésped registrado!</h3>
          <div className="info-table bg-white rounded-xl p-4 mb-4">
            <div className="it-row"><span>Habitación</span><strong>{resultado.numero}</strong></div>
            <div className="it-row"><span>Huésped</span><strong>{resultado.huesped}</strong></div>
            <div className="it-row"><span>Personas</span><strong>{form.personas}</strong></div>
            <div className="it-row"><span>Check-in</span><strong>{form.checkIn}</strong></div>
            <div className="it-row"><span>Check-out</span><strong>{form.checkOut}</strong></div>
            <div className="it-row pin-row"><span>🔐 PIN</span><strong className="pin-grande text-2xl">{resultado.pin}</strong></div>
          </div>
          <p className="pin-aviso text-sm text-gray-600 mb-4"><AlertTriangle className="w-4 h-4 inline mr-1" /> Entrega este PIN al huesped - lo necesitara para consumos y checkout</p>
          <button className="btn-main-action w-full" onClick={() => onNav('menu')}>← Volver al menú</button>
        </div>
      </PantallaForm>
    );
  }

  return null;
}
