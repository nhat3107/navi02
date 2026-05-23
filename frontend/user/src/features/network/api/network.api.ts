import { api } from '../../../shared/utils/axios';
import {
  API_ROUTES,
  apiNetworkCommentById,
  apiNetworkCommentReplies,
  apiNetworkCommentsByPost,
  apiNetworkPostById,
  apiNetworkPostsByAuthor,
} from '../../../shared/constants/routes';
import type {
  NetworkComment,
  NetworkPost,
  PostVisibility,
  ReportTargetType,
} from '../types/network.types';
import {
  normalizeNetworkComment,
  normalizeNetworkPost,
} from '../types/network.types';

function asRecordList(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object');
}

export async function fetchFeed(
  limit = 20,
  skip = 0,
): Promise<{ message?: string; data: NetworkPost[] }> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    API_ROUTES.NETWORK_FEED,
    { params: { limit, skip } },
  );
  const rows = asRecordList(res.data.data);
  return { data: rows.map(normalizeNetworkPost) };
}

export async function fetchPostsByAuthor(
  authorId: string,
  limit = 20,
  skip = 0,
): Promise<{ data: NetworkPost[] }> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    apiNetworkPostsByAuthor(authorId),
    { params: { limit, skip } },
  );
  const rows = asRecordList(res.data.data);
  return { data: rows.map(normalizeNetworkPost) };
}

export async function fetchPostById(postId: string): Promise<NetworkPost> {
  const res = await api.get<{ data: Record<string, unknown> }>(
    apiNetworkPostById(postId),
  );
  return normalizeNetworkPost(res.data.data);
}

export async function createPost(body: {
  content?: string;
  mediaUrls?: string[];
  visibility?: PostVisibility;
}): Promise<NetworkPost> {
  const res = await api.post<{ data: Record<string, unknown> }>(
    API_ROUTES.NETWORK_POSTS,
    body,
  );
  return normalizeNetworkPost(res.data.data);
}

export async function deletePost(postId: string): Promise<void> {
  await api.delete(apiNetworkPostById(postId));
}

export async function likePost(postId: string): Promise<void> {
  await api.post(apiNetworkPostById(postId) + '/like');
}

export async function unlikePost(postId: string): Promise<void> {
  await api.delete(apiNetworkPostById(postId) + '/like');
}

export async function fetchCommentsByPost(
  postId: string,
  limit = 30,
  skip = 0,
): Promise<NetworkComment[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    apiNetworkCommentsByPost(postId),
    { params: { limit, skip } },
  );
  return asRecordList(res.data.data).map(normalizeNetworkComment);
}

export async function fetchCommentReplies(
  parentCommentId: string,
  limit = 20,
  skip = 0,
): Promise<NetworkComment[]> {
  const res = await api.get<{ data: Record<string, unknown>[] }>(
    apiNetworkCommentReplies(parentCommentId),
    { params: { limit, skip } },
  );
  return asRecordList(res.data.data).map(normalizeNetworkComment);
}

export async function createComment(body: {
  postId: string;
  content?: string;
  mediaUrls?: string[];
  parentCommentId?: string | null;
}): Promise<NetworkComment> {
  const res = await api.post<{ data: Record<string, unknown> }>(
    API_ROUTES.NETWORK_COMMENTS,
    body,
  );
  return normalizeNetworkComment(res.data.data);
}

export async function deleteComment(commentId: string): Promise<void> {
  await api.delete(apiNetworkCommentById(commentId));
}

export async function likeComment(commentId: string): Promise<void> {
  await api.post(apiNetworkCommentById(commentId) + '/like');
}

export async function unlikeComment(commentId: string): Promise<void> {
  await api.delete(apiNetworkCommentById(commentId) + '/like');
}

export async function createReport(body: {
  targetId: string;
  targetType: ReportTargetType;
  description: string;
}): Promise<void> {
  await api.post(API_ROUTES.NETWORK_REPORTS, body);
}
