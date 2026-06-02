import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchConversations } from '../../chat/api/chat.api';
import type { ConversationListItem } from '../../chat/types';
import { postMessage } from '../../chat/api/chat.api';
import { searchUsers, type UserSearchHit } from '../../user/api/userDirectory.api';
import type { UserProfile } from '../../user/types/user.types';
import type { NetworkPost } from '../types/network.types';
import { sharePost } from '../api/network.api';
import { Button } from '../../../shared/components/Button';
import { UserAvatar } from '../../user/components/UserAvatar';
import { toast } from '../../../shared/store/toast.store';
import { extractApiMessage } from '../../../shared/utils/api-error';
import { SharedPostPreview } from './SharedPostPreview';

export type SharePostModalVariant = 'repost' | 'message';

const REPOST_MAX = 5000;
const MESSAGE_MAX = 2000;

function dmPeer(c: ConversationListItem, selfId: string) {
  return c.participants.find((p) => p.id !== selfId) ?? c.participants[0];
}

function conversationLabel(c: ConversationListItem, selfId: string): string {
  if (c.isGroup) return c.group_name?.trim() || 'Group chat';
  const other = dmPeer(c, selfId);
  const name = other?.full_name?.trim();
  if (name) return name;
  if (other?.username) return `@${other.username}`;
  return 'Direct message';
}

function userLabel(hit: UserSearchHit): string {
  return hit.full_name?.trim() || `@${hit.username}`;
}

