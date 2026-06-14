import {
  AlertTriangle,
  Bed,
  Calendar,
  CheckCircle,
  Dog,
  DollarSign,
  User,
  Users,
} from 'lucide-react';
import { AMENIDADES } from '../constants';
import PantallaForm from './PantallaForm';
import RoomCalendar from './RoomCalendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui';

const TARIFA_NINO = 80000;
const _TARIFA_MASCOTA = 50000;

export default function CheckinGuestForm({
  standalone,
  form,
  habitacionSeleccionada,
  selectedCalendarRange,
  onUpdateField,
  onCalendarSelect,
  onAgregarPersona,
  onActualizarPersona,
  onSubmit,
  loading,
  error,
  onBack,
}) {
  const totalPersonas = form.adultos + form.ninos;
  const precioAdultos = habitacionSeleccionada
    ? habitacionSeleccionada.tarifa * form.noches
    : 0;
  const precioNinos =
    form.ninos > 0 ? TARIFA_NINO * form.noches * form.ninos : 0;
  const precioMascota = 0;
  const subtotalSinIva = precioAdultos + precioNinos + precioMascota;
  const iva = 0;

  return (
    <PantallaForm
      standalone={standalone}
      titulo="Registrar Huesped"
      desc="Completa los datos del huesped y la estadia"
      onVolver={onBack}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-4">
            Habitación Seleccionada
          </p>
          <div className="p-4 rounded-xl border-2 border-green-400 bg-green-50">
            <div className="flex justify-between items-start mb-2">
              <span className="text-3xl font-bold text-gray-900">
                #{habitacionSeleccionada?.numero}
              </span>
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                Seleccionada
              </span>
            </div>
            <p className="font-semibold text-gray-800">
              {habitacionSeleccionada?.tipo}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Bed className="w-3 h-3" /> {habitacionSeleccionada?.camas}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />{' '}
                {habitacionSeleccionada?.capacidad} pers
              </span>
            </div>
            <p className="text-xl font-bold text-green-600 mt-2">
              {habitacionSeleccionada?.tarifa?.toLocaleString('es-CO')}{' '}
              <span className="text-xs font-normal text-gray-500">
                COP/noche
              </span>
            </p>
            {habitacionSeleccionada?.amenidades?.length > 0 && (
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
                        {amenidad?.label ||
                          a
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    );
                  })}
                  {habitacionSeleccionada.amenidades.length > 5 && (
                    <span className="text-xs text-green-600">
                      +{habitacionSeleccionada.amenidades.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 w-full py-2 text-sm text-green-600 hover:text-green-700 font-medium border border-green-300 rounded-lg hover:bg-green-50"
          >
            ← Cambiar habitación
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" /> Fechas de la
                Estadía
              </CardTitle>
              <CardDescription>
                Selecciona check-in, número de noches y revisa el calendario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Check-in
                  </label>
                  <input
                    type="date"
                    value={form.checkIn}
                    onChange={(e) => onUpdateField('checkIn', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Noches
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={form.noches}
                    onChange={(e) =>
                      onUpdateField('noches', parseInt(e.target.value, 10) || 1)
                    }
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Check-out
                  </label>
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
                  onSelectDates={onCalendarSelect}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" /> Cantidad de
                Personas
              </CardTitle>
              <CardDescription>
                Define el número de adultos y niños
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Adultos
                  </label>
                  <select
                    value={form.adultos}
                    onChange={(e) =>
                      onUpdateField('adultos', parseInt(e.target.value, 10))
                    }
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} adulto{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Niños (0-12)
                  </label>
                  <select
                    value={form.ninos}
                    onChange={(e) =>
                      onUpdateField('ninos', parseInt(e.target.value, 10))
                    }
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n === 0 ? 'Sin niños' : `${n} niño${n > 1 ? 's' : ''}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {totalPersonas > 0 && (
                <p className="text-green-600 font-semibold bg-green-50 px-4 py-2 rounded-lg inline-block">
                  Total: {totalPersonas} persona{totalPersonas > 1 ? 's' : ''}
                </p>
              )}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.tieneMascota}
                    onChange={(e) =>
                      onUpdateField('tieneMascota', e.target.checked)
                    }
                    className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                  />
                  <span className="flex items-center gap-2 text-gray-700">
                    <Dog className="w-5 h-5" /> Mascota (sin costo)
                  </span>
                </label>
                {form.tieneMascota && (
                  <div className="mt-3 ml-8">
                    <input
                      type="text"
                      placeholder="Nombre de la mascota"
                      value={form.nombreMascota}
                      onChange={(e) =>
                        onUpdateField('nombreMascota', e.target.value)
                      }
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-green-600" /> Datos del Huésped
              </CardTitle>
              <CardDescription>
                Completa la información del huésped principal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Juan García"
                    value={form.huesped}
                    onChange={(e) => onUpdateField('huesped', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Documento
                    </label>
                    <input
                      type="text"
                      placeholder="Cédula"
                      value={form.documento}
                      onChange={(e) =>
                        onUpdateField('documento', e.target.value)
                      }
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      placeholder="310 123 4567"
                      value={form.telefono}
                      onChange={(e) =>
                        onUpdateField('telefono', e.target.value)
                      }
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="juan@email.com"
                    value={form.email}
                    onChange={(e) => onUpdateField('email', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Observaciones
                  </label>
                  <textarea
                    placeholder="Notas especiales..."
                    value={form.observaciones}
                    onChange={(e) =>
                      onUpdateField('observaciones', e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {totalPersonas > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" /> Datos de personas
                  adicionales
                </CardTitle>
                <CardDescription>
                  Información de las demás personas en la habitación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.usarMismoContacto}
                      onChange={(e) =>
                        onUpdateField('usarMismoContacto', e.target.checked)
                      }
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Usar el mismo correo y teléfono del huésped principal
                    </span>
                  </label>
                </div>
                <div className="flex items-center justify-end mb-4">
                  <button
                    type="button"
                    onClick={onAgregarPersona}
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
                    <div
                      key={i}
                      className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-xs font-bold text-green-600 uppercase">
                          Persona {i + 2}
                        </p>
                        <button
                          type="button"
                          onClick={() => onActualizarPersona(i, null)}
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
                          onChange={(e) =>
                            onActualizarPersona(i, 'nombre', e.target.value)
                          }
                          className="px-3 py-2 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Documento"
                          value={persona.documento || ''}
                          onChange={(e) =>
                            onActualizarPersona(i, 'documento', e.target.value)
                          }
                          className="px-3 py-2 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-sm"
                        />
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">
                          Datos de contacto (opcional)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="email"
                            placeholder="Correo electrónico"
                            value={persona.email || ''}
                            onChange={(e) =>
                              onActualizarPersona(i, 'email', e.target.value)
                            }
                            disabled={form.usarMismoContacto}
                            className="px-3 py-2 rounded-lg border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                          />
                          <input
                            type="tel"
                            placeholder="Teléfono"
                            value={persona.telefono || ''}
                            onChange={(e) =>
                              onActualizarPersona(i, 'telefono', e.target.value)
                            }
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

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <DollarSign className="w-5 h-5" /> Resumen de Tarifa
              </CardTitle>
              <CardDescription className="text-green-600">
                Desglose de costos de la estadía
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between">
                <span className="text-green-700">
                  Habitación × {form.noches} noche{form.noches > 1 ? 's' : ''}
                </span>
                <span className="font-medium text-green-800">
                  {precioAdultos.toLocaleString('es-CO')} COP
                </span>
              </div>
              {form.ninos > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-700">
                    Niños ({form.ninos}) × {form.noches} noche
                    {form.noches > 1 ? 's' : ''}
                  </span>
                  <span className="font-medium text-green-800">
                    {precioNinos.toLocaleString('es-CO')} COP
                  </span>
                </div>
              )}
              {form.tieneMascota && (
                <div className="flex justify-between">
                  <span className="text-green-700">
                    <Dog className="w-3 h-3 inline mr-1" /> Mascota
                  </span>
                  <span className="font-medium text-green-800">Gratis</span>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-green-200 space-y-1">
                <div className="flex justify-between text-xs text-green-600">
                  <span>Subtotal</span>
                  <span>{subtotalSinIva.toLocaleString('es-CO')} COP</span>
                </div>
                <div className="flex justify-between text-xs text-green-600">
                  <span>IVA 19%</span>
                  <span>{iva.toLocaleString('es-CO')} COP</span>
                </div>
                <div className="flex justify-between text-xs text-green-600">
                  <span>Por noche adulto:</span>
                  <span>
                    {habitacionSeleccionada?.tarifa?.toLocaleString('es-CO') ||
                      '350.000'}{' '}
                    COP
                  </span>
                </div>
                <div className="flex justify-between text-xs text-green-600">
                  <span>Por noche niño:</span>
                  <span>{TARIFA_NINO.toLocaleString('es-CO')} COP</span>
                </div>
              </div>
            </CardContent>
            <div className="px-6 pb-6">
              <div className="pt-4 border-t border-green-200 flex justify-between items-center">
                <span className="text-lg font-semibold text-green-800">
                  Total Estadía
                </span>
                <span className="text-3xl font-bold text-green-600">
                  {(subtotalSinIva + iva).toLocaleString('es-CO')} COP
                </span>
              </div>
            </div>
          </Card>

          {habitacionSeleccionada &&
            totalPersonas > habitacionSeleccionada.capacidad && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" /> La capacidad
                maxima de la habitacion es {habitacionSeleccionada.capacidad}{' '}
                personas
              </div>
            )}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {error}
            </div>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={
              loading ||
              (habitacionSeleccionada &&
                totalPersonas > habitacionSeleccionada.capacidad)
            }
            className="w-full py-5 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-green-600/30 hover:shadow-green-700/40 text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="animate-spin">⟳</span> Registrando...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <CheckCircle className="w-6 h-6" /> Confirmar Check-in
              </span>
            )}
          </button>
        </div>
      </div>
    </PantallaForm>
  );
}
