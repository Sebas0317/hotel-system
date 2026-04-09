import { Route, Routes } from 'react-router-dom';
import { Footer, Header, PageNotFound } from './components';
import Home from './pages/Home';
import { RoomContext } from './context/RoomContext';

/**
 * Root app: router with Header/Footer and routes for Home and 404.
 * Mounted at /landing in the main app.
 */
function App() {
  return (
    <RoomContext>
      <main className="">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        <Footer />
      </main>
    </RoomContext>
  );
}

export default App;
