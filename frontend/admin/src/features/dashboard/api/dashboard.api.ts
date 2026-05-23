import { api } from '../../../shared/utils/axios';
import { API_ROUTES } from '../../../shared/constants/routes';
import type { DashboardStats } from '../../users/types/users.types';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<DashboardStats>(API_ROUTES.ADMIN_DASHBOARD);
  return res.data;
}
