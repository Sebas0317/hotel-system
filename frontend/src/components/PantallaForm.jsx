import HotelTitle from './HotelTitle';

/**
 * PantallaForm — Shared layout wrapper for all reception sub-screens.
 * Provides a consistent topbar with logo, title, and back button,
 * plus a centered form card with title and optional description.
 *
 * @param {Object} props
 * @param {string} props.titulo - Screen title (displayed in card)
 * @param {string} [props.desc] - Optional description below title
 * @param {Function} [props.onVolver] - Back button handler (hides button if omitted)
 * @param {React.ReactNode} props.children - Screen content
 */
export default function PantallaForm({ titulo, desc, onVolver, children }) {
  return (
    <div className="app-shell">
      <header className="topbar flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 px-3 sm:px-6 py-3">
        <div className="topbar-left flex items-center gap-2">
          <span className="topbar-logo text-xl">🏨</span>
          <HotelTitle />
        </div>
        {onVolver && (
          <button className="btn-salir text-sm w-full sm:w-auto text-center" onClick={onVolver}>← Volver</button>
        )}
      </header>
      <div className="form-content flex items-start justify-center p-4 sm:p-6">
        <div className="form-card w-full max-w-[520px] p-4 sm:p-8">
          <h2 className="form-titulo text-lg sm:text-xl md:text-2xl">{titulo}</h2>
          {desc && <p className="form-desc text-sm sm:text-base">{desc}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
