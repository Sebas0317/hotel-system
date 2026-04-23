const variants = {
  default: 'bg-primary text-white',
  secondary: 'bg-gray-200 text-gray-900',
  destructive: 'bg-red-600 text-white',
  outline: 'border border-gray-300 bg-transparent text-gray-700',
  success: 'bg-green-600 text-white',
  warning: 'bg-yellow-500 text-white',
  info: 'bg-blue-600 text-white',
};

export function Badge({ className = '', variant = 'default', children, ...props }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}
