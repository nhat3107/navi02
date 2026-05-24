import { useState } from 'react';
import { followUser, unfollowUser } from '../api/userProfile.api';
import { useProfileCache } from '../store/profileCache.store';

/**
 * Optimistic follow / unfollow toggle.
 *
 * Reads the current follow state from `useProfileCache` so every place that
 * renders the same target user (profile header, discover row, follower list,
 * following list) stays in sync without prop drilling.
 *
 * - Hidden when `targetUserId === viewerUserId` (you can't follow yourself).
 * - On click: flips the cache immediately, then issues the network call.
 *   On failure, the cache is reverted and `onError` is called so the
 *   parent can surface a toast / inline message.
 */
interface FollowButtonProps {
  targetUserId: string;
  viewerUserId: string | null;
  /** Only used to label the button; defaults to "@user". */
  targetLabel?: string;
  /** Visual variants. `compact` is for list rows; `wide` for profile header. */
  variant?: 'compact' | 'wide';
  className?: string;
  onError?: (message: string) => void;
}

export function FollowButton({
  targetUserId,
  viewerUserId,
  targetLabel,
  variant = 'compact',
  className = '',
  onError,
}: FollowButtonProps) {
  const isFollowing = useProfileCache((s) => s.followingIds.has(targetUserId));
  const markFollowed = useProfileCache((s) => s.markFollowed);
  const markUnfollowed = useProfileCache((s) => s.markUnfollowed);
  const [pending, setPending] = useState(false);

  if (!viewerUserId || viewerUserId === targetUserId) return null;

  const onClick = async () => {
    if (pending) return;
    setPending(true);
    const wasFollowing = isFollowing;
    // Optimistic flip first so the UI responds instantly.
    if (wasFollowing) markUnfollowed(targetUserId);
    else markFollowed(targetUserId);
    try {
      if (wasFollowing) await unfollowUser(targetUserId);
      else await followUser(targetUserId);
    } catch (err) {
      // Roll back the optimistic change on failure.
      if (wasFollowing) markFollowed(targetUserId);
      else markUnfollowed(targetUserId);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        (wasFollowing
          ? `Could not unfollow ${targetLabel ?? 'user'}.`
          : `Could not follow ${targetLabel ?? 'user'}.`);
      onError?.(typeof message === 'string' ? message : 'Action failed.');
    } finally {
      setPending(false);
    }
  };

  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent/30';
  const sizeCls =
    variant === 'wide'
      ? 'min-h-[44px] w-full px-5 py-2 text-sm sm:min-w-[140px] sm:w-auto'
      : 'px-4 py-1.5 text-xs';
  const stateCls = isFollowing
    ? 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
    : 'bg-accent text-white shadow-sm shadow-accent/20 hover:bg-accent-hover';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={isFollowing}
      className={`${base} ${sizeCls} ${stateCls} ${className}`}
    >
      {pending ? (
        <span
          aria-hidden
          className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      ) : isFollowing ? (
        'Following'
      ) : (
        'Follow'
      )}
    </button>
  );
}
