import { useState, useEffect, useCallback } from 'react';
import { fetchPrices, updatePrices } from '../services/api';
import { COP } from '../utils/helpers';
import { CATEGORIAS_CONSUMO } from '../constants';

/**
 * Confirmation modal for saving price changes.
 */
function ConfirmModal({ tarifas, productos, onConfirm, onCancel }) {
  const tarifaCount = Object.keys(tarifas).length;
  const productCount = Object.values(productos).reduce((sum, items) => sum + items.length, 0);

  return (
    <div className="pe-modal-overlay" onClick={onCancel}>
      <div className="pe-modal" onClick={(e) => e.stopPropagation()}>
        <h4 className="pe-modal-title">⚠️ Confirmar Cambios de Precios</h4>
        <p className="pe-modal-desc">
          Estás a punto de actualizar <strong>{tarifaCount} tarifas</strong> y <strong>{productCount} productos</strong>.
          Estos cambios se aplicarán a todas las habitaciones y nuevos consumos.
        </p>
        <div className="pe-modal-summary">
          <div className="pe-modal-section">
            <h5>🛏️ Tarifas por Noche</h5>
            {Object.entries(tarifas).map(([tipo, precio]) => (
              <div key={tipo} className="pe-modal-row">
                <span>{tipo}</span>
                <strong>{COP(precio)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="pe-modal-btns">
          <button className="pe-modal-btn pe-modal-btn-confirm" onClick={onConfirm}>
            ✅ Sí, Guardar Cambios
          </button>
          <button className="pe-modal-btn pe-modal-btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * PriceEditor — Admin-only component for editing room rates and product prices.
 * Supports inline editing of names and prices, adding/removing products,
 * validation, and confirmation modal before saving.
 *
 * @param {Object} props
 * @param {Function} props.onUpdate - Callback called after successful save
 * @param {Function} props.onNotify - Callback(type, message) for toast notifications
 */
export default function PriceEditor({ onUpdate, onNotify }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPrices()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const updateTarifa = useCallback((tipo, value) => {
    setData((prev) => ({
      ...prev,
      tarifas: { ...prev.tarifas, [tipo]: parseInt(value) || 0 },
    }));
  }, []);

  const updateProductoName = useCallback((categoria, index, value) => {
    setData((prev) => {
      const productos = { ...prev.productos };
      productos[categoria] = productos[categoria].map((item, i) =>
        i === index ? { ...item, nombre: value.trim() } : item
      );
      return { ...prev, productos };
    });
  }, []);

  const updateProductoPrecio = useCallback((categoria, index, value) => {
    setData((prev) => {
      const productos = { ...prev.productos };
      productos[categoria] = productos[categoria].map((item, i) =>
        i === index ? { ...item, precio: parseInt(value) || 0 } : item
      );
      return { ...prev, productos };
    });
  }, []);

  const addProducto = useCallback((categoria) => {
    setData((prev) => {
      const productos = { ...prev.productos };
      productos[categoria] = [...productos[categoria], { nombre: '', precio: 0 }];
      return { ...prev, productos };
    });
  }, []);

  const removeProducto = useCallback((categoria, index) => {
    setData((prev) => {
      const productos = { ...prev.productos };
      productos[categoria] = productos[categoria].filter((_, i) => i !== index);
      return { ...prev, productos };
    });
  }, []);

  const validateAndSave = async () => {
    for (const [tipo, precio] of Object.entries(data.tarifas)) {
      if (precio <= 0) {
        setError(`Tarifa inválida para "${tipo}": debe ser mayor a 0`);
        return false;
      }
    }
    for (const items of Object.values(data.productos)) {
      for (const item of items) {
        if (!item.nombre.trim()) {
          setError('Hay un producto sin nombre. Completa todos los nombres.');
          return false;
        }
        if (item.precio <= 0) {
          setError(`Precio inválido para "${item.nombre}": debe ser mayor a 0`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    setError('');
    const valid = await validateAndSave();
    if (!valid) return;
    setShowConfirm(true);
  };

  const confirmSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    setError('');
    try {
      await updatePrices(data);
      onNotify('success', 'Precios actualizados correctamente');
      onUpdate();
    } catch (e) {
      setError(e.message);
      onNotify('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="pe-loading">Cargando precios...</p>;
  if (!data) return <p className="pe-error">No se pudo cargar la configuración de precios</p>;

  return (
    <div className="pe-container">
      <div className="pe-header">
        <div>
          <h4 className="pe-title">⚙️ Gestión de Precios</h4>
          <p className="pe-subtitle">Edita tarifas, nombres y precios de consumibles. Los cambios se aplican a todas las habitaciones.</p>
        </div>
        <button className="pe-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : '💾 Guardar Cambios'}
        </button>
      </div>

      {error && <div className="pe-error-msg">⚠️ {error}</div>}

      {/* Room Rates Section */}
      <div className="pe-section">
        <h5 className="pe-section-title">🌿 Tarifas por Noche</h5>
        <p className="pe-section-desc">Precio por noche para cada tipo de habitación. Todas las tarifas incluyen desayuno.</p>
        <div className="pe-grid">
          {Object.entries(data.tarifas).map(([tipo, tarifa]) => {
            const precio = typeof tarifa === 'object' ? tarifa.precio : tarifa;
            const descripcion = typeof tarifa === 'object' ? tarifa.descripcion : '';
            return (
              <div key={tipo} className="pe-field">
                <label className="pe-field-label">{tipo}</label>
                {descripcion && <p className="pe-field-desc">{descripcion}</p>}
                <div className="pe-field-row">
                  <input
                    type="number"
                    className="pe-input"
                    value={precio}
                    onChange={(e) => updateTarifa(tipo, e.target.value)}
                    min="1"
                  />
                  <span className="pe-preview">{COP(precio)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consumables Sections */}
      {CATEGORIAS_CONSUMO.map((cat) => (
        <div key={cat.key} className="pe-section">
          <div className="pe-section-header">
            <div>
              <h5 className="pe-section-title">{cat.label}</h5>
              <p className="pe-section-desc">Precios de productos y servicios. Se muestran al registrar nuevos consumos.</p>
            </div>
            <button className="pe-add-btn" onClick={() => addProducto(cat.key)}>
              ➕ Agregar Producto
            </button>
          </div>
          <div className="pe-list">
            {data.productos[cat.key]?.map((item, i) => (
              <div key={i} className={`pe-item ${!item.nombre.trim() ? 'pe-item-empty' : ''}`}>
                <input
                  type="text"
                  className="pe-name-input"
                  placeholder="Nombre del producto"
                  value={item.nombre}
                  onChange={(e) => updateProductoName(cat.key, i, e.target.value)}
                />
                <div className="pe-item-inputs">
                  <input
                    type="number"
                    className="pe-input"
                    placeholder="Precio"
                    value={item.precio || ''}
                    onChange={(e) => updateProductoPrecio(cat.key, i, e.target.value)}
                    min="1"
                  />
                  <span className="pe-item-preview">{item.precio > 0 ? COP(item.precio) : '—'}</span>
                </div>
                <button
                  className="pe-delete-btn"
                  onClick={() => removeProducto(cat.key, i)}
                  title="Eliminar producto"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Confirmation Modal */}
      {showConfirm && (
        <ConfirmModal
          tarifas={data.tarifas}
          productos={data.productos}
          onConfirm={confirmSave}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
