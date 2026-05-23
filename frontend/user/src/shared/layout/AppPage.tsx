import type { ReactNode } from 'react';
import { AppNavBar } from '../../features/user/components/AppNavBar';

interface AppPageProps {
  children: ReactNode;
  mainClassName?: string;
}

export function AppPage({ children, mainClassName = '' }: AppPageProps) {
  return (
    <div className="app-page">
      <AppNavBar />
      <main className={`app-main ${mainClassName}`.trim()}>{children}</main>
    </div>
  );
}
