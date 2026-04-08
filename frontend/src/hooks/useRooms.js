import { useState, useEffect, useCallback } from 'react';
import { fetchRooms } from '../services/api';

/**
 * Hook to fetch and manage rooms data
 * Provides loading, error states and auto-refresh capability
 * @returns {Object} { rooms, loading, error, refresh }
 */
export function useRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRooms();
      setRooms(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rooms, loading, error, refresh };
}
