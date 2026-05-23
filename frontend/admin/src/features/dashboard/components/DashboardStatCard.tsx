import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type StatCardVariant =
  | 'violet'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'slate';

interface DashboardStatCardProps {
  label: string;
  value: number;
  hint?: string;
  to?: string;
  variant: StatCardVariant;
  icon: ReactNode;
  highlight?: boolean;
}

export function DashboardStatCard({
  label,
  value,
  hint,
  to,
  variant,
  icon,
  highlight,
}: DashboardStatCardProps) {
  const body = (
    <>
      <div className="dash-stat__top">
        <span className={`dash-stat__icon dash-stat__icon--${variant}`}>
          {icon}
        </span>
        {to ? (
          <span className="dash-stat__arrow" aria-hidden>
            →
          </span>
        ) : null}
      </div>
      <span className="dash-stat__value">{value.toLocaleString()}</span>
      <span className="dash-stat__label">{label}</span>
      {hint ? <span className="dash-stat__hint">{hint}</span> : null}
    </>
  );

  const className = `dash-stat dash-stat--${variant}${highlight ? ' dash-stat--highlight' : ''}${to ? ' dash-stat--link' : ''}`;

  if (to) {
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

export function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function PostsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

export function PendingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function BlockedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}
