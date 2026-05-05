import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CallEndedInfo } from '../../features/call/store/call.store';
import { useCallStore } from '../../features/call/store/call.store';
import { ROUTES } from '../../shared/constants/routes';

/**
 * Brief post-call confirmation, then bounce back to /chat. Lives inside
 * `CallRoomPage` so it can reuse the dark, full-screen call layout for a
 * smooth visual transition (CALL_OPTIMIZATION.md §5).
 */
export function CallEndedScreen({ info }: { info: CallEndedInfo }) {
  const navigate = useNavigate();
  const setLastEnded = useCallStore((s) => s.setLastEnded);
  const [seconds, setSeconds] = useState(3);

  useEffect(() => {
    const tick = window.setInterval(
      () => setSeconds((s) => Math.max(0, s - 1)),
      1000,
    );
    const done = window.setTimeout(() => {
      setLastEnded(null);
      navigate(ROUTES.CHAT, { replace: true });
    }, 3000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [info.meetingId, navigate, setLastEnded]);

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
        return null;
    }
  })();

  const handleReturn = () => {
    setLastEnded(null);
    navigate(ROUTES.CHAT, { replace: true });
  };

  return (
    <div className="flex h-[100dvh] items-center justify-center bg-[#0b0d10] text-white">
      <div className="flex max-w-sm flex-col items-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-white/80"
            aria-hidden="true"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">{heading}</h1>
        {subline && <p className="text-sm text-white/60">{subline}</p>}
        <button
          type="button"
          onClick={handleReturn}
          className="mt-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
        >
          Back to chat ({seconds})
        </button>
      </div>
    </div>
  );
}
