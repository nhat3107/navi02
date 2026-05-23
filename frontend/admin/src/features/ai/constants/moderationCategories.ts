/** OpenAI omni-moderation category keys — see prompt/backend/ai/OPENAI_MODERATION.md */
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

export type CategoryThresholds = Record<ModerationCategory, number>;

export const MODERATION_CATEGORY_LABELS: Record<ModerationCategory, string> = {
  sexual: 'Sexual',
  'sexual/minors': 'Sexual / minors',
  harassment: 'Harassment',
  'harassment/threatening': 'Harassment / threatening',
  hate: 'Hate',
  'hate/threatening': 'Hate / threatening',
  illicit: 'Illicit',
  'illicit/violent': 'Illicit / violent',
  'self-harm': 'Self-harm',
  'self-harm/intent': 'Self-harm / intent',
  'self-harm/instructions': 'Self-harm / instructions',
  violence: 'Violence',
  'violence/graphic': 'Violence / graphic',
};

export function buildDefaultThresholds(defaultTemp = 0.5): CategoryThresholds {
  const t = defaultTemp;
  return MODERATION_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = t;
      return acc;
    },
    {} as CategoryThresholds,
  );
}

export function mergeCategoryThresholds(
  raw: Partial<CategoryThresholds> | undefined,
  defaultTemp: number,
): CategoryThresholds {
  const base = buildDefaultThresholds(defaultTemp);
  if (!raw) return base;
  for (const cat of MODERATION_CATEGORIES) {
    const v = raw[cat];
    if (typeof v === 'number' && Number.isFinite(v)) {
      base[cat] = Math.min(1, Math.max(0.1, v));
    }
  }
  return base;
}
