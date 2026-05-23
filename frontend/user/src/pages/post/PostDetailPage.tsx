import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { AppNavBar } from '../../features/user/components/AppNavBar';
import { UserAvatar } from '../../features/user/components/UserAvatar';
import { ROUTES, buildProfilePath, type PostOverlayNavigationState } from '../../shared/constants/routes';
import { useAuthStore } from '../../features/auth/store/auth.store';
import type { UserProfile } from '../../features/user/types/user.types';
import { useAuthorProfiles } from '../../features/network/hooks/useAuthorProfiles';
import type { NetworkComment, NetworkPost } from '../../features/network/types/network.types';
import {
  createComment,
  deleteComment,
  deletePost,
  fetchCommentReplies,
  fetchCommentsByPost,
  fetchPostById,
  likeComment,
  likePost,
  unlikeComment,
  unlikePost,
} from '../../features/network/api/network.api';
import { ReportModal } from '../../features/network/components/ReportModal';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { NetworkMediaPicker } from '../../features/network/components/NetworkMediaPicker';
import { NetworkMediaStrip } from '../../features/network/components/NetworkMediaStrip';
import { formatRelativeTime } from '../../features/network/lib/formatRelativeTime';
import { ExpandablePlainText } from '../../features/network/components/ExpandablePlainText';
import { isCloudinaryVideoUrl } from '../../shared/lib/cloudinary';

const MAX_COMMENT_MEDIA = 4;

