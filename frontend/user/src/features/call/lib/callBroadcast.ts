/**
 * Cross-tab call sync for a single user using the BroadcastChannel API.
 *
 * Why: every tab opens its own socket connection, so the server already
 * fans `incoming_call` out to all of a user's tabs. But each tab then holds
 * its own local store; without a bridge, dismissing an incoming banner in
 * one tab leaves the other tabs still showing it, and both tabs could
 * independently try to join the same meeting.
 *
 * Messages are intentionally small / stateless — they describe *events*,
 * not full state — so a late-arriving tab never sees stale data.
 */

export type CallBroadcastMessage =
  /** A tab accepted, declined, or otherwise dismissed an incoming call. */
  | { type: 'incoming_cleared'; meetingId: string }
  /** A tab has entered (joined) a call — other tabs should suppress duplicate UI. */
  | { type: 'active_session_started'; meetingId: string }
  /** A tab has left its active call. */
  | { type: 'active_session_ended'; meetingId: string };

const CHANNEL_NAME = 'navi-calls';
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      channel = null;
    }
  }
  return channel;
}

export function postCallBroadcast(msg: CallBroadcastMessage): void {
  try {
    getChannel()?.postMessage(msg);
  } catch {
    /* broadcast is best-effort; do not break the app if the API hiccups */
  }
}

export function subscribeCallBroadcast(
  handler: (msg: CallBroadcastMessage) => void,
): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const listener = (ev: MessageEvent<CallBroadcastMessage>) => {
    if (ev.data && typeof ev.data === 'object' && 'type' in ev.data) {
      handler(ev.data as CallBroadcastMessage);
    }
  };
  ch.addEventListener('message', listener);
  return () => ch.removeEventListener('message', listener);
}
