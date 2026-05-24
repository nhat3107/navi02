import { memo, useEffect, useRef } from 'react';
import { useParticipant } from '@videosdk.live/react-sdk';
import { ScreenShareIcon } from '../../features/call/components/CallIcons';

/**
 * Renders the active presenter's screen share + optional share-audio.
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
    <div className="relative flex h-full min-h-[240px] flex-col overflow-hidden rounded-[1.25rem] bg-black shadow-[0_12px_40px_-12px_rgba(0,0,0,0.65)] ring-1 ring-emerald-400/25">
      <video
        ref={videoRef}
        autoPlay
        playsInline
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
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/90 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-white shadow-lg backdrop-blur-sm">
        <ScreenShareIcon className="h-3.5 w-3.5" />
        <span>
          {isLocal ? 'You are sharing' : `${displayName || 'Participant'} is sharing`}
        </span>
      </div>
    </div>
  );
});
