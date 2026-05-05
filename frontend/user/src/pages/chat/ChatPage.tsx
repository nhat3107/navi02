import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProfileApi } from '../../features/auth/api/auth.api';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { fetchCallRoom } from '../../features/call/api/call.api';
import { useCallSocket } from '../../features/call/hooks/useCallSocket';
import { useCallStore } from '../../features/call/store/call.store';
import {
  createGroupConversation,
  fetchConversations,
  fetchMessages,
  postMessage,
} from '../../features/chat/api/chat.api';
import { uploadChatMediaFile } from '../../features/chat/lib/uploadChatMedia';
import {
  useChatSocket,
  type ChatTypingPayload,
} from '../../features/chat/hooks/useChatSocket';
import type { ChatMessage, ConversationListItem } from '../../features/chat/types';
import {
  searchUsers,
  type UserSearchHit,
} from '../../features/user/api/userDirectory.api';
import { Button } from '../../shared/components/Button';
import { ROUTES } from '../../shared/constants/routes';

function mapRowsToMessages(
  rows: Array<{
    id: string;
    sender_id: string;
    content: string;
    media_url: string;
    createdAt: string;
  }>,
  conversationId: string,
): ChatMessage[] {
  return rows.map((r) => ({
    id: r.id,
    conversationId,
    sender_id: r.sender_id,
    content: r.content,
    media_url: r.media_url,
    createdAt: r.createdAt,
  }));
}

function dmTitle(c: ConversationListItem, selfId: string | null): string {
  const other = c.participants.find((p) => p.id !== selfId);
  const name = other?.full_name?.trim();
  if (name) return name;
  if (other?.username) return `@${other.username}`;
  if (other?.id) return `${other.id.slice(0, 8)}…`;
  return c.id.slice(0, 8);
}

