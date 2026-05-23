import { api } from '../../../shared/utils/axios';
import {
  API_ROUTES,
  apiAdminReportReview,
} from '../../../shared/constants/routes';
import {
  normalizeAdminReport,
  type AdminReport,
} from '../../posts/types/posts.types';

type ListQuery = { limit?: number; skip?: number; status?: string };

export async function fetchReports(query?: ListQuery): Promise<AdminReport[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    API_ROUTES.ADMIN_REPORTS,
    { params: query },
  );
  return (res.data.data ?? []).map(normalizeAdminReport);
}

export async function reviewReportApi(
  reportId: string,
  action: 'uphold' | 'dismiss',
): Promise<void> {
  await api.patch(apiAdminReportReview(reportId), { action });
}
