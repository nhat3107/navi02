import { api } from '../../../shared/utils/axios';
import {
  API_ROUTES,
  apiAdminPostApprove,
  apiAdminPostDelete,
} from '../../../shared/constants/routes';
import {
  normalizeAdminPost,
  normalizeReportedPostItem,
  type AdminPost,
  type ReportedPostItem,
} from '../types/posts.types';

type ListQuery = { limit?: number; skip?: number };

export async function fetchPendingPosts(
  query?: ListQuery,
): Promise<AdminPost[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    API_ROUTES.ADMIN_POSTS_PENDING,
    { params: query },
  );
  return (res.data.data ?? []).map(normalizeAdminPost);
}

export async function fetchReportedPosts(
  query?: ListQuery,
): Promise<ReportedPostItem[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    API_ROUTES.ADMIN_POSTS_REPORTED,
    { params: query },
  );
  return (res.data.data ?? []).map(normalizeReportedPostItem);
}

export async function approvePostApi(postId: string): Promise<void> {
  await api.patch(apiAdminPostApprove(postId));
}

export async function rejectPostApi(postId: string): Promise<void> {
  await api.delete(apiAdminPostDelete(postId));
}
