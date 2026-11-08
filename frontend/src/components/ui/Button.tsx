import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg font-sans text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  const variants: Record<string, string> = {
    primary: 'bg-primary-fixed-dim text-on-primary hover:bg-primary-fixed',
    outline: 'border border-outline-variant bg-white text-on-surface hover:bg-surface-container-low',
    danger: 'border border-error/40 bg-white text-error hover:bg-error-container',
    ghost: 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
  };

  const sizes: Record<string, string> = {
    sm: 'min-h-9 px-3 py-1.5 text-xs',
    md: 'px-4 py-2',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} rounded ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
