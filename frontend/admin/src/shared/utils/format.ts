export function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function visibilityLabel(v: string): string {
  switch (v) {
    case 'pending':
      return 'Under review';
    case 'public':
      return 'Public';
    case 'deleted':
      return 'Removed';
    default:
      return v;
  }
}

export function reportStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'reviewed':
      return 'Reviewed';
    case 'resolved':
      return 'Resolved';
    case 'rejected':
      return 'Dismissed';
    default:
      return status;
  }
}

export function targetTypeLabel(type: string): string {
  switch (type) {
    case 'post':
      return 'Post';
    case 'comment':
      return 'Comment';
    case 'user':
      return 'User';
    default:
      return type;
  }
}

export function truncateText(text: string, max = 160): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

export function shortId(id: string, len = 8): string {
  if (!id) return '—';
  return id.length <= len ? id : `${id.slice(0, len)}…`;
}

export function formatUsername(
  userId: string,
  username?: string | null,
): string {
  const u = username?.trim();
  if (u) return `@${u}`;
  return shortId(userId);
}
