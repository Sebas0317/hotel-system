import { useState, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * RoomCalendar - Visual calendar for room availability
 * Uses react-day-picker for date selection and display
 * 
 * @param {Object} props
 * @param {Array} props.room - Room object with reservations
 * @param {Function} props.onSelect - Date selection handler
 * @param {string} props.mode - 'single' | 'range'
 */
export function RoomCalendar({ room, onSelect, mode = 'range' }) {
  const [selectedRange, setSelectedRange] = useState({
    from: undefined,
    to: undefined
  });

  // Get occupied dates from reservations
  const disabledDays = useMemo(() => {
    if (!room) return [];
    
    const dates = [];
    if (room.estado === 'ocupada' && room.checkIn && room.checkOut) {
      const start = new Date(room.checkIn);
      const end = new Date(room.checkOut);
      for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    }
    return dates;
  }, [room]);

  const handleSelect = (dateOrRange) => {
    if (mode === 'range') {
      setSelectedRange(dateOrRange || { from: undefined, to: undefined });
    }
    if (onSelect) {
      onSelect(dateOrRange);
    }
  };

  return (
    <div className="room-calendar">
      <DayPicker
        mode={mode}
        selected={selectedRange}
        onSelect={handleSelect}
        disabled={disabledDays}
        locale={es}
        numberOfMonths={2}
        className="custom-daypicker"
        modifiers={{
          reserved: disabledDays
        }}
        modifiersStyles={{
          reserved: { 
            backgroundColor: '#fee2e2', 
            color: '#dc2626',
            fontWeight: 'bold'
          }
        }}
        components={{
          IconLeft: () => <ChevronLeft className="w-4 h-4" />,
          IconRight: () => <ChevronRight className="w-4 h-4" />
        }}
        footer={
          selectedRange?.from ? (
            <p className="text-sm text-gray-600 mt-2">
              {selectedRange.to ? (
                <>Seleccionado: {selectedRange.from.toLocaleDateString()} - {selectedRange.to.toLocaleDateString()}</>
              ) : (
                <>Desde: {selectedRange.from.toLocaleDateString()}</>
              )}
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-2">Selecciona fechas</p>
          )
        }
      />
    </div>
  );
}

export default RoomCalendar;