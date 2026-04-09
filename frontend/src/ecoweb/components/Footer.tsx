import { Link } from 'react-router-dom';
import { LogoWhite } from "../assets";

/**
 * Site footer: dark background (bg-primary), logo link to home, dynamic year in copyright.
 * Layout: stacked on small screens, row with space-between on sm+.
 */
export default function Footer() {
  return (
    <footer className="bg-primary py-12">
      <div className="container mx-auto max-w-7xl text-white flex items-center gap-5 sm:justify-between flex-col sm:flex-row">
        <Link to="/landing">
          <LogoWhite />
        </Link>
        <div className="flex flex-col items-center">
          <p>&copy; {new Date().getFullYear()}. All Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
