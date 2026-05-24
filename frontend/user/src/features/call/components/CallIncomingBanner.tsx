import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/auth.store';
import { getProfileApi } from '../../auth/api/auth.api';
import { ROUTES } from '../../../shared/constants/routes';
import { useCallStore } from '../store/call.store';
import { fetchVideoCallToken } from '../api/call.api';
import { useCallSocket } from '../hooks/useCallSocket';
import { postCallBroadcast } from '../lib/callBroadcast';
import { useAuthorProfiles } from '../../network/hooks/useAuthorProfiles';
import { UserAvatar } from '../../user/components/UserAvatar';

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
      />
    </svg>
  );
}

function PhoneDeclineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m1.5 13.5c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 0 1 4.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.055.902-.417 1.173l-.97 1.293c-.376.282-.542.769-.38 1.21a12.035 12.035 0 0 0 7.143 7.143c.441.162.928-.004 1.21-.38l1.293-.97c.271-.363.734-.527 1.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 0 1-2.25 2.25h-2.25Z"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    </svg>
  );
}

export function CallIncomingBanner() {
  const incoming = useCallStore((s) => s.incoming);
  const setIncoming = useCallStore((s) => s.setIncoming);
  const setActiveSession = useCallStore((s) => s.setActiveSession);
  const remoteActiveMeetingId = useCallStore((s) => s.remoteActiveMeetingId);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { emitAcceptCall, emitRejectCall } = useCallSocket();
  const [busy, setBusy] = useState(false);

  const callerId = incoming?.from ?? '';
  const { byId: profiles } = useAuthorProfiles(callerId ? [callerId] : []);
  const callerProfile = callerId ? profiles[callerId] : undefined;

  const callerLabel = useMemo(() => {
    if (!incoming) return '';
    const username = callerProfile?.username?.trim();
    if (username) return `@${username}`;
    const fromPayload = incoming.callerName?.trim();
    if (fromPayload) return fromPayload;
    const fullName = callerProfile?.full_name?.trim();
    if (fullName) return fullName;
    return `User ${incoming.from.slice(0, 8)}…`;
  }, [incoming, callerProfile]);

  const callerSubtitle = useMemo(() => {
    if (!incoming) return null;
    const fullName = callerProfile?.full_name?.trim();
    const username = callerProfile?.username?.trim();
    if (fullName && username && callerLabel === `@${username}`) {
      return fullName;
    }
    return null;
  }, [incoming, callerProfile, callerLabel]);

  useEffect(() => {
    if (!incoming) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [incoming?.meetingId]);

  // Another tab already handled / is handling this exact call — stay hidden.
  if (
    incoming &&
    remoteActiveMeetingId &&
    remoteActiveMeetingId === incoming.meetingId
  ) {
    return null;
  }

  if (!incoming) return null;

  const isVideo = incoming.callType === 'video';
  const callKindLabel = isVideo ? 'Video call' : 'Audio call';

  const decline = async () => {
    if (!user || busy) return;
    setBusy(true);
    const meetingId = incoming.meetingId;
    try {
      emitRejectCall({ to: incoming.from, meetingId });
    } finally {
      setIncoming(null);
      postCallBroadcast({ type: 'incoming_cleared', meetingId });
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!user || busy) return;
    setBusy(true);
    const meetingId = incoming.meetingId;
    try {
      const token = await fetchVideoCallToken();
      let displayName = user.email.split('@')[0] ?? 'Guest';
      try {
        const prof = await getProfileApi();
        const username = prof.data.username?.trim();
        const fullName = prof.data.full_name?.trim();
        if (fullName) displayName = fullName;
        else if (username) displayName = username;
      } catch {
        /* ignore */
      }
      emitAcceptCall({ to: incoming.from, meetingId });
      setActiveSession({
        meetingId,
        token,
        callType: incoming.callType,
        displayName,
        signalPeerIds: [incoming.from],
        isGroupCall: Boolean(incoming.isGroupCall),
      });
      setIncoming(null);
      postCallBroadcast({ type: 'incoming_cleared', meetingId });
      postCallBroadcast({ type: 'active_session_started', meetingId });
      navigate(ROUTES.CALL);
    } catch {
      /* token / profile failed */
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="call-incoming-backdrop"
        aria-label="Dismiss incoming call"
        onClick={() => void decline()}
      />

      <div
        className="call-incoming-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-incoming-title"
        aria-describedby="call-incoming-subtitle"
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5 flex h-28 w-28 items-center justify-center">
            <span className="call-incoming-panel__ring" aria-hidden />
            <span
              className="call-incoming-panel__ring call-incoming-panel__ring--delay"
              aria-hidden
            />
            <UserAvatar
              label={callerLabel}
              src={callerProfile?.avatar_url ?? null}
              size="2xl"
              className="!ring-4 !ring-white dark:!ring-slate-900"
            />
          </div>

          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {isVideo ? (
              <VideoIcon className="h-3.5 w-3.5" />
            ) : (
              <PhoneIcon className="h-3.5 w-3.5" />
            )}
            Incoming {callKindLabel.toLowerCase()}
            {incoming.isGroupCall ? (
              <>
                <span className="text-emerald-400">·</span>
                <UsersIcon className="h-3.5 w-3.5" />
                Group
              </>
            ) : null}
          </div>

          <h2
            id="call-incoming-title"
            className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            {callerLabel}
          </h2>
          {callerSubtitle ? (
            <p
              id="call-incoming-subtitle"
              className="mt-1 text-sm text-slate-500 dark:text-slate-400"
            >
              {callerSubtitle}
            </p>
          ) : (
            <p
              id="call-incoming-subtitle"
              className="mt-1 text-sm text-slate-500 dark:text-slate-400"
            >
              {incoming.isGroupCall
                ? 'Someone in your group is calling'
                : 'is calling you'}
            </p>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-10">
          <div className="call-incoming-action">
            <button
              type="button"
              onClick={() => void decline()}
              disabled={busy}
              className="call-incoming-action__btn call-incoming-action__btn--decline"
              aria-label="Decline call"
            >
              <PhoneDeclineIcon className="h-6 w-6" />
            </button>
            <span className="call-incoming-action__label">Decline</span>
          </div>

          <div className="call-incoming-action">
            <button
              type="button"
              onClick={() => void accept()}
              disabled={busy}
              className="call-incoming-action__btn call-incoming-action__btn--accept"
              aria-label="Accept call"
            >
              {isVideo ? (
                <VideoIcon className="h-6 w-6" />
              ) : (
                <PhoneIcon className="h-6 w-6" />
              )}
            </button>
            <span className="call-incoming-action__label">
              {busy ? 'Joining…' : 'Accept'}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
