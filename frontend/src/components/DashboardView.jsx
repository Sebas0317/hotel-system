import { useOutletContext } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';

export default function DashboardView() {
  const { rooms } = useOutletContext();
  return <AdminDashboard rooms={rooms} consumos={[]} />;
}
