import { AlertTriangle, CheckCircle } from 'lucide-react';
import PantallaForm from './PantallaForm';

export default function CheckinSuccess({ standalone, resultado, form, onNav }) {
  return (
    <PantallaForm
      standalone={standalone}
      titulo="Check-in Exitoso"
      onVolver={() => onNav('menu')}
    >
      <div className="exito-box">
        <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
        <h3 className="text-xl font-bold text-green-700 mb-4">
          ¡Huésped registrado!
        </h3>
        <div className="info-table bg-white rounded-xl p-4 mb-4">
          <div className="it-row">
            <span>Habitación</span>
            <strong>{resultado.numero}</strong>
          </div>
          <div className="it-row">
            <span>Huésped</span>
            <strong>{resultado.huesped}</strong>
          </div>
          <div className="it-row">
            <span>Personas</span>
            <strong>{(form.adultos || 0) + (form.ninos || 0)}</strong>
          </div>
          <div className="it-row">
            <span>Check-in</span>
            <strong>{form.checkIn}</strong>
          </div>
          <div className="it-row">
            <span>Check-out</span>
            <strong>{form.checkOut}</strong>
          </div>
          <div className="it-row pin-row">
            <span>🔐 PIN</span>
            <strong className="pin-grande text-2xl">{resultado.pin}</strong>
          </div>
        </div>
        <p className="pin-aviso text-sm text-gray-600 mb-4">
          <AlertTriangle className="w-4 h-4 inline mr-1" /> Entrega este PIN al
          huesped - lo necesitara para consumos y checkout
        </p>
        <button
          className="btn-main-action w-full"
          onClick={() => onNav('menu')}
        >
          ← Volver al menú
        </button>
      </div>
    </PantallaForm>
  );
}
