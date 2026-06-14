'use strict';

const PERMISSIONS = {
  owner: ['*:*'],
  admin: [
    'rooms:*',
    'consumos:*',
    'users:*',
    'accounting:*',
    'reports:*',
    'auth:*',
    'backup:*',
    'config:*',
    'history:*',
    'reservas:*',
  ],
  operator: [
    'rooms:read',
    'rooms:write',
    'rooms:checkin',
    'consumos:*',
    'accounting:read',
    'reports:read',
    'history:read',
    'reservas:read',
    'reservas:write',
  ],
  analyst: [
    'rooms:read',
    'consumos:read',
    'accounting:*',
    'reports:*',
    'history:read',
  ],
  cliente: ['rooms:read', 'consumos:read'],
};

const ROLE_HIERARCHY = {
  owner: 1000,
  admin: 100,
  operator: 60,
  analyst: 40,
  cliente: 10,
};

function hasPermission(role, permission) {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;

  const permParts = permission.split(':');
  for (const rp of rolePerms) {
    const rpParts = rp.split(':');
    if (rpParts[0] === '*' && rpParts[1] === '*') return true;
    if (rpParts[0] === '*' || rpParts[0] === permParts[0]) {
      if (rpParts[1] === '*' || rpParts[1] === permParts[1]) {
        return true;
      }
    }
  }
  return false;
}

function roleAtLeast(role, minimum) {
  return (ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[minimum] || 0);
}

function getPermissions(role) {
  return PERMISSIONS[role] || [];
}

module.exports = {
  PERMISSIONS,
  ROLE_HIERARCHY,
  hasPermission,
  roleAtLeast,
  getPermissions,
};
