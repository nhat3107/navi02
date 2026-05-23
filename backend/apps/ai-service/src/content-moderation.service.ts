import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import { APIError } from 'openai';
import type { ModerationMultiModalInput } from 'openai/resources/moderations';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { OPENAI_CLIENT } from './openai.provider';
import {
  MODERATION_CATEGORIES,
  normalizeCategoryThresholds,
  type ModerationCategory,
} from './moderation-categories';

export type ModerationStatus = 'safe' | 'harmful';

type ModerationInputItem = ModerationMultiModalInput;

/** Matches post composer `NetworkMediaPicker` default (`maxFiles = 8`). */
const MAX_MEDIA_ITEMS = 8;
/** OpenAI omni-moderation allows at most one image per API request. */
const MAX_IMAGES_PER_REQUEST = 1;
const MODERATION_MODEL = 'omni-moderation-latest' as const;
const AI_CONFIG_RPC = 'auth.get_ai_moderation_config';
const CONFIG_CACHE_MS = 15_000;

type ModerationConfig = {
  enabled: boolean;
  temperature: number;
  categoryThresholds: Record<ModerationCategory, number>;
};

type OpenAiModerationSlice = {
  flagged: boolean;
  categories: Partial<Record<ModerationCategory, boolean>>;
  category_scores: Partial<Record<ModerationCategory, number>>;
};

@Injectable()
export class ContentModerationService implements OnModuleInit {
  private readonly logger = new Logger(ContentModerationService.name);
  private configCache: { value: ModerationConfig; at: number } | null = null;

  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI | null,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  onModuleInit() {
    this.kafkaClient.subscribeToResponseOf(AI_CONFIG_RPC);
  }

  /**
   * OpenAI Moderation API (text + images). Per-category score thresholds
   * match `category_scores` keys from omni-moderation (see OPENAI_MODERATION.md).
   * Lower threshold = stricter for that attribute.
   */
  async analyze(text: string, imageUrls: string[]): Promise<ModerationStatus> {
    const config = await this.getModerationConfig();
    if (!config.enabled) {
      this.logger.log('AI moderation disabled by admin config — treating as safe');
      return 'safe';
    }

    const input = this.buildModerationInput(text, imageUrls);
    if (input.length === 0) {
      this.logger.log('Moderation skipped: no text or moderatable media');
      return 'safe';
    }

    if (!this.openai) {
      this.logger.error(
        'OPENAI_API_KEY is not set — cannot moderate (check apps/ai-service/.env)',
      );
      return 'safe';
    }

    const imageCount = input.filter((i) => i.type === 'image_url').length;
    const requests = this.splitModerationRequests(input);
    this.logger.log(
      `Moderation request: text=${input.some((i) => i.type === 'text')}, images=${imageCount}, parallelCalls=${requests.length}, defaultThreshold=${config.temperature}`,
    );

    try {
      const settled = await Promise.allSettled(
        requests.map((batch, index) =>
          this.openAiModeration(batch, this.requestLabel(batch, index)),
        ),
      );

      const merged: OpenAiModerationSlice = {
        flagged: false,
        categories: {},
        category_scores: {},
      };
      let failures = 0;
      for (const outcome of settled) {
        if (outcome.status === 'fulfilled') {
          merged.flagged = merged.flagged || outcome.value.flagged;
          for (const cat of MODERATION_CATEGORIES) {
            merged.categories[cat] =
              merged.categories[cat] || outcome.value.categories[cat];
            const prev = merged.category_scores[cat] ?? 0;
            const next = outcome.value.category_scores[cat] ?? 0;
            merged.category_scores[cat] = Math.max(prev, next);
          }
        } else {
          failures++;
          this.logger.error('Moderation sub-request failed', outcome.reason);
        }
      }

      if (failures > 0 && failures === requests.length) {
        throw new Error(
          `All ${requests.length} moderation sub-request(s) failed`,
        );
      }

      const { harmful, reason } = this.evaluateAgainstThresholds(
        merged,
        config.categoryThresholds,
      );
      const status: ModerationStatus = harmful ? 'harmful' : 'safe';
      this.logger.log(
        `Moderation decision: ${status} (openAiFlagged=${merged.flagged}, reason=${reason ?? 'none'}, ${requests.length - failures}/${requests.length} calls ok)`,
      );
      return status;
    } catch (err) {
      this.logger.error('OpenAI moderation request failed', err);
      return 'safe';
    }
  }

