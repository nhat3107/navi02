import { api } from '../../../shared/utils/axios';
import { API_ROUTES } from '../../../shared/constants/routes';

export interface UserSearchHit {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
}

export interface UserSuggestion extends UserSearchHit {
  mutualCount: number;
}

export async function searchUsers(q: string): Promise<UserSearchHit[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  const res = await api.get<{ message: string; data: UserSearchHit[] }>(
    API_ROUTES.USER_SEARCH,
    { params: { q: trimmed } },
  );
  return res.data.data ?? [];
}

export async function fetchUserSuggestions(
  limit = 10,
): Promise<UserSuggestion[]> {
  const res = await api.get<{ message: string; data: UserSuggestion[] }>(
    API_ROUTES.USER_SUGGESTIONS,
    { params: { limit } },
  );
  return (res.data.data ?? []).map((row) => ({
    id: String(row.id),
    username: String(row.username ?? ''),
    full_name: String(row.full_name ?? ''),
    avatar_url: String(row.avatar_url ?? ''),
    mutualCount: Number(row.mutualCount ?? 0),
  }));
}
