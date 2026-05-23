import OpenAI from 'openai';

export const OPENAI_CLIENT = 'OPENAI_CLIENT';

export const openAiClientProvider = {
  provide: OPENAI_CLIENT,
  useFactory: (): OpenAI | null => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return null;
    return new OpenAI({ apiKey });
  },
};
