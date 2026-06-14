import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { queryKeys } from '../hooks/useQueryKeys';
import { fetchSecurityEvents, fetchUsers } from '../services/api';
import SecurityDashboard from './SecurityDashboard';

export default function SecurityView() {
  const { rooms } = useOutletContext();

  const { data: secEvents } = useQuery({
    queryKey: queryKeys.securityEvents,
    queryFn: () => fetchSecurityEvents(200),
    staleTime: 1000 * 60,
  });

  const { data: secUsers } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => fetchUsers(),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <SecurityDashboard
      events={secEvents || []}
      users={secUsers || []}
      rooms={rooms}
    />
  );
}
