import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthFooterProps {
  children: ReactNode;
}

export function AuthFooter({ children }: AuthFooterProps) {
  return <p className="auth-footer">{children}</p>;
}

export function AuthFooterLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className="auth-footer__link">
      {children}
    </Link>
  );
}
