import { useState, useEffect, useCallback } from 'react';
import { fetchPrices } from '../services/api';

/**
 * Hook to fetch and manage live prices from the backend.
 * Returns current tariffs and product prices, plus a refresh function.
 * Falls back to empty objects if the API fails.
 *
 * @returns {{ tarifas, productos, loading, refresh }}
 */
export function usePrices() {
  const [tarifas, setTarifas] = useState({});
  const [productos, setProductos] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchPrices();
      if (data?.tarifas) setTarifas(data.tarifas);
      if (data?.productos) setProductos(data.productos);
    } catch {
      // Silently fail — components should have fallbacks
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tarifas, productos, loading, refresh };
}
