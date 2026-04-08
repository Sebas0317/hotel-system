import { useRoomContext } from '../context/RoomContext';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoWhite, LogoDark } from '../assets';

export default function Header() {
  const { resetRoomFilterData } = useRoomContext();
  const [header, setHeader] = useState(false);

  useEffect(() => {
    const handler = () => setHeader(window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = ['Home', 'Rooms', 'Restaurant', 'Spa', 'Contact'];

  return (
    <header
      className={`fixed z-50 w-full min-h-[72px] py-6 transition-colors duration-300 
      ${header ? 'bg-white shadow-lg' : 'bg-transparent'}`}
    >
      <div className="container mx-auto max-w-7xl flex flex-col lg:flex-row items-center lg:justify-between gap-y-6 lg:gap-y-0 h-full">
        <Link to="/" onClick={resetRoomFilterData} className="block w-[160px] shrink-0" aria-label="Home">
          {header ? (
            <img className="w-[160px] h-auto block" src={LogoDark} alt="Logo" />
          ) : (
            <img className="w-[160px] h-auto block" src={LogoWhite} alt="Logo" />
          )}
        </Link>
        <nav
          className={`${header ? 'text-primary' : 'text-white'}
        flex gap-x-4 lg:gap-x-8 font-tertiary tracking-[3px] text-[15px] items-center uppercase`}
        >
          {navLinks.map((link) => (
            <Link to="/" className="transition hover:text-accent" key={link}>
              {link}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
