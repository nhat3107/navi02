import { AppShellLayout } from './AppShellLayout';
import { RequireAuth } from '../../app/RequireAuth';
import { RequireUserProfile } from '../../app/RequireUserProfile';

/** Authenticated routes that share the same navbar and app shell. */
export function ProtectedLayout() {
  return (
    <RequireAuth>
      <RequireUserProfile>
        <AppShellLayout />
      </RequireUserProfile>
    </RequireAuth>
  );
}
