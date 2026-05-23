export type ViolationLevel = 'clean' | 'warning' | 'restricted' | 'severe';

export interface AccountStatus {
  violationCount: number;
  violationLevel: ViolationLevel;
  isAccountBlocked: boolean;
  isPostBlocked: boolean;
  canPost: boolean;
  block_until: string | null;
  postBlockUntil: string | null;
  summaryMessage: string;
}

export interface AccountStatusResponse {
  data: AccountStatus;
}
