import type { Location } from 'react-router-dom';
import type { NetworkPost } from '../types/network.types';

export type PostEngagementPatch = {
  postId: string;
  liked: boolean;
  likeCount: number;
};

export type AppNavigationState = {
  backgroundLocation?: Location;
  postEngagementPatches?: PostEngagementPatch[];
};

export function mergeEngagementPatches(
  posts: NetworkPost[],
  patches: PostEngagementPatch[] | undefined,
): NetworkPost[] {
  if (!patches?.length) return posts;
  const byId = new Map(patches.map((p) => [p.postId, p]));
  return posts.map((post) => {
    const patch = byId.get(post.id);
    if (!patch) return post;
    return { ...post, liked: patch.liked, likeCount: patch.likeCount };
  });
}

export function upsertEngagementPatch(
  patches: PostEngagementPatch[] | undefined,
  patch: PostEngagementPatch,
): PostEngagementPatch[] {
  const next = [...(patches ?? [])];
  const idx = next.findIndex((p) => p.postId === patch.postId);
  if (idx >= 0) next[idx] = patch;
  else next.push(patch);
  return next;
}
