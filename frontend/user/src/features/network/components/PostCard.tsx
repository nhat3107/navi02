import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import type { UserProfile } from '../../user/types/user.types';
import type { NetworkPost } from '../types/network.types';
import { UserAvatar } from '../../user/components/UserAvatar';
import { buildPostPath, buildProfilePath } from '../../../shared/constants/routes';
import { likePost, unlikePost, deletePost } from '../api/network.api';
import { ReportModal } from './ReportModal';
import { NetworkMediaStrip } from './NetworkMediaStrip';
import { isCloudinaryVideoUrl } from '../../../shared/lib/cloudinary';
import { formatRelativeTime } from '../lib/formatRelativeTime';

export function PostCard({
  post,
  author,
  viewerUserId,
  mode = 'feed',
  mediaLinkEnabled = true,
  onChanged,
  onPostDeleted,
}: {
  post: NetworkPost;
  author: UserProfile | null | undefined;
  viewerUserId: string | null;
  /** `feed` — full timeline card; `grid` — profile square tile. */
  mode?: 'feed' | 'grid';
  /** When false, tapping the photo will not navigate (useful on the post detail page). */
  mediaLinkEnabled?: boolean;
  onChanged?: () => void;
  onPostDeleted?: () => void;
}) {
  if (mode === 'grid') {
    return (
      <PostGridTile
        post={post}
        firstMediaUrl={post.mediaUrls[0]}
        textPreview={post.content.trim()}
      />
    );
  }

  return (
    <PostFeedCard
      post={post}
      author={author}
      viewerUserId={viewerUserId}
      mediaLinkEnabled={mediaLinkEnabled}
      onChanged={onChanged}
      onPostDeleted={onPostDeleted}
    />
  );
}

