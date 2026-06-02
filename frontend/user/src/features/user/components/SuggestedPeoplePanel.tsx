import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchUserSuggestions, type UserSuggestion } from '../api/userDirectory.api';
import { useProfileCache } from '../store/profileCache.store';
import { DiscoverPersonCard } from './DiscoverPersonCard';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ROUTES } from '../../../shared/constants/routes';

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
  layout = 'grid',
  hideWhenEmpty = false,
}: {
  limit?: number;
  viewerUserId: string | null;
  title?: string;
  description?: string;
  layout?: 'grid' | 'carousel' | 'list';
  hideWhenEmpty?: boolean;
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
    if (hideWhenEmpty) return null;
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

  if (hideWhenEmpty && !loading && !error && visible.length === 0) {
    return null;
  }

  const listClass =
    layout === 'carousel'
      ? 'home-suggestion-strip'
      : layout === 'list'
        ? 'home-suggestions__list'
        : 'discover-suggestion-grid';

  const sectionClass =
    layout === 'list' ? 'home-suggestions' : `discover-section${layout === 'carousel' ? ' mb-5' : ''}`;

  return (
    <section className={sectionClass}>
      <header
        className={
          layout === 'list' ? 'home-suggestions__header' : 'discover-section__header'
        }
      >
        <div className="min-w-0">
          <h2
            className={
              layout === 'list' ? 'home-suggestions__title' : 'discover-section__title'
            }
          >
            {title}
          </h2>
          {layout !== 'list' ? (
            <p className="discover-section__subtitle">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {layout === 'carousel' || layout === 'list' ? (
            <Link
              to={ROUTES.DISCOVER}
              className={
                layout === 'list' ? 'home-suggestions__see-all' : 'discover-refresh-btn'
              }
            >
              {layout === 'list' ? 'See all' : 'See all'}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={
              layout === 'list' ? 'home-suggestions__refresh' : 'discover-refresh-btn'
            }
            aria-label="Refresh suggestions"
            title="Refresh"
          >
            <RefreshIcon className={loading ? 'animate-spin' : ''} />
            {layout === 'list' ? null : <span>Refresh</span>}
          </button>
        </div>
      </header>

      {loading ? (
        <div className={listClass}>
          {Array.from({ length: layout === 'list' ? 5 : 4 }).map((_, i) => (
            <div
              key={i}
              className={
                layout === 'carousel'
                  ? 'home-suggestion-card home-suggestion-card--skeleton'
                  : layout === 'list'
                    ? 'discover-person-row discover-person-row--skeleton'
                    : 'discover-person-tile discover-person-tile--skeleton'
              }
              aria-hidden
            />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="discover-section__message discover-section__message--error">{error}</div>
      ) : null}

      {!loading && !error && visible.length === 0 && layout !== 'list' ? (
        <EmptyState
          title="No suggestions right now"
          description="Follow a few people to unlock friend recommendations."
        />
      ) : null}

      {!loading && !error && visible.length === 0 && layout === 'list' ? (
        <p className="home-suggestions__empty">No suggestions right now.</p>
      ) : null}

      {!loading && !error && visible.length > 0 ? (
        <div className={listClass}>
          {visible.map((hit) =>
            layout === 'carousel' ? (
              <article key={hit.id} className="home-suggestion-card">
                <DiscoverPersonCard
                  id={hit.id}
                  username={hit.username}
                  fullName={hit.full_name}
                  avatarUrl={hit.avatar_url}
                  viewerUserId={viewerUserId}
                  mutualCount={hit.mutualCount}
                  variant="tile"
                />
              </article>
            ) : (
              <DiscoverPersonCard
                key={hit.id}
                id={hit.id}
                username={hit.username}
                fullName={hit.full_name}
                avatarUrl={hit.avatar_url}
                viewerUserId={viewerUserId}
                mutualCount={hit.mutualCount}
                variant={layout === 'list' ? 'row' : 'tile'}
              />
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
