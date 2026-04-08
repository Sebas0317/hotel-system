import { useState, useEffect } from 'react';
import { fetchRooms } from '../services/api';
import HotelTitle from './HotelTitle';

export default function UserMenu({ onNavigate, onExit }) {
  return (
    <div className="app-shell">
      <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
        <div className="topbar-left flex items-center gap-2">
          <span className="topbar-logo text-xl"></span>
          <HotelTitle />
          <span className="topbar-badge user text-xs">User</span>
        </div>
        <button className="btn-salir text-sm" onClick={onExit}>Exit</button>
      </header>

      <div className="usuario-content p-4 sm:p-6 max-w-[800px] mx-auto">
        <div className="menu-grid grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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