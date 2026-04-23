import { forwardRef } from 'react';

const variants = {
  default: 'bg-primary text-white hover:bg-primary/90',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-accent bg-transparent hover:bg-accent/10 text-accent',
  secondary: 'bg-accent text-white hover:bg-accent-hover',
  ghost: 'hover:bg-gray-100 text-gray-700',
  link: 'text-accent underline-offset-4 hover:underline',
};

const sizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10',
};

const Button = forwardRef(
  ({ className = '', variant = 'default', size = 'default', disabled = false, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium
          transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
          disabled:pointer-events-none disabled:opacity-50
          ${variants[variant]} ${sizes[size]} ${className}
        `.trim()}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button, variants, sizes };
