import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  description: string;
  eyebrow?: string;
  children: ReactNode;
}

export function AuthLayout({
  title,
  description,
  eyebrow = 'Navi Admin',
  children,
}: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__badge" aria-hidden>
          N
        </div>
        <header className="auth-card__header">
          <p className="auth-card__eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        {children}
      </div>
    </div>
  );
}
