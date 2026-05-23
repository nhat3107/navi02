import type { ReactNode } from 'react';
import { ThemeToggleCorner } from '../components/ThemeToggle';

interface AuthLayoutProps {
  title: string;
  description: string;
  eyebrow?: string;
  children: ReactNode;
}

export function AuthLayout({
  title,
  description,
  eyebrow = 'Navi',
  children,
}: AuthLayoutProps) {
  return (
    <div className="auth-page relative">
      <ThemeToggleCorner />
      <div className="auth-card">
        <div className="auth-card__badge" aria-hidden>
          N
        </div>
        <header className="mb-8 text-center">
          <p className="auth-card__eyebrow">{eyebrow}</p>
          <h1 className="mb-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          <p className="text-[0.935rem] text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}
