import { Link } from 'react-router-dom';
import { buildProfilePath } from '../../../shared/constants/routes';
import { UserAvatar } from './UserAvatar';
import { FollowButton } from './FollowButton';

function mutualLabel(count: number): string {
  if (count === 1) return '1 mutual';
  return `${count} mutual`;
}

export function DiscoverPersonCard({
  id,
  username,
  fullName,
  avatarUrl,
  viewerUserId,
  mutualCount,
  variant = 'row',
}: {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  viewerUserId: string | null;
  mutualCount?: number;
  variant?: 'row' | 'tile';
}) {
  const displayName = fullName?.trim() || `@${username}`;

  if (variant === 'tile') {
    return (
      <article className="discover-person-tile group">
        <Link to={buildProfilePath(id)} className="discover-person-tile__profile">
          <span className="discover-person-tile__avatar-ring">
            <UserAvatar label={displayName} src={avatarUrl} size="lg" />
          </span>
          <p className="discover-person-tile__name">{displayName}</p>
          <p className="discover-person-tile__username">@{username}</p>
          {mutualCount != null && mutualCount > 0 ? (
            <span className="discover-person-tile__mutual">{mutualLabel(mutualCount)}</span>
          ) : null}
        </Link>
        <FollowButton
          targetUserId={id}
          viewerUserId={viewerUserId}
          targetLabel={`@${username}`}
          variant="wide"
          className="discover-person-tile__follow"
        />
      </article>
    );
  }

  return (
    <article className="discover-person-row group">
      <Link to={buildProfilePath(id)} className="discover-person-row__avatar">
        <span className="discover-person-row__avatar-ring">
          <UserAvatar label={displayName} src={avatarUrl} size="md" />
        </span>
      </Link>
      <Link to={buildProfilePath(id)} className="discover-person-row__body">
        <p className="discover-person-row__name">{displayName}</p>
        <p className="discover-person-row__username">@{username}</p>
        {mutualCount != null && mutualCount > 0 ? (
          <span className="discover-person-row__mutual">{mutualLabel(mutualCount)}</span>
        ) : null}
      </Link>
      <FollowButton
        targetUserId={id}
        viewerUserId={viewerUserId}
        targetLabel={`@${username}`}
      />
    </article>
  );
}
