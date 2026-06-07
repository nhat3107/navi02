import { getWsOrigin } from '../utils/runtime-config';

/** WebSocket origin (gateway) — same logic as chat socket. */
export function wsOriginFromEnv(): string {
  return getWsOrigin();
}
