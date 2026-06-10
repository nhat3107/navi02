import type { IncomingCallPayload } from '../types/call.types';

/** All user ids to notify on `end_call`, excluding the local user. */
export function buildIncomingSignalPeerIds(
  incoming: IncomingCallPayload,
  myUserId: string,
): string[] {
  const peers = new Set<string>();
  if (incoming.from && incoming.from !== myUserId) {
    peers.add(incoming.from);
  }
  if (incoming.peerUserIds) {
    for (const id of incoming.peerUserIds) {
      if (id && id !== myUserId) peers.add(id);
    }
  }
  return [...peers];
}
