import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getProfileApi } from '../../features/auth/api/auth.api';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { fetchCallRoom } from '../../features/call/api/call.api';
import { useCallSocket } from '../../features/call/hooks/useCallSocket';
import { useCallStore } from '../../features/call/store/call.store';
import {
  addGroupMembers,
  createGroupConversation,
  fetchConversations,
  fetchMessages,
  leaveGroupConversation,
  postMessage,
} from '../../features/chat/api/chat.api';
import { uploadChatMediaFile } from '../../features/chat/lib/uploadChatMedia';
import {
  useChatSocket,
  type ChatGroupUpdatedPayload,
  type ChatTypingPayload,
} from '../../features/chat/hooks/useChatSocket';
import type { ChatMessage, ConversationListItem } from '../../features/chat/types';
import {
  searchUsers,
  type UserSearchHit,
} from '../../features/user/api/userDirectory.api';
import { AppPage } from '../../shared/layout/AppPage';
import { Button } from '../../shared/components/Button';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { MediaLightbox } from '../../shared/components/MediaLightbox';
import { extractApiMessage } from '../../shared/utils/api-error';
import { ROUTES } from '../../shared/constants/routes';
import { isCloudinaryVideoUrl } from '../../shared/lib/cloudinary';
import { SharedPostPreviewById } from '../../features/network/components/SharedPostPreview';

function mapRowsToMessages(
  rows: Array<{
    id: string;
    sender_id: string;
    content: string;
    media_url: string;
    type?: string;
    shared_post_id?: string | null;
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
    type:
      r.type === 'system' || r.type === 'post_share'
        ? r.type
        : undefined,
    shared_post_id: r.shared_post_id ?? null,
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
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sz =
    size === 'sm'
      ? 'h-9 w-9 text-xs'
      : size === 'lg'
        ? 'h-12 w-12 text-base'
        : size === 'xl'
          ? 'h-20 w-20 text-2xl'
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

function VideoCallIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

function PhoneCallIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function ChatEmptyIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}


/** Max size for attachments in bubbles: capped width/height, contain so nothing is cropped. */
const CHAT_BUBBLE_MEDIA_SHELL_BASE =
  'mt-1 w-full max-w-[min(280px,calc(100vw-5rem))] sm:max-w-[300px] overflow-hidden rounded-2xl';
const CHAT_BUBBLE_MEDIA_BASE =
  'block w-full max-h-[min(34vh,240px)] sm:max-h-[min(38vh,288px)] h-auto object-contain';

const CHAT_SCROLL_STICK_THRESHOLD_PX = 96;

function ChatMessageMedia({
  mediaUrl,
  isMe,
  onOpen,
  onMediaLoad,
}: {
  mediaUrl: string;
  isMe: boolean;
  onOpen?: () => void;
  onMediaLoad?: () => void;
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

  const isVideo = isCloudinaryVideoUrl(mediaUrl);

  if (isVideo) {
    return (
      <div className={`relative ${shell}`}>
        <video
          src={mediaUrl}
          controls
          playsInline
          preload="metadata"
          className={cls}
          onLoadedData={onMediaLoad}
        />
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label="View attachment full screen"
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
          >
            <ExpandMediaIcon />
          </button>
        ) : null}
      </div>
    );
  }

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label="View attachment full screen"
        className={`${shell} block cursor-zoom-in text-left`}
      >
        <img
          src={mediaUrl}
          alt="Attachment"
          className={cls}
          loading="lazy"
          onLoad={onMediaLoad}
        />
      </button>
    );
  }

  return (
    <div className={shell}>
      <img
        src={mediaUrl}
        alt="Attachment"
        className={cls}
        loading="lazy"
        onLoad={onMediaLoad}
      />
    </div>
  );
}

function ExpandMediaIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

function conversationTitle(
  c: ConversationListItem,
  userId: string | null,
): string {
  if (c.isGroup) return c.group_name?.trim() || 'Group';
  return dmTitle(c, userId);
}

function formatListPreview(text: string | null | undefined): string {
  const t = text?.trim();
  if (!t) return 'No messages yet';
  return t.length > 72 ? `${t.slice(0, 72)}…` : t;
}

