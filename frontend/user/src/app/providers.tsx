import type { ReactNode } from 'react';
import { AppRouter } from './router';

interface ProvidersProps {
  children?: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // ThemeToggle moved inside <AppRouter> so it can use react-router's
  // useLocation() to hide itself on the /call route.
  return (
    <>
      <AppRouter />
      {children}
    </>
  );
}
