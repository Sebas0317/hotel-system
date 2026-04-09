import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

/**
 * Scrolls window to top when route pathname changes.
 * Must be used inside React Router (e.g. inside a route element) so useLocation() returns the current path.
 * Used by ScrollToTop component on Home and RoomDetails.
 */
export function useScrollToTop(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
}
