import { Navigate } from 'react-router-dom';

const ROLES = {
  admin: (rol) => rol && rol !== 'user' && rol !== 'cliente',
  user: (rol) => rol === 'user' || rol === 'cliente',
  any: (rol) => !!rol,
  guest: (rol) => !rol,
};

export default function ProtectedRoute({ rol, allowed, children }) {
  if (allowed === 'guest' && rol) {
    return null;
  }
  const check = ROLES[allowed] || ROLES.any;
  if (check(rol)) return children;
  return <Navigate to="/" replace />;
}