  private async getModerationConfig(): Promise<ModerationConfig> {
    const now = Date.now();
    if (
      this.configCache &&
      now - this.configCache.at < CONFIG_CACHE_MS
    ) {
      return this.configCache.value;
    }

    try {
      const res = (await firstValueFrom(
        this.kafkaClient.send<{
          enabled?: boolean;
          temperature?: number;
          categoryThresholds?: Record<string, number>;
        }>(AI_CONFIG_RPC, {}),
      )) as {
        enabled?: boolean;
        temperature?: number;
        categoryThresholds?: Record<string, number>;
      };

      const temperature =
        typeof res?.temperature === 'number'
          ? Math.min(1, Math.max(0.1, res.temperature))
          : 0.5;

      const value: ModerationConfig = {
        enabled: res?.enabled !== false,
        temperature,
        categoryThresholds: normalizeCategoryThresholds(
          res?.categoryThresholds,
          temperature,
        ),
      };
      this.configCache = { value, at: now };
      return value;
    } catch (err) {
      this.logger.warn(
        'Could not load AI moderation config — using defaults',
        err,
      );
      return {
        enabled: true,
        temperature: 0.5,
        categoryThresholds: normalizeCategoryThresholds({}, 0.5),
      };
    }
  }

  /** Compare OpenAI category flags/scores against admin per-attribute thresholds. */
  private evaluateAgainstThresholds(
    slice: OpenAiModerationSlice,
    thresholds: Record<ModerationCategory, number>,
  ): { harmful: boolean; reason?: string } {
    if (slice.flagged) {
      for (const cat of MODERATION_CATEGORIES) {
        if (slice.categories[cat]) {
          return { harmful: true, reason: `${cat} flagged by OpenAI` };
        }
      }
      return { harmful: true, reason: 'flagged by OpenAI' };
    }

    for (const cat of MODERATION_CATEGORIES) {
      const score = slice.category_scores[cat] ?? 0;
      const threshold = thresholds[cat];
      if (score >= threshold) {
        return {
          harmful: true,
          reason: `${cat} score ${score.toFixed(3)} >= ${threshold}`,
        };
      }
    }
    return { harmful: false };
  }

  private buildModerationInput(
    text: string,
    imageUrls: string[],
  ): ModerationInputItem[] {
    const items: ModerationInputItem[] = [];
    const normalizedText = text.trim();
    if (normalizedText) {
      items.push({ type: 'text', text: normalizedText });
    }

    const media = this.normalizeMediaUrls(imageUrls);
    if (imageUrls.length > MAX_MEDIA_ITEMS) {
      this.logger.warn(
        `Post has ${imageUrls.length} media URL(s); moderating first ${MAX_MEDIA_ITEMS} only`,
      );
    }
    if (imageUrls.length > media.length) {
      this.logger.warn(
        `Skipped ${imageUrls.length - media.length} media URL(s) (not HTTPS or unsupported)`,
      );
    }

    for (const url of media) {
      items.push({ type: 'image_url', image_url: { url } });
    }

    return items;
  }

  private splitModerationRequests(
    items: ModerationInputItem[],
  ): ModerationInputItem[][] {
    const text = items.find((i) => i.type === 'text');
    const images = items.filter(
      (i): i is Extract<ModerationInputItem, { type: 'image_url' }> =>
        i.type === 'image_url',
    );

    const requests: ModerationInputItem[][] = [];
    if (text) requests.push([text]);
    for (const image of images) {
      requests.push([image]);
    }
    return requests;
  }

  private requestLabel(batch: ModerationInputItem[], index: number): string {
    if (batch.length === 1 && batch[0].type === 'text') {
      return `caption#${index}`;
    }
    if (batch.length === 1 && batch[0].type === 'image_url') {
      return `image#${index}`;
    }
    return `request#${index}`;
  }

