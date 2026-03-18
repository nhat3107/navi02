import type { ReactNode } from 'react';
import { AppRouter } from './router';

interface ProvidersProps {
  children?: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <>
      <AppRouter />
      {children}
    </>
  );
}
