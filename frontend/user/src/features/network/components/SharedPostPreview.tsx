import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { UserProfile } from '../../user/types/user.types';
import type { NetworkPost } from '../types/network.types';
import { fetchPostById } from '../api/network.api';
import { useAuthorProfiles } from '../hooks/useAuthorProfiles';
import { buildPostPath, buildProfilePath } from '../../../shared/constants/routes';
import { UserAvatar } from '../../user/components/UserAvatar';
import { isCloudinaryVideoUrl } from '../../../shared/lib/cloudinary';

type SharedPostPreviewProps = {
  post?: NetworkPost | null;
  author?: UserProfile | null;
  /** When only an id is known (e.g. chat), show loading/unavailable states. */
  loading?: boolean;
  unavailable?: boolean;
  compact?: boolean;
  stopCardNavigation?: boolean;
};

export function SharedPostPreview({
  post,
  author,
  loading = false,
  unavailable = false,
  compact = false,
  stopCardNavigation = false,
}: SharedPostPreviewProps) {
  if (loading) {
    return (
      <div
        className={`rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60 ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        <p className="text-slate-500 dark:text-slate-400">Loading post…</p>
      </div>
    );
  }

  if (unavailable || !post || post.visibility === 'deleted') {
    return (
      <div
        className={`rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-900/40 ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        <p className="text-slate-500 dark:text-slate-400">
          This post is no longer available.
        </p>
      </div>
    );
  }

  const profilePath = buildProfilePath(post.authorId);
  const postPath = buildPostPath(post.id);
  const username = author?.username?.trim() || 'user';
  const displayName =
    author?.full_name?.trim() || (author?.username ? `@${author.username}` : 'Member');
  const previewText = post.content.trim();
  const firstMedia = post.mediaUrls[0];
  const linkProps = stopCardNavigation
    ? {
        onClick: (e: React.MouseEvent) => e.stopPropagation(),
      }
    : {};

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60 ${
        compact ? '' : 'shadow-sm'
      }`}
    >
      <div className={`flex items-center gap-2 ${compact ? 'px-3 py-2' : 'px-3 py-2.5'}`}>
        <Link to={profilePath} className="shrink-0" {...linkProps}>
          <UserAvatar label={displayName} src={author?.avatar_url ?? null} size="sm" />
        </Link>
        <Link
          to={profilePath}
          className="min-w-0 truncate font-semibold text-slate-900 hover:opacity-70 dark:text-slate-100"
          {...linkProps}
        >
          {username}
        </Link>
      </div>

      {firstMedia ? (
        <Link to={postPath} className="block" {...linkProps}>
          {isCloudinaryVideoUrl(firstMedia) ? (
            <video
              src={firstMedia}
              muted
              playsInline
              preload="metadata"
              className={`w-full bg-black object-cover ${compact ? 'max-h-36' : 'max-h-52'}`}
            />
          ) : (
            <img
              src={firstMedia}
              alt=""
              className={`w-full object-cover ${compact ? 'max-h-36' : 'max-h-52'}`}
              loading="lazy"
            />
          )}
        </Link>
      ) : null}

      {(previewText || !firstMedia) && (
        <div className={compact ? 'px-3 py-2' : 'px-3 py-2.5'}>
          {previewText ? (
            <Link to={postPath} className="block hover:opacity-80" {...linkProps}>
              <p
                className={`whitespace-pre-wrap text-slate-800 dark:text-slate-200 ${
                  compact ? 'line-clamp-3 text-xs leading-relaxed' : 'line-clamp-4 text-sm leading-relaxed'
                }`}
              >
                {previewText}
              </p>
            </Link>
          ) : (
            <Link
              to={postPath}
              className={`font-medium text-accent hover:text-accent-hover ${
                compact ? 'text-xs' : 'text-sm'
              }`}
              {...linkProps}
            >
              View post
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function SharedPostPreviewById({
  postId,
  compact = false,
  stopCardNavigation = false,
}: {
  postId: string;
  compact?: boolean;
  stopCardNavigation?: boolean;
}) {
  const [post, setPost] = useState<NetworkPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const { byId } = useAuthorProfiles(post?.authorId ? [post.authorId] : []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setUnavailable(false);
    void fetchPostById(postId)
      .then((p) => {
        if (!cancelled) setPost(p);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <SharedPostPreview
      post={post}
      author={post ? byId[post.authorId] : null}
      loading={loading}
      unavailable={unavailable}
      compact={compact}
      stopCardNavigation={stopCardNavigation}
    />
  );
}
