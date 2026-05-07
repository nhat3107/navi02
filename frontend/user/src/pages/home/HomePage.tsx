import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { useProfileCache } from '../../features/user/store/profileCache.store';
import { Button } from '../../shared/components/Button';
import { ROUTES } from '../../shared/constants/routes';
import { AppNavBar } from '../../features/user/components/AppNavBar';
import { UserAvatar } from '../../features/user/components/UserAvatar';

/**
 * `/` — Home / feed.
 *
 * The post / feed feature is still on the roadmap, so this page renders a
 * lightweight placeholder ("compose card" + empty feed) that hints at the
 * upcoming behavior without committing to it. Keeping `AppNavBar` here means
 * navigating between Home, Discover, Messages, and Profile uses the same
 * sticky shell and feels seamless.
 *
 * Guests see the marketing welcome with sign-in / register CTAs.
 */
export function HomePage() {
  const { user, isAuthenticated } = useAuthStore();
  const myProfile = useProfileCache((s) => s.myProfile);
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-slate-900 dark:text-slate-100 -tracking-wide mb-2">
            Welcome to Navi
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Connect, follow, and chat with the people you care about.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button onClick={() => navigate(ROUTES.LOGIN)} className="w-auto">
              Sign in
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(ROUTES.REGISTER)}
              className="w-auto"
            >
              Create account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    myProfile?.full_name?.trim() ||
    (myProfile?.username ? `@${myProfile.username}` : user?.email) ||
    'You';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AppNavBar />

      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <ComposerCard displayName={displayName} avatarUrl={myProfile?.avatar_url ?? null} />

        <FeedPlaceholder />
      </main>
    </div>
  );
}

/**
 * Disabled compose card — visual hint that posting is coming. Clicking the
 * input nudges users toward the placeholder explanation rather than wiring up
 * a half-baked draft state.
 */
function ComposerCard({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  return (
    <section
      aria-label="Compose post"
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-center gap-3">
        <UserAvatar
          label={displayName}
          src={avatarUrl}
          size="md"
        />
        <button
          type="button"
          disabled
          title="Posting is coming soon"
          aria-disabled
          className="flex-1 cursor-not-allowed truncate rounded-full bg-slate-100 px-4 py-2.5 text-left text-sm text-slate-500 transition dark:bg-slate-800 dark:text-slate-400"
        >
          Share something with your followers…
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <ComposerAction label="Photo" icon="image" />
        <ComposerAction label="Video" icon="video" />
        <ComposerAction label="Mood" icon="smile" />
        <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          Coming soon
        </span>
      </div>
    </section>
  );
}

function ComposerAction({
  label,
  icon,
}: {
  label: string;
  icon: 'image' | 'video' | 'smile';
}) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 transition dark:text-slate-400"
    >
      <span aria-hidden className="text-slate-400 dark:text-slate-500">
        <ComposerIcon name={icon} />
      </span>
      {label}
    </button>
  );
}

function ComposerIcon({ name }: { name: 'image' | 'video' | 'smile' }) {
  if (name === 'image') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }
  if (name === 'video') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function FeedPlaceholder() {
  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div
        aria-hidden
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-bg text-accent"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </div>
      <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Your feed is on the way
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Posts from people you follow will show up here. While we finish that,
        find friends to follow or jump into a conversation.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Link
          to={ROUTES.DISCOVER}
          className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover"
        >
          Discover people
        </Link>
        <Link
          to={ROUTES.CHAT}
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Open messages
        </Link>
      </div>
    </section>
  );
}
