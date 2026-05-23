import { useCallback, useEffect, useState } from 'react';
import {
  blockUserApi,
  fetchUsers,
  resetViolationPenaltyApi,
  unblockUserApi,
} from '../../features/users/api/users.api';
import {
  violationLevelLabel,
  type AdminUser,
} from '../../features/users/types/users.types';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatRelativeTime } from '../../shared/utils/format';

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUsers({ limit: 50 });
      setUsers(res.data);
      setTotal(res.total);
    } catch {
      setError('Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleBlock = async (user: AdminUser) => {
    const daysStr = window.prompt('Block for how many days?', '7');
    if (daysStr === null) return;
    const blockDays = Number.parseInt(daysStr, 10);
    if (!Number.isFinite(blockDays) || blockDays < 1) {
      setError('Enter a valid number of days.');
      return;
    }
    setActionId(user.id);
    try {
      await blockUserApi(user.id, blockDays);
      await load();
    } catch {
      setError('Failed to block user.');
    } finally {
      setActionId(null);
    }
  };

  const handleUnblock = async (userId: string) => {
    setActionId(userId);
    try {
      await unblockUserApi(userId);
      await load();
    } catch {
      setError('Failed to unblock user.');
    } finally {
      setActionId(null);
    }
  };

  const handleResetPenalty = async (user: AdminUser) => {
    const confirmed = window.confirm(
      `Reset violation count and posting restrictions for ${user.email}? Account blocks are not changed — use Unblock if needed.`,
    );
    if (!confirmed) return;
    setActionId(user.id);
    try {
      await resetViolationPenaltyApi(user.id);
      await load();
    } catch {
      setError('Failed to reset penalty.');
    } finally {
      setActionId(null);
    }
  };

  const hasPenaltyState = (user: AdminUser) =>
    user.violationCount > 0 || user.isPostBlocked;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Community"
        title="Users"
        description={`Manage member accounts, blocks, and violation levels (${total} total).`}
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {error ? <div className="alert alert--error">{error}</div> : null}
      {loading ? <LoadingState label="Loading users…" /> : null}
      {!loading && users.length === 0 ? (
        <EmptyState title="No users found" description="Member accounts will appear here." />
      ) : null}

      {!loading && users.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Violations</th>
                <th>Level</th>
                <th>Status</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="data-table__primary">{user.email}</td>
                  <td>{user.violationCount}</td>
                  <td>
                    <span className={`badge badge--${user.violationLevel}`}>
                      {violationLevelLabel(user.violationLevel, user.violationCount)}
                    </span>
                  </td>
                  <td>
                    {user.isAccountBlocked ? (
                      <span className="status-pill status-pill--blocked">
                        Blocked
                        {user.block_until
                          ? ` until ${new Date(user.block_until).toLocaleDateString()}`
                          : ''}
                      </span>
                    ) : user.isPostBlocked ? (
                      <span className="status-pill status-pill--restricted">
                        Post restricted
                      </span>
                    ) : (
                      <span className="status-pill status-pill--active">Active</span>
                    )}
                  </td>
                  <td>{formatRelativeTime(user.createdAt)}</td>
                  <td className="data-table__actions">
                    <div className="data-table__action-group">
                      {hasPenaltyState(user) ? (
                        <Button
                          variant="secondary"
                          disabled={actionId === user.id}
                          onClick={() => handleResetPenalty(user)}
                        >
                          Reset penalty
                        </Button>
                      ) : null}
                      {user.isAccountBlocked ? (
                        <Button
                          variant="secondary"
                          disabled={actionId === user.id}
                          onClick={() => handleUnblock(user.id)}
                        >
                          Unblock
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          disabled={actionId === user.id}
                          onClick={() => handleBlock(user)}
                        >
                          Block
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
