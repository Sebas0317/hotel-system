import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Custom hook that synchronizes admin filter state with URL query parameters.
 *
 * URL params used:
 *   ?estado=ocupada   — filters by room status (ocupada/reservada/disponible)
 *   ?tipo=doble       — filters by room type (estándar/doble/deluxe/suite/etc.)
 *   ?buscar=101       — search term for room number or guest name
 *
 * Behavior:
 *   - On mount: reads current URL params and uses them as initial filter values
 *   - On filter change: updates the URL via useSearchParams (replace mode to avoid history bloat)
 *   - Browser back/forward buttons automatically restore previous filter states
 *   - Bookmarked or shared URLs with params will auto-apply filters on load
 *
 * @returns {{ filtro, setFiltro, tipo, setTipo, buscar, setBuscar }}
 */
export function useFilterSync() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filtro = searchParams.get('estado') || 'todos';
  const tipo = searchParams.get('tipo') || 'todos';
  const buscar = searchParams.get('buscar') || '';

  const setFiltro = (value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'todos') {
        next.delete('estado');
      } else {
        next.set('estado', value);
      }
      return next;
    }, { replace: true });
  };

  const setTipo = (value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'todos') {
        next.delete('tipo');
      } else {
        next.set('tipo', value);
      }
      return next;
    }, { replace: true });
  };

  const setBuscar = (value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value) {
        next.delete('buscar');
      } else {
        next.set('buscar', value);
      }
      return next;
    }, { replace: true });
  };

  return useMemo(
    () => ({ filtro, setFiltro, tipo, setTipo, buscar, setBuscar }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtro, tipo, buscar]
  );
}
