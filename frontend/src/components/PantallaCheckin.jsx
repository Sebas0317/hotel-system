import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { checkIn, fetchRooms } from '../services/api';
import CheckinAvailableList from './CheckinAvailableList';
import CheckinGuestForm from './CheckinGuestForm';
import CheckinReservedList from './CheckinReservedList';
import CheckinSuccess from './CheckinSuccess';
import CheckinTypeStep from './CheckinTypeStep';

export default function PantallaCheckin({ onNav, standalone = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
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
    personasAdicionales: [],
  });
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/checkin')) setStep(1.5);
    else if (path.includes('/new')) setStep(2);
    else setStep(1);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    fetchRooms()
      .then((data) => {
        if (!cancelled) setRooms(data);
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const disponibles = useMemo(
    () => rooms.filter((r) => r.estado === 'disponible'),
    [rooms]
  );
  const reservadas = useMemo(
    () => rooms.filter((r) => r.estado === 'reservada'),
    [rooms]
  );
  const habitacionSeleccionada = useMemo(
    () => rooms.find((r) => r.id === form.numero),
    [rooms, form.numero]
  );

  useEffect(() => {
    if (form.checkIn && form.noches > 0) {
      const checkInDate = new Date(form.checkIn);
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + form.noches);
      setForm((prev) => ({
        ...prev,
        checkOut: checkOutDate.toISOString().split('T')[0],
      }));
    }
  }, [form.checkIn, form.noches]);

  const selectedCalendarRange = useMemo(() => {
    if (!form.checkIn || !form.checkOut)
      return { from: undefined, to: undefined };
    return { from: new Date(form.checkIn), to: new Date(form.checkOut) };
  }, [form.checkIn, form.checkOut]);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCalendarSelect = useCallback(({ checkIn, checkOut }) => {
    const checkInStr = new Date(checkIn).toISOString().split('T')[0];
    const checkOutStr = new Date(checkOut).toISOString().split('T')[0];
    const noches = Math.max(
      1,
      Math.ceil(
        (new Date(checkOutStr) - new Date(checkInStr)) / (1000 * 60 * 60 * 24)
      )
    );
    setForm((prev) => ({
      ...prev,
      checkIn: checkInStr,
      checkOut: checkOutStr,
      noches,
    }));
  }, []);

  const handleRoomSelect = useCallback((room) => {
    const today = new Date().toISOString().split('T')[0];
    const checkOutDate = new Date(today);
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    setForm({
      numero: room.id,
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
      personasAdicionales: [],
    });
    setStep(3);
  }, []);

  const handleReservedRoomSelect = useCallback((room) => {
    const today = new Date().toISOString().split('T')[0];
    setForm((prev) => ({
      ...prev,
      numero: room.id,
      huesped: room.huesped || '',
      tipo: room.tipo,
      numeroHabitacion: room.numero,
      email: room.email || '',
      telefono: room.telefono || '',
      documento: room.documento || '',
      noches: 1,
      checkIn: today,
      checkOut: today,
      adultos: 1,
      ninos: 0,
      tieneMascota: false,
      nombreMascota: '',
      observaciones: '',
      personasAdicionales: [],
    }));
    setStep(3);
  }, []);

  const sanitizeInput = useCallback((input) => {
    if (typeof input !== 'string') return '';
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }, []);

  const isValidEmail = useCallback((email) => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, []);

  const isValidPhone = useCallback((phone) => {
    if (!phone) return true;
    return /^[\d\s\-+()]{7,20}$/.test(phone);
  }, []);

  const isValidDocument = useCallback((doc) => {
    if (!doc) return false;
    return doc.replace(/\D/g, '').length >= 5;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.numero || !form.huesped.trim()) {
      return setError(
        'Selecciona una habitación y completa el nombre del huésped principal'
      );
    }
    const sanitizedHuesped = sanitizeInput(form.huesped);
    if (sanitizedHuesped.length < 3)
      return setError('El nombre debe tener al menos 3 caracteres');
    if (!isValidDocument(form.documento))
      return setError(
        'Ingresa un número de documento válido (mínimo 5 dígitos)'
      );
    if (!isValidPhone(form.telefono))
      return setError('Ingresa un número de teléfono válido');
    if (!form.checkIn) return setError('Selecciona la fecha de check-in');
    if (!form.usarMismoContacto && form.personasAdicionales.length > 0) {
      for (let i = 0; i < form.personasAdicionales.length; i++) {
        const p = form.personasAdicionales[i];
        if (p.email && !isValidEmail(p.email))
          return setError(`Correo inválido en persona ${i + 2}`);
      }
    }

    setLoading(true);
    setError('');
    try {
      const sanitizedForm = {
        numero: form.numeroHabitacion || form.numero,
        huesped: sanitizeInput(form.huesped),
        tipo: sanitizeInput(form.tipo),
        noches: parseInt(form.noches, 10) || 1,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        email: sanitizeInput(form.email) || '',
        telefono: sanitizeInput(form.telefono),
        documento: sanitizeInput(form.documento),
        observaciones: sanitizeInput(form.observaciones) || '',
        adultos: parseInt(form.adultos, 10) || 1,
        ninos: parseInt(form.ninos, 10) || 0,
        tieneMascota: form.tieneMascota,
        nombreMascota: sanitizeInput(form.nombreMascota) || '',
        personasAdicionales: form.personasAdicionales.map((p) => ({
          nombre: sanitizeInput(p.nombre) || '',
          documento: sanitizeInput(p.documento) || '',
          email: sanitizeInput(p.email) || '',
          telefono: sanitizeInput(p.telefono) || '',
        })),
      };
      const data = await checkIn(sanitizedForm);
      setResultado(data);
    } catch (e) {
      setError(e?.message || e?.error || 'Error al realizar check-in');
    } finally {
      setLoading(false);
    }
  }, [form, sanitizeInput, isValidDocument, isValidPhone, isValidEmail]);

  const goToStep = useCallback(
    (newStep, path) => {
      setStep(newStep);
      if (path) navigate(path, { replace: true });
    },
    [navigate]
  );

  if (step === 1) {
    return (
      <CheckinTypeStep
        standalone={standalone}
        onNav={onNav}
        onSelectCheckin={() => goToStep(1.5, '/admin/register/checkin')}
        onSelectNew={() => goToStep(2, '/admin/register/new')}
      />
    );
  }

  if (step === 1.5) {
    return (
      <CheckinReservedList
        standalone={standalone}
        reservadas={reservadas}
        roomsLoading={roomsLoading}
        onSelectRoom={handleReservedRoomSelect}
        onBack={() => goToStep(1, '/admin/register')}
      />
    );
  }

  if (step === 2) {
    return (
      <CheckinAvailableList
        standalone={standalone}
        disponibles={disponibles}
        roomsLoading={roomsLoading}
        onSelectRoom={handleRoomSelect}
        onBack={() => goToStep(1, '/admin/register')}
      />
    );
  }

  if (step === 3) {
    return (
      <CheckinGuestForm
        standalone={standalone}
        form={form}
        habitacionSeleccionada={habitacionSeleccionada}
        selectedCalendarRange={selectedCalendarRange}
        onUpdateField={updateField}
        onCalendarSelect={handleCalendarSelect}
        onAgregarPersona={() =>
          setForm((prev) => ({
            ...prev,
            personasAdicionales: [
              ...prev.personasAdicionales,
              { nombre: '', documento: '' },
            ],
          }))
        }
        onActualizarPersona={(index, field, value) => {
          if (field === null) {
            setForm((prev) => ({
              ...prev,
              personasAdicionales: prev.personasAdicionales.filter(
                (_, idx) => idx !== index
              ),
            }));
          } else {
            setForm((prev) => {
              const nuevas = [...prev.personasAdicionales];
              nuevas[index] = { ...nuevas[index], [field]: value };
              return { ...prev, personasAdicionales: nuevas };
            });
          }
        }}
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
        onBack={() => {
          const path = location.pathname;
          goToStep(
            path.includes('/checkin') ? 1.5 : 2,
            path.includes('/checkin')
              ? '/admin/register/checkin'
              : '/admin/register/new'
          );
        }}
      />
    );
  }

  if (resultado) {
    return (
      <CheckinSuccess
        standalone={standalone}
        resultado={resultado}
        form={form}
        onNav={onNav}
      />
    );
  }

  return null;
}
