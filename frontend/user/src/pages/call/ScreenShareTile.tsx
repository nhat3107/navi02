import { memo, useEffect, useRef } from 'react';
import { useParticipant } from '@videosdk.live/react-sdk';

/**
 * Renders the active presenter's screen share + optional share-audio.
 *
 * Why native `<video>` instead of the SDK's VideoPlayer: the SDK component
 * re-attempts `play()` on every parent re-render, which fires AbortError under
 * Vite HMR and StrictMode (we already hit this with webcam tiles). Reusing the
 * same MediaStream-attach pattern keeps screen share solid.
 */
export const ScreenShareTile = memo(function ScreenShareTile({
  participantId,
}: {
  participantId: string;
}) {
  const {
    displayName,
    isLocal,
    screenShareOn,
    screenShareStream,
    screenShareAudioOn,
    screenShareAudioStream,
  } = useParticipant(participantId) as {
    displayName: string;
    isLocal: boolean;
    screenShareOn: boolean;
    screenShareStream?: { track?: MediaStreamTrack | null } | null;
    screenShareAudioOn: boolean;
    screenShareAudioStream?: { track?: MediaStreamTrack | null } | null;
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!screenShareOn || !screenShareStream?.track) {
      el.srcObject = null;
      return;
    }
    const ms = new MediaStream();
    ms.addTrack(screenShareStream.track);
    el.srcObject = ms;
    void el.play().catch(() => {
      /* benign: parent re-rendered mid-attach */
    });
    return () => {
      el.srcObject = null;
    };
  }, [screenShareOn, screenShareStream?.track]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!screenShareAudioOn || !screenShareAudioStream?.track) {
      el.srcObject = null;
      return;
    }
    const ms = new MediaStream();
    ms.addTrack(screenShareAudioStream.track);
    el.srcObject = ms;
    void el.play().catch(() => {});
    return () => {
      el.srcObject = null;
    };
  }, [screenShareAudioOn, screenShareAudioStream?.track]);

  if (!screenShareOn) return null;

  return (
    <div className="relative flex h-full min-h-[240px] flex-col overflow-hidden rounded-2xl bg-black ring-1 ring-emerald-500/30">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        // Local presenter must be muted: the same audio is already coming
        // out of their speakers, so unmuting here causes a feedback loop.
        muted={isLocal}
        className="h-full w-full bg-black object-contain"
      />
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="hidden"
      />
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-emerald-600/90 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-white shadow-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </svg>
        <span>
          {isLocal ? 'You are sharing' : `${displayName || 'Participant'} is sharing`}
        </span>
      </div>
    </div>
  );
});
