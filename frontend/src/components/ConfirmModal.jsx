import { useState, memo } from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';

export const ConfirmModal = memo(function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' }) {
  const icons = {
    warning: AlertTriangle,
    danger: Trash2,
    info: Info,
  };
  const colors = {
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-300', btn: 'bg-yellow-500 hover:bg-yellow-600' },
    danger: { bg: 'bg-red-50', border: 'border-red-300', btn: 'bg-red-500 hover:bg-red-600' },
    info: { bg: 'bg-blue-50', border: 'border-blue-300', btn: 'bg-blue-500 hover:bg-blue-600' },
  };
  const style = colors[type] || colors.warning;
  const Icon = icons[type] || icons.warning;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className={`relative ${style.bg} border-2 ${style.border} rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200`}>
        <div className="flex items-start gap-4">
          <Icon className="w-10 h-10 text-gray-600" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
            <p className="text-gray-600">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl ${style.btn} text-white font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
});

export function useConfirm() {
  const [confirmConfig, setConfirmConfig] = useState(null);

  const confirm = (config) => {
    return new Promise((resolve) => {
      setConfirmConfig({
        ...config,
        onConfirm: () => {
          resolve(true);
          setConfirmConfig(null);
        },
        onCancel: () => {
          resolve(false);
          setConfirmConfig(null);
        },
      });
    });
  };

  return { confirm, confirmConfig };
}