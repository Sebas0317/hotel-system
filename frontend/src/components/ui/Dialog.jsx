import { useState, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DialogContext = createContext({
  open: false,
  onOpenChange: () => {},
});

export function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ children, asChild = false }) {
  const { onOpenChange } = useContext(DialogContext);
  
  if (asChild) {
    return <>{children({ onClick: () => onOpenChange(true) })}</>;
  }
  
  return (
    <span onClick={() => onOpenChange(true)} className="cursor-pointer">
      {children}
    </span>
  );
}

export function DialogContent({ className = '', children }) {
  const { open, onOpenChange } = useContext(DialogContext);
  
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => onOpenChange(false)}
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] 
                       w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg border border-gray-200 
                       bg-white p-6 shadow-lg duration-200 sm:max-w-xl"
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 
                         transition-opacity focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function DialogHeader({ className = '', children, ...props }) {
  return (
    <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function DialogTitle({ className = '', children, ...props }) {
  return (
    <h2
      className={`text-lg font-semibold leading-none tracking-tight text-gray-900 ${className}`.trim()}
      {...props}
    >
      {children}
    </h2>
  );
}

export function DialogDescription({ className = '', children, ...props }) {
  return (
    <p className={`text-sm text-gray-500 ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

export function DialogFooter({ className = '', children, ...props }) {
  return (
    <div
      className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
