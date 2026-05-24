import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchUserSuggestions, type UserSuggestion } from '../api/userDirectory.api';
import { useProfileCache } from '../store/profileCache.store';
import { DiscoverPersonCard } from './DiscoverPersonCard';
import { EmptyState } from '../../../shared/components/EmptyState';

function RefreshIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function SuggestedPeoplePanel({
  limit = 10,
  viewerUserId,
  title = 'People you may know',
  description = 'Suggested from your network',
}: {
  limit?: number;
  viewerUserId: string | null;
  title?: string;
  description?: string;
}) {
  const followingIds = useProfileCache((s) => s.followingIds);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!viewerUserId) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSuggestions(await fetchUserSuggestions(limit));
    } catch {
      setError('Could not load suggestions.');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [limit, viewerUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => suggestions.filter((s) => !followingIds.has(s.id)),
    [suggestions, followingIds],
  );

  if (!viewerUserId) {
    return (
      <section className="discover-section">
        <header className="discover-section__header">
          <div>
            <h2 className="discover-section__title">{title}</h2>
            <p className="discover-section__subtitle">Sign in to see personalized suggestions.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section className="discover-section">
      <header className="discover-section__header">
        <div>
          <h2 className="discover-section__title">{title}</h2>
          <p className="discover-section__subtitle">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="discover-refresh-btn"
          aria-label="Refresh suggestions"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </header>

      {loading ? (
        <div className="discover-suggestion-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="discover-person-tile discover-person-tile--skeleton" aria-hidden />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="discover-section__message discover-section__message--error">{error}</div>
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <EmptyState
          title="No suggestions right now"
          description="Follow a few people to unlock friend recommendations."
        />
      ) : null}

      {!loading && !error && visible.length > 0 ? (
        <div className="discover-suggestion-grid">
          {visible.map((hit) => (
            <DiscoverPersonCard
              key={hit.id}
              id={hit.id}
              username={hit.username}
              fullName={hit.full_name}
              avatarUrl={hit.avatar_url}
              viewerUserId={viewerUserId}
              mutualCount={hit.mutualCount}
              variant="tile"
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
