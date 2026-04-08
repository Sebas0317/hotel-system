import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchRooms } from '../services/api';

/**
 * Hook that polls the backend for room changes and triggers a callback.
 * Compares room data snapshots to detect updates.
 *
 * @param {Object} options
 * @param {number} options.interval - Polling interval in ms (default: 5000)
 * @param {Function} options.onChange - Callback(roomChanges) when changes detected
 * @param {boolean} options.enabled - Whether polling is active
 * @returns {{ rooms, loading, error, refresh }}
 */
export function useRoomSync({ interval = 5000, onChange, enabled = true } = {}) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prevSnapshot = useRef('');
  const timerRef = useRef(null);

  const fetchAndCompare = useCallback(async () => {
    try {
      const data = await fetchRooms();
      const snapshot = JSON.stringify(data.map(r => ({ id: r.id, estado: r.estado, huesped: r.huesped, checkIn: r.checkIn })));

      if (prevSnapshot.current && snapshot !== prevSnapshot.current && onChange) {
        const prev = JSON.parse(prevSnapshot.current);
        const curr = data.map(r => ({ id: r.id, estado: r.estado, huesped: r.huesped, checkIn: r.checkIn }));

        const changes = [];
        curr.forEach((room) => {
          const prevRoom = prev.find(p => p.id === room.id);
          if (!prevRoom) {
            changes.push({ type: 'added', room });
          } else if (prevRoom.estado !== room.estado) {
            changes.push({ type: 'status', room, from: prevRoom.estado, to: room.estado });
          } else if (prevRoom.huesped !== room.huesped) {
            changes.push({ type: 'guest', room });
          }
        });

        if (changes.length > 0) {
          onChange(changes);
        }
      }

      prevSnapshot.current = snapshot;
      setRooms(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    if (!enabled) return;

    fetchAndCompare();
    timerRef.current = setInterval(fetchAndCompare, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, interval, fetchAndCompare]);

  return { rooms, loading, error, refresh: fetchAndCompare };
}
