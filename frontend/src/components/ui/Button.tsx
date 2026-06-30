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
  const base = 'inline-flex items-center justify-center gap-2 font-mono text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<string, string> = {
    primary: 'bg-primary-fixed-dim text-on-primary hover:bg-primary-container',
    outline: 'border border-outline-variant text-on-surface hover:bg-surface-container-low',
    danger: 'border border-error/50 text-error hover:bg-error/10',
    ghost: 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high',
  };

  const sizes: Record<string, string> = {
    sm: 'py-1.5 px-3 text-xs',
    md: 'py-2 px-4',
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