function PostGridTile({
  post,
  firstMediaUrl,
  textPreview,
}: {
  post: NetworkPost;
  firstMediaUrl: string | undefined;
  textPreview: string;
}) {
  const postPath = buildPostPath(post.id);

  return (
    <Link
      to={postPath}
      className="group relative aspect-square overflow-hidden rounded-xl bg-neutral-200 ring-1 ring-black/5 transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)] dark:bg-neutral-900 dark:ring-white/5 sm:rounded-2xl"
    >
      {firstMediaUrl ? (
        isCloudinaryVideoUrl(firstMediaUrl) ? (
          <video
            src={firstMediaUrl}
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={firstMediaUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-200/80 via-fuchsia-100/80 to-amber-100/80 p-3 dark:from-violet-950/50 dark:via-fuchsia-950/40 dark:to-amber-950/40">
          <p className="line-clamp-6 text-center text-xs font-medium leading-snug text-neutral-800 dark:text-neutral-200">
            {textPreview || '·'}
          </p>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center gap-6 bg-black/45 text-[0.8125rem] font-semibold text-white opacity-0 transition-opacity duration-200 md:flex md:group-hover:opacity-100">
        <span className="flex items-center gap-1.5" aria-hidden>
          <HeartGlyph className="text-white" />
          {post.likeCount.toLocaleString()}
        </span>
        <span className="flex items-center gap-1.5" aria-hidden>
          <CommentGlyph className="text-white" />
          {post.commentCount.toLocaleString()}
        </span>
      </div>
    </Link>
  );
}

function PostFeedCard({
  post,
  author,
  viewerUserId,
  mediaLinkEnabled,
  onChanged,
  onPostDeleted,
}: {
  post: NetworkPost;
  author: UserProfile | null | undefined;
  viewerUserId: string | null;
  mediaLinkEnabled: boolean;
  onChanged?: () => void;
  onPostDeleted?: () => void;
}) {
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLiked(Boolean(post.liked));
    setLikeCount(post.likeCount);
  }, [post.id, post.liked, post.likeCount]);

  const isAuthor = Boolean(viewerUserId && viewerUserId === post.authorId);
  const profilePath = buildProfilePath(post.authorId);
  const postPath = buildPostPath(post.id);

  const username = author?.username?.trim() || 'user';
  const displayName =
    author?.full_name?.trim() || (author?.username ? `@${author.username}` : 'Member');

  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  async function toggleLike() {
    if (busy) return;
    setBusy(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    try {
      if (nextLiked) await likePost(post.id);
      else await unlikePost(post.id);
      onChanged?.();
    } catch {
      setLiked(!nextLiked);
      setLikeCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  }

  async function removePost() {
    if (!isAuthor || busy) return;
    setBusy(true);
    try {
      await deletePost(post.id);
      setMenuOpen(false);
      onPostDeleted?.();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  const when = formatRelativeTime(post.createdAt);

  const hasMedia = post.mediaUrls.length > 0;

  /**
   * Treat the whole card as a single tap target for opening the detail view,
   * but only when the user clicked on the card's "chrome" — never when they
   * hit an interactive child (link, button, video, modal trigger…) or are
   * actively selecting text.
   */
  function isInteractiveTarget(el: HTMLElement | null): boolean {
    if (!el) return false;
    return Boolean(
      el.closest(
        'a, button, input, textarea, select, video, audio, label, ' +
          '[role="button"], [role="menu"], [role="menuitem"], [role="dialog"]',
      ),
    );
  }

  function handleCardClick(e: React.MouseEvent<HTMLElement>) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (isInteractiveTarget(e.target as HTMLElement | null)) return;
    if (typeof window !== 'undefined' && window.getSelection()?.toString()) {
      return;
    }
    navigate(postPath);
  }

  function handleCardKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.defaultPrevented) return;
    if (e.target !== e.currentTarget) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    navigate(postPath);
  }

  return (
    <>
      <article
        role="link"
        tabIndex={0}
        aria-label={`Open post by ${username}`}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        className="cursor-pointer overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_18px_-6px_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none dark:hover:shadow-none"
      >
        <header className="flex items-center gap-3 px-5 py-4 sm:gap-4">
          <Link to={profilePath} className="shrink-0">
            <span className="inline-flex rounded-full ring-2 ring-neutral-100 dark:ring-neutral-800">
              <UserAvatar label={displayName} src={author?.avatar_url ?? null} size="md" />
            </span>
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              to={profilePath}
              className="block truncate text-base font-semibold text-neutral-900 hover:opacity-70 dark:text-neutral-100"
            >
              {username}
            </Link>
            {when && (
              <p className="mt-0.5 truncate text-xs text-neutral-600 dark:text-neutral-400">
                {when}
                {post.visibility !== 'public' && (
                  <span className="ml-1 text-neutral-500 dark:text-neutral-500">
                    · {post.visibility}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-full p-2 text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
              aria-expanded={menuOpen}
              aria-label="Post options"
            >
              <MoreIcon />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-30 min-w-[10rem] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-950">
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
                  onClick={() => {
                    setMenuOpen(false);
                    setReportOpen(true);
                  }}
                >
                  Report
                </button>
                {isAuthor && (
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    onClick={() => void removePost()}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {hasMedia && (
          <div className="border-y border-neutral-200 dark:border-neutral-800">
            <NetworkMediaStrip
              urls={post.mediaUrls}
              variant="feed"
              linkTo={mediaLinkEnabled ? postPath : undefined}
            />
          </div>
        )}

        <div className="space-y-1.5 px-5 pb-4 pt-3">
          <div className="-ml-1.5 flex items-center gap-1 pt-0.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleLike()}
              className={`rounded-full p-2 transition hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-900 ${
                liked
                  ? 'text-[#ff3040]'
                  : 'text-neutral-900 dark:text-neutral-100'
              }`}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <HeartIcon filled={liked} large />
            </button>
            <Link
              to={postPath}
              className="rounded-full p-2 text-neutral-900 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900"
              aria-label="Comment"
            >
              <CommentIcon large />
            </Link>
          </div>

          {likeCount > 0 && (
            <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {likeCount.toLocaleString()}{' '}
              {likeCount === 1 ? 'like' : 'likes'}
            </p>
          )}

          {post.content.trim().length > 0 && (
            <p className="text-base leading-relaxed text-neutral-900 dark:text-neutral-100">
              <Link
                to={profilePath}
                className="mr-1.5 font-semibold hover:opacity-70"
              >
                {username}
              </Link>
              <span className="whitespace-pre-wrap font-normal">{post.content}</span>
            </p>
          )}

          {post.commentCount > 0 && (
            <Link
              to={postPath}
              className="inline-block text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              View all {post.commentCount}{' '}
              {post.commentCount === 1 ? 'comment' : 'comments'}
            </Link>
          )}

          <Link
            to={postPath}
            className="block pt-1 text-[0.7rem] uppercase tracking-wide text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            {when}
          </Link>
        </div>
      </article>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={post.id}
      />
    </>
  );
}

function HeartIcon({ filled, large }: { filled: boolean; large?: boolean }) {
  const sz = large ? 28 : 18;
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon({ large }: { large?: boolean }) {
  const sz = large ? 28 : 18;
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function HeartGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
