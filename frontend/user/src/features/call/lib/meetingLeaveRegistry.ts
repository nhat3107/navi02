import { releaseLocalMediaTracks } from './releaseCallMedia';

let leaveMeetingFn: (() => void) | null = null;

export function registerMeetingLeave(fn: () => void): void {
  leaveMeetingFn = fn;
}

export function unregisterMeetingLeave(): void {
  leaveMeetingFn = null;
}

/** Leave the VideoSDK room while `MeetingProvider` is still mounted. */
export function requestMeetingLeave(): void {
  try {
    leaveMeetingFn?.();
  } catch {
    /* SDK may already be tearing down */
  }
}

export function teardownMeetingMedia(): void {
  requestMeetingLeave();
  releaseLocalMediaTracks();
}
