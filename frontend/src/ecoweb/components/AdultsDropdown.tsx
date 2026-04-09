import { useRoomContext } from '../context/RoomContext';
import { BsChevronDown } from 'react-icons/bs';
import { adultsList } from '../data';
import { Menu } from '@headlessui/react';

/**
 * Dropdown to select number of adults. Uses Headless UI Menu and RoomContext.
 * - Menu.Button shows current adults; chevron rotates 180° when open (CSS .dropdown-chevron).
 * - Menu.Items: transition + data-[closed] for open/close animation; modal={false} keeps focus in page.
 * - Clicking an option calls setAdults(name) and updates context for room filtering.
 */
export default function AdultsDropdown() {
  const { adults, setAdults } = useRoomContext();

  return (
    <Menu as="div" className="w-full h-full bg-white relative">
      <Menu.Button className="dropdown-trigger w-full h-full flex items-center justify-between px-8 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 border-0 focus:border-0">
        {adults}
        <BsChevronDown className="dropdown-chevron text-base text-accent-hover transition-transform duration-200 ease-out" />
      </Menu.Button>
      <Menu.Items
        as="ul"
        transition
        className="dropdown-panel bg-white absolute w-full flex flex-col z-40 border border-accent/20 shadow-md transition ease-out duration-200 data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0"
        modal={false}
      >
        {adultsList.map(({ name }, idx) => (
          <Menu.Item
            as="li"
            key={idx}
            onClick={() => setAdults(name)}
            className="h-10 hover:bg-accent hover:text-white w-full flex items-center justify-center cursor-pointer border-b border-gray-200 last:border-b-0 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0"
          >
            {name}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
}
