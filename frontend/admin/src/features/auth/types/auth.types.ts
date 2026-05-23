export interface Admin {
  id: string;
  email: string;
  role: string;
}

export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  access_token: string;
}

export interface AdminAuthState {
  admin: Admin | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (admin: Admin, accessToken: string) => void;
  logout: () => void;
}
