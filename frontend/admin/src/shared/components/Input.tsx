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
      <div className={`field ${className}`.trim()}>
        <label className="field__label">{label}</label>
        <div className="field__control">
          <input
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            className={`field__input${error ? ' field__input--error' : ''}`}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              className="field__toggle"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          ) : null}
        </div>
        {error ? <span className="field__error">{error}</span> : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
