/** Stop every local MediaStream track attached to DOM media elements. */
export function releaseCallMedia(): void {
  try {
    document.querySelectorAll('video, audio').forEach((el) => {
      const media = el as HTMLMediaElement;
      const stream = media.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            /* already stopped */
          }
        });
        media.srcObject = null;
      }
    });
  } catch {
    /* DOM may be unavailable */
  }
}

/** Full navigation reload — releases camera/mic permissions cleanly. */
export function reloadToChat(chatPath: string): void {
  releaseCallMedia();
  window.location.assign(chatPath);
}
