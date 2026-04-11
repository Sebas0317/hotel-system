import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRooms } from '../services/api';

export function useRooms() {
  const queryClient = useQueryClient();

  const { data: rooms = [], isLoading: loading, error, refetch: refresh } = useQuery({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  return { rooms, loading, error, refresh };
}

export function useInvalidateRooms() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['rooms'] });
}