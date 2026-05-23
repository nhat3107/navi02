import { create } from 'zustand';
import type { CallType, IncomingCallPayload } from '../types/call.types';

export type ActiveCallSession = {
  meetingId: string;
  token: string;
  callType: CallType;
  displayName: string;
  /** User ids to signal on `end_call` (everyone else in the call). */
  signalPeerIds: string[];
  /** Group call vs 1:1 — drives "End for everyone" UI + auto-end logic. */
  isGroupCall: boolean;
};

/** Why the most-recent call ended — drives the post-call ended screen copy. */
export type CallEndedInfo = {
  meetingId: string;
  /** Local user id that triggered the end (or remote sender). Optional. */
  endedBy?: string;
  /** True when ended via "End call for everyone". */
  forEveryone?: boolean;
  /** Coarse classification for the UI label. */
  reason:
    | 'left_by_me'
    | 'ended_by_remote'
    | 'ended_for_everyone'
    | 'rejected'
    | 'all_left'
    | 'connection_failed';
};

type CallStore = {
  incoming: IncomingCallPayload | null;
  setIncoming: (p: IncomingCallPayload | null) => void;
  activeSession: ActiveCallSession | null;
  setActiveSession: (s: ActiveCallSession | null) => void;
  /**
   * Meeting id currently being handled in *another tab* of the same user.
   * Used to suppress duplicate incoming banners / prevent a second join when
   * another tab has already accepted or started the call.
   */
  remoteActiveMeetingId: string | null;
  setRemoteActiveMeetingId: (id: string | null) => void;
  /**
   * Last call's end state — kept around briefly so the call UI can show a
   * "Call ended" screen (with reason) before unmounting.
   */
  lastEnded: CallEndedInfo | null;
  setLastEnded: (info: CallEndedInfo | null) => void;
};

export const useCallStore = create<CallStore>((set) => ({
  incoming: null,
  setIncoming: (p) => set({ incoming: p }),
  activeSession: null,
  setActiveSession: (s) => set({ activeSession: s }),
  remoteActiveMeetingId: null,
  setRemoteActiveMeetingId: (id) => set({ remoteActiveMeetingId: id }),
  lastEnded: null,
  setLastEnded: (info) => set({ lastEnded: info }),
}));
