import type { ReactNode } from 'react';
import { AppRouter } from './router';
import { ThemeToggle } from '../shared/components/ThemeToggle';

interface ProvidersProps {
  children?: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <>
      <ThemeToggle />
      <AppRouter />
      {children}
    </>
  );
}
