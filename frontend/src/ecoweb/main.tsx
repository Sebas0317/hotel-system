import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { RoomContext } from './context/RoomContext';
import './style/fonts.css';
import './style/index.css';

// Entry point: mount React into #root. RoomContext wraps the whole app so any
// component can access rooms, loading, adults/kids, and filter actions via useRoomContext().
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <RoomContext>
    <StrictMode>
      <App />
    </StrictMode>
  </RoomContext>
);
