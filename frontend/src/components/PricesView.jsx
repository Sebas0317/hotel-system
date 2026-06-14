import { useOutletContext } from 'react-router-dom';
import PriceEditor from './PriceEditor';
import { Toast } from './RoomActions';

export default function PricesView() {
  const { inlineToast, setInlineToast } = useOutletContext();

  const showToast = (type, message) => {
    setInlineToast({ type, message });
  };

  return (
    <>
      <PriceEditor
        onUpdate={() => showToast('success', 'Precios actualizados')}
        onNotify={showToast}
      />
      {inlineToast && (
        <Toast
          message={inlineToast.message}
          type={inlineToast.type}
          onDismiss={() => setInlineToast(null)}
        />
      )}
    </>
  );
}
