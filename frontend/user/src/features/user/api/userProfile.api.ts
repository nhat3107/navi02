import { api } from '../../../shared/utils/axios';
import {
  API_ROUTES,
  apiUserFollow,
  apiUserFollowersById,
  apiUserFollowingById,
  apiUserProfileById,
} from '../../../shared/constants/routes';
import type {
  FollowEdge,
  FollowEdgeListResponse,
  FollowMutationResponse,
  UpdateProfilePayload,
  UserProfile,
  UserProfileResponse,
} from '../types/user.types';

/**
 * Profile of `userId`. The backend route returns 404 when the profile is
 * missing — propagated as an Axios error for the page to handle.
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const res = await api.get<UserProfileResponse>(apiUserProfileById(userId));
  return res.data.data;
}

/** Patch own profile (`PATCH /api/user/profile`). */
export async function updateOwnProfile(
  payload: UpdateProfilePayload,
): Promise<UserProfile> {
  const res = await api.patch<UserProfileResponse>(
    API_ROUTES.USER_PROFILE,
    payload,
  );
  return res.data.data;
}

/** Follow `userId`. Throws 409 when already following — caller decides UX. */
export async function followUser(
  userId: string,
): Promise<FollowMutationResponse> {
  const res = await api.post<FollowMutationResponse>(apiUserFollow(userId));
  return res.data;
}

/** Unfollow `userId`. Throws 404 when not following — caller decides UX. */
export async function unfollowUser(
  userId: string,
): Promise<FollowMutationResponse> {
  const res = await api.delete<FollowMutationResponse>(apiUserFollow(userId));
  return res.data;
}

export async function fetchMyFollowers(): Promise<FollowEdge[]> {
  const res = await api.get<FollowEdgeListResponse>(API_ROUTES.USER_FOLLOWERS_ME);
  return res.data.data ?? [];
}

export async function fetchMyFollowing(): Promise<FollowEdge[]> {
  const res = await api.get<FollowEdgeListResponse>(API_ROUTES.USER_FOLLOWING_ME);
  return res.data.data ?? [];
}

export async function fetchUserFollowers(userId: string): Promise<FollowEdge[]> {
  const res = await api.get<FollowEdgeListResponse>(apiUserFollowersById(userId));
  return res.data.data ?? [];
}

export async function fetchUserFollowing(userId: string): Promise<FollowEdge[]> {
  const res = await api.get<FollowEdgeListResponse>(apiUserFollowingById(userId));
  return res.data.data ?? [];
}
