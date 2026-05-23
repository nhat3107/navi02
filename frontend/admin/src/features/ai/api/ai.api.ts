import { api } from '../../../shared/utils/axios';
import { API_ROUTES } from '../../../shared/constants/routes';
import type { AiModerationConfig } from '../../users/types/users.types';

export async function fetchAiConfig(): Promise<AiModerationConfig> {
  const res = await api.get<AiModerationConfig>(API_ROUTES.ADMIN_AI_CONFIG);
  return res.data;
}

export async function updateAiConfigApi(body: {
  enabled?: boolean;
  temperature?: number;
  categoryThresholds?: Record<string, number>;
}): Promise<AiModerationConfig> {
  const res = await api.patch<AiModerationConfig>(
    API_ROUTES.ADMIN_AI_CONFIG,
    body,
  );
  return res.data;
}
