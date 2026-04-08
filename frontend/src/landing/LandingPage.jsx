import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RoomContext } from './context/RoomContext';
import { Header, Footer, PageNotFound, ScrollToTop } from './components';
import Home from './pages/Home';
import RoomDetails from './pages/RoomDetails';
import './style/index.css';

/**
 * LandingPage — standalone app wrapper for the hotel booking landing page.
 * Has its own BrowserRouter so it doesn't conflict with the main app's router.
 * All routes are relative to /landing (set in App.jsx route path).
 */
export default function LandingPage() {
  return (
    <BrowserRouter>
      <RoomContext>
        <ScrollToTop />
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:id" element={<RoomDetails />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        <Footer />
      </RoomContext>
    </BrowserRouter>
  );
}
