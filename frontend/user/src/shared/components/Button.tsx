import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white shadow-[0_1px_3px_rgba(139,92,246,0.3)] hover:bg-accent-hover hover:shadow-[0_4px_12px_rgba(139,92,246,0.35)] hover:-translate-y-px active:translate-y-0',
  secondary:
    'bg-accent-bg text-accent border border-transparent hover:border-accent',
  danger:
    'bg-error text-white hover:opacity-90',
};

export function Button({
  variant = 'primary',
  loading = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-6 py-2.5 text-[0.935rem] font-medium rounded-lg border-none cursor-pointer transition-all duration-150 disabled:opacity-55 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size={18} /> : children}
    </button>
  );
}
