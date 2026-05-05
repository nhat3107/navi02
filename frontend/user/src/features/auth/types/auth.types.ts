export interface User {
  id: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

/** POST /auth/signin | /auth/refresh — body `access_token`; refresh ở cookie HttpOnly `refresh_token`. */
export interface SignInResponse {
  access_token: string;
}

export interface SignUpResponse {
  message: string;
  data: {
    userId: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
  };
}

export interface OnboardPayload {
  full_name: string;
  username: string;
  gender: string;
  date_of_birth: string;
  avatar_url: string;
  bio: string;
}

export interface OnboardRequest {
  full_name: string;
  username: string;
  dob: string;
  gender: string;
  bio: string;
  /** HTTPS URL from Cloudinary after step 1, or '' if skipped */
  avatar_url: string;
}

export interface CloudinarySignatureData {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  public_id: string;
  uploadUrl: string;
  /** Present when gateway/user-service returns it (chat video vs image). */
  resourceType?: 'image' | 'video';
}

/** Mirrors `UserProfile` in user-service Prisma schema (API returns JSON). */
export interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  gender: string;
  date_of_birth: string;
  avatar_url: string;
  bio: string;
  followers_count: number;
  following_count: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileResponse {
  message: string;
  data: UserProfile;
}

export interface OnboardApiResponse {
  message: string;
  data: {
    id: string;
    username: string;
    full_name: string;
  };
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  logout: () => void;
}
