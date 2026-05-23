import { api } from '../../../shared/utils/axios';
import { API_ROUTES } from '../../../shared/constants/routes';
import type {
  AccountStatus,
  AccountStatusResponse,
} from '../types/accountStatus.types';

export async function fetchAccountStatusApi(): Promise<AccountStatus> {
  const res = await api.get<AccountStatusResponse>(API_ROUTES.USER_ACCOUNT_STATUS);
  return res.data.data;
}
