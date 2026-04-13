import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPrices, updatePrices } from '../services/api';

/**
 * Hook to fetch and manage live prices from the backend using React Query.
 * Provides automatic caching, deduplication, and background refetching.
 *
 * @returns {{ tarifas, productos, isLoading, refresh, update }}
 */
export function usePrices() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['prices'],
    queryFn: fetchPrices,
    staleTime: 5 * 60 * 1000, // 5 minutes — prices change rarely
    gcTime: 30 * 60 * 1000,   // Keep in cache for 30 minutes
    retry: 1,
  });

  const update = useMutation({
    mutationFn: updatePrices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prices'] });
    },
  });

  return {
    tarifas: data?.tarifas || {},
    productos: data?.productos || {},
    isLoading,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['prices'] }),
    update: update.mutateAsync,
    isUpdating: update.isPending,
  };
}
