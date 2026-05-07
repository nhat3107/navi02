/**
 * Mirrors `UserProfile` returned by `GET /api/user/profile` and
 * `GET /api/user/profile/:userId`.
 *
 * Re-uses the Prisma-shaped record from auth.types so the same record can flow
 * through `useAuthStore` and the profile pages without conversion.
 */
export type {
  UserProfile,
  UserProfileResponse,
} from '../../auth/types/auth.types';

/**
 * Row returned by `GET /api/user/followers`, `GET /api/user/following`,
 * `GET /api/user/:userId/followers`, `GET /api/user/:userId/following`.
 */
export interface FollowEdge {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  /** ISO timestamp of when the follow relationship was created. */
  followed_at: string;
}

export interface FollowEdgeListResponse {
  message: string;
  data: FollowEdge[];
}

export interface FollowMutationResponse {
  message: string;
}

/** Body sent to `PATCH /api/user/profile`. All fields optional. */
export interface UpdateProfilePayload {
  full_name?: string;
  username?: string;
  gender?: string;
  /** YYYY-MM-DD; backend converts to Date. */
  date_of_birth?: string;
  avatar_url?: string;
  bio?: string;
}
