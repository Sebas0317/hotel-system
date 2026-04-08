import { useState, useEffect } from 'react';
import { fetchRooms } from '../services/api';
import HotelTitle from './HotelTitle';

/**
 * User menu screen - Reception role navigation hub
 * Shows quick stats and navigation cards to main features
 */
export default function PantallaMenuUsuario({ onNav, onSalir }) {
  const [stats, setStats] = useState({ total: 0, ocupadas: 0, reservadas: 0, disponibles: 0 });

  useEffect(() => {
    fetchRooms()
      .then((rooms) => {
        setStats({
          total: rooms.length,
          ocupadas: rooms.filter((r) => r.estado === 'ocupada').length,
          reservadas: rooms.filter((r) => r.estado === 'reservada').length,
          disponibles: rooms.filter((r) => r.estado === 'disponible').length,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
        <div className="topbar-left flex items-center gap-2">
          <span className="topbar-logo text-xl">🌿</span>
          <HotelTitle />
          <span className="topbar-badge user text-xs">Recepción</span>
        </div>
        <button className="btn-salir text-sm" onClick={onSalir}>← Salir</button>
      </header>

      <div className="usuario-content p-4 sm:p-6 max-w-[800px] mx-auto">
        <div className="usuario-stats flex flex-wrap gap-2 sm:gap-3 mb-6">
          <div className="stat-pill total flex-1 min-w-[80px]"><span className="sp-num text-xl sm:text-3xl">{stats.total}</span><span className="sp-lbl text-[10px] sm:text-xs">Total</span></div>
          <div className="stat-pill ocupada flex-1 min-w-[80px]"><span className="sp-num text-xl sm:text-3xl">{stats.ocupadas}</span><span className="sp-lbl text-[10px] sm:text-xs">Ocupadas</span></div>
          <div className="stat-pill reservada flex-1 min-w-[80px]"><span className="sp-num text-xl sm:text-3xl">{stats.reservadas}</span><span className="sp-lbl text-[10px] sm:text-xs">Reservadas</span></div>
          <div className="stat-pill disponible flex-1 min-w-[80px]"><span className="sp-num text-xl sm:text-3xl">{stats.disponibles}</span><span className="sp-lbl text-[10px] sm:text-xs">Disponibles</span></div>
        </div>

        <div className="menu-grid grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <button className="menu-card checkin text-left p-5 sm:p-6" onClick={() => onNav('checkin')}>
            <span className="mc-icon text-3xl sm:text-4xl">🌱</span>
            <span className="mc-title text-lg sm:text-xl">Registro de Huésped</span>
            <span className="mc-desc text-sm sm:text-base">Registrar nuevo huésped y asignar habitación</span>
          </button>
          <button className="menu-card consumo text-left p-5 sm:p-6" onClick={() => onNav('consumo')}>
            <span className="mc-icon text-3xl sm:text-4xl">🍽️</span>
            <span className="mc-title text-lg sm:text-xl">Registrar Consumo</span>
            <span className="mc-desc text-sm sm:text-base">Agregar cargos a una habitación activa</span>
          </button>
          <button className="menu-card ver text-left p-5 sm:p-6" onClick={() => onNav('ver')}>
            <span className="mc-icon text-3xl sm:text-4xl">🔍</span>
            <span className="mc-title text-lg sm:text-xl">Ver Habitación</span>
            <span className="mc-desc text-sm sm:text-base">Consultar consumos y estado de cuenta</span>
          </button>
          <button className="menu-card checkout text-left p-5 sm:p-6" onClick={() => onNav('checkout')}>
            <span className="mc-icon text-3xl sm:text-4xl">🍃</span>
            <span className="mc-title text-lg sm:text-xl">Salida de Huésped</span>
            <span className="mc-desc text-sm sm:text-base">Procesar checkout y generar factura</span>
          </button>
        </div>
      </div>
    </div>
  );
}
