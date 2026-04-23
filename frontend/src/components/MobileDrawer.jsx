import { Drawer as VaulDrawer } from 'vaul';
import { X } from 'lucide-react';

/**
 * MobileDrawer - Slide-out drawer for mobile navigation
 * Uses Vaul for smooth animations
 * 
 * @param {Object} props
 * @param {boolean} props.open - Open state
 * @param {Function} props.onClose - Close handler
 * @param {React.Node} props.children - Drawer content
 * @param {string} props.title - Drawer title
 */
export function MobileDrawer({ open, onClose, children, title }) {
  return (
    <VaulDrawer.Root open={open} onOpenChange={onClose}>
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <VaulDrawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 flex flex-col max-h-[80vh]">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <VaulDrawer.Title className="text-lg font-semibold">
              {title || 'Menu'}
            </VaulDrawer.Title>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
}

export default MobileDrawer;