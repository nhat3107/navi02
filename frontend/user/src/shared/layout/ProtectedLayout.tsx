import { AppShellLayout } from './AppShellLayout';
import { RequireUserProfile } from '../../app/RequireUserProfile';

/** Authenticated routes that share the same navbar and app shell. */
export function ProtectedLayout() {
  return (
    <RequireUserProfile>
      <AppShellLayout />
    </RequireUserProfile>
  );
}
