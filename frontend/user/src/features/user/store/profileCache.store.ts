import { create } from 'zustand';
import type { UserProfile } from '../types/user.types';

/**
 * Lightweight cache for the authenticated user's own profile + any other
 * profile the UI has resolved this session.
 *
 * Keeping this separate from `useAuthStore` so the auth store stays
 * minimal (just the JWT-backed session). Pages call `setMyProfile` /
 * `setProfile` after their first fetch; sibling components read the same
 * record without refetching.
 *
 * The follow-set is the de-duplicated list of user ids the current account
 * follows. Loaded once via `setFollowingIds`, then mutated optimistically
 * by `markFollowed` / `markUnfollowed` from the follow button. Reading via
 * `isFollowing(id)` is O(1).
 */
interface ProfileCacheState {
  /** Own profile from `GET /api/user/profile`. */
  myProfile: UserProfile | null;
  /** Any user's profile keyed by id (including own). */
  profiles: Record<string, UserProfile>;
  /** Set of user ids the current account follows (their `id` values). */
  followingIds: Set<string>;

  setMyProfile: (p: UserProfile) => void;
  setProfile: (p: UserProfile) => void;
  patchMyProfile: (patch: Partial<UserProfile>) => void;
  setFollowingIds: (ids: string[]) => void;
  markFollowed: (id: string) => void;
  markUnfollowed: (id: string) => void;
  isFollowing: (id: string) => boolean;
  clear: () => void;
}

export const useProfileCache = create<ProfileCacheState>((set, get) => ({
  myProfile: null,
  profiles: {},
  followingIds: new Set<string>(),

  setMyProfile: (p) =>
    set((s) => ({
      myProfile: p,
      profiles: { ...s.profiles, [p.id]: p },
    })),

  setProfile: (p) =>
    set((s) => ({
      profiles: { ...s.profiles, [p.id]: p },
      // Keep `myProfile` in sync if the same user is fetched.
      myProfile:
        s.myProfile && s.myProfile.id === p.id ? p : s.myProfile,
    })),

  patchMyProfile: (patch) =>
    set((s) => {
      if (!s.myProfile) return s;
      const next = { ...s.myProfile, ...patch };
      return {
        myProfile: next,
        profiles: { ...s.profiles, [next.id]: next },
      };
    }),

  setFollowingIds: (ids) => set({ followingIds: new Set(ids) }),

  markFollowed: (id) =>
    set((s) => {
      if (s.followingIds.has(id)) return s;
      const next = new Set(s.followingIds);
      next.add(id);
      // Bump my own following_count optimistically.
      const my = s.myProfile
        ? { ...s.myProfile, following_count: s.myProfile.following_count + 1 }
        : s.myProfile;
      // Bump the followed user's followers_count if they're cached.
      const cached = s.profiles[id];
      const updatedProfiles = cached
        ? {
            ...s.profiles,
            [id]: { ...cached, followers_count: cached.followers_count + 1 },
          }
        : s.profiles;
      return {
        followingIds: next,
        myProfile: my,
        profiles: my && my.id !== id ? { ...updatedProfiles, [my.id]: my } : updatedProfiles,
      };
    }),

  markUnfollowed: (id) =>
    set((s) => {
      if (!s.followingIds.has(id)) return s;
      const next = new Set(s.followingIds);
      next.delete(id);
      const my = s.myProfile
        ? {
            ...s.myProfile,
            following_count: Math.max(0, s.myProfile.following_count - 1),
          }
        : s.myProfile;
      const cached = s.profiles[id];
      const updatedProfiles = cached
        ? {
            ...s.profiles,
            [id]: {
              ...cached,
              followers_count: Math.max(0, cached.followers_count - 1),
            },
          }
        : s.profiles;
      return {
        followingIds: next,
        myProfile: my,
        profiles: my && my.id !== id ? { ...updatedProfiles, [my.id]: my } : updatedProfiles,
      };
    }),

  isFollowing: (id) => get().followingIds.has(id),

  clear: () =>
    set({
      myProfile: null,
      profiles: {},
      followingIds: new Set<string>(),
    }),
}));
