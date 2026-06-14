'use strict';

const jwt = require('jsonwebtoken');
const logger = require('./logger');

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  logger.error('JWT_SECRET no configurado en websocket. Usando secreto temporal.');
  return require('crypto').randomBytes(64).toString('hex');
}

let wss = null;

function initWebSocket(server) {
  const { WebSocketServer } = require('ws');

  wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 1024 * 100,
  });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    ws.on('error', () => {});

    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    if (token) {
      try {
        const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
        if (decoded && decoded.type === 'room' && decoded.roomId) {
          ws.roomAccess = decoded;
        } else if (decoded && decoded.role) {
          ws.user = decoded;
        }
      } catch {
        ws.close(4001, 'Token invalido o expirado');
        return;
      }
    }

    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
  });

  const heartbeatInterval = setInterval(() => {
    if (wss) {
      wss.clients.forEach((ws) => {
        if (ws.readyState === 1) {
          ws.ping();
        }
      });
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
    wss = null;
  });
}

function broadcast(event, data) {
  if (!wss) return;

  const message = JSON.stringify({ type: event, data, timestamp: new Date().toISOString() });
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(message);
    }
  });
}

module.exports = { initWebSocket, broadcast };
