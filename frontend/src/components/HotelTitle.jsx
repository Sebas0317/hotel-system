/**
 * HotelTitle — Centralized hotel name component.
 * Change the name here to update all views consistently.
 *
 * @param {Object} props
 * @param {'topbar' | 'login'} [props.variant='topbar'] - Rendering style
 */
export default function HotelTitle({ variant = 'topbar' }) {
  if (variant === 'login') {
    return <h1 className="login-title">EcoBosque</h1>;
  }
  return <span className="topbar-title">EcoBosque</span>;
}
