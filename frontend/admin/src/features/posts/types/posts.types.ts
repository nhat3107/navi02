export type PostVisibility =
  | 'public'
  | 'followers'
  | 'private'
  | 'pending'
  | 'deleted';

export interface AdminPost {
  id: string;
  authorId: string;
  content: string;
  mediaUrls: string[];
  visibility: PostVisibility;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReport {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: 'post' | 'comment' | 'user';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportedPostItem {
  post: AdminPost;
  reports: AdminReport[];
}

function readId(raw: Record<string, unknown>): string {
  const id = raw.id ?? raw._id;
  if (typeof id === 'string') return id;
  if (id && typeof id === 'object' && '$oid' in id) {
    return String((id as { $oid: string }).$oid);
  }
  return String(id ?? '');
}

export function normalizeAdminPost(raw: Record<string, unknown>): AdminPost {
  return {
    id: readId(raw),
    authorId: String(raw.authorId ?? ''),
    content: String(raw.content ?? ''),
    mediaUrls: Array.isArray(raw.mediaUrls)
      ? raw.mediaUrls.map(String)
      : [],
    visibility: (raw.visibility as PostVisibility) ?? 'pending',
    likeCount: Number(raw.likeCount ?? 0),
    commentCount: Number(raw.commentCount ?? 0),
    shareCount: Number(raw.shareCount ?? 0),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

export function normalizeAdminReport(raw: Record<string, unknown>): AdminReport {
  return {
    id: readId(raw),
    reporterId: String(raw.reporterId ?? ''),
    targetId: String(raw.targetId ?? ''),
    targetType: (raw.targetType as AdminReport['targetType']) ?? 'post',
    description: String(raw.description ?? ''),
    status: (raw.status as AdminReport['status']) ?? 'pending',
    reviewedBy:
      raw.reviewedBy === null || raw.reviewedBy === undefined
        ? null
        : String(raw.reviewedBy),
    reviewedAt:
      raw.reviewedAt === null || raw.reviewedAt === undefined
        ? null
        : String(raw.reviewedAt),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

export function normalizeReportedPostItem(raw: Record<string, unknown>): ReportedPostItem {
  const postRaw = (raw.post ?? {}) as Record<string, unknown>;
  const reportsRaw = Array.isArray(raw.reports) ? raw.reports : [];
  return {
    post: normalizeAdminPost(postRaw),
    reports: reportsRaw.map((r) =>
      normalizeAdminReport(r as Record<string, unknown>),
    ),
  };
}
