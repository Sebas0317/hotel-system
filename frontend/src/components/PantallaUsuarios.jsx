import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle,
  Key,
  Loader,
  RefreshCw,
  Search,
  Shield,
  ShieldOff,
  Smartphone,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast as sonnerToast } from 'sonner';
import {
  createUser,
  deleteUser,
  fetchUserStats,
  fetchUsers,
  resetUserPassword,
  updateUser,
} from '../services/api';

const ROLE_CONFIG = {
  owner: {
    label: 'Owner',
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  admin: {
    label: 'Admin',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  operator: {
    label: 'Operador',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  analyst: {
    label: 'Analista',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  cliente: {
    label: 'Cliente',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.cliente;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

function UserFormModal({ isOpen, onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('cliente');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      return setError('Completa los campos requeridos');
    }
    if (password.length < 8)
      return setError('La contrasena debe tener al menos 8 caracteres');
    setLoading(true);
    setError('');
    try {
      const _result = await createUser({
        username,
        email,
        password,
        firstName,
        lastName,
        role,
      });
      sonnerToast.success('Usuario creado exitosamente');
      onSuccess();
      onClose();
    } catch (e) {
      setError(e.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Nuevo usuario</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                placeholder="Juan"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Apellido
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
                placeholder="Perez"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Usuario *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
              placeholder="juanperez"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Correo *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
              placeholder="juan@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Contrasena *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
              placeholder="Min. 8 caracteres"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Rol
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
            >
              <option value="cliente">Cliente</option>
              <option value="operator">Operador</option>
              <option value="analyst">Analista</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {loading ? 'Creando...' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ isOpen, onClose, user, onSuccess }) {
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setIsActive(user.isActive);
      setEmailVerified(user.emailVerified);
      setTwoFactorEnabled(user.twoFactorEnabled);
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await updateUser(user.id, {
        role,
        isActive,
        emailVerified,
        twoFactorEnabled,
        firstName,
        lastName,
      });
      sonnerToast.success('Usuario actualizado');
      onSuccess();
      onClose();
    } catch (e) {
      setError(e.message || 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Editar usuario</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Apellido
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Rol
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
            >
              <option value="cliente">Cliente</option>
              <option value="operator">Operador</option>
              <option value="analyst">Analista</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
              <span className="text-sm font-medium text-gray-700">
                Cuenta activa
              </span>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`w-11 h-6 rounded-full transition-colors relative ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5 left-0.5' : 'left-0.5'}`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Correo verificado
                </span>
                <p className="text-xs text-gray-400">
                  El usuario confirmo su correo
                </p>
              </div>
              <button
                onClick={() => setEmailVerified(!emailVerified)}
                className={`w-11 h-6 rounded-full transition-colors relative ${emailVerified ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailVerified ? 'translate-x-5 left-0.5' : 'left-0.5'}`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  2FA activado
                </span>
                <p className="text-xs text-gray-400">
                  Autenticacion en dos pasos
                </p>
              </div>
              <button
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative ${twoFactorEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${twoFactorEnabled ? 'translate-x-5 left-0.5' : 'left-0.5'}`}
                />
              </button>
            </label>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ isOpen, onClose, user }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const handleReset = async () => {
    if (newPassword.length < 8)
      return setError('La contrasena debe tener al menos 8 caracteres');
    if (newPassword !== confirmPassword)
      return setError('Las contrasenas no coinciden');
    if (requires2FA && twoFactorCode.length !== 6)
      return setError('Ingresa el codigo 2FA de 6 digitos');
    setLoading(true);
    setError('');
    try {
      await resetUserPassword(
        user.id,
        newPassword,
        requires2FA ? twoFactorCode : undefined
      );
      sonnerToast.success('Contrasena restablecida');
      onClose();
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('2FA') || msg.includes('requires2FA')) {
        setRequires2FA(true);
      }
      setError(msg || 'Error al restablecer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Restablecer contrasena
            </h3>
            <p className="text-sm text-gray-500">
              {user.username} — {user.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Nueva contrasena
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
              placeholder="Min. 8 caracteres"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Confirmar contrasena
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
              placeholder="Repite la contrasena"
            />
          </div>

          {requires2FA && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                <Smartphone className="w-3 h-3 inline mr-1" />
                Codigo 2FA (enviado a tu correo)
              </label>
              <input
                type="text"
                value={twoFactorCode}
                onChange={(e) =>
                  setTwoFactorCode(
                    e.target.value.replace(/\D/g, '').slice(0, 6)
                  )
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 tracking-[0.5em] text-center font-mono text-lg"
                placeholder="000000"
                maxLength={6}
              />
              <p className="text-xs text-gray-400 mt-1">
                Ingresa el codigo enviado a tu correo electronico
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Key className="w-4 h-4" />
            )}
            {loading ? 'Restableciendo...' : 'Restablecer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ isOpen, onClose, user, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      await deleteUser(user.id);
      sonnerToast.success('Usuario eliminado');
      onSuccess();
      onClose();
    } catch (e) {
      setError(e.message || 'Error al eliminar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
          Eliminar usuario
        </h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          Esta accion no se puede deshacer. Se eliminara a{' '}
          <strong>{user.username}</strong> ({user.email}).
        </p>
        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PantallaUsuarios({ userRole = 'admin' }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetPwdUser, setResetPwdUser] = useState(null);
  const [deleteUserState, setDeleteUserState] = useState(null);

  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () =>
      fetchUsers({ search, role: roleFilter || undefined, sort: 'created' }),
    staleTime: 10000,
  });

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: fetchUserStats,
    staleTime: 30000,
  });

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    sonnerToast.info('Usuarios actualizados');
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500">
            {stats
              ? `${stats.total} usuarios (${stats.activos} activos)`
              : 'Gestion de cuentas'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-500 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo usuario
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
            <div
              key={key}
              className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}
            >
              <p className={`text-2xl font-bold ${cfg.color}`}>
                {stats.porRol[key] || 0}
              </p>
              <p className={`text-xs font-medium ${cfg.color} opacity-70`}>
                {cfg.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, usuario o correo..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
        >
          <option value="">Todos los roles</option>
          <option value="admin">Admin</option>
          <option value="operator">Operador</option>
          <option value="analyst">Analista</option>
          <option value="cliente">Cliente</option>
        </select>
      </div>

      {/* User table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Usuario
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Email
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">
                    Rol
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">
                    Estado
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="h-4 w-36 animate-pulse bg-gray-200 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-52 animate-pulse bg-gray-200 rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse bg-gray-200 rounded mx-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-16 animate-pulse bg-gray-200 rounded mx-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse bg-gray-200 rounded ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">
          Error al cargar usuarios
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No se encontraron usuarios</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Usuario
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Correo
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Rol
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">
                    Estado
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">
                    2FA
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Ultimo acceso
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Creado
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {u.firstName || u.lastName
                              ? `${u.firstName || ''} ${u.lastName || ''}`.trim()
                              : u.username}
                          </p>
                          <p className="text-xs text-gray-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.twoFactorEnabled ? (
                        <Shield className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <ShieldOff className="w-4 h-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDate(u.lastLogin)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditUser(u)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"
                          title="Editar"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setResetPwdUser(u)}
                          className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-600"
                          title="Restablecer contrasena"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        {(u.role !== 'admin' && u.role !== 'owner') ||
                        userRole === 'owner' ? (
                          <button
                            onClick={() => setDeleteUserState(u)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <UserFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['user-stats'] });
        }}
      />
      <EditUserModal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        user={editUser}
        onSuccess={() => {
          refetch();
        }}
      />
      <ResetPasswordModal
        isOpen={!!resetPwdUser}
        onClose={() => setResetPwdUser(null)}
        user={resetPwdUser}
      />
      <ConfirmDeleteModal
        isOpen={!!deleteUserState}
        onClose={() => setDeleteUserState(null)}
        user={deleteUserState}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['user-stats'] });
        }}
      />
    </div>
  );
}
