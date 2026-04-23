const variants = {
  default: 'bg-gray-50 text-gray-900 border-gray-200',
  destructive: 'bg-red-50 text-red-900 border-red-200',
  warning: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  success: 'bg-green-50 text-green-900 border-green-200',
  info: 'bg-blue-50 text-blue-900 border-blue-200',
};

export function Alert({ className = '', variant = 'default', children, ...props }) {
  return (
    <div
      className={`relative w-full rounded-lg border p-4 ${variants[variant]} ${className}`.trim()}
      role="alert"
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertTitle({ className = '', children, ...props }) {
  return (
    <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`.trim()} {...props}>
      {children}
    </h5>
  );
}

export function AlertDescription({ className = '', children, ...props }) {
  return (
    <div className={`text-sm [&_p]:leading-relaxed ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
