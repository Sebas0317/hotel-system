'use strict';

/**
 * WebSocket broadcast utility for real-time updates.
 * Emits room state changes to all connected clients.
 * Falls back gracefully if WebSocket server is not initialized.
 */

let wss = null;

function initWebSocket(server) {
  const { WebSocketServer } = require('ws');

  wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 1024 * 100, // 100KB
  });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    ws.on('error', () => {}); // Prevent crash on client disconnect

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
  });

  const heartbeatInterval = setInterval(() => {
    if (wss) {
      wss.clients.forEach((ws) => {
        if (ws.readyState === 1) { // OPEN
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
    if (ws.readyState === 1) { // OPEN
      ws.send(message);
    }
  });
}

module.exports = { initWebSocket, broadcast };
