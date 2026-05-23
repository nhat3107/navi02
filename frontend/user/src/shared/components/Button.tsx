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
    'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-[0_2px_8px_rgba(139,92,246,0.35)] hover:from-violet-600 hover:to-indigo-600 hover:shadow-[0_4px_14px_rgba(139,92,246,0.4)] hover:-translate-y-px active:translate-y-0',
  secondary:
    'bg-white text-slate-800 border border-slate-200 shadow-sm hover:border-accent hover:text-accent dark:bg-neutral-950 dark:text-slate-200 dark:border-neutral-800 dark:hover:border-accent',
  danger:
    'bg-error text-white shadow-sm hover:opacity-90',
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
      className={`inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-6 py-2.5 text-[0.935rem] font-semibold rounded-xl border-none cursor-pointer transition-all duration-150 disabled:opacity-55 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size={18} /> : children}
    </button>
  );
}
