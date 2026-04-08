import { createContext, useState } from 'react';
import { roomData } from '../data';

export const RoomInfo = createContext(null);

export function RoomContext({ children }) {
  const [rooms, setRooms] = useState(roomData);
  const [loading, setLoading] = useState(false);
  const [adults, setAdults] = useState('1 Adult');
  const [kids, setKids] = useState('0 Kid');

  const total = +adults[0] + +kids[0];

  const resetRoomFilterData = () => {
    setAdults('1 Adult');
    setKids('0 Kid');
    setRooms(roomData);
  };

  const handleCheck = (e) => {
    e.preventDefault();
    setLoading(true);
    const filterRooms = roomData.filter((room) => total <= room.maxPerson);
    setTimeout(() => {
      setLoading(false);
      setRooms(filterRooms);
    }, 3000);
  };

  const value = {
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
