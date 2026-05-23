export interface AdminAccount {
  id: string;
  email: string;
  createdAt: string;
}

export interface CreateAdminUserPayload {
  email: string;
  password: string;
}
