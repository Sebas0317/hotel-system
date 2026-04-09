import { Route, Routes } from 'react-router-dom';
import { Footer, Header, PageNotFound } from './components';
import Home from './pages/Home';
import RoomDetails from './pages/RoomDetails';
import { RoomContext } from './context/RoomContext';

/**
 * Root app: router with Header/Footer and routes for Home, RoomDetails and 404.
 * Mounted at /landing in the main app (no nested router, uses absolute paths).
 */
function App() {
  return (
    <RoomContext>
      <main className="">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:id" element={<RoomDetails />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        <Footer />
      </main>
    </RoomContext>
  );
}

export default App;
