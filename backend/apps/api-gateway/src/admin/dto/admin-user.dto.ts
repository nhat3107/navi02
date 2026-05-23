export class BlockUserDto {
  /** ISO timestamp — overrides blockDays when set. */
  blockedUntil?: string;
  /** Block duration in days (default 7). */
  blockDays?: number;
}

export class UpdateAiConfigDto {
  enabled?: boolean;
  temperature?: number;
  categoryThresholds?: Record<string, number>;
}

export class CreateAdminUserDto {
  email: string;
  password: string;
}
