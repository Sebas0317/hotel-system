import { useContext } from 'react';
import { RoomInfo } from './RoomContext';

export function useRoomContext() {
  const ctx = useContext(RoomInfo);
  if (!ctx) throw new Error('useRoomContext must be used within RoomContext');
  return ctx;
}