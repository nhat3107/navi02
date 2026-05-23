import { LoginForm } from './LoginForm';

export function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__badge" aria-hidden>
          N
        </div>
        <header className="auth-card__header">
          <p className="auth-card__eyebrow">Navi Admin</p>
          <h1>Sign in</h1>
          <p>Use your admin credentials to access the moderation console.</p>
        </header>
        <LoginForm />
      </div>
    </div>
  );
}
