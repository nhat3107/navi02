import { memo, useEffect, useRef } from 'react';
import { useParticipant } from '@videosdk.live/react-sdk';

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
 *
 * `isSpeaking` (driven by the meeting-level `activeSpeakerId`) glows the
 * frame so it's obvious who's making a sound right now — even if their mic
 * icon is small or off-screen in a busy grid.
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

  // Treat as speaking only when the mic is actually broadcasting audio —
  // avoids a visual glitch where the SDK briefly reports a recently-muted
  // participant as the active speaker (their last syllable is still in
  // flight). `isSpeaking && micOn` is the exact "is making a sound right
  // now" signal we want for the frame highlight.
  const speakingNow = isSpeaking && micOn;

  return (
    <div
      className={`relative flex aspect-video h-full w-full flex-col overflow-hidden rounded-2xl bg-zinc-900/90 transition-shadow duration-150 ${
        speakingNow
          ? 'ring-2 ring-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]'
          : 'ring-1 ring-white/10'
      }`}
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
        <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-white transition-colors duration-150 sm:h-16 sm:w-16 sm:text-xl md:h-20 md:w-20 md:text-2xl ${
              speakingNow ? 'bg-emerald-600' : 'bg-zinc-700'
            }`}
          >
            {initials(name)}
          </span>
        </div>
      )}
      <audio ref={audioRef} autoPlay playsInline muted={isLocal} className="hidden" />
      <div className="pointer-events-none absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1.5 sm:bottom-2 sm:left-2 sm:right-2">
        <span className="flex max-w-[72%] items-center gap-1 truncate rounded-lg bg-black/55 px-1.5 py-0.5 text-[0.62rem] font-medium text-white backdrop-blur-sm sm:gap-1.5 sm:px-2 sm:py-1 sm:text-xs">
          {speakingNow && (
            <span
              aria-hidden="true"
              className="inline-flex h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400"
            />
          )}
          <span className="truncate">{isLocal ? 'You' : name}</span>
        </span>
        {!isLocal && (
          <span className="hidden shrink-0 rounded bg-black/45 px-1.5 py-0.5 text-[0.62rem] text-white/80 sm:inline">
            {webcamOn ? 'Cam on' : 'Cam off'}
          </span>
        )}
      </div>
    </div>
  );
});
