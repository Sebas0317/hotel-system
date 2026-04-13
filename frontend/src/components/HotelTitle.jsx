import { memo } from 'react';

/**
 * HotelTitle — Centralized hotel name component.
 * Change the name here to update all views consistently.
 *
 * @param {Object} props
 * @param {'topbar' | 'login'} [props.variant='topbar'] - Rendering style
 * @param {Function} [props.onClick] - Click handler
 */
const HotelTitle = memo(function HotelTitle({ variant = 'topbar', onClick }) {
  if (variant === 'login') {
    return <h1 className="login-title">EcoBosque</h1>;
  }
  if (onClick) {
    return <span className="topbar-title cursor-pointer hover:text-green-600" onClick={onClick}>EcoBosque</span>;
  }
  return <span className="topbar-title">EcoBosque</span>;
});

export default HotelTitle;
