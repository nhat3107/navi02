type AuthAlertVariant = 'error' | 'success' | 'info';

interface AuthAlertProps {
  variant?: AuthAlertVariant;
  children: React.ReactNode;
}

export function AuthAlert({ variant = 'error', children }: AuthAlertProps) {
  return (
    <div className={`auth-alert auth-alert--${variant}`} role="alert">
      {children}
    </div>
  );
}
