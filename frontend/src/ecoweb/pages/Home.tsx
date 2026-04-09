import { BookForm, HeroSlider, Rooms, ScrollToTop } from '../components';

/**
 * Home page: hero slider, booking form overlay, and room grid (filtered by guest count when user clicks Check Now).
 * BookForm sits in a strip that overlaps the hero on large screens (lg:absolute lg:-top-12); Rooms shows the grid below.
 */
export default function Home() {
  return (
    <div>
      <ScrollToTop />
      <HeroSlider />
      <div className="container mx-auto max-w-7xl relative">
        <div className="bg-accent/20 mt-4 p-4 lg:absolute lg:left-0 lg:right-0 lg:p-0 lg:-top-12 lg:z-30 lg:shadow-xl">
          <BookForm />
        </div>
      </div>
      <Rooms />
    </div>
  );
}