  private assertWithinImageLimit(batch: ModerationInputItem[]): void {
    const imageCount = batch.filter((i) => i.type === 'image_url').length;
    if (imageCount > MAX_IMAGES_PER_REQUEST) {
      throw new Error(
        `Internal error: ${imageCount} images in one request (max ${MAX_IMAGES_PER_REQUEST})`,
      );
    }
  }

  private normalizeMediaUrls(urls: string[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();

    for (const raw of urls) {
      if (out.length >= MAX_MEDIA_ITEMS) break;
      if (typeof raw !== 'string') continue;

      const url = this.toModerationImageUrl(raw.trim());
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    }

    return out;
  }

  private toModerationImageUrl(url: string): string | null {
    if (!url.startsWith('https://')) {
      return null;
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return null;
    } catch {
      return null;
    }

    if (/\/video\/upload\//.test(url)) {
      return this.cloudinaryVideoPosterUrl(url);
    }

    if (/\.(mp4|mov|webm|mkv|m4v)(\?|$)/i.test(url)) {
      this.logger.warn(
        `Skipping non-Cloudinary video URL for image moderation: ${url.slice(0, 120)}`,
      );
      return null;
    }

    return url;
  }

  private cloudinaryVideoPosterUrl(url: string): string {
    let poster = url.replace('/video/upload/', '/video/upload/so_0,f_jpg/');
    poster = poster.replace(/\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i, '.jpg$2');
    const pathPart = poster.split('?')[0] ?? '';
    if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(pathPart)) {
      const q = poster.includes('?') ? poster.slice(poster.indexOf('?')) : '';
      const base = q ? poster.slice(0, poster.indexOf('?')) : poster;
      poster = `${base}.jpg${q}`;
    }
    return poster;
  }

  private async openAiModeration(
    input: ModerationInputItem[],
    label = 'moderation',
  ): Promise<OpenAiModerationSlice> {
    this.assertWithinImageLimit(input);

    const bodyInput: string | ModerationMultiModalInput[] =
      input.length === 1 && input[0].type === 'text'
        ? input[0].text
        : input;

    try {
      const json = await this.openai!.moderations.create({
        model: MODERATION_MODEL,
        input: bodyInput,
      });

      const results = json.results ?? [];
      if (results.length !== input.length) {
        this.logger.warn(
          `OpenAI returned ${results.length} result(s) for ${input.length} input item(s)`,
        );
      }

      const categories: Partial<Record<ModerationCategory, boolean>> = {};
      const category_scores: Partial<Record<ModerationCategory, number>> = {};
      let flagged = false;

      for (const r of results) {
        if (r.flagged) flagged = true;
        for (const cat of MODERATION_CATEGORIES) {
          const catFlag = (
            r.categories as unknown as Record<string, boolean> | undefined
          )?.[cat];
          if (catFlag) categories[cat] = true;
          const score = (
            r.category_scores as unknown as Record<string, number> | undefined
          )?.[cat];
          if (typeof score === 'number') {
            category_scores[cat] = Math.max(category_scores[cat] ?? 0, score);
          }
        }
      }

      const perItem = results.map((r, i) => {
        const kind = input[i]?.type ?? 'unknown';
        return {
          index: i,
          kind,
          flagged: Boolean(r.flagged),
          categories: r.categories ?? null,
          category_scores: r.category_scores ?? null,
        };
      });

      this.logger.log(
        `OpenAI moderation [${label}]:\n${JSON.stringify(
          {
            id: json.id,
            model: json.model,
            flagged,
            category_scores,
            items: perItem,
          },
          null,
          2,
        )}`,
      );

      return { flagged, categories, category_scores };
    } catch (err) {
      if (err instanceof APIError) {
        this.logger.error(
          `OpenAI moderation HTTP ${err.status}: ${err.message}`,
        );
        throw new Error(`OpenAI moderation ${err.status}: ${err.message}`);
      }
      throw err;
    }
  }
}