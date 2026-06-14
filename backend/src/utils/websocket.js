'use strict';

const jwt = require('jsonwebtoken');
const logger = require('./logger');

function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  logger.error(
    'JWT_SECRET no configurado en websocket. Usando secreto temporal.'
  );
  return require('node:crypto').randomBytes(64).toString('hex');
}

const PONG_TIMEOUT = 10000; // 10s to respond to ping

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

    // Require authentication (C30)
    if (!token) {
      ws.close(4001, 'Token requerido');
      return;
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret(), {
        algorithms: ['HS256'],
      });
      if (decoded && decoded.type === 'room' && decoded.roomId) {
        ws.roomAccess = decoded;
      } else if (decoded?.role) {
        ws.user = decoded;
      } else {
        ws.close(4001, 'Token invalido');
        return;
      }
    } catch {
      ws.close(4001, 'Token invalido o expirado');
      return;
    }

    // Track pong responses to detect dead connections (C29)
    let pongTimer = null;
    const resetPongTimer = () => {
      if (pongTimer) clearTimeout(pongTimer);
      pongTimer = setTimeout(() => {
        logger.warn(
          { ip: clientIp },
          'WebSocket pong timeout — closing dead connection'
        );
        ws.close(4002, 'Pong timeout');
      }, PONG_TIMEOUT);
    };
    ws.on('pong', resetPongTimer);
    ws.on('close', () => {
      if (pongTimer) clearTimeout(pongTimer);
    });
    resetPongTimer();

    ws.send(
      JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })
    );
  });

  const heartbeatInterval = setInterval(() => {
    if (wss) {
      wss.clients.forEach((ws) => {
        if (ws.readyState === 1) {
          try {
            ws.ping();
          } catch {
            /* socket already destroyed */
          }
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

  const roomId = data?.id || data?.roomId;
  const message = JSON.stringify({
    type: event,
    data,
    timestamp: new Date().toISOString(),
  });
  wss.clients.forEach((ws) => {
    if (ws.readyState !== 1) return;
    // Admin users receive all broadcasts
    if (ws.user) return ws.send(message);
    // Guest connections only receive their own room's events
    if (
      ws.roomAccess &&
      roomId &&
      String(ws.roomAccess.roomId) === String(roomId)
    ) {
      return ws.send(message);
    }
  });
}

module.exports = { initWebSocket, broadcast };
