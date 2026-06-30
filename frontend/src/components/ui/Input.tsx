import { forwardRef, type InputHTMLAttributes } from 'react';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full bg-transparent border-b border-outline-variant py-2 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary-fixed-dim focus:outline-none transition-colors ${className}`}
      {...props}
    />
  ),
);

Input.displayName = 'Input';

export { Input };