export function SharePostModal({
  open,
  onClose,
  variant,
  post,
  author,
  viewerUserId,
  onReposted,
}: {
  open: boolean;
  onClose: () => void;
  variant: SharePostModalVariant;
  post: NetworkPost;
  author?: UserProfile | null;
  viewerUserId: string;
  onReposted?: (repost: NetworkPost) => void;
}) {
  const [caption, setCaption] = useState('');
  const [messageText, setMessageText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    null,
  );
  const [selectedReceiverId, setSelectedReceiverId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<UserSearchHit[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRepost = variant === 'repost';
  const isAuthor = viewerUserId === post.authorId;
  const shareTargetPostId = post.originalPostId ?? post.id;
  const textValue = isRepost ? caption : messageText;
  const textMax = isRepost ? REPOST_MAX : MESSAGE_MAX;
  const canClose = !submitting;

  const reset = useCallback(() => {
    setCaption('');
    setMessageText('');
    setError(null);
    setFocused(false);
    setSelectedConversationId(null);
    setSelectedReceiverId(null);
    setSelectedLabel('');
    setSelectedAvatar(null);
    setUserQuery('');
    setUserResults([]);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    if (variant === 'message') {
      setLoadingConversations(true);
      void fetchConversations()
        .then((res) => setConversations(res.data ?? []))
        .catch(() => setConversations([]))
        .finally(() => setLoadingConversations(false));
    }
  }, [open, variant, reset]);

  useEffect(() => {
    if (!open || variant !== 'message') return;
    const q = userQuery.trim();
    if (q.length < 2) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setUserSearchLoading(true);
      void searchUsers(q)
        .then(setUserResults)
        .catch(() => setUserResults([]))
        .finally(() => setUserSearchLoading(false));
    }, 320);
    return () => clearTimeout(timer);
  }, [open, userQuery, variant]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el || !open) return;
    el.style.height = '0px';
    const next = Math.min(Math.max(el.scrollHeight, isRepost ? 72 : 56), 220);
    el.style.height = `${next}px`;
  }, [textValue, open, isRepost]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = prev;
    };
  }, [open, variant]);

  useEffect(() => {
    if (!open || !canClose) return;
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, canClose, onClose]);

  if (!open) return null;

  async function submitRepost() {
    if (isAuthor) return;
    setSubmitting(true);
    setError(null);
    try {
      const repost = await sharePost(shareTargetPostId, caption);
      toast('Post reposted to your feed', 'success');
      onReposted?.(repost);
      onClose();
    } catch (e) {
      setError(extractApiMessage(e, 'Could not repost this post.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitMessageShare() {
    if (!selectedConversationId && !selectedReceiverId) {
      setError('Choose someone to send this post to.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await postMessage({
        conversationId: selectedConversationId ?? undefined,
        receiverId: selectedConversationId ? undefined : selectedReceiverId ?? undefined,
        type: 'post_share',
        sharedPostId: shareTargetPostId,
        content: messageText.trim() || undefined,
      });
      toast('Post sent in message', 'success');
      onClose();
    } catch (e) {
      setError(extractApiMessage(e, 'Could not send this post.'));
    } finally {
      setSubmitting(false);
    }
  }

  function pickConversation(c: ConversationListItem) {
    const peer = dmPeer(c, viewerUserId);
    setSelectedConversationId(c.id);
    setSelectedReceiverId(null);
    setSelectedLabel(conversationLabel(c, viewerUserId));
    setSelectedAvatar(peer?.avatar_url ?? null);
    setUserQuery('');
    setUserResults([]);
    setError(null);
  }

  function pickUser(hit: UserSearchHit) {
    if (hit.id === viewerUserId) return;
    setSelectedReceiverId(hit.id);
    setSelectedConversationId(null);
    setSelectedLabel(userLabel(hit));
    setSelectedAvatar(hit.avatar_url || null);
    setUserQuery('');
    setUserResults([]);
    setError(null);
  }

  function clearRecipient() {
    setSelectedConversationId(null);
    setSelectedReceiverId(null);
    setSelectedLabel('');
    setSelectedAvatar(null);
  }

  const title = isRepost ? 'Repost' : 'Send in message';
  const titleId = isRepost ? 'repost-post-title' : 'message-share-post-title';

  return createPortal(
    <div
      className="feed-composer-modal"
      role="dialog"
      aria-modal
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="feed-composer-modal__backdrop"
        aria-label="Close dialog"
        onClick={() => canClose && onClose()}
      />
      <div
        className={`feed-composer-modal__panel surface-card ${
          focused
            ? 'border-violet-300 shadow-[0_8px_28px_-8px_rgba(139,92,246,0.15)] dark:border-violet-700'
            : ''
        }`}
      >
        <header className="feed-composer-modal__header">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {isRepost
                ? 'Add a comment for your followers (optional).'
                : 'Pick a chat and optionally add a note.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => canClose && onClose()}
            disabled={!canClose}
            className="feed-composer-modal__close"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4 sm:px-6">
          <SharedPostPreview post={post} author={author} compact stopCardNavigation />

          {isRepost ? (
            isAuthor ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                You can&apos;t repost your own post. Use &ldquo;Send in message&rdquo; to share
                it privately.
              </p>
            ) : (
              <textarea
                ref={textareaRef}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                rows={2}
                maxLength={REPOST_MAX}
                placeholder="Add your thoughts…"
                disabled={submitting}
                className="block w-full resize-none bg-transparent text-base leading-relaxed text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400"
                aria-label="Repost comment"
              />
            )
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Send to
                </p>
                {selectedLabel ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 px-3 py-2.5 dark:bg-accent/10">
                    <UserAvatar
                      label={selectedLabel}
                      src={selectedAvatar}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {selectedLabel}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold text-accent hover:text-accent-hover"
                      onClick={clearRecipient}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder="Search people…"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none ring-accent/30 placeholder:text-slate-500 focus:border-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
                      />
                    </div>
                    {userSearchLoading ? (
                      <p className="text-xs text-slate-500">Searching…</p>
                    ) : null}
                    {userResults.length > 0 ? (
                      <ul className="max-h-36 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                        {userResults.map((hit) => (
                          <li key={hit.id}>
                            <button
                              type="button"
                              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/80"
                              onClick={() => pickUser(hit)}
                            >
                              <UserAvatar
                                label={userLabel(hit)}
                                src={hit.avatar_url || null}
                                size="sm"
                              />
                              <span className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                {userLabel(hit)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Recent chats
                      </p>
                      {loadingConversations ? (
                        <p className="text-xs text-slate-500">Loading conversations…</p>
                      ) : conversations.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-700">
                          No conversations yet. Search for someone above.
                        </p>
                      ) : (
                        <ul className="max-h-44 space-y-1 overflow-y-auto">
                          {conversations.map((c) => {
                            const peer = dmPeer(c, viewerUserId);
                            const label = conversationLabel(c, viewerUserId);
                            return (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/80"
                                  onClick={() => pickConversation(c)}
                                >
                                  <UserAvatar
                                    label={label}
                                    src={peer?.avatar_url ?? null}
                                    size="sm"
                                  />
                                  <span className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {label}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Note (optional)
                </p>
                <textarea
                  ref={textareaRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  rows={2}
                  maxLength={MESSAGE_MAX}
                  placeholder="Say something about this post…"
                  disabled={submitting}
                  className="block w-full resize-none bg-transparent text-base leading-relaxed text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400"
                  aria-label="Message note"
                />
              </div>
            </>
          )}

          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/60 sm:px-6">
          <div className="flex flex-wrap items-center justify-end gap-3">
            {!isRepost || !isAuthor ? (
              <span
                className={`mr-auto text-[0.7rem] tabular-nums ${
                  textValue.length > textMax * 0.9
                    ? 'font-semibold text-amber-700 dark:text-amber-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                aria-live="polite"
              >
                {textValue.length} / {textMax}
              </span>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              disabled={!canClose}
              onClick={() => canClose && onClose()}
              className="w-auto"
            >
              Cancel
            </Button>
            {isRepost ? (
              <Button
                type="button"
                disabled={submitting || isAuthor}
                loading={submitting}
                onClick={() => void submitRepost()}
                className="w-auto min-w-[112px] rounded-full px-6"
              >
                Repost
              </Button>
            ) : (
              <Button
                type="button"
                disabled={submitting}
                loading={submitting}
                onClick={() => void submitMessageShare()}
                className="w-auto min-w-[112px] rounded-full px-6"
              >
                Send
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
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
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
