import type { ReactNode } from 'react';
import { AppRouter } from './router';
import { ToastContainer } from '../shared/components/ToastContainer';

interface ProvidersProps {
  children?: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // ThemeToggle moved inside <AppRouter> so it can use react-router's
  // useLocation() to hide itself on the /call route.
  return (
    <>
      <ToastContainer />
      <AppRouter />
      {children}
    </>
  );
}
