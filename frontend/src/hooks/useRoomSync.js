import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

/**
 * Hook that polls the backend for room changes and triggers a callback.
 * Uses React Query for efficient caching and refetching.
 *
 * @param {Object} options
 * @param {number} options.interval - Polling interval in ms (default: 5000)
 * @param {Function} options.onChange - Callback(roomChanges) when changes detected
 * @param {boolean} options.enabled - Whether polling is active
 */
export function useRoomSync({ interval = 5000, onChange, enabled = true } = {}) {
  const queryClient = useQueryClient();
  const prevSnapshot = useRef('');
  const timerRef = useRef(null);

  const fetchAndCompare = async () => {
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
      
      const snapshot = JSON.stringify(roomsData.map(r => ({ id: r.id, estado: r.estado, huesped: r.huesped, checkIn: r.checkIn })));

      if (prevSnapshot.current && snapshot !== prevSnapshot.current && onChange) {
        try {
          const prev = JSON.parse(prevSnapshot.current);
          const curr = roomsData.map(r => ({ id: r.id, estado: r.estado, huesped: r.huesped, checkIn: r.checkIn }));

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
        } catch {
          // Ignore parse errors
        }
      }

      prevSnapshot.current = snapshot;
    } catch {
      // Silently ignore sync errors
    }
  };

  useEffect(() => {
    if (!enabled) return;

    fetchAndCompare();
    timerRef.current = setInterval(fetchAndCompare, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, interval]);

  return { refresh: fetchAndCompare };
}