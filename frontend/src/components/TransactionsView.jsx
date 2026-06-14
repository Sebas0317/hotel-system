import { CheckCircle, CreditCard } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast as sonnerToast } from 'sonner';
import { CATEGORIAS_CONSUMO } from '../constants';
import { createConsumo, validarPin } from '../services/api';

export default function TransactionsView() {
  const { rooms } = useOutletContext();

  const [txn, setTxn] = useState({
    room: null,
    roomId: '',
    pin: '',
    error: '',
    loading: false,
    cat: 'restaurante',
    form: { descripcion: '', precio: '' },
    exito: false,
  });

  const occupiedRooms = useMemo(
    () => rooms.filter((r) => r.estado === 'ocupada'),
    [rooms]
  );

  const handleValidatePin = useCallback(async () => {
    const roomData = rooms.find((r) => r.id === txn.roomId);
    if (!roomData) {
      setTxn((prev) => ({ ...prev, error: 'Selecciona una habitacion' }));
      sonnerToast.error('Selecciona una habitacion');
      return;
    }
    setTxn((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const result = await validarPin(roomData.numero, txn.pin);
      setTxn((prev) => ({
        ...prev,
        room: result.room,
        roomId: result.room.id,
        loading: false,
        error: '',
      }));
      sonnerToast.success('Habitacion encontrada');
    } catch {
      setTxn((prev) => ({ ...prev, loading: false, error: 'PIN incorrecto' }));
      sonnerToast.error('PIN incorrecto');
    }
  }, [rooms, txn.roomId, txn.pin]);

  const handleRegisterConsumo = useCallback(async () => {
    if (!txn.form.descripcion.trim() || !txn.form.precio) {
      setTxn((prev) => ({ ...prev, error: 'Completa todos los campos' }));
      sonnerToast.error('Completa todos los campos');
      return;
    }
    setTxn((prev) => ({ ...prev, loading: true, error: '' }));
    const loadingToast = sonnerToast.loading('Registrando consumo...');

    try {
      await createConsumo({
        roomId: txn.room.id,
        descripcion: txn.form.descripcion,
        precio: parseFloat(txn.form.precio),
        categoria: txn.cat,
      });

      sonnerToast.dismiss(loadingToast);
      sonnerToast.success('Consumo registrado exitosamente', {
        duration: 3000,
      });

      setTxn((prev) => ({
        ...prev,
        loading: false,
        exito: true,
        form: { descripcion: '', precio: '' },
      }));
      setTimeout(() => setTxn((prev) => ({ ...prev, exito: false })), 2000);
    } catch {
      sonnerToast.dismiss(loadingToast);
      sonnerToast.error('Error al registrar consumo');
      setTxn((prev) => ({
        ...prev,
        loading: false,
        error: 'Error al registrar consumo',
      }));
    }
  }, [txn.room, txn.form, txn.cat]);

  const handleResetTxn = useCallback(() => {
    setTxn({
      room: null,
      roomId: '',
      pin: '',
      error: '',
      loading: false,
      cat: 'restaurante',
      form: { descripcion: '', precio: '' },
      exito: false,
    });
  }, []);

  return (
    <>
      <h2 className="text-xl font-bold">
        <CreditCard className="w-5 h-5 inline mr-2" /> Registrar Consumo
      </h2>
      {txn.exito && (
        <div className="mb-4 p-3 bg-emerald-50/80 border border-emerald-200/60 rounded-xl text-emerald-700 backdrop-blur-sm">
          <CheckCircle className="w-5 h-5 inline mr-1 text-emerald-500" />{' '}
          Consumo registrado exitosamente
        </div>
      )}
      {!txn.room ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 p-6 space-y-4 mt-6">
          <select
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={txn.roomId}
            onChange={(e) =>
              setTxn((prev) => ({ ...prev, roomId: e.target.value }))
            }
          >
            <option value="">Seleccionar habitacion ocupada</option>
            {occupiedRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.numero} — {r.huesped}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              className="flex-1 p-3 border border-gray-300 rounded-lg"
              type="text"
              placeholder="PIN de la habitacion"
              value={txn.pin}
              onChange={(e) =>
                setTxn((prev) => ({ ...prev, pin: e.target.value }))
              }
              maxLength={6}
            />
            <button
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200/30 font-medium transition-all duration-300"
              onClick={handleValidatePin}
            >
              Validar
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/60 p-6 space-y-4 mt-6">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="font-bold">
              #{txn.room.numero} — {txn.room.huesped}
            </p>
            <p className="text-sm text-gray-500">{txn.room.tipo}</p>
          </div>
          <select
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={txn.cat}
            onChange={(e) =>
              setTxn((prev) => ({ ...prev, cat: e.target.value }))
            }
          >
            {CATEGORIAS_CONSUMO.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            className="w-full p-3 border border-gray-300 rounded-lg"
            placeholder="Descripcion del consumo"
            value={txn.form.descripcion}
            onChange={(e) =>
              setTxn((prev) => ({
                ...prev,
                form: { ...prev.form, descripcion: e.target.value },
              }))
            }
          />
          <input
            className="w-full p-3 border border-gray-300 rounded-lg"
            type="number"
            placeholder="Precio"
            value={txn.form.precio}
            onChange={(e) =>
              setTxn((prev) => ({
                ...prev,
                form: { ...prev.form, precio: e.target.value },
              }))
            }
          />
          <div className="flex gap-2">
            <button
              className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-200/30 font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleRegisterConsumo}
              disabled={txn.loading}
            >
              {txn.loading ? 'Registrando...' : 'Registrar Consumo'}
            </button>
            <button
              className="px-4 py-3 bg-gray-100/80 text-gray-600 rounded-xl hover:bg-gray-200/80 hover:text-gray-800 font-medium transition-all duration-200"
              onClick={handleResetTxn}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
