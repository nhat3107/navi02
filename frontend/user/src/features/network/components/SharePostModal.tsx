import { useCallback, useEffect, useState } from 'react';
import { fetchConversations } from '../../chat/api/chat.api';
import type { ConversationListItem } from '../../chat/types';
import { postMessage } from '../../chat/api/chat.api';
import { searchUsers, type UserSearchHit } from '../../user/api/userDirectory.api';
import type { NetworkPost } from '../types/network.types';
import { sharePost } from '../api/network.api';
import { Button } from '../../../shared/components/Button';
import { toast } from '../../../shared/store/toast.store';
import { extractApiMessage } from '../../../shared/utils/api-error';

type ShareMode = 'repost' | 'message';

function dmTitle(c: ConversationListItem, selfId: string): string {
  const other = c.participants.find((p) => p.id !== selfId);
  const name = other?.full_name?.trim();
  if (name) return name;
  if (other?.username) return `@${other.username}`;
  return 'Direct message';
}

export function SharePostModal({
  open,
  onClose,
  post,
  viewerUserId,
  onReposted,
}: {
  open: boolean;
  onClose: () => void;
  post: NetworkPost;
  viewerUserId: string;
  onReposted?: (repost: NetworkPost) => void;
}) {
  const [mode, setMode] = useState<ShareMode>('repost');
  const [caption, setCaption] = useState('');
  const [messageText, setMessageText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    null,
  );
  const [selectedReceiverId, setSelectedReceiverId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState('');

  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<UserSearchHit[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  const isAuthor = viewerUserId === post.authorId;
  const shareTargetPostId = post.originalPostId ?? post.id;

  const reset = useCallback(() => {
    setMode('repost');
    setCaption('');
    setMessageText('');
    setError(null);
    setSelectedConversationId(null);
    setSelectedReceiverId(null);
    setSelectedLabel('');
    setUserQuery('');
    setUserResults([]);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    setLoadingConversations(true);
    void fetchConversations()
      .then((res) => setConversations(res.data ?? []))
      .catch(() => setConversations([]))
      .finally(() => setLoadingConversations(false));
  }, [open, reset]);

  useEffect(() => {
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
  }, [userQuery]);

  if (!open) return null;

  async function submitRepost() {
    setSubmitting(true);
    setError(null);
    try {
      const repost = await sharePost(shareTargetPostId, caption);
      toast('Post shared to your feed', 'success');
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
      setError('Choose a conversation or person to send this post to.');
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
      toast('Post shared to your message', 'success');
      onClose();
    } catch (e) {
      setError(extractApiMessage(e, 'Could not send this post.'));
    } finally {
      setSubmitting(false);
    }
  }

  function pickConversation(c: ConversationListItem) {
    setSelectedConversationId(c.id);
    setSelectedReceiverId(null);
    setSelectedLabel(c.isGroup ? c.group_name || 'Group chat' : dmTitle(c, viewerUserId));
    setUserQuery('');
    setUserResults([]);
  }

  function pickUser(hit: UserSearchHit) {
    if (hit.id === viewerUserId) return;
    setSelectedReceiverId(hit.id);
    setSelectedConversationId(null);
    setSelectedLabel(hit.full_name?.trim() || `@${hit.username}`);
    setUserQuery('');
    setUserResults([]);
  }

  return (
    <div
      className="modal-sheet-backdrop"
      role="dialog"
      aria-modal
      aria-labelledby="share-post-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close share dialog"
        onClick={() => !submitting && onClose()}
      />
      <div className="modal-sheet-panel flex max-h-[min(90vh,720px)] flex-col">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2
            id="share-post-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            Share post
          </h2>
          <div className="mt-3 flex gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              disabled={isAuthor}
              onClick={() => setMode('repost')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === 'repost'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Repost
            </button>
            <button
              type="button"
              onClick={() => setMode('message')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === 'message'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Message
            </button>
          </div>
          {isAuthor && mode === 'repost' ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              You can&apos;t repost your own post. Share it in a message instead.
            </p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {mode === 'repost' ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Add an optional comment. Your followers will see this repost in their feed.
              </p>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder="Say something about this post (optional)"
                disabled={isAuthor || submitting}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-accent/30 placeholder:text-slate-500 focus:border-accent focus:ring-2 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Send to
                </label>
                {selectedLabel ? (
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-sm dark:bg-accent/10">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {selectedLabel}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-accent hover:text-accent-hover"
                      onClick={() => {
                        setSelectedConversationId(null);
                        setSelectedReceiverId(null);
                        setSelectedLabel('');
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="Search people…"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-accent/30 focus:border-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    {userSearchLoading ? (
                      <p className="mt-2 text-xs text-slate-500">Searching…</p>
                    ) : null}
                    {userResults.length > 0 ? (
                      <ul className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        {userResults.map((hit) => (
                          <li key={hit.id}>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                              onClick={() => pickUser(hit)}
                            >
                              {hit.full_name?.trim() || `@${hit.username}`}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Recent chats
                      </p>
                      {loadingConversations ? (
                        <p className="mt-2 text-xs text-slate-500">Loading…</p>
                      ) : conversations.length === 0 ? (
                        <p className="mt-2 text-xs text-slate-500">No conversations yet.</p>
                      ) : (
                        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                          {conversations.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                                onClick={() => pickConversation(c)}
                              >
                                {c.isGroup
                                  ? c.group_name || 'Group chat'
                                  : dmTitle(c, viewerUserId)}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Message (optional)
                </label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Add a note…"
                  disabled={submitting}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-accent/30 placeholder:text-slate-500 focus:border-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {error ? (
            <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-700">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={() => !submitting && onClose()}
            className="w-auto"
          >
            Cancel
          </Button>
          {mode === 'repost' ? (
            <Button
              type="button"
              disabled={submitting || isAuthor}
              onClick={() => void submitRepost()}
              className="w-auto"
            >
              Repost
            </Button>
          ) : (
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void submitMessageShare()}
              className="w-auto"
            >
              Send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
