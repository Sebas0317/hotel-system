import { useScrollToTop } from '../hooks';

/**
 * Renders nothing; runs useScrollToTop to scroll window to top when the route pathname changes.
 * Used on Home and RoomDetails so navigating between list and detail (or back) resets scroll position.
 */
export function ScrollToTop() {
  useScrollToTop();
  return null;
}
