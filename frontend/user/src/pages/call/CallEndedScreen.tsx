import { useCallback, useEffect, useState } from 'react';
import type { CallEndedInfo } from '../../features/call/store/call.store';
import { useCallStore } from '../../features/call/store/call.store';
import { reloadToChat } from '../../features/call/lib/callMediaCleanup';
import { ROUTES } from '../../shared/constants/routes';
import { PhoneHangupIcon } from '../../features/call/components/CallIcons';

function endedVisual(reason: CallEndedInfo['reason']) {
  switch (reason) {
    case 'rejected':
      return {
        tone: 'text-amber-300',
        bg: 'bg-amber-500/15 ring-amber-400/20',
        label: 'Declined',
      };
    case 'connection_failed':
      return {
        tone: 'text-red-300',
        bg: 'bg-red-500/15 ring-red-400/20',
        label: 'Disconnected',
      };
    case 'ended_for_everyone':
    case 'all_left':
    case 'ended_by_remote':
      return {
        tone: 'text-slate-200',
        bg: 'bg-white/10 ring-white/10',
        label: 'Ended',
      };
    default:
      return {
        tone: 'text-emerald-300',
        bg: 'bg-emerald-500/15 ring-emerald-400/20',
        label: 'Left',
      };
  }
}

/**
 * Brief post-call confirmation, then bounce back to /chat.
 */
export function CallEndedScreen({ info }: { info: CallEndedInfo }) {
  const setLastEnded = useCallStore((s) => s.setLastEnded);
  const [seconds, setSeconds] = useState(3);
  const visual = endedVisual(info.reason);

  const returnToChat = useCallback(() => {
    setLastEnded(null);
    reloadToChat(ROUTES.CHAT);
  }, [setLastEnded]);

  useEffect(() => {
    const tick = window.setInterval(
      () => setSeconds((s) => Math.max(0, s - 1)),
      1000,
    );
    const done = window.setTimeout(returnToChat, 3000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [info.meetingId, returnToChat]);

  const heading = (() => {
    switch (info.reason) {
      case 'rejected':
        return 'Call declined';
      case 'ended_for_everyone':
        return 'Call ended for everyone';
      case 'all_left':
        return 'Everyone left the call';
      case 'connection_failed':
        return 'Connection lost';
      case 'ended_by_remote':
        return 'Call ended';
      case 'left_by_me':
      default:
        return 'You left the call';
    }
  })();

  const subline = (() => {
    switch (info.reason) {
      case 'rejected':
        return 'The other party didn’t pick up.';
      case 'ended_for_everyone':
        return info.endedBy
          ? 'A participant ended the call for everyone.'
          : 'The host ended the call for everyone.';
      case 'all_left':
        return 'You were the last person on the call.';
      case 'connection_failed':
        return 'We couldn’t recover the connection. Try again in a moment.';
      case 'ended_by_remote':
        return 'The other party hung up.';
      case 'left_by_me':
      default:
        return 'Returning you to chat.';
    }
  })();

  const handleReturn = () => returnToChat();

  return (
    <div className="call-room__ended">
      <div className="call-room__ambient" aria-hidden />
      <div className="call-room__ended-card relative">
        <div
          className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ring-1 ${visual.bg}`}
        >
          <PhoneHangupIcon className={`h-8 w-8 ${visual.tone}`} />
        </div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
          {visual.label}
        </p>
        <h1 className="text-xl font-bold tracking-tight text-white">{heading}</h1>
        {subline ? (
          <p className="mt-2 text-sm leading-relaxed text-white/55">{subline}</p>
        ) : null}
        <button
          type="button"
          onClick={handleReturn}
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          Back to chat
          <span className="ml-2 font-mono text-xs tabular-nums text-white/50">
            {seconds}s
          </span>
        </button>
      </div>
    </div>
  );
}
