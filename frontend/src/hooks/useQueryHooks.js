/**
 * useRoomsQuery - Hook for fetching rooms with TanStack Query
 * 
 * Replaces manual useEffect + fetch with proper caching
 */
import { useQuery } from '@tanstack/react-query';
import { fetchRooms } from '../services/api';
import { queryKeys, staleTimes } from './useQueryKeys';

export function useRoomsQuery() {
  return useQuery({
    queryKey: queryKeys.rooms,
    queryFn: fetchRooms,
    staleTime: staleTimes.rooms,
  });
}

/**
 * useHistoryQuery - Hook for fetching reservation history
 */
import { fetchHistory } from '../services/api';

export function useHistoryQuery() {
  return useQuery({
    queryKey: queryKeys.history,
    queryFn: fetchHistory,
    staleTime: staleTimes.history,
  });
}

/**
 * useAccountingQuery - Hook for fetching accounting summary
 */
import { fetchAccountingSummary } from '../services/api';

export function useAccountingQuery() {
  return useQuery({
    queryKey: queryKeys.accounting,
    queryFn: fetchAccountingSummary,
    staleTime: staleTimes.accounting,
  });
}

/**
 * useConsumosQuery - Hook for fetching room consumos
 */
import { fetchConsumos } from '../services/api';

export function useConsumosQuery(roomId) {
  return useQuery({
    queryKey: queryKeys.consumos(roomId),
    queryFn: () => fetchConsumos(roomId),
    staleTime: staleTimes.consumos,
    enabled: !!roomId,
  });
}