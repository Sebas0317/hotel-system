import { LogoWhite } from "../assets";

export default function Footer() {
  return (
    <footer className="bg-primary py-12">
      <div className="container mx-auto max-w-7xl text-white flex items-center gap-5 sm:justify-between flex-col sm:flex-row">
        <a href="/">
          <img src={LogoWhite} alt="Logo" className="w-[160px] h-auto" />
        </a>
        <div className="flex flex-col items-center">
          <p>&copy; {new Date().getFullYear()}. All Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
