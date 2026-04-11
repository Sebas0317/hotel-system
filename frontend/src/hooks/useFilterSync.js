import { useMemo, useEffect, useState, useCallback } from 'react';

/**
 * Custom hook that synchronizes admin filter state with URL hash.
 * Uses hash-based routing for cleaner URLs.
 * 
 * Hash format: #/admin/[filter]/[roomId]
 * Examples:
 *   #/admin - all rooms
 *   #/admin/limpieza - filter by limpieza
 *   #/admin/limpieza/sb-101 - room detail open
 */
export function useFilterSync() {
  const [hashState, setHashState] = useState(() => {
    const hash = window.location.hash.slice(1) || '/admin';
    return parseHash(hash);
  });

  function parseHash(hash) {
    const parts = hash.split('/').filter(Boolean);
    return {
      filtro: parts[1] || 'todos',
      room: parts[2] || null
    };
  }

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '/admin';
      setHashState(parseHash(hash));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const updateHash = useCallback((updates) => {
    setHashState(prev => {
      const newParams = { ...prev, ...updates };
      const parts = ['/admin', newParams.filtro !== 'todos' ? newParams.filtro : '', newParams.room || ''].filter(Boolean);
      const newHash = parts.join('/');
      window.location.hash = newHash;
      return newParams;
    });
  }, []);

  const setFiltro = useCallback((value) => {
    updateHash({ filtro: value });
  }, [updateHash]);

  const setRoom = useCallback((roomId) => {
    if (roomId) {
      updateHash({ room: roomId });
    } else {
      updateHash({ room: null });
    }
  }, [updateHash]);

  const setTipo = useCallback(() => {}, []);
  const setBuscar = useCallback(() => {}, []);
  const tipo = 'todos';
  const buscar = '';

  return useMemo(
    () => ({ 
      filtro: hashState.filtro, 
      setFiltro, 
      tipo, 
      setTipo, 
      buscar, 
      setBuscar,
      room: hashState.room,
      setRoom
    }),
    [hashState.filtro, hashState.room, setFiltro, setRoom]
  );
}