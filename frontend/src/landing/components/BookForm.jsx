import { AdultsDropdown, CheckIn, CheckOut, KidsDropdown } from './index';
import { useRoomContext } from '../context/useRoomContext';

export default function BookForm() {
  const { handleCheck } = useRoomContext();

  return (
    <form className="h-[300px] lg:h-[70px] w-full">
      <div className="flex flex-col w-full h-full lg:flex-row">
        <div className="flex-1 min-w-0 border-r w-full">
          <CheckIn />
        </div>
        <div className="flex-1 min-w-0 border-r w-full">
          <CheckOut />
        </div>
        <div className="flex-1 min-w-0 border-r w-full">
          <AdultsDropdown />
        </div>
        <div className="flex-1 min-w-0 border-r w-full">
          <KidsDropdown />
        </div>
        <button type="submit" className="btn btn-primary" onClick={(e) => handleCheck(e)}>
          Check Now
        </button>
      </div>
    </form>
  );
}
