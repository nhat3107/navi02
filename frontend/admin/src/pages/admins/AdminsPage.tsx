import { type FormEvent, useCallback, useEffect, useState } from 'react';
import {
  createAdminUserApi,
  fetchAdmins,
} from '../../features/admins/api/admins.api';
import type { AdminAccount } from '../../features/admins/types/admins.types';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { Input } from '../../shared/components/Input';
import { LoadingState } from '../../shared/components/LoadingState';
import { PageHeader } from '../../shared/components/PageHeader';
import { formatRelativeTime } from '../../shared/utils/format';

export function AdminsPage() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdmins();
      setAdmins(res.data);
    } catch {
      setError('Could not load admin accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const validate = (): boolean => {
    const next: typeof fieldErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      next.email = 'Enter a valid email address';
    }
    if (!password || password.length < 8) {
      next.password = 'Password must be at least 8 characters';
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    if (!validate()) return;

    setCreating(true);
    setError(null);
    try {
      const created = await createAdminUserApi({
        email: email.trim().toLowerCase(),
        password,
      });
      setSuccess(`Admin account ready for ${created.email}`);
      setEmail('');
      setPassword('');
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to create admin account.';
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Access control"
        title="Admin accounts"
        description="Create and manage admin panel login accounts."
      />

      {error ? <div className="alert alert--error">{error}</div> : null}
      {success ? <div className="alert alert--success">{success}</div> : null}

      <section className="panel">
        <h2 className="panel__title">Create admin user</h2>
        <p className="panel__hint">
          Uses the account email as the login username. If the email already
          exists, the account is promoted to admin and the password is updated.
        </p>
        <form className="admin-create-form" onSubmit={handleCreate} noValidate>
          <Input
            label="Email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            autoComplete="off"
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            autoComplete="new-password"
          />
          <Button type="submit" loading={creating}>
            Create admin
          </Button>
        </form>
      </section>

      <section className="panel panel--flush">
        <h2 className="panel__title">Existing admins</h2>
        {loading ? <LoadingState label="Loading admin accounts…" /> : null}
        {!loading && admins.length === 0 ? (
          <EmptyState title="No admin accounts yet" />
        ) : null}
        {!loading && admins.length > 0 ? (
          <div className="table-wrap table-wrap--inset">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td className="data-table__primary">{admin.email}</td>
                    <td>{formatRelativeTime(admin.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
