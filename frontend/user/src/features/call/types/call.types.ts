export type CallType = 'audio' | 'video';

/** Server → callee(s) */
export type IncomingCallPayload = {
  from: string;
  meetingId: string;
  conversationId?: string;
  callType: CallType;
  isGroupCall: boolean;
  callerName?: string;
  /** Group calls: other invited user ids (for `end_call` fan-out). */
  peerUserIds?: string[];
};

export type CallEndedPayload = {
  meetingId: string;
  endedBy: string;
  /**
   * `true` when the sender used the "End call for everyone" action (group
   * calls). Receivers should leave immediately and surface a stronger
   * "Call ended by X" message instead of the soft "Other party left".
   */
  forEveryone?: boolean;
};

export type CallAcceptedPayload = {
  from: string;
  meetingId: string;
};

export type CallRejectedPayload = {
  from: string;
  meetingId: string;
};
