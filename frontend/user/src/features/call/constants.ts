/** How long an incoming call rings before auto-decline (callee). */
export const CALL_RING_TIMEOUT_MS = 2 * 60 * 1000;

/** Same limit for callers waiting alone in the room (no answer). */
export const CALL_NO_ANSWER_TIMEOUT_MS = CALL_RING_TIMEOUT_MS;
