import type { ReactNode } from 'react';

interface AppPageProps {
  children: ReactNode;
  mainClassName?: string;
  /** Fill remaining viewport below the navbar (chat, etc.). */
  fill?: boolean;
}

export function AppPage({ children, mainClassName = '', fill = false }: AppPageProps) {
  return (
    <main
      className={`app-main${fill ? ' app-main--fill' : ''}${mainClassName ? ` ${mainClassName}` : ''}`}
    >
      {children}
    </main>
  );
}
