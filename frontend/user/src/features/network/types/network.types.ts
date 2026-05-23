export type PostVisibility =
  | 'public'
  | 'followers'
  | 'private'
  | 'pending'
  | 'deleted';

export type ReportTargetType = 'post' | 'comment' | 'user';

export interface NetworkPost {
  id: string;
  authorId: string;
  content: string;
  mediaUrls: string[];
  visibility: PostVisibility;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt?: string;
  liked?: boolean;
}

export interface NetworkComment {
  id: string;
  authorId: string;
  postId: string;
  content: string;
  mediaUrls: string[];
  parentCommentId: string | null;
  replyCount: number;
  likeCount: number;
  createdAt: string;
}

function readId(raw: Record<string, unknown>): string {
  const v = raw._id ?? raw.id;
  if (v && typeof v === 'object' && v !== null && '$oid' in v) {
    return String((v as { $oid: string }).$oid);
  }
  return String(v ?? '');
}

export function normalizeNetworkPost(raw: Record<string, unknown>): NetworkPost {
  const media = raw.mediaUrls;
  return {
    id: readId(raw),
    authorId: String(raw.authorId ?? ''),
    content: String(raw.content ?? ''),
    mediaUrls: Array.isArray(media)
      ? media.filter((u): u is string => typeof u === 'string')
      : [],
    visibility: (raw.visibility as PostVisibility) ?? 'public',
    likeCount: Number(raw.likeCount ?? 0),
    commentCount: Number(raw.commentCount ?? 0),
    shareCount: Number(raw.shareCount ?? 0),
    createdAt:
      typeof raw.createdAt === 'string'
        ? raw.createdAt
        : raw.createdAt &&
            typeof raw.createdAt === 'object' &&
            raw.createdAt !== null &&
            'toISOString' in raw.createdAt
          ? (raw.createdAt as Date).toISOString()
          : '',
    updatedAt:
      typeof raw.updatedAt === 'string'
        ? raw.updatedAt
        : undefined,
    liked: typeof raw.liked === 'boolean' ? raw.liked : undefined,
  };
}

export function normalizeNetworkComment(
  raw: Record<string, unknown>,
): NetworkComment {
  const parent = raw.parentCommentId;
  let parentCommentId: string | null = null;
  if (parent != null && parent !== '') {
    parentCommentId =
      typeof parent === 'object' && parent !== null
        ? readId(parent as Record<string, unknown>)
        : String(parent);
  }
  const postIdRaw = raw.postId;
  const postId =
    typeof postIdRaw === 'object' && postIdRaw !== null
      ? readId(postIdRaw as Record<string, unknown>)
      : String(postIdRaw ?? '');

  const cMedia = raw.mediaUrls;
  return {
    id: readId(raw),
    authorId: String(raw.authorId ?? ''),
    postId,
    content: String(raw.content ?? ''),
    mediaUrls: Array.isArray(cMedia)
      ? cMedia.filter((u): u is string => typeof u === 'string')
      : [],
    parentCommentId,
    replyCount: Number(raw.replyCount ?? 0),
    likeCount: Number(raw.likeCount ?? 0),
    createdAt:
      typeof raw.createdAt === 'string'
        ? raw.createdAt
        : '',
  };
}
