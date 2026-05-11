import { useEffect, useRef, useState } from 'react';
import type { UserProfile } from '../../user/types/user.types';
import { fetchUserProfile } from '../../user/api/userProfile.api';

/**
 * Loads `UserProfile` rows for the given ids (deduped). Each id is fetched at
 * most once for the lifetime of the hook instance.
 */
export function useAuthorProfiles(authorIds: string[]): {
  byId: Record<string, UserProfile>;
  loading: boolean;
} {
  const [byId, setById] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef<Set<string>>(new Set());

  const key = [...new Set(authorIds.filter(Boolean))].sort().join('|');

  useEffect(() => {
    const unique = [...new Set(authorIds.filter(Boolean))];
    if (unique.length === 0) return;

    const missing = unique.filter((id) => !fetchedRef.current.has(id));
    if (missing.length === 0) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const results = await Promise.all(
        missing.map((id) =>
          fetchUserProfile(id)
            .then((p) => ({ id, p } as const))
            .catch(() => null),
        ),
      );
      if (cancelled) return;
      for (const r of results) {
        if (r) fetchedRef.current.add(r.id);
      }
      setById((prev) => {
        const next = { ...prev };
        for (const r of results) {
          if (r) next[r.id] = r.p;
        }
        return next;
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { byId, loading };
}
