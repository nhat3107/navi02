import type { ReactNode } from 'react';
import { ThemeToggleCorner } from '../components/ThemeToggle';

interface AuthLayoutProps {
  title: string;
  description: string;
  eyebrow?: string;
  /** Optional step indicator for multi-step flows (e.g. onboarding). */
  step?: { current: number; total: number };
  children: ReactNode;
  footer?: ReactNode;
  /** Wider card for profile setup forms. */
  wide?: boolean;
}

export function AuthLayout({
  title,
  description,
  eyebrow = 'Navi',
  step,
  children,
  footer,
  wide = false,
}: AuthLayoutProps) {
  const stepPct = step
    ? Math.round((step.current / step.total) * 100)
    : 0;

  return (
    <div className="auth-page relative">
      <ThemeToggleCorner />
      <div className={`auth-card${wide ? ' auth-card--wide' : ''}`}>
        <div className="auth-card__badge" aria-hidden>
          N
        </div>

        {step ? (
          <div className="auth-step" aria-label={`Step ${step.current} of ${step.total}`}>
            <div className="auth-step__track">
              <div
                className="auth-step__fill"
                style={{ width: `${stepPct}%` }}
              />
            </div>
            <p className="auth-step__label">
              Step {step.current} of {step.total}
            </p>
          </div>
        ) : null}

        <header className="auth-card__header">
          <p className="auth-card__eyebrow">{eyebrow}</p>
          <h1 className="auth-card__title">{title}</h1>
          <p className="auth-card__desc">{description}</p>
        </header>

        {children}

        {footer}
      </div>
    </div>
  );
}

/** Centered loading state on the auth gradient background. */
export function AuthLoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="auth-page relative">
      <ThemeToggleCorner />
      <div className="auth-loading">
        <div className="auth-loading__spinner" aria-hidden />
        <p>{label}</p>
      </div>
    </div>
  );
}
