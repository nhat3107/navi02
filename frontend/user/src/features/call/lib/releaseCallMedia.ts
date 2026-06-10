/** Stop any lingering camera/mic tracks after a call ends. */
export function releaseLocalMediaTracks(): void {
  if (typeof document === 'undefined') return;

  document.querySelectorAll('video, audio').forEach((el) => {
    const media = el as HTMLMediaElement;
    const stream = media.srcObject;
    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          /* already stopped */
        }
      }
    }
    media.srcObject = null;
  });
}
