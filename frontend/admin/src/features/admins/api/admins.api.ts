import { api } from '../../../shared/utils/axios';
import { API_ROUTES } from '../../../shared/constants/routes';
import type {
  AdminAccount,
  CreateAdminUserPayload,
} from '../types/admins.types';

export async function fetchAdmins(): Promise<{
  data: AdminAccount[];
  total: number;
}> {
  const res = await api.get<{ data: AdminAccount[]; total: number }>(
    API_ROUTES.ADMIN_ADMINS,
  );
  return res.data;
}

export async function createAdminUserApi(
  payload: CreateAdminUserPayload,
): Promise<AdminAccount> {
  const res = await api.post<{ data: AdminAccount }>(
    API_ROUTES.ADMIN_ADMINS,
    payload,
  );
  return res.data.data;
}
