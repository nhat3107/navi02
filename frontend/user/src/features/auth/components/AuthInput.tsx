import { Input } from '../../../shared/components/Input';
import type { InputHTMLAttributes } from 'react';

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  inputClassName?: string;
}

export function AuthInput({ label, error, inputClassName, ...props }: AuthInputProps) {
  return (
    <Input
      label={label}
      error={error}
      inputClassName={inputClassName}
      {...props}
    />
  );
}
