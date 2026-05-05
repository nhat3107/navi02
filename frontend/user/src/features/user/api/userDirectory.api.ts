import { api } from '../../../shared/utils/axios';
import { API_ROUTES } from '../../../shared/constants/routes';

export interface UserSearchHit {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
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
