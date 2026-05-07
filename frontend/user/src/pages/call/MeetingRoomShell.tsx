import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeeting } from '@videosdk.live/react-sdk';
import { useCallStore } from '../../features/call/store/call.store';
import { useCallSocket } from '../../features/call/hooks/useCallSocket';
import { postCallBroadcast } from '../../features/call/lib/callBroadcast';
import { ROUTES } from '../../shared/constants/routes';
import { ParticipantMediaTile } from './ParticipantMediaTile';
import { ScreenShareTile } from './ScreenShareTile';

/** Isolated timer — does not re-render video tiles every second. */
function MeetingDuration() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const m = Math.floor(elapsed / 60);
  const sec = elapsed % 60;
  return (
    <span className="rounded-lg bg-white/10 px-2 py-1 text-xs tabular-nums">
      {String(m).padStart(2, '0')}:{String(sec).padStart(2, '0')}
    </span>
  );
}

type Toast = { id: number; text: string; tone: 'in' | 'out' };

/**
 * Stacks the reconnecting indicator and participant toasts in a single column
 * so they never overlap, and stays clear of the header on the smallest
 * viewports.
 */
function CallNotices({
  toasts,
  reconnecting,
}: {
  toasts: Toast[];
  reconnecting: boolean;
}) {
  if (!reconnecting && toasts.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-x-2 top-3 z-30 flex flex-col items-center gap-2 sm:inset-x-0">
      {reconnecting && (
        <div className="pointer-events-auto rounded-full bg-amber-500/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-amber-900/30 backdrop-blur">
          Reconnecting…
        </div>
      )}
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto max-w-full truncate rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur ${
            t.tone === 'in'
              ? 'bg-emerald-600/90 shadow-emerald-900/30'
              : 'bg-zinc-700/90 shadow-zinc-900/30'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function MeetingRoomShell() {
  const navigate = useNavigate();
  const setActiveSession = useCallStore((s) => s.setActiveSession);
  const setLastEnded = useCallStore((s) => s.setLastEnded);
  const activeSession = useCallStore((s) => s.activeSession);
  const { emitEndCall } = useCallSocket();

  const joinedRef = useRef(false);
  const autoLeftRef = useRef(false);
  const leaveRef = useRef<() => void>(() => {});
  const endedBroadcastRef = useRef(false);
  const endNotifiedRef = useRef(false);
  const sdkJoinedRef = useRef(false);
  const leftRef = useRef(false);
  // Tracks whether at least one OTHER participant was ever in the room. Used
  // to distinguish "I was alone the whole time" (waiting screen) from
  // "I'm now alone after others left" (group → auto end-for-all).
  const sawPeerRef = useRef(false);
  const everyoneLeftTriggeredRef = useRef(false);

  const isGroupCall = Boolean(activeSession?.isGroupCall);
  const meetingId = activeSession?.meetingId ?? '';
  const peerIds = useMemo(
    () => activeSession?.signalPeerIds ?? [],
    [activeSession?.signalPeerIds],
  );

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [connState, setConnState] = useState<
    'CONNECTING' | 'CONNECTED' | 'FAILED' | 'DISCONNECTED' | 'CLOSING' | 'CLOSED'
  >('CONNECTING');
  const [showLeaveMenu, setShowLeaveMenu] = useState(false);

  const pushToast = useCallback((text: string, tone: 'in' | 'out') => {
    setToasts((prev) => {
      const id = Date.now() + Math.random();
      const next = [...prev, { id, text, tone }];
      window.setTimeout(() => {
        setToasts((curr) => curr.filter((t) => t.id !== id));
      }, 3500);
      return next;
    });
  }, []);

  const emitEndCallRef = useRef(emitEndCall);
  emitEndCallRef.current = emitEndCall;

  /**
   * Idempotent socket emit so a callee waiting on an incoming banner always
   * learns we're gone — works for the Leave button, browser tab close, HMR
   * remount, route navigation away from the call, etc.
   */
  const notifyPeersEndCall = useCallback((forEveryone = false) => {
    if (endNotifiedRef.current && !forEveryone) return;
    endNotifiedRef.current = true;
    const sess = useCallStore.getState().activeSession;
    if (!sess?.signalPeerIds?.length) return;
    try {
      emitEndCallRef.current({
        toUsers: sess.signalPeerIds,
        meetingId: sess.meetingId,
        forEveryone,
      });
    } catch {
      /* socket may already be torn down on tab close */
    }
  }, []);

  /** Race-safe leave: silent no-op if SDK isn't joined or we already left. */
  const safeLeave = useCallback(() => {
    if (leftRef.current) return;
    if (!sdkJoinedRef.current) return;
    leftRef.current = true;
    try {
      leaveRef.current();
    } catch {
      /* SDK may already be tearing down */
    }
  }, []);

  const {
    join,
    leave,
    toggleMic,
    toggleWebcam,
    toggleScreenShare,
    participants,
    localParticipant,
    localMicOn,
    localWebcamOn,
    localScreenShareOn,
    presenterId,
    activeSpeakerId,
    isMeetingJoined,
  } = useMeeting({
    onMeetingJoined: () => {
      sdkJoinedRef.current = true;
      setConnState('CONNECTED');
    },
    onMeetingStateChanged: ({ state }) => {
      setConnState(state);
      // Hard fail with no recovery — surface ended-screen so user isn't stuck.
      if (state === 'FAILED') {
        if (everyoneLeftTriggeredRef.current) return;
        everyoneLeftTriggeredRef.current = true;
        setLastEnded({
          meetingId,
          reason: 'connection_failed',
        });
        setActiveSession(null);
      }
    },
    onError: ({ code, message }) => {
      console.warn('[VideoSDK]', code, message);
    },
    onParticipantJoined: (p) => {
      if (p?.local) return;
      sawPeerRef.current = true;
      pushToast(`${p?.displayName || 'A participant'} joined`, 'in');
    },
    onPresenterChanged: (newPresenterId) => {
      if (!newPresenterId) {
        pushToast('Screen sharing stopped', 'out');
        return;
      }
      const part = participants.get(newPresenterId) ?? localParticipant;
      const name = part?.local
        ? 'You'
        : part?.displayName || 'A participant';
      pushToast(`${name} started sharing the screen`, 'in');
    },
    onParticipantLeft: (p) => {
      if (p?.local) return;
      const name = p?.displayName || 'A participant';
      pushToast(`${name} left`, 'out');

      const sess = useCallStore.getState().activeSession;
      if (!sess) return;

      const isOneToOne = !sess.isGroupCall;

      if (isOneToOne) {
        // 1:1 → leaving peer ends the call for the remaining user.
        if (autoLeftRef.current) return;
        autoLeftRef.current = true;
        notifyPeersEndCall(false);
        setLastEnded({
          meetingId: sess.meetingId,
          endedBy: p?.id,
          reason: 'ended_by_remote',
        });
        safeLeave();
        return;
      }

      // Group → if I'm the only non-local left and others were here, end too.
      // We delay one tick so VideoSDK's participants map updates first.
      window.setTimeout(() => {
        if (everyoneLeftTriggeredRef.current) return;
        const remaining = [...participants.values()].filter(
          (part) => !part.local,
        );
        if (remaining.length === 0 && sawPeerRef.current) {
          everyoneLeftTriggeredRef.current = true;
          notifyPeersEndCall(false);
          setLastEnded({
            meetingId: sess.meetingId,
            reason: 'all_left',
          });
          safeLeave();
        }
      }, 250);
    },
    onMeetingLeft: () => {
      leftRef.current = true;
      const sess = useCallStore.getState().activeSession;
      const mid = sess?.meetingId ?? meetingId ?? '';
      if (mid && !endedBroadcastRef.current) {
        endedBroadcastRef.current = true;
        postCallBroadcast({ type: 'active_session_ended', meetingId: mid });
      }
      // CallSignalBridge / 1:1 / group-end paths set `lastEnded` themselves.
      // If nobody set it (e.g. the user just clicked "Leave"), record it here.
      const { lastEnded } = useCallStore.getState();
      if (!lastEnded || lastEnded.meetingId !== mid) {
        setLastEnded({
          meetingId: mid,
          reason: 'left_by_me',
        });
      }
      setActiveSession(null);
    },
  });

  leaveRef.current = leave;

  // Join once per mount. Cleanup notifies peers + leaves so an HMR remount
  // doesn't leave a ghost peer connected, and so callee banners don't linger.
  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    try {
      join();
    } catch {
      /* SDK rejects duplicate joins internally */
    }
    return () => {
      // Unmount can mean: HMR (don't end the call), tab close (do end it),
      // or explicit hangUp (already handled). To stay safe, only end the call
      // here if the session is gone (i.e. we already decided to end).
      const sess = useCallStore.getState().activeSession;
      if (!sess) {
        notifyPeersEndCall(false);
      }
      safeLeave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-tab + tab-close hardening.
  useEffect(() => {
    if (!meetingId) return;
    postCallBroadcast({ type: 'active_session_started', meetingId });
    const onUnload = () => {
      notifyPeersEndCall(false);
      if (endedBroadcastRef.current) return;
      endedBroadcastRef.current = true;
      postCallBroadcast({ type: 'active_session_ended', meetingId });
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [meetingId, notifyPeersEndCall]);

  const participantIds = useMemo(() => {
    const ids = [...participants.keys()];
    const localId = localParticipant?.id;
    if (!localId) return ids.sort();
    const seenLocal = ids.includes(localId);
    return ids
      .filter((id) => {
        const p = participants.get(id);
        if (!p) return false;
        if (p.local && id !== localId && seenLocal) return false;
        return true;
      })
      .sort();
  }, [participants, localParticipant?.id]);

  // Track the "saw any peer" flag from the participants map directly too —
  // covers the case where peers were already in the room when we joined.
  useEffect(() => {
    if (sawPeerRef.current) return;
    for (const p of participants.values()) {
      if (!p.local) {
        sawPeerRef.current = true;
        return;
      }
    }
  }, [participants]);

  const gridClass =
    participantIds.length <= 1
      ? 'grid-cols-1 max-w-3xl mx-auto'
      : participantIds.length === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : participantIds.length <= 4
          ? 'grid-cols-1 sm:grid-cols-2'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const handleToggleShare = useCallback(async () => {
    try {
      // Browsers throw if `getDisplayMedia` is denied / cancelled (the user
      // closed the picker). The SDK turns that into an unhandled rejection,
      // so we swallow it here.
      await Promise.resolve(toggleScreenShare());
    } catch (err) {
      console.warn('[VideoSDK] toggleScreenShare', err);
    }
  }, [toggleScreenShare]);

  // Rendering layout: when someone is presenting, give the share the main
  // stage and demote camera tiles to a smaller filmstrip.
  const showPresenter = Boolean(presenterId);

  const hangUp = () => {
    setShowLeaveMenu(false);
    notifyPeersEndCall(false);
    setLastEnded({
      meetingId,
      reason: 'left_by_me',
    });
    if (sdkJoinedRef.current) {
      safeLeave();
    } else {
      setActiveSession(null);
    }
  };

  const endForEveryone = () => {
    setShowLeaveMenu(false);
    if (peerIds.length === 0) {
      hangUp();
      return;
    }
    everyoneLeftTriggeredRef.current = true;
    notifyPeersEndCall(true);
    setLastEnded({
      meetingId,
      reason: 'ended_for_everyone',
    });
    if (sdkJoinedRef.current) {
      safeLeave();
    } else {
      setActiveSession(null);
    }
  };

  const reconnecting =
    isMeetingJoined &&
    (connState === 'DISCONNECTED' || connState === 'CONNECTING');

  return (
    <div className="relative flex h-[100dvh] flex-col bg-[#0b0d10] text-white">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4 sm:py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.CHAT)}
            title="Back to chat (call keeps running)"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Back to chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-white/45 sm:text-[0.65rem]">
              {isGroupCall ? 'Group meeting' : 'Meeting'}
            </p>
            <p className="hidden truncate font-mono text-xs text-white/75 sm:block md:text-sm">
              {meetingId.slice(0, 12)}…{meetingId.slice(-6)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm tabular-nums text-white/80 sm:gap-4">
          <span className="hidden md:inline">
            {participantIds.length}{' '}
            {participantIds.length === 1 ? 'participant' : 'participants'}
          </span>
          <span className="inline md:hidden" aria-label="participants" title="participants">
            {participantIds.length}p
          </span>
          <MeetingDuration />
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-y-auto p-2 sm:p-3 md:p-4">
        <CallNotices toasts={toasts} reconnecting={reconnecting} />

        {!isMeetingJoined ? (
          <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 text-center text-white/70">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-sm">Joining meeting…</p>
          </div>
        ) : participantIds.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-white/60">
            Waiting for participants…
          </div>
        ) : showPresenter && presenterId ? (
          <div className="flex h-full min-h-[55vh] flex-col gap-2 sm:gap-3">
            <div className="min-h-0 flex-1">
              <ScreenShareTile participantId={presenterId} />
            </div>
            <div className="flex shrink-0 gap-2 overflow-x-auto pb-1 sm:gap-3">
              {participantIds.map((id) => (
                <div
                  key={id}
                  className="h-20 w-28 shrink-0 sm:h-24 sm:w-36 md:h-28 md:w-44 lg:h-32 lg:w-48"
                >
                  <ParticipantMediaTile
                    participantId={id}
                    isSpeaking={activeSpeakerId === id}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`grid gap-2 sm:gap-3 ${gridClass}`}>
            {participantIds.map((id) => (
              <ParticipantMediaTile
                key={id}
                participantId={id}
                isSpeaking={activeSpeakerId === id}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="shrink-0 border-t border-white/10 bg-[#12151a]/95 px-3 py-3 backdrop-blur-md sm:px-4 sm:py-4 md:px-8">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4">
          <button
            type="button"
            onClick={() => toggleMic()}
            title={localMicOn ? 'Mute' : 'Unmute'}
            className={`flex h-11 w-11 items-center justify-center rounded-full text-lg transition sm:h-12 sm:w-12 md:h-14 md:w-14 ${
              localMicOn
                ? 'bg-white/10 hover:bg-white/15'
                : 'bg-rose-600/90 hover:bg-rose-500'
            }`}
          >
            {localMicOn ? '🎤' : '🔇'}
          </button>
          <button
            type="button"
            onClick={() => toggleWebcam()}
            title={localWebcamOn ? 'Camera off' : 'Camera on'}
            className={`flex h-11 w-11 items-center justify-center rounded-full text-lg transition sm:h-12 sm:w-12 md:h-14 md:w-14 ${
              localWebcamOn
                ? 'bg-white/10 hover:bg-white/15'
                : 'bg-rose-600/90 hover:bg-rose-500'
            }`}
          >
            {localWebcamOn ? '📹' : '📷'}
          </button>
          <button
            type="button"
            onClick={handleToggleShare}
            title={localScreenShareOn ? 'Stop sharing' : 'Share screen'}
            aria-pressed={localScreenShareOn}
            disabled={!isMeetingJoined}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition sm:h-12 sm:w-12 md:h-14 md:w-14 disabled:opacity-40 ${
              localScreenShareOn
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/40'
                : 'bg-white/10 hover:bg-white/15'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <rect width="20" height="14" x="2" y="3" rx="2" />
              <line x1="8" x2="16" y1="21" y2="21" />
              <line x1="12" x2="12" y1="17" y2="21" />
            </svg>
          </button>

          {isGroupCall ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLeaveMenu((v) => !v)}
                title="Leave call"
                className="flex h-11 items-center gap-2 rounded-2xl bg-rose-600 px-3 text-sm font-semibold shadow-lg shadow-rose-900/40 transition hover:bg-rose-500 sm:h-12 sm:px-4 md:h-14 md:px-5"
                aria-haspopup="menu"
                aria-expanded={showLeaveMenu}
              >
                Leave
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {showLeaveMenu && (
                <div
                  className="absolute bottom-[calc(100%+0.5rem)] right-0 z-40 w-[min(15rem,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-[#1b1f25] p-1.5 text-sm shadow-2xl shadow-black/60"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={hangUp}
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-white/85 transition hover:bg-white/10"
                    role="menuitem"
                  >
                    Leave call
                    <span className="block text-[0.7rem] text-white/50">
                      Others stay in the meeting
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={endForEveryone}
                    className="block w-full rounded-xl px-3 py-2.5 text-left text-rose-300 transition hover:bg-rose-500/10"
                    role="menuitem"
                  >
                    End call for everyone
                    <span className="block text-[0.7rem] text-rose-200/60">
                      Removes all participants
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={hangUp}
              title="Leave call"
              className="flex h-11 w-14 items-center justify-center rounded-2xl bg-rose-600 text-sm font-semibold shadow-lg shadow-rose-900/40 transition hover:bg-rose-500 sm:h-12 sm:w-16 md:h-14 md:w-20"
            >
              Leave
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
