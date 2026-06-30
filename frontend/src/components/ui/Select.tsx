import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ children, className = '', ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={`w-full appearance-none bg-transparent border-b border-outline-variant py-2 pr-8 font-mono text-sm text-on-surface focus:border-primary-fixed-dim focus:outline-none transition-colors ${className}`}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
  </div>
));

Select.displayName = 'Select';

export { Select };