export function PostDetailPage({ overlay = false }: { overlay?: boolean }) {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const viewerId = user?.id ?? null;

  const [post, setPost] = useState<NetworkPost | null>(null);
  const [comments, setComments] = useState<NetworkComment[]>([]);
  const [phase, setPhase] = useState<
    | 'loading'
    | 'ready'
    | 'not-found'
    | 'removed'
    | 'under-review'
    | 'error'
  >('loading');
  const [commentDraft, setCommentDraft] = useState('');
  const [commentMediaUrls, setCommentMediaUrls] = useState<string[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [extraAuthorIds, setExtraAuthorIds] = useState<string[]>([]);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  /** Active media inside the in-pane carousel (first item by default). */
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  /** Lightbox state for media attached to comments (separate from post media). */
  const [commentLightbox, setCommentLightbox] = useState<
    { urls: string[]; startIndex: number } | null
  >(null);
  /** Composer is hidden by default — clicking the comment icon toggles it. */
  const [composerOpen, setComposerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  const dismissOverlay = useCallback(() => {
    const bg = (location.state as PostOverlayNavigationState | null | undefined)
      ?.backgroundLocation;
    if (bg && typeof bg.pathname === 'string') {
      navigate(
        {
          pathname: bg.pathname,
          search: bg.search,
          hash: bg.hash,
        },
        { replace: true, state: bg.state },
      );
    } else {
      navigate(-1);
    }
  }, [navigate, location.state]);

  useEffect(() => {
    setExtraAuthorIds([]);
    setActiveMediaIndex(0);
    setComposerOpen(false);
    setCommentLightbox(null);
  }, [postId]);

  useEffect(() => {
    if (!composerOpen) return;
    const t = window.setTimeout(() => commentInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [composerOpen]);

  useEffect(() => {
    if (!overlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [overlay]);

  const load = useCallback(async () => {
    const id = postId?.trim();
    if (!id) {
      setPhase('not-found');
      return;
    }
    setPhase('loading');
    try {
      const [p, list] = await Promise.all([
        fetchPostById(id),
        fetchCommentsByPost(id),
      ]);
      setPost(p);
      setComments(list);
      setPhase('ready');
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>;
      const status = ax.response?.status;
      const msg = ax.response?.data?.message;
      if (status === 410 || msg === 'POST_REMOVED') setPhase('removed');
      else if (status === 403 && msg === 'POST_UNDER_REVIEW') {
        setPhase('under-review');
      } else if (status === 404) setPhase('not-found');
      else setPhase('error');
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!post) return;
    setLiked(Boolean(post.liked));
    setLikeCount(post.likeCount);
  }, [post?.id, post?.liked, post?.likeCount]);

  const mediaCount = post?.mediaUrls.length ?? 0;
  const showPrev = useCallback(() => {
    if (mediaCount < 2) return;
    setActiveMediaIndex((i) => (i - 1 + mediaCount) % mediaCount);
  }, [mediaCount]);
  const showNext = useCallback(() => {
    if (mediaCount < 2) return;
    setActiveMediaIndex((i) => (i + 1) % mediaCount);
  }, [mediaCount]);

  // Esc: overlay → previous screen (see `PostOverlayNavigationState`); full page → back.
  // Lightbox uses capture-phase Esc.
  // Arrow keys step carousel when not typing in a form control.
  useEffect(() => {
    function isTypingTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      if (t.isContentEditable) return true;
      const tag = t.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    }
    function onKey(e: KeyboardEvent) {
      const anyLightboxOpen = lightboxIndex !== null || commentLightbox !== null;
      if (e.key === 'Escape' && !anyLightboxOpen) {
        if (overlay) dismissOverlay();
        else navigate(-1);
        return;
      }
      if (anyLightboxOpen) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === 'ArrowRight' && mediaCount > 1) {
        e.preventDefault();
        showNext();
      } else if (e.key === 'ArrowLeft' && mediaCount > 1) {
        e.preventDefault();
        showPrev();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [
    navigate,
    overlay,
    dismissOverlay,
    lightboxIndex,
    commentLightbox,
    mediaCount,
    showNext,
    showPrev,
  ]);

  // Click-outside dismiss for the post options menu.
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

  const baseAuthorIds = post
    ? [post.authorId, ...comments.map((c) => c.authorId)]
    : [];
  const mergedAuthorIds = [...new Set([...baseAuthorIds, ...extraAuthorIds])];
  const { byId: authorById } = useAuthorProfiles(mergedAuthorIds);

  function appendAuthors(ids: string[]) {
    setExtraAuthorIds((prev) => [...new Set([...prev, ...ids])]);
  }

  async function sendTopLevelComment() {
    const id = postId?.trim();
    const text = commentDraft.trim();
    if (!id || !post || (!text && commentMediaUrls.length === 0)) return;
    setSubmittingComment(true);
    try {
      const created = await createComment({
        postId: id,
        content: text || undefined,
        mediaUrls: commentMediaUrls.length ? commentMediaUrls : undefined,
      });
      appendAuthors([created.authorId]);
      setComments((prev) => [created, ...prev]);
      setPost((p) => (p ? { ...p, commentCount: p.commentCount + 1 } : p));
      setCommentDraft('');
      setCommentMediaUrls([]);
    } finally {
      setSubmittingComment(false);
    }
  }

  async function togglePostLike() {
    if (!post || likeBusy) return;
    setLikeBusy(true);
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      if (next) await likePost(post.id);
      else await unlikePost(post.id);
    } catch {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setLikeBusy(false);
    }
  }

  async function removePost() {
    if (!post) return;
    try {
      await deletePost(post.id);
      navigate(ROUTES.HOME, { replace: true });
    } catch {
      /* ignore */
    }
  }

  function toggleComposer() {
    setComposerOpen((v) => !v);
  }

  function openCommentLightbox(urls: string[], startIndex: number) {
    if (!urls.length) return;
    setCommentLightbox({
      urls,
      startIndex: Math.min(Math.max(startIndex, 0), urls.length - 1),
    });
  }

  const author = post ? authorById[post.authorId] : undefined;
  const username = author?.username?.trim() || 'user';
  const displayName =
    author?.full_name?.trim() ||
    (author?.username ? `@${author.username}` : 'Member');
  const profilePath = post ? buildProfilePath(post.authorId) : ROUTES.HOME;
  const isAuthor = Boolean(viewerId && post && viewerId === post.authorId);
  const when = post ? formatRelativeTime(post.createdAt) : '';
  const hasMedia = (post?.mediaUrls.length ?? 0) > 0;
  const textOnly = Boolean(
    post && !hasMedia && post.content.trim().length > 0,
  );
  const detailTwoColumn = Boolean(post && (hasMedia || textOnly));

  const pageMain = (
    <main
      className={`relative mx-auto w-full max-w-[min(1120px,100%)] scroll-mt-4 px-3 pb-12 sm:px-6 ${
        overlay
          ? 'pt-2 sm:pt-3'
          : 'pt-[max(1rem,env(safe-area-inset-top,0px))] sm:pt-6'
      }`}
    >
        {phase === 'loading' && (
          <div className="rounded-3xl border border-neutral-200/70 bg-white/80 p-12 text-center text-sm font-medium text-neutral-700 shadow-[0_25px_60px_-25px_rgba(15,23,42,0.25)] backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/80 dark:text-neutral-200">
            Loading post…
          </div>
        )}
        {phase === 'not-found' && (
          <div className="rounded-3xl border border-neutral-200/70 bg-white/80 p-12 text-center text-sm font-medium text-neutral-800 shadow-[0_25px_60px_-25px_rgba(15,23,42,0.25)] backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/80 dark:text-neutral-100">
            This post is not available.
          </div>
        )}
        {phase === 'removed' && (
          <div className="rounded-3xl border border-neutral-200/70 bg-white/80 p-12 text-center shadow-[0_25px_60px_-25px_rgba(15,23,42,0.25)] backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/80">
            <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              This post has been removed
            </p>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              It was removed because it did not meet our community guidelines.
            </p>
          </div>
        )}
        {phase === 'under-review' && (
          <div className="rounded-3xl border border-amber-200/70 bg-amber-50/90 p-12 text-center shadow-[0_25px_60px_-25px_rgba(245,158,11,0.2)] backdrop-blur dark:border-amber-900/40 dark:bg-amber-950/40">
            <p className="text-base font-semibold text-amber-950 dark:text-amber-100">
              This post is under review
            </p>
            <p className="mt-2 text-sm text-amber-900/80 dark:text-amber-200/90">
              Only the author can view it while moderation is in progress.
            </p>
          </div>
        )}
        {phase === 'error' && (
          <div className="rounded-3xl border border-rose-200/60 bg-rose-50/80 p-12 text-center text-sm font-medium text-rose-800 shadow-[0_25px_60px_-25px_rgba(244,63,94,0.25)] backdrop-blur dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
            Could not load this post.
          </div>
        )}

        {phase === 'ready' && post && (
          <article
            aria-label="Post detail"
            className={`relative overflow-hidden rounded-3xl border shadow-[0_24px_64px_-28px_rgba(15,23,42,0.2)] ring-1 transition-shadow duration-300 dark:shadow-[0_28px_72px_-32px_rgba(0,0,0,0.65)] ${
              textOnly
                ? 'border-violet-200/70 bg-gradient-to-br from-white via-violet-50/50 to-sky-50/40 ring-violet-200/30 dark:border-violet-500/20 dark:from-neutral-950 dark:via-violet-950/35 dark:to-slate-950/80 dark:ring-violet-500/10'
                : 'border-neutral-200/60 bg-white ring-black/[0.04] dark:border-neutral-800/70 dark:bg-neutral-950 dark:ring-white/[0.06]'
            } ${
              detailTwoColumn
                ? 'lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]'
                : 'mx-auto lg:max-w-[700px]'
            }`}
          >
            {post.visibility === 'pending' && isAuthor && (
              <p className="border-b border-amber-200/80 bg-amber-50 px-5 py-2.5 text-center text-sm font-semibold text-amber-900 lg:col-span-2 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-100">
                Under review — this post is hidden from everyone else until moderation
                finishes.
              </p>
            )}
            {hasMedia && (
              <MediaCarousel
                urls={post.mediaUrls}
                index={Math.min(activeMediaIndex, post.mediaUrls.length - 1)}
                onPrev={showPrev}
                onNext={showNext}
                onJumpTo={(i) => setActiveMediaIndex(i)}
                onZoom={(i) => setLightboxIndex(i)}
              />
            )}

            {textOnly && (
              <section
                aria-label="Post text"
                className="relative flex min-h-[280px] flex-col border-b border-violet-200/50 bg-gradient-to-b from-violet-50/60 via-white/80 to-fuchsia-50/35 dark:border-violet-800/40 dark:from-violet-950/50 dark:via-neutral-950/90 dark:to-fuchsia-950/25 lg:h-[min(82vh,820px)] lg:max-h-[min(82vh,820px)] lg:min-h-[560px] lg:border-b-0 lg:border-r lg:border-violet-200/40 dark:lg:border-violet-800/30"
              >
                <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto p-5 sm:p-8">
                  <div className="relative overflow-hidden rounded-2xl border border-violet-200/70 bg-white/95 px-7 py-9 shadow-[0_12px_48px_-16px_rgba(124,58,237,0.28)] ring-2 ring-violet-400/25 dark:border-violet-500/30 dark:bg-neutral-900/90 dark:shadow-[0_16px_56px_-20px_rgba(167,139,250,0.35)] dark:ring-violet-400/20 sm:rounded-3xl sm:px-10 sm:py-11">
                    <div
                      className="pointer-events-none absolute -left-8 -top-10 h-36 w-36 rounded-full bg-gradient-to-br from-violet-400/25 to-fuchsia-400/15 blur-2xl dark:from-violet-500/20 dark:to-fuchsia-600/10"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute -bottom-8 -right-6 h-32 w-32 rounded-full bg-gradient-to-tl from-sky-400/20 to-violet-400/10 blur-2xl dark:from-sky-500/15 dark:to-violet-500/10"
                      aria-hidden
                    />
                    <ExpandablePlainText
                      text={post.content.trim()}
                      maxCollapsedChars={720}
                      paragraphClassName="relative mx-auto max-w-prose whitespace-pre-wrap text-[1.0625rem] font-semibold leading-[1.7] tracking-[-0.01em] text-neutral-900 antialiased sm:text-lg dark:text-neutral-100"
                      moreClassName="relative mt-3 text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200"
                    />
                  </div>
                </div>
              </section>
            )}

            <div
              className={`flex flex-col ${
                textOnly
                  ? 'bg-gradient-to-b from-white/95 via-violet-50/30 to-white/90 dark:from-neutral-950 dark:via-violet-950/20 dark:to-neutral-950'
                  : 'bg-white dark:bg-neutral-950'
              } ${
                detailTwoColumn
                  ? 'lg:h-[min(82vh,820px)] lg:max-h-[min(82vh,820px)] lg:min-h-[560px]'
                  : ''
              }`}
            >
              <header
                className="flex items-start gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
              >
                <Link to={profilePath} className="mt-0.5 shrink-0">
                  <span className="inline-flex rounded-full ring-2 ring-neutral-100 dark:ring-neutral-800">
                    <UserAvatar
                      label={displayName}
                      src={author?.avatar_url ?? null}
                      size="md"
                    />
                  </span>
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <Link
                      to={profilePath}
                      className="truncate text-base font-semibold text-neutral-900 hover:opacity-70 dark:text-neutral-100"
                    >
                      {username}
                    </Link>
                    {when && (
                      <span className="truncate text-xs text-neutral-600 dark:text-neutral-400">
                        · {when}
                        {post.visibility !== 'public' && (
                          <span className="ml-1 text-neutral-500 dark:text-neutral-500">
                            · {post.visibility}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {hasMedia && post.content.trim().length > 0 && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-[1.0625rem] font-medium leading-[1.65] text-neutral-900 antialiased dark:text-neutral-100 sm:text-lg sm:leading-relaxed">
                      {post.content}
                    </p>
                  )}
                </div>
                <div className="relative shrink-0" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="rounded-full p-2 text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900"
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

              <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
                <ul className="space-y-1.5">
                  {comments.map((c) => (
                    <CommentThread
                      key={c.id}
                      root={c}
                      authorById={authorById}
                      viewerUserId={viewerId}
                      appendAuthors={appendAuthors}
                      onThreadChanged={() => void load()}
                      onMediaClick={openCommentLightbox}
                    />
                  ))}
                </ul>

                {comments.length === 0 && !composerOpen && (
                  <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-5 py-8 text-center dark:border-neutral-700 dark:bg-neutral-900/60">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      No comments yet
                    </p>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                      Be the first to start the conversation.
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-neutral-200 px-5 py-3 dark:border-neutral-800">
                <div className="-ml-1.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <div className="flex min-h-[40px] items-center gap-1.5">
                    <button
                      type="button"
                      disabled={likeBusy}
                      onClick={() => void togglePostLike()}
                      className={`rounded-full p-2 transition hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-900 ${
                        liked
                          ? 'text-[#ff3040]'
                          : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                      aria-label={liked ? 'Unlike' : 'Like'}
                    >
                      <HeartIcon filled={liked} />
                    </button>
                    {likeCount > 0 ? (
                      <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                        {likeCount.toLocaleString()}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={toggleComposer}
                    aria-expanded={composerOpen}
                    aria-controls="comment-composer"
                    className={`rounded-full p-2 transition hover:bg-neutral-100 dark:hover:bg-neutral-900 ${
                      composerOpen
                        ? 'text-accent'
                        : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                    aria-label={
                      composerOpen ? 'Close comment box' : 'Add a comment'
                    }
                  >
                    <CommentIcon />
                  </button>
                </div>
              </div>

              {composerOpen && (
                <div
                  id="comment-composer"
                  className="border-t border-neutral-200 px-5 py-3 dark:border-neutral-800"
                >
                  <div className="group flex items-center gap-2 rounded-full border border-neutral-300 bg-white pl-4 pr-1.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-within:border-accent dark:focus-within:ring-accent/30">
                    <textarea
                      ref={commentInputRef}
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void sendTopLevelComment();
                        } else if (
                          e.key === 'Escape' &&
                          !commentDraft.trim() &&
                          commentMediaUrls.length === 0
                        ) {
                          e.preventDefault();
                          setComposerOpen(false);
                        }
                      }}
                      rows={1}
                      maxLength={2000}
                      placeholder="Add a comment…"
                      className="min-h-[24px] max-h-32 min-w-0 flex-1 resize-none border-0 bg-transparent py-2.5 text-sm font-medium leading-snug text-neutral-900 caret-accent outline-none placeholder:font-normal placeholder:text-neutral-500 dark:text-neutral-50 dark:placeholder:text-neutral-400"
                    />
                    <button
                      type="button"
                      disabled={
                        submittingComment ||
                        (!commentDraft.trim() && commentMediaUrls.length === 0)
                      }
                      onClick={() => void sendTopLevelComment()}
                      className="rounded-full px-4 py-1.5 text-sm font-bold tracking-wide text-[#0095f6] transition hover:text-[#1877f2] disabled:cursor-not-allowed disabled:text-neutral-400 dark:disabled:text-neutral-500"
                    >
                      {submittingComment ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-[0.7rem] font-medium text-neutral-500 dark:text-neutral-400">
                      Press Enter to post · Shift + Enter for a new line
                    </p>
                    <p
                      className={`text-[0.7rem] tabular-nums ${
                        commentDraft.length > 1800
                          ? 'font-semibold text-amber-700 dark:text-amber-300'
                          : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {commentDraft.length}/2000
                    </p>
                  </div>
                  <div className="mt-2">
                    <NetworkMediaPicker
                      urls={commentMediaUrls}
                      onUrlsChange={setCommentMediaUrls}
                      maxFiles={MAX_COMMENT_MEDIA}
                      disabled={submittingComment}
                      addLabel="Attach photo / video"
                      variant="compact"
                    />
                  </div>
                </div>
              )}
            </div>

            <ReportModal
              open={reportOpen}
              onClose={() => setReportOpen(false)}
              targetType="post"
              targetId={post.id}
            />
            <ConfirmDialog
              open={deleteConfirmOpen}
              onClose={() => !deleteBusy && setDeleteConfirmOpen(false)}
              onConfirm={() => void removePost()}
              title="Delete post?"
              message="This will permanently remove the post. You can't undo this."
              confirmLabel="Delete"
              confirming={deleteBusy}
            />
          </article>
        )}

        {phase === 'ready' && post && hasMedia && lightboxIndex !== null && (
          <ImageLightbox
            urls={post.mediaUrls}
            startIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onIndexChange={(i) => setActiveMediaIndex(i)}
          />
        )}

        {commentLightbox !== null && (
          <ImageLightbox
            urls={commentLightbox.urls}
            startIndex={commentLightbox.startIndex}
            onClose={() => setCommentLightbox(null)}
          />
        )}
      </main>
  );

  if (overlay) {
    return (
      <div
        className="fixed inset-0 z-[95] flex min-h-full items-center justify-center overflow-y-auto overscroll-y-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-[calc(1rem+env(safe-area-inset-top,0px))] sm:px-6 sm:pb-10 sm:pt-[calc(1.25rem+env(safe-area-inset-top,0px))]"
        role="dialog"
        aria-modal="true"
        aria-label="Post"
      >
        <button
          type="button"
          className="fixed inset-0 z-0 cursor-default bg-black/60 backdrop-blur-[3px]"
          aria-label="Close and return"
          onClick={() => dismissOverlay()}
        />
        <div className="relative z-10 my-8 w-full max-w-[min(1120px,100%)] sm:my-10">
          {pageMain}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-200 dark:bg-black">
      <AppNavBar />

      {/* Soft floating backdrop, evokes the "lifted" feel of a modal. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[520px] bg-gradient-to-br from-neutral-200/55 via-accent-bg/25 to-neutral-100/40 blur-3xl dark:from-neutral-950 dark:via-accent-bg/20 dark:to-black"
      />

      {pageMain}
    </div>
  );
}

/**
 * In-pane media carousel for the post detail.
 *
 * Shows one media at a time. Multi-media posts get overlay prev/next chevrons,
 * a top-right page counter, and a tappable dot strip at the bottom. Clicking
 * an image fires `onZoom(index)` to open the fullscreen `ImageLightbox`.
 * Videos render with native controls and are not wrapped in a button so the
 * built-in play/seek UI keeps working.
 */
function MediaCarousel({
  urls,
  index,
  onPrev,
  onNext,
  onJumpTo,
  onZoom,
}: {
  urls: string[];
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onJumpTo: (i: number) => void;
  onZoom: (i: number) => void;
}) {
  const total = urls.length;
  const safeIndex = Math.min(Math.max(index, 0), total - 1);
  const url = urls[safeIndex];
  const isVideo = isCloudinaryVideoUrl(url);
  const hasMulti = total > 1;

  return (
    <div className="relative flex min-h-[320px] items-center justify-center bg-black lg:h-[min(82vh,820px)] lg:max-h-[min(82vh,820px)] lg:min-h-[560px]">
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        {isVideo ? (
          <video
            key={url}
            src={url}
            controls
            playsInline
            preload="metadata"
            className="block max-h-[82vh] w-auto max-w-full object-contain"
          />
        ) : (
          <button
            key={url}
            type="button"
            onClick={() => onZoom(safeIndex)}
            aria-label="Open image"
            className="group block max-w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <img
              src={url}
              alt=""
              loading="lazy"
              className="block max-h-[82vh] w-auto max-w-full object-contain transition-opacity duration-150 group-hover:opacity-95"
            />
          </button>
        )}
      </div>

      {hasMulti && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label="Previous media"
            className="absolute left-3 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur transition hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-10 sm:w-10"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="Next media"
            className="absolute right-3 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur transition hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-10 sm:w-10"
          >
            <ChevronRightIcon />
          </button>
          <div className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[0.7rem] font-semibold tabular-nums text-white backdrop-blur">
            {safeIndex + 1} / {total}
          </div>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1.5 backdrop-blur">
            {urls.map((u, i) => (
              <button
                key={u}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpTo(i);
                }}
                aria-label={`Go to media ${i + 1}`}
                aria-current={i === safeIndex}
                className={`h-1.5 rounded-full transition-all ${
                  i === safeIndex
                    ? 'w-4 bg-white'
                    : 'w-1.5 bg-white/55 hover:bg-white/85'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Fullscreen, distraction-free image viewer. Locks body scroll, owns its own
 * Esc handler (capture phase so the page-level Esc handler doesn't fire), and
 * supports keyboard / button navigation across multi-image carousels.
 */
function ImageLightbox({
  urls,
  startIndex,
  onClose,
  onIndexChange,
}: {
  urls: string[];
  startIndex: number;
  onClose: () => void;
  /** Fires every time the active slide changes so the parent carousel can stay in sync. */
  onIndexChange?: (i: number) => void;
}) {
  const total = urls.length;
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(startIndex, 0), Math.max(0, total - 1)),
  );

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);
  const next = useCallback(() => {
    setIndex((i) => (i + 1) % total);
  }, [total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowRight' && total > 1) {
        next();
      } else if (e.key === 'ArrowLeft' && total > 1) {
        prev();
      }
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [next, prev, total, onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const url = urls[index];
  const isVideo = isCloudinaryVideoUrl(url);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close image"
        className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <CloseIcon />
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous image"
            className="absolute left-4 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next image"
            className="absolute right-4 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <ChevronRightIcon />
          </button>
          <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {index + 1} / {total}
          </div>
        </>
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full max-w-full items-center justify-center"
      >
        {isVideo ? (
          <video
            key={url}
            src={url}
            controls
            autoPlay
            playsInline
            className="max-h-[92vh] max-w-[92vw] rounded-lg shadow-2xl"
          />
        ) : (
          <img
            key={url}
            src={url}
            alt=""
            className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}


/**
 * Top-level comment node. Owns the reply composer and (lazily-loaded) nested
 * replies. Each reply re-uses `CommentItem` without the "Reply" / "View N
 * replies" affordances so threads stay one level deep but visually grouped.
 */
function CommentThread({
  root,
  authorById,
  viewerUserId,
  appendAuthors,
  onThreadChanged,
  onMediaClick,
}: {
  root: NetworkComment;
  authorById: Record<string, UserProfile>;
  viewerUserId: string | null;
  appendAuthors: (ids: string[]) => void;
  onThreadChanged: () => void;
  /** Open the fullscreen viewer at `index` for the given comment's media. */
  onMediaClick: (urls: string[], index: number) => void;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<NetworkComment[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyMediaUrls, setReplyMediaUrls] = useState<string[]>([]);
  const [sendingReply, setSendingReply] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (replyOpen) replyInputRef.current?.focus();
  }, [replyOpen]);

  async function loadReplies() {
    if (showReplies) {
      setShowReplies(false);
      return;
    }
    setShowReplies(true);
    if (replies.length > 0 || root.replyCount === 0) return;
    setLoadingReplies(true);
    try {
      const data = await fetchCommentReplies(root.id);
      appendAuthors(data.map((r) => r.authorId));
      setReplies(data);
    } finally {
      setLoadingReplies(false);
    }
  }

  function toggleReplyOpen() {
    setReplyOpen((v) => {
      if (v) {
        setReplyText('');
        setReplyMediaUrls([]);
      }
      return !v;
    });
  }

  async function sendReply() {
    const text = replyText.trim();
    if (!text && replyMediaUrls.length === 0) return;
    setSendingReply(true);
    try {
      const created = await createComment({
        postId: root.postId,
        content: text || undefined,
        mediaUrls: replyMediaUrls.length ? replyMediaUrls : undefined,
        parentCommentId: root.id,
      });
      appendAuthors([created.authorId]);
      setReplyText('');
      setReplyMediaUrls([]);
      setReplyOpen(false);
      setReplies((r) => [...r, created]);
      setShowReplies(true);
      onThreadChanged();
    } finally {
      setSendingReply(false);
    }
  }

  const replyDisabled =
    sendingReply || (!replyText.trim() && replyMediaUrls.length === 0);

  return (
    <li className="group/thread">
      <CommentItem
        comment={root}
        author={authorById[root.authorId]}
        viewerUserId={viewerUserId}
        onChanged={onThreadChanged}
        canReply
        replyOpen={replyOpen}
        onToggleReply={toggleReplyOpen}
        repliesOpen={showReplies}
        repliesLoading={loadingReplies}
        onToggleReplies={() => void loadReplies()}
        onMediaClick={onMediaClick}
      />

      {replyOpen && (
        <div className="mb-2 ml-11 mr-1 mt-1 space-y-2 sm:ml-12">
          <div className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white pl-3.5 pr-1 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-within:border-accent dark:focus-within:ring-accent/30">
            <textarea
              ref={replyInputRef}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendReply();
                } else if (e.key === 'Escape') {
                  toggleReplyOpen();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Write a reply…"
              className="min-h-[22px] max-h-28 min-w-0 flex-1 resize-none border-0 bg-transparent py-2 text-xs font-medium leading-snug text-neutral-900 caret-accent outline-none placeholder:font-normal placeholder:text-neutral-500 dark:text-neutral-50 dark:placeholder:text-neutral-400"
            />
            <button
              type="button"
              disabled={replyDisabled}
              onClick={() => void sendReply()}
              className="rounded-full px-3 py-1.5 text-xs font-bold tracking-wide text-[#0095f6] transition hover:text-[#1877f2] disabled:cursor-not-allowed disabled:text-neutral-400 dark:disabled:text-neutral-500"
            >
              {sendingReply ? 'Posting…' : 'Reply'}
            </button>
          </div>
          <NetworkMediaPicker
            urls={replyMediaUrls}
            onUrlsChange={setReplyMediaUrls}
            maxFiles={MAX_COMMENT_MEDIA}
            disabled={sendingReply}
            addLabel="Attach"
            variant="compact"
          />
        </div>
      )}

      {showReplies && replies.length > 0 && (
        <ul
          className="relative ml-5 mt-1 space-y-0.5 border-l-2 border-neutral-200 pl-4 dark:border-neutral-800 sm:ml-7"
          aria-label={`Replies to ${authorById[root.authorId]?.username ?? 'comment'}`}
        >
          {replies.map((r) => (
            <li key={r.id} className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute -left-4 top-6 h-px w-3 bg-neutral-200 dark:bg-neutral-800"
              />
              <CommentItem
                comment={r}
                author={authorById[r.authorId]}
                viewerUserId={viewerUserId}
                onChanged={onThreadChanged}
                nested
                onMediaClick={onMediaClick}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Single comment row. Modern layout: avatar | username + time → body → action
 * footer (Like, Reply, View replies). The "More" menu lives in the top-right
 * and reveals on hover/focus to keep the row visually clean at rest.
 */
function CommentItem({
  comment,
  author,
  viewerUserId,
  onChanged,
  nested,
  canReply,
  replyOpen,
  onToggleReply,
  repliesOpen,
  repliesLoading,
  onToggleReplies,
  onMediaClick,
}: {
  comment: NetworkComment;
  author: UserProfile | undefined;
  viewerUserId: string | null;
  onChanged: () => void;
  nested?: boolean;
  canReply?: boolean;
  replyOpen?: boolean;
  onToggleReply?: () => void;
  repliesOpen?: boolean;
  repliesLoading?: boolean;
  onToggleReplies?: () => void;
  /** Open this comment's media in the fullscreen viewer at `index`. */
  onMediaClick?: (urls: string[], index: number) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  const isAuthor = Boolean(viewerUserId && viewerUserId === comment.authorId);
  const profilePath = buildProfilePath(comment.authorId);
  const display =
    author?.full_name?.trim() ||
    (author?.username ? `@${author.username}` : 'Member');
  const handle = author?.username?.trim() || display;
  const relTime = formatRelativeTime(comment.createdAt);

  async function toggleLike() {
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      if (next) await likeComment(comment.id);
      else await unlikeComment(comment.id);
    } catch {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!isAuthor) return;
    setMenuOpen(false);
    try {
      await deleteComment(comment.id);
      onChanged();
    } catch {
      /* ignore */
    }
  }

  const hasReplies = (comment.replyCount ?? 0) > 0;

  return (
    <>
      <div
        className={`group/cmt relative flex gap-3 rounded-2xl transition-colors hover:bg-neutral-100/70 focus-within:bg-neutral-100/70 dark:hover:bg-neutral-900/50 dark:focus-within:bg-neutral-900/50 ${
          nested ? 'px-2 py-2' : 'px-2.5 py-2.5'
        }`}
      >
        <Link
          to={profilePath}
          className="shrink-0 self-start"
          aria-label={`Open ${handle}'s profile`}
        >
          <UserAvatar
            label={display}
            src={author?.avatar_url ?? null}
            size={nested ? 'xs' : 'sm'}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 pr-7 text-sm leading-snug">
            <Link
              to={profilePath}
              className="truncate font-semibold text-neutral-900 hover:underline dark:text-neutral-100"
            >
              {handle}
            </Link>
            {relTime && (
              <span className="shrink-0 text-[0.7rem] font-medium text-neutral-500 dark:text-neutral-400">
                · {relTime}
              </span>
            )}
          </div>

          {comment.content.trim().length > 0 && (
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-900 dark:text-neutral-100">
              {comment.content}
            </p>
          )}

          {comment.mediaUrls.length > 0 && (
            <div className="mt-2">
              <NetworkMediaStrip
                urls={comment.mediaUrls}
                className="max-w-[min(100%,360px)]"
                onImageClick={
                  onMediaClick
                    ? (i) => onMediaClick(comment.mediaUrls, i)
                    : undefined
                }
              />
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] font-semibold">
            <button
              type="button"
              onClick={() => void toggleLike()}
              disabled={busy}
              aria-pressed={liked}
              aria-label={liked ? 'Unlike comment' : 'Like comment'}
              className={`inline-flex items-center gap-1 transition disabled:opacity-60 ${
                liked
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-neutral-600 hover:text-rose-600 dark:text-neutral-300 dark:hover:text-rose-400'
              }`}
            >
              <CommentHeartGlyph filled={liked} />
              {likeCount > 0 ? (
                <span className="tabular-nums">{likeCount}</span>
              ) : (
                <span>Like</span>
              )}
            </button>

            {canReply && onToggleReply && (
              <button
                type="button"
                onClick={onToggleReply}
                className={`transition ${
                  replyOpen
                    ? 'text-accent'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100'
                }`}
              >
                {replyOpen ? 'Cancel' : 'Reply'}
              </button>
            )}

            {hasReplies && onToggleReplies && (
              <button
                type="button"
                onClick={onToggleReplies}
                className="inline-flex items-center gap-1.5 text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
              >
                <span
                  aria-hidden
                  className="inline-block h-px w-5 bg-current opacity-60"
                />
                {repliesLoading
                  ? 'Loading…'
                  : repliesOpen
                    ? `Hide ${comment.replyCount} repl${comment.replyCount === 1 ? 'y' : 'ies'}`
                    : `View ${comment.replyCount} repl${comment.replyCount === 1 ? 'y' : 'ies'}`}
              </button>
            )}
          </div>
        </div>

        <div
          ref={menuRef}
          className="absolute right-1.5 top-1.5 shrink-0"
        >
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Comment options"
            className={`rounded-full p-1.5 text-neutral-500 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 ${
              menuOpen
                ? 'bg-neutral-200/70 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                : 'opacity-0 group-hover/cmt:opacity-100 group-focus-within/cmt:opacity-100'
            }`}
          >
            <SmallMoreIcon />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-9 z-20 min-w-[9.5rem] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-950"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
                className="w-full px-4 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
              >
                Report
              </button>
              {isAuthor && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void remove()}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="comment"
        targetId={comment.id}
        title="Report comment"
      />
    </>
  );
}

function CommentHeartGlyph({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function SmallMoreIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
