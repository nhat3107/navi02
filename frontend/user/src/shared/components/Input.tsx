import { type InputHTMLAttributes, forwardRef, useState } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, type, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            className={`w-full px-3.5 py-2.5 text-[0.935rem] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-[1.5px] rounded-lg outline-none transition-all duration-150 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
              error
                ? 'border-error focus:ring-2 focus:ring-error-bg'
                : 'border-slate-300 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent-bg'
            }`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-slate-400 dark:text-slate-500 p-1 flex items-center transition-colors hover:text-slate-700 dark:hover:text-slate-200"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          )}
        </div>
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    );
  }
);
