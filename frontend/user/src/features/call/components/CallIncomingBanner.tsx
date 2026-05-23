import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/auth.store';
import { getProfileApi } from '../../auth/api/auth.api';
import { ROUTES } from '../../../shared/constants/routes';
import { useCallStore } from '../store/call.store';
import { fetchVideoCallToken } from '../api/call.api';
import { useCallSocket } from '../hooks/useCallSocket';
import { postCallBroadcast } from '../lib/callBroadcast';

export function CallIncomingBanner() {
  const incoming = useCallStore((s) => s.incoming);
  const setIncoming = useCallStore((s) => s.setIncoming);
  const setActiveSession = useCallStore((s) => s.setActiveSession);
  const remoteActiveMeetingId = useCallStore((s) => s.remoteActiveMeetingId);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { emitAcceptCall, emitRejectCall } = useCallSocket();
  const [busy, setBusy] = useState(false);

  // Another tab already handled / is handling this exact call — stay hidden.
  if (
    incoming &&
    remoteActiveMeetingId &&
    remoteActiveMeetingId === incoming.meetingId
  ) {
    return null;
  }

  if (!incoming) return null;

  const label =
    incoming.callerName?.trim() ||
    `User ${incoming.from.slice(0, 8)}…`;

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
        const n = prof.data.full_name?.trim();
        if (n) displayName = n;
      } catch {
        /* ignore */
      }
      emitAcceptCall({ to: incoming.from, meetingId });
      setActiveSession({
        meetingId,
        token,
        callType: incoming.callType,
        displayName,
        // For 1:1 the only signal peer is the caller. Group-call invitees
        // currently still get this banner with `isGroupCall=true`; we
        // populate `signalPeerIds` with the caller alone (the SFU itself
        // tracks the rest), and the "End for everyone" button on the call
        // page will fan-out via the same socket relay.
        signalPeerIds: [incoming.from],
        isGroupCall: Boolean(incoming.isGroupCall),
      });
      setIncoming(null);
      // Tell sibling tabs this call is taken so they don't also prompt.
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
    <div className="fixed bottom-6 left-1/2 z-[100] flex w-[min(100vw-2rem,24rem)] -translate-x-1/2 flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-2xl shadow-slate-900/20 backdrop-blur-md dark:border-slate-600 dark:bg-slate-900/95">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-lg font-semibold text-accent">
          {incoming.callType === 'video' ? '📹' : '📞'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Incoming {incoming.callType === 'video' ? 'video' : 'audio'} call
            {incoming.isGroupCall ? ' (group)' : ''}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {label}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void decline()}
          disabled={busy}
          className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => void accept()}
          disabled={busy}
          className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? '…' : 'Accept'}
        </button>
      </div>
    </div>
  );
}
