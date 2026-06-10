import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeeting } from '@videosdk.live/react-sdk';
import { useCallStore } from '../../features/call/store/call.store';
import { useCallSocket } from '../../features/call/hooks/useCallSocket';
import { CALL_NO_ANSWER_TIMEOUT_MS } from '../../features/call/constants';
import { postCallBroadcast } from '../../features/call/lib/callBroadcast';
import { releaseLocalMediaTracks } from '../../features/call/lib/releaseCallMedia';
import { teardownMeetingMedia } from '../../features/call/lib/meetingLeaveRegistry';
import { ROUTES } from '../../shared/constants/routes';
import { ParticipantMediaTile } from './ParticipantMediaTile';
import { ScreenShareTile } from './ScreenShareTile';
import {
  CamOffIcon,
  CamOnIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  MicOffIcon,
  MicOnIcon,
  PhoneHangupIcon,
  ScreenShareIcon,
  UsersIcon,
} from '../../features/call/components/CallIcons';

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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium tabular-nums text-white/90">
      <span className="call-room__live-dot">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
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
    <div className="pointer-events-none absolute inset-x-2 top-2 z-30 flex flex-col items-center gap-2 sm:inset-x-0">
      {reconnecting && (
        <div className="call-room__notice call-room__notice--warn">
          Reconnecting…
        </div>
      )}
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`call-room__notice ${
            t.tone === 'in' ? 'call-room__notice--in' : 'call-room__notice--out'
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
  const participantsRef = useRef(
    new Map<string, { local?: boolean }>(),
  );

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
        teardownMeetingMedia();
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

      // Group → end only when no remote participants remain (last one in the room).
      window.setTimeout(() => {
        if (everyoneLeftTriggeredRef.current) return;
        const remaining = [...participantsRef.current.values()].filter(
          (part) => !part.local,
        );
        if (remaining.length === 0 && sawPeerRef.current) {
          everyoneLeftTriggeredRef.current = true;
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
      releaseLocalMediaTracks();
      setActiveSession(null);
    },
  });

  leaveRef.current = leave;
  participantsRef.current = participants;

  // Join is handled by CallMeetingJoiner (persists across /call ↔ /chat navigation).
  useEffect(() => {
    if (isMeetingJoined) {
      sdkJoinedRef.current = true;
      setConnState('CONNECTED');
    }
  }, [isMeetingJoined]);

  // Caller gave up waiting — end the ring on callee side after 2 minutes.
  useEffect(() => {
    if (!isMeetingJoined || !meetingId) return;

    const timeoutId = window.setTimeout(() => {
      if (everyoneLeftTriggeredRef.current || autoLeftRef.current) return;
      if (sawPeerRef.current) return;

      everyoneLeftTriggeredRef.current = true;
      notifyPeersEndCall(false);
      setLastEnded({
        meetingId,
        reason: 'rejected',
      });
      safeLeave();
    }, CALL_NO_ANSWER_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    isMeetingJoined,
    meetingId,
    notifyPeersEndCall,
    safeLeave,
    setLastEnded,
  ]);

  // Cross-tab + tab-close hardening.
  useEffect(() => {
    if (!meetingId) return;
    postCallBroadcast({ type: 'active_session_started', meetingId });
    const onUnload = () => {
      const sess = useCallStore.getState().activeSession;
      if (sess && !sess.isGroupCall) {
        notifyPeersEndCall(false);
      }
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

  const participantCount = participantIds.length;
  const isLargeGroup = isGroupCall && participantCount >= 6;
  const isVeryLargeGroup = isGroupCall && participantCount >= 10;

  /**
   * Responsive participant grid:
   * - 1: single centered hero tile
   * - 2: balanced two-up
   * - 3-4: 2x2 style
   * - 5+: progressively denser auto-fit with a hard min width to avoid
   *   overlapping controls on narrow viewports.
   */
  const gridClass =
    participantCount <= 1
      ? 'mx-auto max-w-4xl grid-cols-1'
      : participantCount === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : participantCount <= 4
          ? 'grid-cols-1 sm:grid-cols-2'
          : isVeryLargeGroup
            ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
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
    // 1:1 only — group leavers stay on VideoSDK; peers are not notified via socket.
    if (!isGroupCall) {
      notifyPeersEndCall(false);
    }
    setLastEnded({
      meetingId,
      reason: 'left_by_me',
    });
    if (sdkJoinedRef.current) {
      safeLeave();
    } else {
      teardownMeetingMedia();
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
      teardownMeetingMedia();
      setActiveSession(null);
    }
  };

  const reconnecting =
    isMeetingJoined &&
    (connState === 'DISCONNECTED' || connState === 'CONNECTING');

  const callTitle = useMemo(() => {
    if (isGroupCall) return 'Group call';
    for (const p of participants.values()) {
      if (!p.local) {
        const name = p.displayName?.trim();
        if (name) return name;
      }
    }
    return activeSession?.callType === 'audio' ? 'Audio call' : 'Video call';
  }, [isGroupCall, participants, activeSession?.callType]);

  const callSubtitle = isGroupCall
    ? `${participantIds.length} participant${participantIds.length === 1 ? '' : 's'}`
    : activeSession?.callType === 'audio'
      ? 'Audio only'
      : 'Camera enabled';

  return (
    <div className="call-room">
      <div className="call-room__ambient" aria-hidden />

      <header className="call-room__topbar">
        <div className="call-room__topbar-pill min-w-0">
          <button
            type="button"
            onClick={() => navigate(ROUTES.CHAT)}
            title="Back to chat (call keeps running)"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/80 transition hover:bg-white/15 hover:text-white"
            aria-label="Back to chat"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-white">
                {callTitle}
              </p>
              {isGroupCall ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                  <UsersIcon className="h-3 w-3" />
                  Group
                </span>
              ) : null}
            </div>
            <p className="truncate text-xs text-white/50">{callSubtitle}</p>
          </div>
        </div>

        <div className="call-room__topbar-pill shrink-0">
          <span className="hidden text-xs text-white/60 sm:inline">
            {participantIds.length}{' '}
            {participantIds.length === 1 ? 'person' : 'people'}
          </span>
          <span className="text-white/30 sm:hidden" aria-hidden>
            ·
          </span>
          <MeetingDuration />
        </div>
      </header>

      <main className="call-room__stage">
        <CallNotices toasts={toasts} reconnecting={reconnecting} />

        {!isMeetingJoined ? (
          <div className="call-room__waiting">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <span className="call-room__waiting-ring" aria-hidden />
              <span
                className="call-room__waiting-ring"
                style={{ animationDelay: '0.75s' }}
                aria-hidden
              />
              <span className="relative h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">Joining call…</p>
              <p className="mt-1 text-sm text-white/50">Setting up audio and video</p>
            </div>
          </div>
        ) : participantIds.length === 0 ? (
          <div className="call-room__waiting">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <span className="call-room__waiting-ring" aria-hidden />
              <span
                className="call-room__waiting-ring"
                style={{ animationDelay: '0.75s' }}
                aria-hidden
              />
              <UsersIcon className="relative h-9 w-9 text-emerald-400/90" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">Waiting for others</p>
              <p className="mt-1 text-sm text-white/50">
                They&apos;ll appear here when they join
              </p>
            </div>
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
                  className={`shrink-0 ${
                    isLargeGroup
                      ? 'h-20 w-28 sm:h-22 sm:w-32 md:h-24 md:w-36'
                      : 'h-20 w-28 sm:h-24 sm:w-36 md:h-28 md:w-44 lg:h-32 lg:w-48'
                  }`}
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
          <div
            className={`grid h-full overflow-y-auto pr-0.5 ${
              isLargeGroup ? 'gap-2' : 'gap-2 sm:gap-3'
            } ${gridClass}`}
          >
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

      <div className="call-room__dock-wrap">
        <div className="call-room__dock">
          <button
            type="button"
            onClick={() => toggleMic()}
            title={localMicOn ? 'Mute' : 'Unmute'}
            aria-pressed={localMicOn}
            className={`call-room__ctrl ${localMicOn ? 'call-room__ctrl--idle' : 'call-room__ctrl--off'}`}
          >
            {localMicOn ? (
              <MicOnIcon className="h-5 w-5" />
            ) : (
              <MicOffIcon className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => toggleWebcam()}
            title={localWebcamOn ? 'Camera off' : 'Camera on'}
            aria-pressed={localWebcamOn}
            className={`call-room__ctrl ${localWebcamOn ? 'call-room__ctrl--idle' : 'call-room__ctrl--off'}`}
          >
            {localWebcamOn ? (
              <CamOnIcon className="h-5 w-5" />
            ) : (
              <CamOffIcon className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={handleToggleShare}
            title={localScreenShareOn ? 'Stop sharing' : 'Share screen'}
            aria-pressed={localScreenShareOn}
            disabled={!isMeetingJoined}
            className={`call-room__ctrl ${
              localScreenShareOn ? 'call-room__ctrl--active' : 'call-room__ctrl--idle'
            }`}
          >
            <ScreenShareIcon className="h-5 w-5" />
          </button>

          {isGroupCall ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLeaveMenu((v) => !v)}
                title="Leave call"
                className="call-room__ctrl call-room__ctrl--danger flex items-center"
                aria-haspopup="menu"
                aria-expanded={showLeaveMenu}
              >
                <PhoneHangupIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Leave</span>
                <ChevronDownIcon className="h-4 w-4 opacity-80" />
              </button>
              {showLeaveMenu && (
                <div className="call-room__leave-menu" role="menu">
                  <button
                    type="button"
                    onClick={hangUp}
                    className="call-room__leave-item text-white/90"
                    role="menuitem"
                  >
                    Leave call
                    <span className="block text-[0.7rem] text-white/45">
                      Others stay in the meeting
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={endForEveryone}
                    className="call-room__leave-item text-rose-300 hover:bg-rose-500/10"
                    role="menuitem"
                  >
                    End for everyone
                    <span className="block text-[0.7rem] text-rose-200/55">
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
              className="call-room__ctrl call-room__ctrl--danger flex items-center gap-2"
            >
              <PhoneHangupIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
