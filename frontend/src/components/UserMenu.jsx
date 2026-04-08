import { useState, useEffect } from 'react';
import { fetchRooms } from '../services/api';
import HotelTitle from './HotelTitle';

export default function UserMenu({ onNavigate, onExit }) {
  const [stats, setStats] = useState({ total: 0, occupied: 0, reserved: 0, available: 0 });

  useEffect(() => {
    fetchRooms()
      .then((rooms) => {
        setStats({
          total: rooms.length,
          occupied: rooms.filter((r) => r.estado === 'ocupada').length,
          reserved: rooms.filter((r) => r.estado === 'reservada').length,
          available: rooms.filter((r) => r.estado === 'disponible').length,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
        <div className="topbar-left flex items-center gap-2">
          <span className="topbar-logo text-xl"></span>
          <HotelTitle />
          <span className="topbar-badge user text-xs">Front Desk</span>
        </div>
        <button className="btn-salir text-sm" onClick={onExit}>Exit</button>
      </header>

      <div className="usuario-content p-4 sm:p-6 max-w-[800px] mx-auto">
        <div className="usuario-stats flex flex-wrap gap-2 sm:gap-3 mb-6">
          <div className="stat-pill total flex-1 min-w-[80px]"><span className="sp-num text-xl sm:text-3xl">{stats.total}</span><span className="sp-lbl text-[10px] sm:text-xs">Total</span></div>
          <div className="stat-pill occupied flex-1 min-w-[80px]"><span className="sp-num text-xl sm:text-3xl">{stats.occupied}</span><span className="sp-lbl text-[10px] sm:text-xs">Occupied</span></div>
          <div className="stat-pill reserved flex-1 min-w-[80px]"><span className="sp-num text-xl sm:text-3xl">{stats.reserved}</span><span className="sp-lbl text-[10px] sm:text-xs">Reserved</span></div>
          <div className="stat-pill available flex-1 min-w-[80px]"><span className="sp-num text-xl sm:text-3xl">{stats.available}</span><span className="sp-lbl text-[10px] sm:text-xs">Available</span></div>
        </div>

        <div className="menu-grid grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <button className="menu-card checkin text-left p-5 sm:p-6" onClick={() => onNavigate('register')}>
            <span className="mc-icon text-3xl sm:text-4xl"></span>
            <span className="mc-title text-lg sm:text-xl">Guest Registration</span>
            <span className="mc-desc text-sm sm:text-base">Register new guest and assign room</span>
          </button>
          <button className="menu-card consumo text-left p-5 sm:p-6" onClick={() => onNavigate('transactions')}>
            <span className="mc-icon text-3xl sm:text-4xl"></span>
            <span className="mc-title text-lg sm:text-xl">Transaction Entry</span>
            <span className="mc-desc text-sm sm:text-base">Add charges to active room</span>
          </button>
          <button className="menu-card ver text-left p-5 sm:p-6" onClick={() => onNavigate('room')}>
            <span className="mc-icon text-3xl sm:text-4xl"></span>
            <span className="mc-title text-lg sm:text-xl">Room Status</span>
            <span className="mc-desc text-sm sm:text-base">View transactions and account balance</span>
          </button>
          <button className="menu-card checkout text-left p-5 sm:p-6" onClick={() => onNavigate('checkout')}>
            <span className="mc-icon text-3xl sm:text-4xl"></span>
            <span className="mc-title text-lg sm:text-xl">Guest Checkout</span>
            <span className="mc-desc text-sm sm:text-base">Process checkout and generate invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
}