/** OpenAI `omni-moderation-latest` category keys (see prompt/backend/ai/OPENAI_MODERATION.md). */
export const MODERATION_CATEGORIES = [
  'sexual',
  'sexual/minors',
  'harassment',
  'harassment/threatening',
  'hate',
  'hate/threatening',
  'illicit',
  'illicit/violent',
  'self-harm',
  'self-harm/intent',
  'self-harm/instructions',
  'violence',
  'violence/graphic',
] as const;

export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];

export type CategoryThresholds = Partial<Record<ModerationCategory, number>>;

export function clampThreshold(value: number): number {
  return Math.min(1, Math.max(0.1, value));
}

export function normalizeCategoryThresholds(
  raw: unknown,
  defaultTemperature: number,
): Record<ModerationCategory, number> {
  const base = clampThreshold(defaultTemperature);
  const input =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const out = {} as Record<ModerationCategory, number>;
  for (const cat of MODERATION_CATEGORIES) {
    const v = input[cat];
    out[cat] =
      typeof v === 'number' && Number.isFinite(v)
        ? clampThreshold(v)
        : base;
  }
  return out;
}
