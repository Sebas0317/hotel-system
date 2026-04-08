import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function ScrollToTop() {
  const navigate = useNavigate();

  useEffect(() => {
    const unlisten = navigate(() => {
      window.scrollTo(0, 0);
    });
    return unlisten;
  }, [navigate]);

  return null;
}
