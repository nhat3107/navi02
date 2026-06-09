import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { AppPage } from '../../shared/layout/AppPage';
import { UserAvatar } from '../../features/user/components/UserAvatar';
import { ROUTES, buildProfilePath, type PostOverlayNavigationState } from '../../shared/constants/routes';
import {
  type AppNavigationState,
  upsertEngagementPatch,
} from '../../features/network/lib/postEngagementNavigation';
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
import { SharePostModal } from '../../features/network/components/SharePostModal';
import { SharedPostPreview } from '../../features/network/components/SharedPostPreview';
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
  const [shareModal, setShareModal] = useState<'repost' | 'message' | null>(null);
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
      const prevState = (bg.state ?? {}) as AppNavigationState;
      const nextState: AppNavigationState = { ...prevState };
      if (post) {
        nextState.postEngagementPatches = upsertEngagementPatch(
          prevState.postEngagementPatches,
          { postId: post.id, liked, likeCount },
        );
      }
      navigate(
        {
          pathname: bg.pathname,
          search: bg.search,
          hash: bg.hash,
        },
        { replace: true, state: nextState },
      );
    } else {
      navigate(-1);
    }
  }, [navigate, location.state, post, liked, likeCount]);

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

  const displayMediaUrls =
    post?.originalPost?.mediaUrls ?? post?.mediaUrls ?? [];
  const mediaCount = displayMediaUrls.length;
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
    ? [
        post.authorId,
        post.originalPost?.authorId,
        ...comments.map((c) => c.authorId),
      ].filter(Boolean) as string[]
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

  const handleReplyCountChange = useCallback(
    (parentCommentId: string, delta: 1 | -1) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentCommentId
            ? {
                ...c,
                replyCount: Math.max(0, c.replyCount + delta),
              }
            : c,
        ),
      );
    },
    [],
  );

  const handleCommentDeleted = useCallback(
    (commentId: string, parentCommentId: string | null | undefined) => {
      if (parentCommentId) {
        handleReplyCountChange(parentCommentId, -1);
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setPost((p) =>
        p ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p,
      );
    },
    [handleReplyCountChange],
  );

  const author = post ? authorById[post.authorId] : undefined;
  const originalPost = post?.originalPost ?? null;
  const isRepost = Boolean(post?.originalPostId);
  const displayPost = isRepost && originalPost ? originalPost : post;
  const username = author?.username?.trim() || 'user';
  const displayName =
    author?.full_name?.trim() ||
    (author?.username ? `@${author.username}` : 'Member');
  const profilePath = post ? buildProfilePath(post.authorId) : ROUTES.HOME;
  const isAuthor = Boolean(viewerId && post && viewerId === post.authorId);
  const when = post ? formatRelativeTime(post.createdAt) : '';
  const hasMedia = (displayPost?.mediaUrls.length ?? 0) > 0;
  const textOnly = Boolean(
    displayPost &&
      !hasMedia &&
      (isRepost
        ? displayPost.content.trim().length > 0
        : (post?.content.trim().length ?? 0) > 0),
  );
  const detailTwoColumn = Boolean(post && (hasMedia || textOnly));
  const shareTarget = isRepost && originalPost ? originalPost : post;
  const shareAuthor = shareTarget ? authorById[shareTarget.authorId] : undefined;
  const canRepost = Boolean(
    viewerId && shareTarget && viewerId !== shareTarget.authorId,
  );
  const originalAuthor = originalPost
    ? authorById[originalPost.authorId]
    : undefined;
  const repostQuote = isRepost ? (post?.content.trim() ?? '') : '';
  const mediaCaption =
    !isRepost && hasMedia ? (post?.content.trim() ?? '') : '';
  const showCaptionInPane = repostQuote.length > 0 || mediaCaption.length > 0;
  const textOnlyBody = (
    isRepost ? displayPost?.content ?? '' : post?.content ?? ''
  ).trim();

  const pageMain = (
    <main
      className={`relative mx-auto w-full max-w-[min(1120px,100%)] scroll-mt-4 pb-4 sm:px-6 md:pb-12 ${
        overlay
          ? 'px-0 pt-2 sm:pt-3'
          : 'px-0 pt-0 sm:pt-6'
      }`}
    >
        {phase === 'loading' && (
          <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-12 text-center text-sm font-medium text-slate-700 shadow-[0_25px_60px_-25px_rgba(15,23,42,0.25)] backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/80 dark:text-slate-200">
            Loading post…
          </div>
        )}
        {phase === 'not-found' && (
          <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-12 text-center text-sm font-medium text-slate-800 shadow-[0_25px_60px_-25px_rgba(15,23,42,0.25)] backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/80 dark:text-slate-100">
            This post is not available.
          </div>
        )}
        {phase === 'removed' && (
          <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-12 text-center shadow-[0_25px_60px_-25px_rgba(15,23,42,0.25)] backdrop-blur dark:border-slate-800/70 dark:bg-slate-950/80">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
              This post has been removed
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
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
            className={`relative overflow-hidden rounded-3xl border shadow-[0_24px_64px_-28px_rgba(15,23,42,0.2)] ring-1 transition-shadow duration-300 dark:shadow-[0_28px_72px_-32px_rgba(0,0,0,0.65)] border-slate-200/60 bg-white ring-black/[0.04] dark:border-slate-800/70 dark:bg-slate-950 dark:ring-white/[0.06] ${
              detailTwoColumn
                ? 'lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,1fr)]'
                : 'mx-auto lg:max-w-[700px]'
            }`}
          >
            {isRepost && (
              <p className="border-b border-slate-200 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:col-span-2 dark:border-slate-800 dark:text-slate-400">
                Reposted
              </p>
            )}
            {post.visibility === 'pending' && isAuthor && (
              <p className="border-b border-amber-200/80 bg-amber-50 px-5 py-2.5 text-center text-sm font-semibold text-amber-900 lg:col-span-2 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-100">
                Under review — this post is hidden from everyone else until moderation
                finishes.
              </p>
            )}
            {hasMedia && displayPost && (
              <MediaCarousel
                urls={displayPost.mediaUrls}
                index={Math.min(activeMediaIndex, displayPost.mediaUrls.length - 1)}
                onPrev={showPrev}
                onNext={showNext}
                onJumpTo={(i) => setActiveMediaIndex(i)}
                onZoom={(i) => setLightboxIndex(i)}
              />
            )}

            {textOnly && (
              <section
                aria-label="Post text"
                className="post-detail-text-only relative flex max-h-[min(72vh,680px)] min-h-[280px] flex-col border-b border-slate-200 dark:border-slate-800 lg:h-[min(82vh,820px)] lg:max-h-[min(82vh,820px)] lg:min-h-[560px] lg:border-b-0 lg:border-r"
              >
                <div className="flex min-h-0 flex-1 flex-col justify-start overflow-y-auto overscroll-y-contain p-5 sm:p-8">
                  <div className="post-detail-text-only__highlight">
                    {isRepost && repostQuote.length > 0 && (
                      <div className="mb-6 border-b border-slate-200/80 pb-5 dark:border-slate-700/80">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Repost note
                        </span>
                        <ExpandablePlainText
                          text={repostQuote}
                          maxCollapsedChars={0}
                          alwaysExpanded
                          paragraphClassName="whitespace-pre-wrap break-words text-base leading-relaxed text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    )}
                    {textOnlyBody.length > 0 ? (
                      <ExpandablePlainText
                        text={textOnlyBody}
                        maxCollapsedChars={0}
                        alwaysExpanded
                        paragraphClassName="whitespace-pre-wrap break-words text-base leading-[1.75] text-slate-800 dark:text-slate-200 sm:text-lg sm:leading-[1.8]"
                      />
                    ) : isRepost && !originalPost ? (
                      <SharedPostPreview unavailable />
                    ) : null}
                  </div>
                </div>
              </section>
            )}

            <div
              className={`flex min-h-0 flex-col bg-white dark:bg-slate-950 ${
                detailTwoColumn
                  ? 'max-h-[min(72vh,680px)] lg:h-[min(82vh,820px)] lg:max-h-[min(82vh,820px)] lg:min-h-[560px]'
                  : ''
              }`}
            >
              <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
                <Link to={profilePath} className="shrink-0">
                  <span className="inline-flex rounded-full ring-2 ring-slate-100 dark:ring-slate-800">
                    <UserAvatar
                      label={displayName}
                      src={author?.avatar_url ?? null}
                      size="md"
                    />
                  </span>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to={profilePath}
                    className="block truncate text-sm font-semibold text-slate-900 hover:opacity-70 dark:text-slate-100"
                  >
                    {username}
                  </Link>
                  {when && (
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {when}
                      {post.visibility !== 'public' && (
                        <span className="ml-1">· {post.visibility}</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="relative shrink-0" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="rounded-full p-2 text-slate-800 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-900"
                    aria-expanded={menuOpen}
                    aria-label="Post options"
                  >
                    <MoreIcon />
                  </button>
                  {menuOpen && (
                    <div className="absolute bottom-full right-0 z-30 mb-1 min-w-[10rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl md:bottom-auto md:top-10 md:mb-0 dark:border-slate-700 dark:bg-slate-950">
                      <button
                        type="button"
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-900"
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

              <div className="shrink-0 border-b border-slate-200 px-5 py-2.5 dark:border-slate-800">
                <div className="-ml-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <button
                    type="button"
                    disabled={likeBusy}
                    onClick={() => void togglePostLike()}
                    className={`rounded-full p-2 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-900 ${
                      liked
                        ? 'text-[#ff3040]'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                    aria-label={liked ? 'Unlike' : 'Like'}
                  >
                    <HeartIcon filled={liked} />
                  </button>
                  <button
                    type="button"
                    onClick={toggleComposer}
                    aria-expanded={composerOpen}
                    aria-controls="comment-composer"
                    className={`rounded-full p-2 transition hover:bg-slate-100 dark:hover:bg-slate-900 ${
                      composerOpen
                        ? 'text-accent'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}
                    aria-label={
                      composerOpen ? 'Close comment box' : 'Add a comment'
                    }
                  >
                    <CommentIcon />
                  </button>
                  {viewerId ? (
                    <>
                      {canRepost ? (
                        <button
                          type="button"
                          onClick={() => setShareModal('repost')}
                          className="rounded-full p-2 text-slate-900 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-900"
                          aria-label="Repost"
                        >
                          <RepostIcon />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setShareModal('message')}
                        className="rounded-full p-2 text-slate-900 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-900"
                        aria-label="Send post in message"
                      >
                        <MessageShareIcon />
                      </button>
                    </>
                  ) : null}
                </div>
                {likeCount > 0 ? (
                  <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {likeCount.toLocaleString()}{' '}
                    {likeCount === 1 ? 'like' : 'likes'}
                  </p>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 sm:px-5">
                {showCaptionInPane && (
                  <div className="mb-4 border-b border-slate-100 pb-4 dark:border-slate-800/80">
                    <PostDetailCaption
                      username={username}
                      profilePath={profilePath}
                      text={repostQuote || mediaCaption}
                    />
                  </div>
                )}

                {isRepost && originalPost && !hasMedia && !textOnly && (
                  <div className="mb-4">
                    <SharedPostPreview
                      post={originalPost}
                      author={originalAuthor}
                    />
                  </div>
                )}

                {isRepost && !originalPost && !hasMedia && !textOnly && (
                  <div className="mb-4">
                    <SharedPostPreview unavailable />
                  </div>
                )}

                {comments.length > 0 ? (
                  <ul className="space-y-1.5">
                    {comments.map((c) => (
                      <CommentThread
                        key={c.id}
                        root={c}
                        authorById={authorById}
                        viewerUserId={viewerId}
                        postAuthorId={post.authorId}
                        appendAuthors={appendAuthors}
                        onCommentDeleted={handleCommentDeleted}
                        onReplyAdded={(parentId) =>
                          handleReplyCountChange(parentId, 1)
                        }
                        onMediaClick={openCommentLightbox}
                      />
                    ))}
                  </ul>
                ) : (
                  !showCaptionInPane &&
                  !(isRepost && (originalPost || !hasMedia)) &&
                  !composerOpen && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        No comments yet
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        Be the first to start the conversation.
                      </p>
                    </div>
                  )
                )}
              </div>

              {composerOpen && (
                <div
                  id="comment-composer"
                  className="border-t border-slate-200 px-5 py-3 dark:border-slate-800"
                >
                  <div className="group flex items-center gap-2 rounded-full border border-slate-300 bg-white pl-4 pr-1.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-accent dark:focus-within:ring-accent/30">
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
                      className="min-h-[24px] max-h-32 min-w-0 flex-1 resize-none border-0 bg-transparent py-2.5 text-sm font-medium leading-snug text-slate-900 caret-accent outline-none placeholder:font-normal placeholder:text-slate-500 dark:text-slate-50 dark:placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      disabled={
                        submittingComment ||
                        (!commentDraft.trim() && commentMediaUrls.length === 0)
                      }
                      onClick={() => void sendTopLevelComment()}
                      className="rounded-full px-4 py-1.5 text-sm font-bold tracking-wide text-[#0095f6] transition hover:text-[#1877f2] disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-500"
                    >
                      {submittingComment ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                  <div className="mt-2 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <p className="text-[0.7rem] font-medium text-slate-500 dark:text-slate-400">
                      Press Enter to post · Shift + Enter for a new line
                    </p>
                    <p
                      className={`text-[0.7rem] tabular-nums ${
                        commentDraft.length > 1800
                          ? 'font-semibold text-amber-700 dark:text-amber-300'
                          : 'text-slate-500 dark:text-slate-400'
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

            {shareModal && shareTarget ? (
              <SharePostModal
                open
                variant={shareModal}
                onClose={() => setShareModal(null)}
                post={shareTarget}
                author={shareAuthor}
                viewerUserId={viewerId ?? ''}
              />
            ) : null}
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
            urls={displayMediaUrls}
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
        <button
          type="button"
          onClick={() => dismissOverlay()}
          aria-label="Close post"
          className="fixed left-4 top-[max(0.75rem,env(safe-area-inset-top))] z-[96] inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-4 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-black/70"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <div className="relative z-10 my-8 w-full max-w-[min(1120px,100%)] sm:my-10">
          {pageMain}
        </div>
      </div>
    );
  }

  return (
    <AppPage mainClassName="relative p-0">
      {/* Soft floating backdrop, evokes the "lifted" feel of a modal. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[520px] bg-gradient-to-br from-slate-200/55 via-accent-bg/25 to-slate-100/40 blur-3xl dark:from-slate-950 dark:via-accent-bg/20 dark:to-slate-950"
      />

      {pageMain}
    </AppPage>
  );
}

/** Caption in the scrollable pane — full text, parent scrolls when long. */
function PostDetailCaption({
  username,
  profilePath,
  text,
}: {
  username: string;
  profilePath: string;
  text: string;
}) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  return (
    <ExpandablePlainText
      text={trimmed}
      maxCollapsedChars={0}
      alwaysExpanded
      lead={
        <Link
          to={profilePath}
          className="mr-1.5 font-semibold text-slate-900 hover:opacity-70 dark:text-slate-100"
        >
          {username}
        </Link>
      }
      paragraphClassName="break-words text-sm leading-relaxed text-slate-800 dark:text-slate-200"
    />
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

function RepostIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function MessageShareIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
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
  postAuthorId,
  appendAuthors,
  onCommentDeleted,
  onReplyAdded,
  onMediaClick,
}: {
  root: NetworkComment;
  authorById: Record<string, UserProfile>;
  viewerUserId: string | null;
  postAuthorId: string;
  appendAuthors: (ids: string[]) => void;
  onCommentDeleted: (
    commentId: string,
    parentCommentId: string | null | undefined,
  ) => void;
  onReplyAdded: (parentCommentId: string) => void;
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
      onReplyAdded(root.id);
    } finally {
      setSendingReply(false);
    }
  }

  function handleReplyDeleted(commentId: string) {
    setReplies((r) => r.filter((x) => x.id !== commentId));
    onCommentDeleted(commentId, root.id);
  }

  function handleRootDeleted() {
    onCommentDeleted(root.id, null);
  }

  const replyDisabled =
    sendingReply || (!replyText.trim() && replyMediaUrls.length === 0);

  return (
    <li className="group/thread">
      <CommentItem
        comment={root}
        author={authorById[root.authorId]}
        viewerUserId={viewerUserId}
        postAuthorId={postAuthorId}
        onDeleted={handleRootDeleted}
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
          <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white pl-3.5 pr-1 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-accent dark:focus-within:ring-accent/30">
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
              className="min-h-[22px] max-h-28 min-w-0 flex-1 resize-none border-0 bg-transparent py-2 text-xs font-medium leading-snug text-slate-900 caret-accent outline-none placeholder:font-normal placeholder:text-slate-500 dark:text-slate-50 dark:placeholder:text-slate-400"
            />
            <button
              type="button"
              disabled={replyDisabled}
              onClick={() => void sendReply()}
              className="rounded-full px-3 py-1.5 text-xs font-bold tracking-wide text-[#0095f6] transition hover:text-[#1877f2] disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-500"
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
          className="relative ml-5 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-4 dark:border-slate-800 sm:ml-7"
          aria-label={`Replies to ${authorById[root.authorId]?.username ?? 'comment'}`}
        >
          {replies.map((r) => (
            <li key={r.id} className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute -left-4 top-6 h-px w-3 bg-slate-200 dark:bg-slate-800"
              />
              <CommentItem
                comment={r}
                author={authorById[r.authorId]}
                viewerUserId={viewerUserId}
                postAuthorId={postAuthorId}
                onDeleted={() => handleReplyDeleted(r.id)}
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
  postAuthorId,
  onDeleted,
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
  postAuthorId: string;
  onDeleted: () => void;
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
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

  const isCommentAuthor = Boolean(
    viewerUserId && viewerUserId === comment.authorId,
  );
  const isPostAuthor = Boolean(
    viewerUserId && viewerUserId === postAuthorId,
  );
  const canDelete = isCommentAuthor || isPostAuthor;
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
    if (!canDelete || deleteBusy) return;
    setDeleteBusy(true);
    try {
      await deleteComment(comment.id);
      onDeleted();
    } catch {
      /* ignore */
    } finally {
      setDeleteBusy(false);
      setDeleteConfirmOpen(false);
    }
  }

  const hasReplies = (comment.replyCount ?? 0) > 0;

  return (
    <>
      <div
        className={`group/cmt relative flex gap-3 rounded-2xl transition-colors hover:bg-slate-100/70 focus-within:bg-slate-100/70 dark:hover:bg-slate-900/50 dark:focus-within:bg-slate-900/50 ${
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
              className="truncate font-semibold text-slate-900 hover:underline dark:text-slate-100"
            >
              {handle}
            </Link>
            {relTime && (
              <span className="shrink-0 text-[0.7rem] font-medium text-slate-500 dark:text-slate-400">
                · {relTime}
              </span>
            )}
          </div>

          {comment.content.trim().length > 0 && (
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-900 dark:text-slate-100">
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
                  : 'text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400'
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
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                {replyOpen ? 'Cancel' : 'Reply'}
              </button>
            )}

            {hasReplies && onToggleReplies && (
              <button
                type="button"
                onClick={onToggleReplies}
                className="inline-flex items-center gap-1.5 text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
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
            className={`rounded-full p-1.5 text-slate-500 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${
              menuOpen
                ? 'bg-slate-200/70 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                : 'opacity-0 group-hover/cmt:opacity-100 group-focus-within/cmt:opacity-100'
            }`}
          >
            <SmallMoreIcon />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute bottom-full right-0 z-20 mb-1 min-w-[9.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl md:bottom-auto md:top-9 md:mb-0 dark:border-slate-700 dark:bg-slate-950"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setReportOpen(true);
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                Report
              </button>
              {canDelete && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteConfirmOpen(true);
                  }}
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
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => !deleteBusy && setDeleteConfirmOpen(false)}
        onConfirm={() => void remove()}
        title="Delete comment?"
        message={
          isPostAuthor && !isCommentAuthor
            ? 'This comment will be permanently removed from your post.'
            : comment.parentCommentId
              ? 'This reply will be permanently removed.'
              : (comment.replyCount ?? 0) > 0
                ? 'This comment and all replies under it will be permanently removed.'
                : 'This comment will be permanently removed.'
        }
        confirmLabel="Delete"
        confirming={deleteBusy}
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