export function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMemberSearchInput, setAddMemberSearchInput] = useState('');
  const [addMemberResults, setAddMemberResults] = useState<UserSearchHit[]>([]);
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const addMemberDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mediaLightbox, setMediaLightbox] = useState<{
    urls: string[];
    startIndex: number;
  } | null>(null);
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

  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
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

  const [convFilter, setConvFilter] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'direct' | 'groups'>('direct');
  const [showInfo, setShowInfo] = useState(false);
  const convFilterNorm = convFilter.trim().toLowerCase();

  const filteredConversations = useMemo(() => {
    if (!convFilterNorm) return conversations;
    return conversations.filter((c) => {
      const title = conversationTitle(c, userId).toLowerCase();
      const last = (c.last_message ?? '').toLowerCase();
      if (c.isGroup) {
        return title.includes(convFilterNorm) || last.includes(convFilterNorm);
      }
      const hay = c.participants
        .map((p) => `${p.full_name ?? ''} ${p.username ?? ''}`.toLowerCase())
        .join(' ');
      return (
        title.includes(convFilterNorm) ||
        last.includes(convFilterNorm) ||
        hay.includes(convFilterNorm)
      );
    });
  }, [conversations, userId, convFilterNorm]);

  const filteredDirectConversations = useMemo(
    () => filteredConversations.filter((c) => !c.isGroup),
    [filteredConversations],
  );

  const filteredGroupConversations = useMemo(
    () => filteredConversations.filter((c) => c.isGroup),
    [filteredConversations],
  );

  const directCount = useMemo(
    () => conversations.filter((c) => !c.isGroup).length,
    [conversations],
  );

  const groupCount = useMemo(
    () => conversations.filter((c) => c.isGroup).length,
    [conversations],
  );

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const conversationMediaUrls = useMemo(
    () =>
      messages
        .map((m) => m.media_url?.trim())
        .filter((url): url is string => Boolean(url)),
    [messages],
  );

  const openChatMedia = useCallback(
    (mediaUrl: string) => {
      const urls =
        conversationMediaUrls.length > 0
          ? conversationMediaUrls
          : [mediaUrl];
      const idx = urls.indexOf(mediaUrl);
      setMediaLightbox({
        urls,
        startIndex: idx >= 0 ? idx : 0,
      });
    },
    [conversationMediaUrls],
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
        subtitle: 'Group chat',
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

  const hasActiveThread = Boolean(activeConversationId || peerId.trim());

  const scrollToLatestMessage = useCallback(
    (opts?: { force?: boolean; smooth?: boolean }) => {
      const el = messagesScrollRef.current;
      if (!el) return;

      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      const nearBottom = distanceFromBottom <= CHAT_SCROLL_STICK_THRESHOLD_PX;
      const force = opts?.force ?? false;

      if (!force && !stickToBottomRef.current && !nearBottom) return;

      if (force || nearBottom) stickToBottomRef.current = true;

      const behavior = opts?.smooth ? 'smooth' : 'auto';
      const run = () => {
        el.scrollTo({ top: el.scrollHeight, behavior });
      };
      run();
      requestAnimationFrame(run);
    },
    [],
  );

  const onMessagesScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current =
      distanceFromBottom <= CHAT_SCROLL_STICK_THRESHOLD_PX;
  }, []);

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

  useEffect(() => {
    const openId = (location.state as { openConversationId?: string } | null)
      ?.openConversationId;
    if (openId) {
      setActiveConversationId(openId);
      setPeerId('');
      setPeerLabel('');
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

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
    stickToBottomRef.current = true;
    setShowInfo(false);
    setShowAddMembers(false);
    setAddMemberSearchInput('');
    setAddMemberResults([]);
  }, [activeConversationId, peerId]);

  useLayoutEffect(() => {
    if (loadingMessages) return;
    scrollToLatestMessage({ smooth: true });
  }, [messages, loadingMessages, scrollToLatestMessage]);

  useLayoutEffect(() => {
    if (loadingMessages) return;
    scrollToLatestMessage({ force: true });
  }, [loadingMessages, activeConversationId, peerId, scrollToLatestMessage]);

  useLayoutEffect(() => {
    if (loadingMessages || !typingFrom) return;
    scrollToLatestMessage({ smooth: true });
  }, [typingFrom, loadingMessages, scrollToLatestMessage]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      scrollToLatestMessage();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeConversationId, peerId, scrollToLatestMessage]);

  useEffect(() => {
    const el = messageInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const q = convFilter.trim();
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
  }, [convFilter]);

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

  useEffect(() => {
    if (!showAddMembers) return;
    if (addMemberDebounceRef.current) clearTimeout(addMemberDebounceRef.current);
    const q = addMemberSearchInput.trim();
    if (q.length < 2) {
      setAddMemberResults([]);
      setAddMemberLoading(false);
      return;
    }
    const memberIds = new Set(
      activeConversation?.participants.map((p) => p.id) ?? [],
    );
    setAddMemberLoading(true);
    addMemberDebounceRef.current = setTimeout(() => {
      void searchUsers(q)
        .then((hits) =>
          setAddMemberResults(
            hits.filter((h) => h.id !== userId && !memberIds.has(h.id)),
          ),
        )
        .catch(() => setAddMemberResults([]))
        .finally(() => setAddMemberLoading(false));
    }, 320);
    return () => {
      if (addMemberDebounceRef.current) clearTimeout(addMemberDebounceRef.current);
    };
  }, [addMemberSearchInput, showAddMembers, activeConversation, userId]);

  const selectPeer = (hit: UserSearchHit) => {
    clearPendingMedia();
    setShowGroupForm(false);
    setSidebarTab('direct');
    setPeerId(hit.id);
    setPeerLabel(hit.username || hit.full_name);
    setPeerAvatarUrl(hit.avatar_url?.trim() ?? '');
    setConvFilter('');
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
    setConvFilter('');
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
      setSidebarTab('groups');
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

  const handleLeaveGroup = async () => {
    if (!activeConversationId || leavingGroup) return;
    setLeavingGroup(true);
    setError(null);
    try {
      await leaveGroupConversation(activeConversationId);
      setConversations((prev) =>
        prev.filter((c) => c.id !== activeConversationId),
      );
      setActiveConversationId(null);
      setMessages([]);
      setShowInfo(false);
      setShowAddMembers(false);
      setLeaveConfirmOpen(false);
    } catch (e) {
      setError(extractApiMessage(e, 'Could not leave group.'));
    } finally {
      setLeavingGroup(false);
    }
  };

  const submitAddMember = async (hit: UserSearchHit) => {
    if (!activeConversationId || addingMembers || !userId) return;
    if (hit.id === userId) return;
    if (activeConversation?.participants.some((p) => p.id === hit.id)) return;
    setAddingMembers(true);
    setError(null);
    try {
      const res = await addGroupMembers(activeConversationId, [hit.id]);
      const updated = res.data.conversation;
      setConversations((prev) => {
        const has = prev.some((c) => c.id === updated.id);
        if (!has) return [updated, ...prev];
        return prev.map((c) => (c.id === updated.id ? updated : c));
      });
      setAddMemberSearchInput('');
      setAddMemberResults([]);
    } catch (e) {
      setError(extractApiMessage(e, 'Could not add member.'));
    } finally {
      setAddingMembers(false);
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

  const onGroupUpdated = useCallback(
    (payload: ChatGroupUpdatedPayload) => {
      if (payload.action === 'leave' && payload.userId === userId) {
        setConversations((prev) =>
          prev.filter((c) => c.id !== payload.conversationId),
        );
        if (activeConvIdRef.current === payload.conversationId) {
          setActiveConversationId(null);
          setMessages([]);
          setShowInfo(false);
          setShowAddMembers(false);
        }
        return;
      }
      if (
        payload.action === 'members_added' &&
        payload.conversation
      ) {
        const row = payload.conversation;
        setConversations((prev) => {
          const has = prev.some((c) => c.id === row.id);
          if (!has) return [row, ...prev];
          return prev.map((c) => (c.id === row.id ? row : c));
        });
        return;
      }
      void reloadConversations();
    },
    [userId, reloadConversations],
  );

  const { emitTyping } = useChatSocket({
    onReceive,
    onTyping,
    onGroupUpdated,
  });

  const appendSentMessage = useCallback(
    (row: {
      id: string;
      conversationId: string;
      sender_id: string;
      content: string;
      media_url: string;
      type?: string;
      shared_post_id?: string | null;
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
            type:
              row.type === 'system' || row.type === 'post_share'
                ? row.type
                : undefined,
            shared_post_id: row.shared_post_id ?? null,
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
    setSidebarTab(c.isGroup ? 'groups' : 'direct');
    setPeerId('');
    setPeerLabel('');
    setPeerAvatarUrl('');
    setConvFilter('');
    setUserSearchResults([]);
    setShowGroupForm(false);
    setError(null);
  };

  const sidebarRowClass = (isActive: boolean) =>
    `flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all ${
      isActive
        ? 'bg-accent-bg shadow-sm ring-1 ring-accent/20'
        : 'hover:bg-slate-100/90 dark:hover:bg-slate-800/70'
    }`;

  const renderConversationRow = (c: ConversationListItem) => {
    const title = conversationTitle(c, userId);
    const isActive = activeConversationId === c.id;
    return (
      <li key={c.id}>
        <button
          type="button"
          title={title}
          onClick={() => openConversation(c)}
          className={sidebarRowClass(isActive)}
        >
          <ChatAvatar
            label={title}
            imageUrl={
              c.isGroup ? null : getOtherParticipant(c, userId)?.avatar_url
            }
            size="sm"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
              {formatListPreview(c.last_message)}
            </span>
          </span>
        </button>
      </li>
    );
  };

  const toggleGroupForm = () => {
    setShowGroupForm((open) => {
      if (open) {
        setNewGroupName('');
        setNewGroupMembers([]);
        setGroupSearchInput('');
        setGroupSearchResults([]);
      }
      return !open;
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 bg-slate-200 dark:bg-slate-950">
        <p className="text-slate-600 dark:text-slate-400">Sign in to use chat.</p>
        <Link to={ROUTES.LOGIN} className="text-accent font-medium">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <AppPage fill mainClassName="max-w-7xl">
      <div className="chat-page">
      <div className={`chat-page__layout${hasActiveThread ? ' chat-page__layout--thread' : ''}`}>
        <aside
          className={`chat-sidebar ${
            hasActiveThread ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="chat-sidebar__head">
            <h2 className="chat-sidebar__title">Messages</h2>
          </div>

          <div className="chat-sidebar__search-wrap">
            <label className="sr-only" htmlFor="chat-sidebar-search">
              Search chats or people
            </label>
            <span className="chat-sidebar__search-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              id="chat-sidebar-search"
              value={convFilter}
              onChange={(e) => setConvFilter(e.target.value)}
              placeholder="Search chats or people…"
              autoComplete="off"
              className="chat-sidebar__search"
            />
          </div>

          <div className="chat-sidebar__tabs" role="tablist" aria-label="Chat type">
            <button
              type="button"
              role="tab"
              aria-selected={sidebarTab === 'direct'}
              onClick={() => {
                setSidebarTab('direct');
                setShowGroupForm(false);
                setNewGroupName('');
                setNewGroupMembers([]);
                setGroupSearchInput('');
                setGroupSearchResults([]);
              }}
              className={`chat-sidebar__tab${sidebarTab === 'direct' ? ' chat-sidebar__tab--active' : ''}`}
            >
              Direct
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sidebarTab === 'groups'}
              onClick={() => setSidebarTab('groups')}
              className={`chat-sidebar__tab${sidebarTab === 'groups' ? ' chat-sidebar__tab--active' : ''}`}
            >
              Groups
            </button>
          </div>

          {sidebarTab === 'groups' ? (
            <div className="chat-sidebar__actions">
              <button
                type="button"
                onClick={toggleGroupForm}
                className={`chat-sidebar__create-btn${showGroupForm ? ' chat-sidebar__create-btn--active' : ''}`}
              >
                {showGroupForm ? 'Cancel' : 'Create group'}
              </button>
            </div>
          ) : null}

          {sidebarTab === 'groups' && showGroupForm ? (
            <div className="chat-sidebar__group-panel">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name"
                className="chat-sidebar__input"
              />
              {newGroupMembers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {newGroupMembers.map((m) => (
                    <span key={m.id} className="chat-sidebar__member-chip">
                      @{m.username}
                      <button
                        type="button"
                        onClick={() => removeGroupMember(m.id)}
                        aria-label={`Remove ${m.username}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <input
                value={groupSearchInput}
                onChange={(e) => setGroupSearchInput(e.target.value)}
                placeholder="Add members (search users)…"
                className="chat-sidebar__input"
              />
              {groupSearchLoading ? (
                <p className="chat-sidebar__hint !py-1 !px-0">Searching members…</p>
              ) : groupSearchResults.length > 0 ? (
                <ul className="chat-sidebar__mini-list">
                  {groupSearchResults.map((hit) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        disabled={!userId || hit.id === userId}
                        onClick={() => addGroupMember(hit)}
                        className="chat-sidebar__mini-row"
                      >
                        {hit.full_name?.trim() || hit.username}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Button
                variant="primary"
                className="w-full !min-h-[40px] text-sm"
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
          ) : null}

          <div className="chat-sidebar__list">
            {sidebarTab === 'direct' && convFilterNorm.length >= 2 ? (
              <section className="chat-sidebar__section">
                <p className="chat-sidebar__section-label">People</p>
                {userSearchLoading ? (
                  <p className="chat-sidebar__hint">Searching…</p>
                ) : userSearchResults.length === 0 ? (
                  <p className="chat-sidebar__hint">No people found.</p>
                ) : (
                  <ul className="space-y-0.5 px-2 pb-2">
                    {userSearchResults.map((hit) => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          onClick={() => selectPeer(hit)}
                          className={sidebarRowClass(false)}
                        >
                          <ChatAvatar
                            label={hit.full_name || hit.username}
                            imageUrl={hit.avatar_url}
                            size="sm"
                          />
                          <span className="min-w-0 flex-1 text-left">
                            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {hit.full_name?.trim() || `@${hit.username}`}
                            </span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              @{hit.username}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            <section
              className="chat-sidebar__section"
              aria-label={sidebarTab === 'direct' ? 'Direct messages' : 'Group chats'}
            >
              {loadingList ? (
                <p className="chat-sidebar__hint">Loading conversations…</p>
              ) : sidebarTab === 'direct' ? (
                directCount === 0 ? (
                  <div className="chat-sidebar__empty">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      No direct messages yet
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Search above to find someone and start chatting.
                    </p>
                  </div>
                ) : filteredDirectConversations.length === 0 ? (
                  <p className="chat-sidebar__hint">
                    No direct chats match &ldquo;{convFilter.trim()}&rdquo;.
                  </p>
                ) : (
                  <ul className="space-y-0.5 px-2 pb-3">
                    {filteredDirectConversations.map(renderConversationRow)}
                  </ul>
                )
              ) : groupCount === 0 ? (
                <div className="chat-sidebar__empty">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    No group chats yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Tap Create group to start one.
                  </p>
                </div>
              ) : filteredGroupConversations.length === 0 ? (
                <p className="chat-sidebar__hint">
                  No groups match &ldquo;{convFilter.trim()}&rdquo;.
                </p>
              ) : (
                <ul className="space-y-0.5 px-2 pb-3">
                  {filteredGroupConversations.map(renderConversationRow)}
                </ul>
              )}
            </section>
          </div>
        </aside>

        <main
          className={`chat-panel ${
            hasActiveThread ? 'chat-panel--thread flex' : 'hidden md:flex'
          }`}
        >
          {headerMeta ? (
            <div className="chat-panel__header">
              <button
                type="button"
                onClick={clearNewChat}
                aria-label="Back to conversations"
                title="Back to conversations"
                className="chat-panel__back"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <ChatAvatar
                label={headerMeta.avatarLabel}
                imageUrl={headerMeta.avatarImageUrl}
                size="lg"
              />
              <div className="chat-panel__identity">
                <p className="chat-panel__title">{headerMeta.title}</p>
                <p className="chat-panel__subtitle">{headerMeta.subtitle}</p>
              </div>
              <div className="chat-panel__actions">
                {canPlaceCall ? (
                  <>
                    <button
                      type="button"
                      disabled={callStarting}
                      onClick={() => void startOutgoingCall('video')}
                      title="Video call"
                      aria-label="Start video call"
                      className="chat-panel__action chat-panel__action--accent"
                    >
                      <VideoCallIcon className="h-[1.125rem] w-[1.125rem]" />
                    </button>
                    <button
                      type="button"
                      disabled={callStarting}
                      onClick={() => void startOutgoingCall('audio')}
                      title="Voice call"
                      aria-label="Start voice call"
                      className="chat-panel__action chat-panel__action--accent"
                    >
                      <PhoneCallIcon className="h-[1.125rem] w-[1.125rem]" />
                    </button>
                  </>
                ) : null}
                {activeConversation ? (
                  <button
                    type="button"
                    onClick={() => setShowInfo(true)}
                    title="Chat info"
                    aria-label="Show chat info"
                    aria-haspopup="dialog"
                    aria-expanded={showInfo}
                    className="chat-panel__action"
                  >
                    <InfoIcon className="h-[1.125rem] w-[1.125rem]" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="chat-panel__empty flex-1">
              <div className="chat-panel__empty-icon">
                <ChatEmptyIcon className="h-8 w-8" />
              </div>
              <p className="chat-panel__empty-title">Select a conversation</p>
              <p className="chat-panel__empty-desc">
                Pick a chat from the sidebar or search for someone to message.
              </p>
            </div>
          )}

          {error ? <div className="chat-panel__error">{error}</div> : null}

          {headerMeta ? (
            <div
              ref={messagesScrollRef}
              className="chat-panel__messages"
              onScroll={onMessagesScroll}
            >
              {loadingMessages ? (
                <p className="py-12 text-center text-sm text-slate-500">
                  Loading messages…
                </p>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="chat-panel__empty-icon mb-3 !h-14 !w-14">
                    <ChatEmptyIcon className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No messages yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Send a message to start the conversation.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  if (m.type === 'system') {
                    return (
                      <div key={m.id} className="flex justify-center px-2 py-1">
                        <p className="chat-system-msg">{m.content}</p>
                      </div>
                    );
                  }
                  const isMe = m.sender_id === userId;
                  const showPeerAvatar = Boolean(userId) && !isMe;
                  const label = senderLabel(m.sender_id);
                  const senderVisual = participantById.get(m.sender_id);
                  return (
                    <div
                      key={m.id}
                      className={`chat-msg ${isMe ? 'chat-msg--mine' : 'chat-msg--theirs'} items-end`}
                    >
                      {showPeerAvatar ? (
                        <ChatAvatar
                          label={label}
                          imageUrl={senderVisual?.avatar_url}
                          size="sm"
                          className="mb-0.5 ring-2 ring-white dark:ring-slate-900"
                        />
                      ) : null}
                      <div
                        className={`chat-msg__body ${isMe ? 'chat-msg__body--mine' : 'chat-msg__body--theirs'}`}
                      >
                        {activeConversation?.isGroup && !isMe ? (
                          <span className="chat-msg__sender">{label}</span>
                        ) : null}
                        <div
                          className={`chat-bubble ${isMe ? 'chat-bubble--mine' : 'chat-bubble--theirs'}`}
                        >
                          {m.content?.trim() ? (
                            <p
                              className={`whitespace-pre-wrap break-words ${
                                m.type === 'post_share' && m.shared_post_id
                                  ? 'mb-2'
                                  : m.media_url?.trim()
                                    ? 'mt-2'
                                    : ''
                              }`}
                            >
                              {m.content}
                            </p>
                          ) : null}
                          {m.type === 'post_share' && m.shared_post_id ? (
                            <SharedPostPreviewById
                              postId={m.shared_post_id}
                              compact
                              stopCardNavigation
                            />
                          ) : null}
                          {m.media_url?.trim() && m.type !== 'post_share' ? (
                            <ChatMessageMedia
                              mediaUrl={m.media_url.trim()}
                              isMe={isMe}
                              onOpen={() => openChatMedia(m.media_url.trim())}
                              onMediaLoad={() => scrollToLatestMessage()}
                            />
                          ) : null}
                          <p
                            className={`chat-bubble__time ${isMe ? 'chat-bubble__time--mine' : 'chat-bubble__time--theirs'}`}
                          >
                            {formatChatTime(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {typingFrom ? (
                <div className="chat-typing">
                  <TypingDots />
                  <span className="italic">
                    {activeConversation?.isGroup
                      ? `${senderLabel(typingFrom)} is typing…`
                      : 'Typing…'}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {headerMeta ? (
          <div className="chat-composer">
            <div className="chat-composer__inner">
              {pendingMedia ? (
                <div
                  role="status"
                  aria-label="Attachment preview"
                  className="chat-composer__preview"
                >
                  <div className="flex shrink-0 justify-center sm:justify-start">
                    <div className="w-full max-w-[min(280px,calc(100vw-5rem))] overflow-hidden rounded-xl border border-slate-200/90 bg-slate-100/50 sm:max-w-[300px] dark:border-slate-600 dark:bg-slate-900/35">
                      {pendingMedia.isVideo ? (
                        <video
                          src={pendingMedia.previewUrl}
                          controls
                          playsInline
                          className="block h-auto max-h-[min(34vh,240px)] w-full bg-slate-200/30 object-contain dark:bg-slate-950/50 sm:max-h-[min(38vh,288px)]"
                        />
                      ) : (
                        <img
                          src={pendingMedia.previewUrl}
                          alt="Attachment preview"
                          className="block h-auto max-h-[min(34vh,240px)] w-full bg-slate-200/30 object-contain dark:bg-slate-950/50 sm:max-h-[min(38vh,288px)]"
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      Ready to send
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Add an optional caption below, then tap send.
                    </p>
                    <button
                      type="button"
                      onClick={clearPendingMedia}
                      disabled={sending}
                      className="self-start rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : null}
              <div
                className={`chat-composer__field ${canSend ? 'chat-composer__field--active' : 'chat-composer__field--idle'}`}
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
                  className="chat-composer__attach"
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
                      : 'Choose a chat to start messaging'
                  }
                  disabled={sending || !canSend}
                  rows={1}
                  className="chat-composer__input"
                />
                <button
                  type="button"
                  onClick={() => void submitComposer()}
                  disabled={!canSubmit}
                  aria-label={
                    pendingMedia ? 'Send attachment' : 'Send message'
                  }
                  title={pendingMedia ? 'Send attachment' : 'Send'}
                  className="chat-composer__send"
                >
                  {sending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <SendIcon className="h-4 w-4 -ml-0.5" />
                  )}
                </button>
              </div>
              {canSend ? (
                <p className="chat-composer__hint">
                  <kbd className="rounded-md border border-slate-200 bg-slate-100/80 px-1.5 py-0.5 font-sans text-[0.6rem] dark:border-slate-600 dark:bg-slate-800">
                    Enter
                  </kbd>{' '}
                  to send ·{' '}
                  <kbd className="rounded-md border border-slate-200 bg-slate-100/80 px-1.5 py-0.5 font-sans text-[0.6rem] dark:border-slate-600 dark:bg-slate-800">
                    Shift+Enter
                  </kbd>{' '}
                  for new line
                </p>
              ) : null}
            </div>
          </div>
          ) : null}
        </main>
      </div>

      {showInfo && activeConversation && headerMeta && (
        <div
          className="fixed inset-0 z-40 flex"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-info-title"
        >
          <button
            type="button"
            aria-label="Close chat info"
            onClick={() => setShowInfo(false)}
            className="flex-1 cursor-default bg-slate-900/40 backdrop-blur-sm"
          />
          <aside className="chat-info">
            <header className="chat-info__header">
              <p id="chat-info-title" className="chat-info__title">
                {activeConversation.isGroup ? 'Group info' : 'Contact info'}
              </p>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                aria-label="Close"
                className="chat-info__close"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
              <div className="chat-info__hero">
                <ChatAvatar
                  label={headerMeta.avatarLabel}
                  imageUrl={headerMeta.avatarImageUrl}
                  size="xl"
                />
                <div className="min-w-0 max-w-full text-center">
                  <p className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {headerMeta.title}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                    {headerMeta.subtitle}
                  </p>
                </div>
              </div>

              {activeConversation.isGroup ? (
                <>
                  <section>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="chat-info__section-label !mb-0">
                        Members · {activeConversation.participants.length}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddMembers((v) => !v)}
                        className="text-xs font-semibold text-accent hover:text-accent-hover"
                      >
                        {showAddMembers ? 'Done' : 'Add people'}
                      </button>
                    </div>
                    {showAddMembers ? (
                      <div className="mb-3 space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                        <input
                          type="search"
                          value={addMemberSearchInput}
                          onChange={(e) => setAddMemberSearchInput(e.target.value)}
                          placeholder="Search users to add…"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent dark:border-slate-600 dark:bg-slate-900"
                        />
                        {addMemberLoading ? (
                          <p className="text-xs text-slate-500">Searching…</p>
                        ) : addMemberResults.length > 0 ? (
                          <ul className="max-h-40 space-y-1 overflow-y-auto">
                            {addMemberResults.map((hit) => (
                              <li key={hit.id}>
                                <button
                                  type="button"
                                  disabled={addingMembers}
                                  onClick={() => void submitAddMember(hit)}
                                  className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-white dark:hover:bg-slate-900/60 disabled:opacity-50"
                                >
                                  <ChatAvatar
                                    label={hit.full_name || hit.username}
                                    imageUrl={hit.avatar_url}
                                    size="sm"
                                  />
                                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {hit.full_name?.trim() || `@${hit.username}`}
                                  </span>
                                  <span className="text-xs font-semibold text-accent">
                                    Add
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : addMemberSearchInput.trim().length >= 2 ? (
                          <p className="text-xs text-slate-500">No users found.</p>
                        ) : (
                          <p className="text-xs text-slate-500">
                            Type at least 2 characters to search.
                          </p>
                        )}
                      </div>
                    ) : null}
                    <ul className="space-y-1">
                      {activeConversation.participants.map((p) => {
                        const displayName =
                          p.full_name?.trim() ||
                          (p.username ? `@${p.username}` : `${p.id.slice(0, 8)}…`);
                        const isSelf = p.id === userId;
                        return (
                          <li key={p.id} className="chat-info__member">
                            <ChatAvatar
                              label={displayName}
                              imageUrl={p.avatar_url}
                              size="md"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                {displayName}
                                {isSelf && (
                                  <span className="ml-1.5 text-xs font-normal text-slate-500 dark:text-slate-400">
                                    (you)
                                  </span>
                                )}
                              </p>
                              {p.username && p.full_name && (
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  @{p.username}
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>

                  <section className="border-t border-slate-100 pt-4 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setLeaveConfirmOpen(true)}
                      className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                    >
                      Leave group
                    </button>
                  </section>
                </>
              ) : (
                (() => {
                  const other = getOtherParticipant(activeConversation, userId);
                  const rows: Array<{ k: string; v: string }> = [];
                  if (other?.full_name?.trim()) {
                    rows.push({ k: 'Full name', v: other.full_name.trim() });
                  }
                  if (other?.username?.trim()) {
                    rows.push({ k: 'Username', v: `@${other.username.trim()}` });
                  }
                  if (other?.email?.trim()) {
                    rows.push({ k: 'Email', v: other.email.trim() });
                  }
                  if (rows.length === 0) return null;
                  return (
                    <section>
                      <p className="chat-info__section-label">About</p>
                      <dl className="space-y-2">
                        {rows.map((r) => (
                          <div key={r.k} className="chat-info__detail">
                            <dt className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
                              {r.k}
                            </dt>
                            <dd className="mt-0.5 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
                              {r.v}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  );
                })()
              )}
            </div>
          </aside>
        </div>
      )}

      {mediaLightbox ? (
        <MediaLightbox
          urls={mediaLightbox.urls}
          startIndex={mediaLightbox.startIndex}
          onClose={() => setMediaLightbox(null)}
        />
      ) : null}

      <ConfirmDialog
        open={leaveConfirmOpen}
        onClose={() => !leavingGroup && setLeaveConfirmOpen(false)}
        onConfirm={() => void handleLeaveGroup()}
        title="Leave this group?"
        message="You will no longer receive messages from this group. Other members will stay in the chat."
        confirmLabel="Leave group"
        confirming={leavingGroup}
      />
    </div>
    </AppPage>
  );
}