function initials(label: string): string {
  const t = label.replace(/^@/, '').trim();
  if (!t) return '?';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

function formatChatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function getOtherParticipant(
  c: ConversationListItem | null,
  selfId: string | null,
) {
  if (!c || !selfId) return null;
  return c.participants.find((p) => p.id !== selfId) ?? null;
}

function ChatAvatar({
  label,
  imageUrl,
  size = 'md',
  className = '',
}: {
  label: string;
  /** Profile photo URL (e.g. Cloudinary); falls back to initials */
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sz =
    size === 'sm'
      ? 'h-9 w-9 text-xs'
      : size === 'lg'
        ? 'h-12 w-12 text-base'
        : 'h-10 w-10 text-sm';
  const src = imageUrl?.trim();
  if (src) {
    return (
      <div
        className={`flex shrink-0 overflow-hidden rounded-full bg-slate-200 shadow-sm ring-2 ring-white dark:bg-slate-700 dark:ring-slate-900 ${sz} ${className}`}
        aria-hidden
      >
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 font-semibold text-white shadow-sm ${sz} ${className}`}
      aria-hidden
    >
      {initials(label)}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1 py-0.5" aria-label="Typing">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 animate-pulse"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function SendIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.588.75.75 0 0 0 0-1.278A60.517 60.517 0 0 0 3.478 2.404Z" />
    </svg>
  );
}

function PaperclipIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function isCloudinaryVideoUrl(url: string): boolean {
  return /\/video\/upload\//.test(url);
}

/** Max size for attachments in bubbles: capped width/height, contain so nothing is cropped. */
const CHAT_BUBBLE_MEDIA_SHELL_BASE =
  'mt-1 w-full max-w-[min(280px,calc(100vw-5rem))] sm:max-w-[300px] overflow-hidden rounded-2xl';
const CHAT_BUBBLE_MEDIA_BASE =
  'block w-full max-h-[min(34vh,240px)] sm:max-h-[min(38vh,288px)] h-auto object-contain';

function ChatMessageMedia({
  mediaUrl,
  isMe,
}: {
  mediaUrl: string;
  isMe: boolean;
}) {
  /** Borders align with bubble: accent = soft light edge; peer = same family as `border-slate-200/80` on bubble */
  const shellTheme = isMe
    ? 'ring-1 ring-inset ring-white/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
    : 'ring-1 ring-inset ring-slate-200/80 dark:ring-slate-600/90';
  const letterbox = isMe
    ? 'bg-black/20 dark:bg-black/25'
    : 'bg-slate-100/80 dark:bg-slate-900/40';
  const cls = `${CHAT_BUBBLE_MEDIA_BASE} ${letterbox}`;
  const shell = `${CHAT_BUBBLE_MEDIA_SHELL_BASE} ${shellTheme}`;

  if (isCloudinaryVideoUrl(mediaUrl)) {
    return (
      <div className={shell}>
        <video
          src={mediaUrl}
          controls
          playsInline
          preload="metadata"
          className={cls}
        />
      </div>
    );
  }
  return (
    <div className={shell}>
      <img src={mediaUrl} alt="Attachment" className={cls} loading="lazy" />
    </div>
  );
}

export function ChatPage() {
  const navigate = useNavigate();
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const userId = user?.id ?? null;
  const { emitCallUser } = useCallSocket();
  const setCallSession = useCallStore((s) => s.setActiveSession);

  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [peerId, setPeerId] = useState('');
  const [peerLabel, setPeerLabel] = useState('');
  const [peerAvatarUrl, setPeerAvatarUrl] = useState('');
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchHit[]>(
    [],
  );
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState<UserSearchHit[]>([]);
  const [groupSearchInput, setGroupSearchInput] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState<UserSearchHit[]>(
    [],
  );
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);
  const groupSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [pendingMedia, setPendingMedia] = useState<{
    file: File;
    previewUrl: string;
    isVideo: boolean;
  } | null>(null);
  const pendingMediaRef = useRef(pendingMedia);
  pendingMediaRef.current = pendingMedia;

  const [loadingList, setLoadingList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [callStarting, setCallStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingFrom, setTypingFrom] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const activeConvIdRef = useRef<string | null>(null);
  activeConvIdRef.current = activeConversationId;

  useEffect(() => {
    return () => {
      const p = pendingMediaRef.current;
      if (p) URL.revokeObjectURL(p.previewUrl);
    };
  }, []);

  const clearPendingMedia = useCallback(() => {
    setPendingMedia((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  const directConversations = useMemo(
    () => conversations.filter((c) => !c.isGroup),
    [conversations],
  );
  const groupConversations = useMemo(
    () => conversations.filter((c) => c.isGroup),
    [conversations],
  );

  const [convFilter, setConvFilter] = useState('');
  const [showUserLookup, setShowUserLookup] = useState(true);
  const convFilterNorm = convFilter.trim().toLowerCase();

  const filteredDirectConversations = useMemo(() => {
    if (!convFilterNorm) return directConversations;
    return directConversations.filter((c) => {
      const title = dmTitle(c, userId).toLowerCase();
      const last = (c.last_message ?? '').toLowerCase();
      const hay = c.participants
        .map((p) => `${p.full_name ?? ''} ${p.username ?? ''}`.toLowerCase())
        .join(' ');
      return (
        title.includes(convFilterNorm) ||
        last.includes(convFilterNorm) ||
        hay.includes(convFilterNorm)
      );
    });
  }, [directConversations, userId, convFilterNorm]);

  const filteredGroupConversations = useMemo(() => {
    if (!convFilterNorm) return groupConversations;
    return groupConversations.filter((c) => {
      const name = (c.group_name ?? 'group').toLowerCase();
      const last = (c.last_message ?? '').toLowerCase();
      return name.includes(convFilterNorm) || last.includes(convFilterNorm);
    });
  }, [groupConversations, convFilterNorm]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const participantById = useMemo(() => {
    const m = new Map<
      string,
      { username?: string; full_name?: string; avatar_url?: string }
    >();
    if (!activeConversation) return m;
    for (const p of activeConversation.participants) {
      m.set(p.id, {
        username: p.username,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
      });
    }
    return m;
  }, [activeConversation]);

  const senderLabel = useCallback(
    (senderId: string) => {
      if (senderId === userId) return 'You';
      const p = participantById.get(senderId);
      const name = p?.full_name?.trim();
      if (name) return name;
      if (p?.username) return `@${p.username}`;
      return `${senderId.slice(0, 8)}…`;
    },
    [participantById, userId],
  );

  const otherUserId = useMemo(() => {
    if (!userId) return null;
    if (
      activeConversationId &&
      activeConversation &&
      !activeConversation.isGroup
    ) {
      return (
        activeConversation.participants.find((p) => p.id !== userId)?.id ?? null
      );
    }
    return peerId.trim() || null;
  }, [activeConversationId, activeConversation, userId, peerId]);

  const canPlaceCall = useMemo(() => {
    if (!userId) return false;
    if (activeConversation?.isGroup && activeConversationId) {
      return activeConversation.participants.some((p) => p.id !== userId);
    }
    return Boolean(otherUserId);
  }, [userId, activeConversation, activeConversationId, otherUserId]);

  const activeConvMetaRef = useRef<{ id: string | null; isGroup: boolean }>({
    id: null,
    isGroup: false,
  });
  activeConvMetaRef.current = {
    id: activeConversationId,
    isGroup: activeConversation?.isGroup ?? false,
  };
  const otherUserIdRef = useRef<string | null>(null);
  otherUserIdRef.current = otherUserId;

  const headerMeta = useMemo(() => {
    if (activeConversation?.isGroup) {
      const title = activeConversation.group_name || 'Group';
      return {
        title,
        subtitle: `${activeConversation.participants.length} members · Group chat`,
        avatarLabel: title,
        avatarImageUrl: null as string | null,
      };
    }
    if (activeConversation && userId) {
      const title = dmTitle(activeConversation, userId);
      const other = getOtherParticipant(activeConversation, userId);
      const subtitle = other?.username
        ? `@${other.username}`
        : 'Direct message';
      return {
        title,
        subtitle,
        avatarLabel: title,
        avatarImageUrl: other?.avatar_url?.trim() || null,
      };
    }
    if (peerId && peerLabel) {
      return {
        title: `@${peerLabel}`,
        subtitle: 'Send a message to start',
        avatarLabel: peerLabel,
        avatarImageUrl: peerAvatarUrl.trim() || null,
      };
    }
    return null;
  }, [activeConversation, userId, peerId, peerLabel, peerAvatarUrl]);

  const reloadConversations = useCallback(async () => {
    if (!accessToken) return;
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetchConversations();
      setConversations(res.data);
    } catch {
      setError('Could not load conversations.');
    } finally {
      setLoadingList(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void reloadConversations();
  }, [reloadConversations]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!accessToken) return;
      setLoadingMessages(true);
      setError(null);
      try {
        const res = await fetchMessages(conversationId);
        setMessages(mapRowsToMessages(res.data, conversationId));
      } catch {
        setError('Could not load messages.');
      } finally {
        setLoadingMessages(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (activeConversationId) {
      void loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMessages, typingFrom]);

  useEffect(() => {
    const el = messageInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const q = userSearchInput.trim();
    if (q.length < 2) {
      setUserSearchResults([]);
      setUserSearchLoading(false);
      return;
    }
    setUserSearchLoading(true);
    searchDebounceRef.current = setTimeout(() => {
      void searchUsers(q)
        .then(setUserSearchResults)
        .catch(() => setUserSearchResults([]))
        .finally(() => setUserSearchLoading(false));
    }, 320);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [userSearchInput]);

  useEffect(() => {
    if (groupSearchDebounceRef.current)
      clearTimeout(groupSearchDebounceRef.current);
    const q = groupSearchInput.trim();
    if (q.length < 2) {
      setGroupSearchResults([]);
      setGroupSearchLoading(false);
      return;
    }
    setGroupSearchLoading(true);
    groupSearchDebounceRef.current = setTimeout(() => {
      void searchUsers(q)
        .then(setGroupSearchResults)
        .catch(() => setGroupSearchResults([]))
        .finally(() => setGroupSearchLoading(false));
    }, 320);
    return () => {
      if (groupSearchDebounceRef.current)
        clearTimeout(groupSearchDebounceRef.current);
    };
  }, [groupSearchInput]);

  const selectPeer = (hit: UserSearchHit) => {
    clearPendingMedia();
    setShowGroupForm(false);
    setPeerId(hit.id);
    setPeerLabel(hit.username || hit.full_name);
    setPeerAvatarUrl(hit.avatar_url?.trim() ?? '');
    setUserSearchInput('');
    setUserSearchResults([]);
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
  };

  const addGroupMember = (hit: UserSearchHit) => {
    if (!userId || hit.id === userId) return;
    setNewGroupMembers((prev) =>
      prev.some((m) => m.id === hit.id) ? prev : [...prev, hit],
    );
    setGroupSearchInput('');
    setGroupSearchResults([]);
  };

  const removeGroupMember = (id: string) => {
    setNewGroupMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const clearNewChat = () => {
    clearPendingMedia();
    setActiveConversationId(null);
    setMessages([]);
    setPeerId('');
    setPeerLabel('');
    setPeerAvatarUrl('');
    setUserSearchInput('');
    setUserSearchResults([]);
    setShowGroupForm(false);
    setNewGroupName('');
    setNewGroupMembers([]);
    setGroupSearchInput('');
    setGroupSearchResults([]);
  };

  const submitCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!accessToken || !name || newGroupMembers.length < 2) {
      setError('Enter a group name and add at least two members.');
      return;
    }
    setCreatingGroup(true);
    setError(null);
    try {
      const res = await createGroupConversation({
        group_name: name,
        member_ids: newGroupMembers.map((m) => m.id),
      });
      clearPendingMedia();
      const row = res.data;
      setConversations((prev) => {
        if (prev.some((c) => c.id === row.id)) return prev;
        return [row, ...prev];
      });
      setActiveConversationId(row.id);
      setPeerId('');
      setPeerLabel('');
      setPeerAvatarUrl('');
      setShowGroupForm(false);
      setNewGroupName('');
      setNewGroupMembers([]);
      setGroupSearchInput('');
      setGroupSearchResults([]);
      void reloadConversations();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Could not create group.';
      setError(typeof msg === 'string' ? msg : 'Could not create group.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const onReceive = useCallback((msg: ChatMessage) => {
    const conv = activeConvIdRef.current;
    if (msg.conversationId === conv) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } else {
      void reloadConversations();
    }
  }, [reloadConversations]);

  const onTyping = useCallback(
    (p: ChatTypingPayload) => {
      const { id: convId, isGroup } = activeConvMetaRef.current;
      if (!convId || !userId) return;
      if (p.from === userId) return;
      if (p.conversationId != null && p.conversationId !== '') {
        if (p.conversationId !== convId) return;
        setTypingFrom(p.from);
      } else if (!isGroup) {
        if (p.from !== otherUserIdRef.current) return;
        setTypingFrom(p.from);
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingFrom(null), 2500);
    },
    [userId],
  );

  const { connected, emitTyping } = useChatSocket({
    onReceive,
    onTyping,
  });

  const appendSentMessage = useCallback(
    (row: {
      id: string;
      conversationId: string;
      sender_id: string;
      content: string;
      media_url: string;
      createdAt: string;
    }) => {
      setActiveConversationId(row.conversationId);
      setPeerId('');
      setPeerLabel('');
      setMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev;
        return [
          ...prev,
          {
            id: row.id,
            conversationId: row.conversationId,
            sender_id: row.sender_id,
            content: row.content,
            media_url: row.media_url,
            createdAt: row.createdAt,
          },
        ];
      });
      void reloadConversations();
    },
    [reloadConversations],
  );

  const canSend = Boolean(activeConversationId) || Boolean(peerId.trim());
  const canSubmit =
    canSend &&
    !sending &&
    (pendingMedia != null || draft.trim().length > 0);

  const startOutgoingCall = useCallback(
    async (callType: 'audio' | 'video') => {
      if (!userId || !accessToken || !user) return;
      setCallStarting(true);
      setError(null);
      try {
        const { token, meetingId } = await fetchCallRoom();
        let displayName = user.email.split('@')[0] ?? 'Guest';
        try {
          const prof = await getProfileApi();
          const n = prof.data.full_name?.trim();
          if (n) displayName = n;
        } catch {
          /* ignore */
        }

        let signalPeerIds: string[] = [];

        if (activeConversation?.isGroup && activeConversationId) {
          signalPeerIds = activeConversation.participants
            .filter((p) => p.id !== userId)
            .map((p) => p.id);
          if (signalPeerIds.length === 0) {
            setError('No other members to call in this group.');
            return;
          }
          emitCallUser({
            toUsers: signalPeerIds,
            meetingId,
            conversationId: activeConversationId,
            callType,
            isGroupCall: true,
            callerName: displayName,
          });
        } else {
          const peer = otherUserId;
          if (!peer) {
            setError('Open a chat with someone to start a call.');
            return;
          }
          signalPeerIds = [peer];
          emitCallUser({
            to: peer,
            meetingId,
            conversationId: activeConversationId ?? undefined,
            callType,
            isGroupCall: false,
            callerName: displayName,
          });
        }

        setCallSession({
          meetingId,
          token,
          callType,
          displayName,
          signalPeerIds,
          isGroupCall: Boolean(activeConversation?.isGroup),
        });
        navigate(ROUTES.CALL);
      } catch {
        setError(
          'Could not start call. Ensure VIDEOSDK_API_KEY and VIDEOSDK_SECRET are set on the API gateway.',
        );
      } finally {
        setCallStarting(false);
      }
    },
    [
      userId,
      accessToken,
      user,
      activeConversation,
      activeConversationId,
      otherUserId,
      emitCallUser,
      setCallSession,
      navigate,
    ],
  );

  const sendTextOnly = async () => {
    const text = draft.trim();
    if (!text || !accessToken) return;

    if (!activeConversationId && !peerId.trim()) {
      setError(
        'Open a conversation or pick someone for a direct message, then send.',
      );
      return;
    }

    setSending(true);
    setError(null);
    try {
      const res = await postMessage({
        conversationId: activeConversationId ?? undefined,
        receiverId: activeConversationId ? undefined : peerId.trim(),
        content: text,
      });
      setDraft('');
      appendSentMessage(res.data);
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Send failed.';
      setError(typeof msg === 'string' ? msg : 'Send failed.');
    } finally {
      setSending(false);
    }
  };

  const sendPendingMedia = async () => {
    if (!pendingMedia || !accessToken) return;

    if (!activeConversationId && !peerId.trim()) {
      setError(
        'Open a conversation or pick someone for a direct message, then send.',
      );
      return;
    }

    setSending(true);
    setError(null);
    try {
      const url = await uploadChatMediaFile(pendingMedia.file);
      const caption = draft.trim();
      const res = await postMessage({
        conversationId: activeConversationId ?? undefined,
        receiverId: activeConversationId ? undefined : peerId.trim(),
        content: caption || undefined,
        media_url: url,
      });
      clearPendingMedia();
      setDraft('');
      appendSentMessage(res.data);
    } catch (err) {
      const fromApi = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      const msg =
        typeof fromApi === 'string' && fromApi.trim()
          ? fromApi
          : err instanceof Error && err.message
            ? err.message
            : 'Could not send attachment.';
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const submitComposer = async () => {
    if (!canSend || sending) return;
    if (pendingMedia) {
      await sendPendingMedia();
      return;
    }
    await sendTextOnly();
  };

  const onPickChatMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!activeConversationId && !peerId.trim()) {
      setError(
        'Open a conversation or pick someone for a direct message, then attach.',
      );
      return;
    }

    const isVid = file.type.startsWith('video/');
    const isImg = file.type.startsWith('image/');
    if (!isVid && !isImg) {
      setError('Please choose an image or video.');
      return;
    }
    const maxBytes = isVid ? 80 * 1024 * 1024 : 12 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(
        isVid
          ? 'Video must be 80 MB or smaller.'
          : 'Image must be 12 MB or smaller.',
      );
      return;
    }

    setError(null);
    const previewUrl = URL.createObjectURL(file);
    setPendingMedia((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl, isVideo: isVid };
    });
  };

  const onDraftChange = (v: string) => {
    setDraft(v);
    if (v.length === 0 || !userId) return;
    if (activeConversation?.isGroup && activeConversationId) {
      const others = activeConversation.participants
        .filter((p) => p.id !== userId)
        .map((p) => p.id);
      if (others.length > 0) {
        emitTyping({
          toUsers: others,
          conversationId: activeConversationId,
        });
      }
    } else if (otherUserId) {
      emitTyping({ to: otherUserId });
    }
  };

  const openConversation = (c: ConversationListItem) => {
    clearPendingMedia();
    setActiveConversationId(c.id);
    setPeerId('');
    setPeerLabel('');
    setPeerAvatarUrl('');
    setUserSearchInput('');
    setUserSearchResults([]);
    setShowGroupForm(false);
    setError(null);
  };

  const sidebarRowClass = (isActive: boolean) =>
    `w-full text-left flex items-start gap-3 px-3 py-2.5 text-sm transition-all rounded-2xl mx-1.5 ${
      isActive
        ? 'bg-accent-bg text-accent shadow-sm ring-1 ring-accent/20'
        : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
    }`;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-600 dark:text-slate-400">Sign in to use chat.</p>
        <Link to={ROUTES.LOGIN} className="text-accent font-medium">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
      <header className="shrink-0 border-b border-slate-200/80 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={ROUTES.HOME}
            className="text-sm text-slate-500 hover:text-accent shrink-0 rounded-2xl px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Home
          </Link>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
            Messages
          </h1>
          <span
            className={`shrink-0 text-[0.65rem] uppercase tracking-wide px-2 py-0.5 rounded-full font-medium ${
              connected
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 w-full max-w-7xl mx-auto gap-3 px-3 pb-3 pt-2">
        <aside className="flex h-full min-h-0 w-full max-w-[320px] shrink-0 flex-col overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900 shadow-[4px_0_32px_-16px_rgba(0,0,0,0.12)] dark:shadow-none">
          <div className="shrink-0 space-y-2 border-b border-slate-100 p-3 dark:border-slate-800">
            <label className="sr-only" htmlFor="conv-filter">
              Filter conversations
            </label>
            <input
              id="conv-filter"
              value={convFilter}
              onChange={(e) => setConvFilter(e.target.value)}
              placeholder="Search chats…"
              autoComplete="off"
              className="w-full px-3 py-2.5 text-sm rounded-3xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                type="button"
                className="min-w-0 flex-1 text-sm rounded-3xl shadow-sm"
                onClick={() => clearNewChat()}
              >
                New DM
              </Button>
              <button
                type="button"
                onClick={() => setShowUserLookup((v) => !v)}
                className={`shrink-0 rounded-3xl border px-3 text-sm font-medium transition-colors ${
                  showUserLookup
                    ? 'border-accent/40 bg-accent-bg text-accent'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
                aria-expanded={showUserLookup}
                title="Find people to message"
              >
                Find
              </button>
            </div>
            {showUserLookup && (
              <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/30">
                <label className="block text-[0.65rem] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Directory search
                </label>
                <input
                  value={userSearchInput}
                  onChange={(e) => setUserSearchInput(e.target.value)}
                  placeholder="Username or name…"
                  className="w-full px-3 py-2 text-sm rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/25"
                />
                <div className="max-h-28 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
                  {userSearchLoading && (
                    <p className="p-2 text-xs text-slate-500">Searching…</p>
                  )}
                  {!userSearchLoading &&
                    userSearchInput.trim().length >= 2 &&
                    userSearchResults.length === 0 && (
                      <p className="p-2 text-xs text-slate-500">No matches.</p>
                    )}
                  <ul>
                    {userSearchResults.map((hit) => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          onClick={() => selectPeer(hit)}
                          className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent-bg/60 hover:text-accent last:rounded-b-2xl first:rounded-t-2xl"
                        >
                          <ChatAvatar
                            label={hit.full_name || hit.username}
                            imageUrl={hit.avatar_url}
                            size="sm"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-slate-900 dark:text-slate-100">
                              {hit.username}
                            </span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              {hit.full_name}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <section
              className="flex min-h-0 flex-[1.15] flex-col border-b border-slate-100 dark:border-slate-800"
              aria-label="Direct messages"
            >
              <div className="flex shrink-0 items-center justify-between px-3 py-2">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
                  Direct
                </p>
                <span className="tabular-nums text-[0.65rem] text-slate-400">
                  {loadingList ? '…' : filteredDirectConversations.length}
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable]">
                {loadingList ? (
                  <p className="p-3 text-sm text-slate-500">Loading…</p>
                ) : directConversations.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">No direct chats yet.</p>
                ) : filteredDirectConversations.length === 0 ? (
                  <p className="p-3 text-xs text-slate-500">
                    No chats match &ldquo;{convFilter.trim()}&rdquo;.
                  </p>
                ) : (
                  <ul className="space-y-0.5 pb-1">
                    {filteredDirectConversations.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          title={dmTitle(c, userId)}
                          onClick={() => openConversation(c)}
                          className={sidebarRowClass(
                            activeConversationId === c.id,
                          )}
                        >
                          <ChatAvatar
                            label={dmTitle(c, userId)}
                            imageUrl={
                              getOtherParticipant(c, userId)?.avatar_url
                            }
                            size="sm"
                            className="mt-0.5"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-slate-900 dark:text-slate-100">
                              {dmTitle(c, userId)}
                            </span>
                            {c.last_message && (
                              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                                {c.last_message}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section
              className="flex min-h-0 flex-1 flex-col"
              aria-label="Group chats"
            >
              <div className="flex shrink-0 items-center justify-between px-3 py-2">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
                  Groups
                </p>
                <span className="tabular-nums text-[0.65rem] text-slate-400">
                  {loadingList ? '…' : filteredGroupConversations.length}
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable]">
                {loadingList ? (
                  <p className="p-3 text-sm text-slate-500">Loading…</p>
                ) : groupConversations.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">No groups yet.</p>
                ) : filteredGroupConversations.length === 0 ? (
                  <p className="p-3 text-xs text-slate-500">
                    No groups match &ldquo;{convFilter.trim()}&rdquo;.
                  </p>
                ) : (
                  <ul className="space-y-0.5 pb-1">
                    {filteredGroupConversations.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          title={c.group_name || 'Group'}
                          onClick={() => openConversation(c)}
                          className={sidebarRowClass(
                            activeConversationId === c.id,
                          )}
                        >
                          <ChatAvatar
                            label={c.group_name || 'Group'}
                            size="sm"
                            className="mt-0.5"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-slate-900 dark:text-slate-100">
                              {c.group_name || 'Group'}
                            </span>
                            <span className="text-[0.65rem] text-slate-500">
                              {c.participants.length} members
                            </span>
                            {c.last_message && (
                              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                                {c.last_message}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <div className="max-h-[min(40vh,280px)] shrink-0 overflow-y-auto overscroll-contain border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-2 p-3">
              <Button
                variant="secondary"
                type="button"
                className="w-full text-sm rounded-3xl shadow-sm"
                onClick={() => {
                  setShowGroupForm((open) => {
                    if (open) {
                      setNewGroupName('');
                      setNewGroupMembers([]);
                      setGroupSearchInput('');
                      setGroupSearchResults([]);
                    } else {
                      setPeerId('');
                      setPeerLabel('');
                      setPeerAvatarUrl('');
                      setUserSearchInput('');
                      setUserSearchResults([]);
                      setError(null);
                    }
                    return !open;
                  });
                }}
              >
                {showGroupForm ? 'Cancel new group' : 'Create group'}
              </Button>
              {showGroupForm && (
                <div className="space-y-2.5 rounded-3xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/40">
                  <input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name"
                    className="w-full rounded-3xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent/25"
                  />
                  {newGroupMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {newGroupMembers.map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-2.5 pr-1 text-xs text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                        >
                          @{m.username}
                          <button
                            type="button"
                            onClick={() => removeGroupMember(m.id)}
                            className="rounded-full px-1 hover:bg-slate-200 dark:hover:bg-slate-600"
                            aria-label={`Remove ${m.username}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <label className="block text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">
                    Add members (min 2)
                  </label>
                  <input
                    value={groupSearchInput}
                    onChange={(e) => setGroupSearchInput(e.target.value)}
                    placeholder="Search users…"
                    className="w-full rounded-3xl border border-slate-200 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent/25"
                  />
                  <div className="max-h-24 overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
                    {groupSearchLoading && (
                      <p className="p-2 text-xs text-slate-500">Searching…</p>
                    )}
                    {!groupSearchLoading &&
                      groupSearchInput.trim().length >= 2 &&
                      groupSearchResults.length === 0 && (
                        <p className="p-2 text-xs text-slate-500">No matches.</p>
                      )}
                    <ul>
                      {groupSearchResults.map((hit) => (
                        <li key={hit.id}>
                          <button
                            type="button"
                            disabled={!userId || hit.id === userId}
                            onClick={() => addGroupMember(hit)}
                            className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-accent-bg/60 hover:text-accent disabled:opacity-40 dark:border-slate-700/80 last:border-0"
                          >
                            {hit.username}
                            <span className="block text-xs text-slate-500">
                              {hit.full_name}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full rounded-3xl text-sm"
                    loading={creatingGroup}
                    disabled={
                      creatingGroup ||
                      !newGroupName.trim() ||
                      newGroupMembers.length < 2
                    }
                    onClick={() => void submitCreateGroup()}
                  >
                    Create group
                  </Button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-700/90 bg-slate-50 dark:bg-slate-950 shadow-[0_8px_40px_-20px_rgba(0,0,0,0.1)] dark:shadow-none">
          {headerMeta && (
            <div className="shrink-0 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 shadow-sm">
              <ChatAvatar
                label={headerMeta.avatarLabel}
                imageUrl={headerMeta.avatarImageUrl}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {headerMeta.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {headerMeta.subtitle}
                </p>
              </div>
              {canPlaceCall && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={callStarting}
                    onClick={() => void startOutgoingCall('video')}
                    title="Start video call"
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Video
                  </button>
                  <button
                    type="button"
                    disabled={callStarting}
                    onClick={() => void startOutgoingCall('audio')}
                    title="Start voice call"
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Audio
                  </button>
                </div>
              )}
            </div>
          )}

          {!headerMeta && (
            <div className="shrink-0 px-4 py-8 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                Choose someone or a group on the left, or start a new direct
                message.
              </p>
            </div>
          )}

          {error && (
            <div className="mx-4 mt-3 px-4 py-3 rounded-3xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm border border-red-100 dark:border-red-900/50 shadow-sm">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 scroll-smooth">
            {loadingMessages ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Loading messages…
              </p>
            ) : messages.length === 0 && headerMeta && !loadingMessages ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="h-14 w-14 rounded-3xl bg-slate-200/80 dark:bg-slate-800 flex items-center justify-center text-2xl mb-3 shadow-inner">
                  💬
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No messages yet. Say hello below.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === userId;
                const showPeerAvatar = Boolean(userId) && !isMe;
                const label = senderLabel(m.sender_id);
                const senderVisual = participantById.get(m.sender_id);
                return (
                  <div
                    key={m.id}
                    className={`flex gap-2 max-w-[min(92%,40rem)] ${
                      isMe
                        ? 'ml-auto flex-row-reverse items-end'
                        : 'mr-auto flex-row items-end'
                    }`}
                  >
                    {showPeerAvatar && (
                      <ChatAvatar
                        label={label}
                        imageUrl={senderVisual?.avatar_url}
                        size="sm"
                        className="mb-1 ring-2 ring-white dark:ring-slate-900"
                      />
                    )}
                    <div
                      className={`flex min-w-0 flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      {activeConversation?.isGroup && !isMe && (
                        <span className="max-w-full truncate px-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {label}
                        </span>
                      )}
                      <div
                        className={`rounded-[1.35rem] px-4 py-2.5 text-sm shadow-md shadow-slate-900/5 dark:shadow-none ${
                          isMe
                            ? 'bg-accent text-white rounded-br-lg'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-lg'
                        }`}
                      >
                        {m.media_url?.trim() ? (
                          <ChatMessageMedia
                            mediaUrl={m.media_url.trim()}
                            isMe={isMe}
                          />
                        ) : null}
                        {m.content?.trim() ? (
                          <p
                            className={`whitespace-pre-wrap break-words leading-relaxed ${
                              m.media_url?.trim() ? 'mt-2' : ''
                            }`}
                          >
                            {m.content}
                          </p>
                        ) : null}
                        <p
                          className={`text-[0.65rem] mt-1 tabular-nums ${
                            isMe
                              ? 'text-white/70'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {formatChatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {typingFrom && (
              <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-300">
                <TypingDots />
                <span className="italic">
                  {activeConversation?.isGroup
                    ? `${senderLabel(typingFrom)} is typing…`
                    : 'Typing…'}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} className="h-1" aria-hidden />
          </div>

          <div className="shrink-0 px-3 py-3 md:px-4 md:py-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="max-w-4xl mx-auto">
              {pendingMedia && (
                <div
                  role="status"
                  aria-label="Attachment preview"
                  className="mb-3 flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-slate-50 p-3 shadow-sm dark:border-slate-600 dark:bg-slate-800/80 sm:flex-row sm:items-stretch"
                >
                  <div className="flex shrink-0 justify-center sm:justify-start">
                    <div className="w-full max-w-[min(280px,calc(100vw-5rem))] sm:max-w-[300px] overflow-hidden rounded-xl border border-slate-200/90 bg-slate-100/50 dark:border-slate-600 dark:bg-slate-900/35">
                      {pendingMedia.isVideo ? (
                        <video
                          src={pendingMedia.previewUrl}
                          controls
                          playsInline
                          className="block w-full max-h-[min(34vh,240px)] sm:max-h-[min(38vh,288px)] h-auto object-contain bg-slate-200/30 dark:bg-slate-950/50"
                        />
                      ) : (
                        <img
                          src={pendingMedia.previewUrl}
                          alt="Attachment preview"
                          className="block w-full max-h-[min(34vh,240px)] sm:max-h-[min(38vh,288px)] h-auto object-contain bg-slate-200/30 dark:bg-slate-950/50"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <p>
                      Preview ready. Add a caption in the field below if you like,
                      then tap send.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={clearPendingMedia}
                        disabled={sending}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        Cancel attachment
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div
                className={`relative rounded-3xl border bg-slate-50 dark:bg-slate-800/90 transition-shadow ${
                  canSend
                    ? 'border-slate-200 dark:border-slate-600 focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent/50'
                    : 'border-slate-200/70 dark:border-slate-700'
                }`}
              >
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  aria-hidden
                  tabIndex={-1}
                  onChange={onPickChatMedia}
                />
                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  disabled={sending || !canSend}
                  aria-label="Attach photo or video"
                  title="Attach photo or video"
                  className="absolute bottom-2.5 left-2.5 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-200/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700/90"
                >
                  <PaperclipIcon className="h-5 w-5" />
                </button>
                <textarea
                  ref={messageInputRef}
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (canSubmit) void submitComposer();
                    }
                  }}
                  placeholder={
                    canSend
                      ? pendingMedia
                        ? 'Caption (optional)…'
                        : 'Write a message…'
                      : 'Choose a chat on the left'
                  }
                  disabled={sending || !canSend}
                  rows={1}
                  className="block w-full min-h-[48px] max-h-[120px] resize-none rounded-3xl bg-transparent pl-12 pr-[3.25rem] py-3.5 text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void submitComposer()}
                  disabled={!canSubmit}
                  aria-label={
                    pendingMedia ? 'Send attachment' : 'Send message'
                  }
                  title={pendingMedia ? 'Send attachment' : 'Send'}
                  className="absolute bottom-2.5 right-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-white shadow-md shadow-accent/25 transition hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-600 dark:disabled:text-slate-400"
                >
                  {sending ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  ) : (
                    <SendIcon className="h-4 w-4 -ml-0.5" />
                  )}
                </button>
              </div>
              {canSend && (
                <p className="mt-2 text-center text-[0.65rem] text-slate-400 dark:text-slate-500 tabular-nums">
                  <kbd className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-800 px-1.5 py-0.5 font-sans text-[0.6rem]">
                    Enter
                  </kbd>{' '}
                  send · paperclip picks photo/video (preview first) ·{' '}
                  <kbd className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-100/80 dark:bg-slate-800 px-1.5 py-0.5 font-sans text-[0.6rem]">
                    Shift+Enter
                  </kbd>{' '}
                  new line
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
