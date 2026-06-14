import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

/**
 * useRoomSync — Real-time room sync via WebSocket with polling fallback.
 *
 * Connects to the backend WebSocket at /ws and listens for 'room:update' events.
 * Falls back to 5-second polling if WebSocket connection fails.
 *
 * @param {Object} options
 * @param {number} options.interval - Polling interval in ms (default: 5000)
 * @param {Function} options.onChange - Callback(roomChanges) when changes detected
 * @param {boolean} options.enabled - Whether sync is active
 */
export function useRoomSync({
  interval = 5000,
  onChange,
  enabled = true,
} = {}) {
  const queryClient = useQueryClient();
  const prevSnapshot = useRef('');
  const timerRef = useRef(null);
  const wsRef = useRef(null);
  const wsConnected = useRef(false);

  const fetchAndCompare = useCallback(async () => {
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ['rooms'],
        staleTime: 30000,
        gcTime: 60000,
        retry: 1,
      });

      if (!data) {
        return;
      }

      const roomsData = Array.isArray(data) ? data : [];
      if (roomsData.length === 0) {
        return;
      }

      const snapshot = JSON.stringify(
        roomsData.map((r) => ({
          id: r.id,
          estado: r.estado,
          huesped: r.huesped,
          checkIn: r.checkIn,
        }))
      );

      if (
        prevSnapshot.current &&
        snapshot !== prevSnapshot.current &&
        onChange
      ) {
        try {
          const prev = JSON.parse(prevSnapshot.current);
          const curr = roomsData.map((r) => ({
            id: r.id,
            estado: r.estado,
            huesped: r.huesped,
            checkIn: r.checkIn,
          }));

          const changes = [];
          curr.forEach((room) => {
            const prevRoom = prev.find((p) => p.id === room.id);
            if (!prevRoom) {
              changes.push({ type: 'added', room });
            } else if (prevRoom.estado !== room.estado) {
              changes.push({
                type: 'status',
                room,
                from: prevRoom.estado,
                to: room.estado,
              });
            } else if (prevRoom.huesped !== room.huesped) {
              changes.push({ type: 'guest', room });
            }
          });

          if (changes.length > 0) {
            onChange(changes);
          }
        } catch {
          // Ignore parse errors
        }
      }

      prevSnapshot.current = snapshot;
    } catch {
      // Silently ignore sync errors
    }
  }, [onChange, queryClient]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!enabled) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    let reconnectTimer;

    function connect() {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          wsConnected.current = true;
          // Clear polling interval when WS is connected
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'room:update' || msg.type === 'room:changes') {
              // Invalidate query cache to trigger re-fetch
              queryClient.invalidateQueries({ queryKey: ['rooms'] });
            }
          } catch {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          wsConnected.current = false;
          wsRef.current = null;
          // Fall back to polling on disconnect
          startPolling();
          // Attempt reconnection after 3 seconds
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          // onerror will be followed by onclose, which handles fallback
          ws.close();
        };
      } catch {
        // WebSocket not available, fall back to polling
        startPolling();
      }
    }

    function startPolling() {
      if (timerRef.current) return;
      fetchAndCompare();
      timerRef.current = setInterval(fetchAndCompare, interval);
    }

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [enabled, interval, fetchAndCompare, queryClient]);

  return { refresh: fetchAndCompare };
}
