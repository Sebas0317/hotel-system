import { useEffect, useRef, useState } from 'react';
import { Timeline, DataSet } from 'vis-timeline/peer';
import 'vis-timeline/styles/vis-timeline-graph2d.css';
import vis from 'vis-timeline/peer';

/**
 * OccupancyTimeline - Gantt chart for room occupancy visualization
 * Uses vis-timeline for interactive timeline display
 * 
 * @param {Object} props
 * @param {Array} props.rooms - Array of room objects with checkIn/checkOut
 */
export function OccupancyTimeline({ rooms }) {
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rooms || rooms.length === 0) {
      setLoading(false);
      return;
    }

    // Transform rooms into timeline items
    const items = new DataSet(
      rooms
        .filter(r => r.checkIn && r.checkOut)
        .map((r, index) => ({
          id: r.id,
          content: `${r.numero} - ${r.huesped || 'Libre'}`,
          start: new Date(r.checkIn),
          end: new Date(r.checkOut),
          type: 'range',
          className: r.estado === 'ocupada' 
            ? 'timeline-occupied' 
            : r.estado === 'reservada'
              ? 'timeline-reserved'
              : 'timeline-available',
          style: r.estado === 'ocupada'
            ? 'background-color: #fcd34d; border-color: #d97706;'
            : r.estado === 'reservada'
              ? 'background-color: #bfdbfe; border-color: #3b82f6;'
              : 'background-color: #bbf7d0; border-color: #16a34a;',
        }))
    );

    // Timeline configuration
    const options = {
      height: '300px',
      start: new Date(new Date().setDate(new Date().getDate() - 7)),
      end: new Date(new Date().setDate(new Date().getDate() + 30)),
      zoomKey: ' ctrlKey',
      horizontalScroll: true,
      zoomMin: 1000 * 60 * 60 * 24 * 7,
      zoomMax: 1000 * 60 * 60 * 24 * 90,
      stack: false,
      showCurrentTime: true,
      editable: false,
      margin: {
        item: 10,
        axis: 5,
      },
    };

    // Initialize timeline
    timelineRef.current = new Timeline(containerRef.current, items, options);

    setLoading(false);

    return () => {
      if (timelineRef.current) {
        timelineRef.current.destroy();
      }
    };
  }, [rooms]);

  if (loading) {
    return (
      <div className="timeline-loading flex items-center justify-center p-8">
        <span className="text-gray-500">Cargando timeline...</span>
      </div>
    );
  }

  return (
    <div className="occupancy-timeline">
      <div ref={containerRef} className="vis-timeline-container" />
      <div className="timeline-legend flex gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-300 rounded" /> Ocupada
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-300 rounded" /> Reservada
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-300 rounded" /> Disponible
        </span>
      </div>
    </div>
  );
}

export default OccupancyTimeline;