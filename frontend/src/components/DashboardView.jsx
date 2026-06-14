import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchConsumos } from '../services/api';
import { AdminDashboard } from './AdminDashboard';

export default function DashboardView() {
  const { rooms } = useOutletContext();
  const [consumos, setConsumos] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      (rooms || [])
        .filter((r) => r.estado === 'ocupada' || r.estado === 'reservada')
        .map((r) => fetchConsumos(r.id).catch(() => []))
    ).then((results) => {
      if (!cancelled) setConsumos(results.flat());
    });
    return () => {
      cancelled = true;
    };
  }, [rooms]);

  return <AdminDashboard rooms={rooms} consumos={consumos} />;
}
