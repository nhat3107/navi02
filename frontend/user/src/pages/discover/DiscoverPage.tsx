import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../shared/constants/routes';
import { searchUsers, type UserSearchHit } from '../../features/user/api/userDirectory.api';
import { fetchMyFollowing } from '../../features/user/api/userProfile.api';
import { useProfileCache } from '../../features/user/store/profileCache.store';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { AppPage } from '../../shared/layout/AppPage';
import { EmptyState } from '../../shared/components/EmptyState';
import { DiscoverPersonCard } from '../../features/user/components/DiscoverPersonCard';
import { SuggestedPeoplePanel } from '../../features/user/components/SuggestedPeoplePanel';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 220;

export function DiscoverPage() {
  const viewerUserId = useAuthStore((s) => s.user?.id ?? null);
  const followingIds = useProfileCache((s) => s.followingIds);
  const setFollowingIds = useProfileCache((s) => s.setFollowingIds);

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<UserSearchHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!viewerUserId) return;
    if (followingIds.size > 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const edges = await fetchMyFollowing();
        if (!cancelled) setFollowingIds(edges.map((e) => e.id));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewerUserId, followingIds.size, setFollowingIds]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) {
      setHits(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const id = ++requestIdRef.current;

    const t = window.setTimeout(async () => {
      try {
        const rows = await searchUsers(trimmed);
        if (id !== requestIdRef.current) return;
        setHits(rows);
      } catch (e) {
        if (id !== requestIdRef.current) return;
        const message =
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? 'Search failed.';
        setError(typeof message === 'string' ? message : 'Search failed.');
        setHits([]);
      } finally {
        if (id === requestIdRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [query]);

  const showResults = query.trim().length >= MIN_QUERY;
  const filteredHits = useMemo(
    () => (hits ?? []).filter((h) => h.id !== viewerUserId),
    [hits, viewerUserId],
  );

  function clearSearch() {
    setQuery('');
    inputRef.current?.focus();
  }

  return (
    <AppPage>
      <div className="discover-page">
      <section className="discover-hero">
        <div className="discover-hero__glow" aria-hidden />
        <div className="discover-hero__content">
          <p className="discover-hero__eyebrow">Explore</p>
          <h1 className="discover-hero__title">Discover people</h1>
          <p className="discover-hero__desc">
            Search by name or username, follow interesting profiles, and grow your network.
          </p>
          {viewerUserId ? (
            <div className="discover-hero__stats">
              <span className="discover-stat-pill">
                Following {followingIds.size}
              </span>
            </div>
          ) : null}
        </div>

        <label className="discover-search">
          <span className="sr-only">Search people</span>
          <span className="discover-search__icon" aria-hidden>
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or @username"
            className="discover-search__input"
            autoFocus
          />
          {query.length > 0 ? (
            <button
              type="button"
              onClick={clearSearch}
              className="discover-search__clear"
              aria-label="Clear search"
            >
              <CloseIcon />
            </button>
          ) : null}
        </label>
        {!showResults ? (
          <p className="discover-search__hint">
            Type at least {MIN_QUERY} characters to search the directory.
          </p>
        ) : null}
      </section>

      {showResults ? (
        <ResultsSection
          loading={loading}
          error={error}
          hits={filteredHits}
          viewerUserId={viewerUserId}
          query={query.trim()}
        />
      ) : (
        <div className="discover-stack">
          <SuggestedPeoplePanel viewerUserId={viewerUserId} limit={10} />
          <QuickLinksSection viewerUserId={viewerUserId} />
        </div>
      )}
      </div>
    </AppPage>
  );
}

function ResultsSection({
  loading,
  error,
  hits,
  viewerUserId,
  query,
}: {
  loading: boolean;
  error: string | null;
  hits: UserSearchHit[];
  viewerUserId: string | null;
  query: string;
}) {
  return (
    <section className="discover-section">
      <header className="discover-section__header">
        <div>
          <h2 className="discover-section__title">Search results</h2>
          <p className="discover-section__subtitle">
            {loading ? `Searching for “${query}”…` : `Matches for “${query}”`}
          </p>
        </div>
        {!loading ? (
          <span className="discover-count-badge">
            {hits.length} {hits.length === 1 ? 'person' : 'people'}
          </span>
        ) : null}
      </header>

      {loading ? (
        <div className="discover-results-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="discover-person-row discover-person-row--skeleton" aria-hidden />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="discover-section__message discover-section__message--error">{error}</div>
      ) : null}

      {!loading && !error && hits.length === 0 ? (
        <EmptyState
          title="No matches"
          description="Try a different spelling, display name, or username."
        />
      ) : null}

      {!loading && !error && hits.length > 0 ? (
        <div className="discover-results-list">
          {hits.map((hit) => (
            <DiscoverPersonCard
              key={hit.id}
              id={hit.id}
              username={hit.username}
              fullName={hit.full_name}
              avatarUrl={hit.avatar_url}
              viewerUserId={viewerUserId}
              variant="row"
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function QuickLinksSection({ viewerUserId }: { viewerUserId: string | null }) {
  const followingIds = useProfileCache((s) => s.followingIds);

  const links = [
    {
      to: ROUTES.PROFILE_ME,
      title: 'Your profile',
      desc: 'Update bio, photo, and username',
      icon: <ProfileIcon />,
      tone: 'violet' as const,
    },
    {
      to: ROUTES.CHAT,
      title: 'Messages',
      desc: 'Pick up a chat or start a new one',
      icon: <ChatIcon />,
      tone: 'fuchsia' as const,
    },
    {
      to: ROUTES.PROFILE_ME_FOLLOWING,
      title: 'Following',
      desc: `${followingIds.size} ${followingIds.size === 1 ? 'person' : 'people'} in your network`,
      icon: <NetworkIcon />,
      tone: 'indigo' as const,
    },
  ];

  return (
    <section className="discover-section">
      <header className="discover-section__header">
        <div>
          <h2 className="discover-section__title">Quick links</h2>
          <p className="discover-section__subtitle">Shortcuts while you explore</p>
        </div>
      </header>
      <div className="discover-quick-grid">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`discover-quick-tile discover-quick-tile--${link.tone}`}
          >
            <span className="discover-quick-tile__icon">{link.icon}</span>
            <span className="discover-quick-tile__title">{link.title}</span>
            <span className="discover-quick-tile__desc">{link.desc}</span>
          </Link>
        ))}
      </div>
      {!viewerUserId ? (
        <p className="discover-section__footnote">
          Sign in to follow people and start chatting.
        </p>
      ) : null}
    </section>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function NetworkIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}
