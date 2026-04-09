import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { RoomContextValue } from '../types';
import { roomData } from '../data';

// Context holds room list, loading, guest counts, and filter/reset actions.
// Default null; Provider in RoomContext() sets the value.
const RoomInfo = createContext<RoomContextValue | null>(null);

/**
 * RoomContext provides room list, loading state, guest counts (adults/kids),
 * and check/reset actions. Used for filtering rooms by capacity.
 * - rooms: filtered list (or full roomData after reset).
 * - total: derived from first character of adults + kids strings (e.g. "2 Adults" -> 2).
 * - handleCheck: filters roomData by total <= room.maxPerson, then sets rooms after 3s (simulated loading).
 */
export function RoomContext({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState(roomData);
  const [loading, setLoading] = useState(false);
  const [adults, setAdults] = useState('1 Adult');
  const [kids, setKids] = useState('0 Kid');
  const [total, setTotal] = useState(0);

  // Keep total in sync with adults/kids (e.g. "2 Adults" + "1 Kid" -> total 3).
  useEffect(() => {
    setTotal(+adults[0] + +kids[0]);
  }, [adults, kids]);

  // Restore initial guest counts and show all rooms again.
  const resetRoomFilterData = () => {
    setAdults('1 Adult');
    setKids('0 Kid');
    setRooms(roomData);
  };

  // On "Check Now": show spinner, filter rooms by capacity, update list after 3s delay.
  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const filterRooms = roomData.filter((room) => total <= room.maxPerson);
    setTimeout(() => {
      setLoading(false);
      setRooms(filterRooms);
    }, 3000);
  };

  const value: RoomContextValue = {
    rooms,
    loading,
    adults,
    setAdults,
    kids,
    setKids,
    handleCheck,
    resetRoomFilterData,
  };

  return <RoomInfo.Provider value={value}>{children}</RoomInfo.Provider>;
}

/* eslint-disable react-refresh/only-export-components -- context + hook in same file is a common pattern */
/** Hook to read/write room state and actions. Must be used inside a RoomContext provider. */
export function useRoomContext(): RoomContextValue {
  const ctx = useContext(RoomInfo);
  if (!ctx) throw new Error('useRoomContext must be used within RoomContext');
  return ctx;
}
