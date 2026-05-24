import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import type { UserProfile } from '../../user/types/user.types';
import type { NetworkPost } from '../types/network.types';
import { UserAvatar } from '../../user/components/UserAvatar';
import { buildPostPath, buildProfilePath, type PostOverlayNavigationState } from '../../../shared/constants/routes';
import { likePost, unlikePost, deletePost } from '../api/network.api';
import { ReportModal } from './ReportModal';
import { SharePostModal } from './SharePostModal';
import { SharedPostPreview } from './SharedPostPreview';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { NetworkMediaStrip } from './NetworkMediaStrip';
import { isCloudinaryVideoUrl } from '../../../shared/lib/cloudinary';
import { formatRelativeTime } from '../lib/formatRelativeTime';
import { ExpandablePlainText } from './ExpandablePlainText';

export function PostCard({
  post,
  author,
  viewerUserId,
  mode = 'feed',
  mediaLinkEnabled = true,
  onChanged,
  onPostDeleted,
  onReposted,
  originalAuthor,
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
  onReposted?: (repost: NetworkPost) => void;
  originalAuthor?: UserProfile | null | undefined;
}) {
  if (mode === 'grid') {
    return (
      <PostGridTile
        post={post}
        firstMediaUrl={post.mediaUrls[0]}
        textPreview={post.content.trim()}
        isPending={post.visibility === 'pending'}
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
      onReposted={onReposted}
      originalAuthor={originalAuthor}
    />
  );
}

function PostGridTile({
  post,
  firstMediaUrl,
  textPreview,
  isPending = false,
}: {
  post: NetworkPost;
  firstMediaUrl: string | undefined;
  textPreview: string;
  isPending?: boolean;
}) {
  const location = useLocation();
  const postPath = buildPostPath(post.id);
  const overlayState: PostOverlayNavigationState = {
    backgroundLocation: location,
  };

  return (
    <Link
      to={postPath}
      state={overlayState}
      className={`group relative aspect-square overflow-hidden rounded-xl bg-neutral-200 ring-1 ring-black/5 transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)] dark:bg-neutral-900 dark:ring-white/5 sm:rounded-2xl ${
        isPending ? 'ring-2 ring-amber-400/80 dark:ring-amber-500/60' : ''
      }`}
    >
      {isPending && (
        <span className="absolute left-1.5 top-1.5 z-10 rounded-md bg-amber-500/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          Review
        </span>
      )}
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
        <div className="flex h-full w-full items-center justify-center bg-slate-50/90 p-3 dark:bg-slate-900/80">
          <p className="line-clamp-6 text-center text-xs leading-relaxed text-slate-600 dark:text-slate-400">
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
  onReposted,
  originalAuthor,
}: {
  post: NetworkPost;
  author: UserProfile | null | undefined;
  viewerUserId: string | null;
  mediaLinkEnabled: boolean;
  onChanged?: () => void;
  onPostDeleted?: () => void;
  onReposted?: (repost: NetworkPost) => void;
  originalAuthor?: UserProfile | null | undefined;
}) {
  const location = useLocation();
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const overlayState: PostOverlayNavigationState = {
    backgroundLocation: location,
  };

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
      setDeleteConfirmOpen(false);
      setMenuOpen(false);
      onPostDeleted?.();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  const when = formatRelativeTime(post.createdAt);

  const originalPost = post.originalPost ?? null;
  const isRepost = Boolean(post.originalPostId);
  const displayPost = isRepost && originalPost ? originalPost : post;
  const hasMedia = displayPost.mediaUrls.length > 0;
  const bodyText = isRepost ? post.content.trim() : post.content.trim();
  const originalBodyText = isRepost ? displayPost.content.trim() : '';
  const textOnly = !hasMedia && (isRepost ? originalBodyText.length > 0 : bodyText.length > 0);
  const pendingReview =
    post.visibility === 'pending' && isAuthor;

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
    navigate(postPath, { state: overlayState });
  }

  function handleCardKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.defaultPrevented) return;
    if (e.target !== e.currentTarget) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    navigate(postPath, { state: overlayState });
  }

  return (
    <>
      <article
        role="link"
        tabIndex={0}
        aria-label={`Open post by ${username}`}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        className="surface-card surface-card--hover cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        {isRepost ? (
          <p className="border-b border-neutral-200 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            Reposted
          </p>
        ) : null}
        {pendingReview && (
          <p className="border-b border-amber-200/80 bg-amber-50 px-5 py-2 text-center text-xs font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-100">
            Under review — only you can see this post
          </p>
        )}
        <header className="flex items-start gap-3 px-4 py-4 sm:gap-4 sm:px-5">
          <Link to={profilePath} className="shrink-0 pt-0.5">
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
              <div className="absolute bottom-full right-0 z-30 mb-1 min-w-[10rem] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl md:bottom-auto md:top-10 md:mb-0 dark:border-neutral-700 dark:bg-neutral-950">
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
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {isRepost && bodyText ? (
          <div className="px-5 pb-2 pt-3">
            <ExpandablePlainText
              text={bodyText}
              maxCollapsedChars={260}
              stopCardNavigation
              paragraphClassName="whitespace-pre-wrap text-base leading-relaxed text-slate-800 dark:text-slate-200"
              moreClassName="mt-2 text-sm font-medium text-accent hover:text-accent-hover"
            />
          </div>
        ) : null}

        {isRepost && originalPost ? (
          <div className="px-5 pb-3">
            <SharedPostPreview
              post={originalPost}
              author={originalAuthor}
              stopCardNavigation
            />
          </div>
        ) : isRepost ? (
          <div className="px-5 pb-3">
            <SharedPostPreview unavailable stopCardNavigation />
          </div>
        ) : null}

        {!isRepost && textOnly && (
          <div className="px-5 pb-2">
            <ExpandablePlainText
              text={bodyText}
              maxCollapsedChars={260}
              stopCardNavigation
              paragraphClassName="whitespace-pre-wrap text-base leading-relaxed text-slate-800 dark:text-slate-200"
              moreClassName="mt-2 text-sm font-medium text-accent hover:text-accent-hover"
            />
          </div>
        )}

        {!isRepost && hasMedia && (
          <div className="border-y border-neutral-200 dark:border-neutral-800">
            <NetworkMediaStrip
              urls={displayPost.mediaUrls}
              variant="feed"
              linkTo={mediaLinkEnabled ? buildPostPath(displayPost.id) : undefined}
              linkState={mediaLinkEnabled ? overlayState : undefined}
            />
          </div>
        )}

        <div className="space-y-1.5 px-5 pb-4 pt-3">
          <div className="-ml-1.5 flex items-center gap-5 pt-0.5">
            <div className="flex min-h-[44px] min-w-0 items-center gap-1.5">
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
              {likeCount > 0 ? (
                <span className="text-base font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {likeCount.toLocaleString()}
                </span>
              ) : null}
            </div>
            <Link
              to={postPath}
              state={overlayState}
              className="rounded-full p-2 text-neutral-900 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900"
              aria-label="Comment"
            >
              <CommentIcon large />
            </Link>
            {viewerUserId ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShareOpen(true);
                }}
                className="rounded-full p-2 text-neutral-900 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900"
                aria-label="Share post"
              >
                <ShareIcon large />
              </button>
            ) : null}
          </div>

          {!isRepost && !textOnly && bodyText.length > 0 && (
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
              state={overlayState}
              className="inline-block text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              View all {post.commentCount}{' '}
              {post.commentCount === 1 ? 'comment' : 'comments'}
            </Link>
          )}
        </div>
      </article>

      <SharePostModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        post={isRepost && originalPost ? originalPost : post}
        viewerUserId={viewerUserId ?? ''}
        onReposted={onReposted}
      />
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={post.id}
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => !busy && setDeleteConfirmOpen(false)}
        onConfirm={() => void removePost()}
        title="Delete post?"
        message="This will permanently remove the post. You can't undo this."
        confirmLabel="Delete"
        confirming={busy}
      />
    </>
  );
}

function ShareIcon({ large }: { large?: boolean }) {
  const sz = large ? 28 : 18;
  return (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
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
