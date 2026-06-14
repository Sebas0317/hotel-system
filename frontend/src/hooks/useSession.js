import { useCallback, useEffect, useRef, useState } from 'react';

const EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export function useSession({
  timeout = 10 * 60 * 1000,
  onExpire,
  enabled = true,
  warningMs = 60 * 1000,
}) {
  const timerRef = useRef(null);
  const [remaining, setRemaining] = useState(timeout);
  const isWarning = remaining <= warningMs;

  const reset = useCallback(() => {
    setRemaining(timeout);
  }, [timeout]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      clear();
      setRemaining(timeout);
      return;
    }

    const handleActivity = () => {
      setRemaining(timeout);
    };

    EVENTS.forEach((ev) =>
      document.addEventListener(ev, handleActivity, { passive: true })
    );
    handleActivity();

    return () => {
      EVENTS.forEach((ev) => document.removeEventListener(ev, handleActivity));
    };
  }, [enabled, timeout, clear]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          clear();
          onExpire?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    timerRef.current = interval;
    return () => clear();
  }, [enabled, onExpire, clear]);

  return { remaining, isWarning, reset, clear };
}
