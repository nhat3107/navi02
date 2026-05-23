import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  badge?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
}: PageHeaderProps) {
  return (
    <header className="page-hero">
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="page-hero__eyebrow">{eyebrow}</p> : null}
        <div className="flex flex-wrap items-end gap-3">
          <h1 className="page-hero__title">{title}</h1>
          {badge}
        </div>
        {description ? <p className="page-hero__desc">{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
