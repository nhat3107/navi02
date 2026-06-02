import { memo, useEffect, useRef } from 'react';
import { useParticipant } from '@videosdk.live/react-sdk';
import { MicOffIcon } from '../../features/call/components/CallIcons';

function initials(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  const p = t.split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

/**
 * Renders webcam + mic with native elements (SDK VideoPlayer spams play() AbortError
 * when parent re-renders / HMR). Tracks attached via MediaStream like official quickstart.
 */
export const ParticipantMediaTile = memo(function ParticipantMediaTile({
  participantId,
  isSpeaking = false,
}: {
  participantId: string;
  isSpeaking?: boolean;
}) {
  const {
    displayName,
    webcamOn,
    micOn,
    isLocal,
    webcamStream,
    micStream,
  } = useParticipant(participantId);
  const name = displayName || 'Participant';
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!webcamOn || !webcamStream?.track) {
      el.srcObject = null;
      return;
    }
    const ms = new MediaStream();
    ms.addTrack(webcamStream.track);
    el.srcObject = ms;
    void el.play().catch(() => {
      /* benign: interrupted by track swap / strict mode / HMR */
    });
    return () => {
      el.srcObject = null;
    };
  }, [webcamOn, webcamStream?.track]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!micOn || !micStream?.track) {
      el.srcObject = null;
      return;
    }
    const ms = new MediaStream();
    ms.addTrack(micStream.track);
    el.srcObject = ms;
    void el.play().catch(() => {});
    return () => {
      el.srcObject = null;
    };
  }, [micOn, micStream?.track]);

  const speakingNow = isSpeaking && micOn;

  return (
    <div
      className={`call-room__tile ${speakingNow ? 'call-room__tile--speaking' : ''}`}
      data-speaking={speakingNow ? 'true' : 'false'}
    >
      {webcamOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="h-full w-full flex-1 object-cover"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-[#07090d]">
          <span
            className={`call-room__tile-avatar transition-colors duration-200 ${
              speakingNow
                ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                : 'bg-slate-700/90'
            }`}
          >
            {initials(name)}
          </span>
        </div>
      )}
      <audio ref={audioRef} autoPlay playsInline muted={isLocal} className="hidden" />

      {!micOn ? (
        <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
          <MicOffIcon className="h-4 w-4" />
        </span>
      ) : null}

      <div className="call-room__tile-meta">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-white">
          {speakingNow ? (
            <span
              aria-hidden="true"
              className="inline-flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400"
            />
          ) : null}
          <span className="truncate">{isLocal ? 'You' : name}</span>
        </span>
      </div>
    </div>
  );
});
