import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../shared/constants/routes';
import { Button } from '../../shared/components/Button';
import { extractApiMessage } from '../../shared/utils/api-error';
import { getProfileApi, getCloudinaryUploadSignatureApi } from '../../features/auth/api/auth.api';
import { uploadAvatarToCloudinary } from '../../features/auth/lib/uploadAvatarToCloudinary';
import { updateOwnProfile } from '../../features/user/api/userProfile.api';
import { useProfileCache } from '../../features/user/store/profileCache.store';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { AppPage } from '../../shared/layout/AppPage';
import { PageHeader } from '../../shared/components/PageHeader';
import { LoadingState } from '../../shared/components/LoadingState';
import { UserAvatar } from '../../features/user/components/UserAvatar';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
] as const;

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * `/settings/profile` — view, replace avatar, edit display name, username,
 * gender, date of birth, and bio. Uses the same Cloudinary signed-upload flow
 * as the onboarding step.
 *
 * On mount we eagerly fetch the latest profile (rather than rely on cache) so
 * the form always shows the server's current state — important if another
 * device just changed something.
 */
type LoadPhase = 'loading' | 'ready' | 'error';

function toDateInput(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // YYYY-MM-DD for <input type="date" />
  return d.toISOString().slice(0, 10);
}

export function EditProfilePage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const myProfile = useProfileCache((s) => s.myProfile);
  const setMyProfile = useProfileCache((s) => s.setMyProfile);
  const patchMyProfile = useProfileCache((s) => s.patchMyProfile);

  const [phase, setPhase] = useState<LoadPhase>(myProfile ? 'ready' : 'loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(myProfile?.full_name ?? '');
  const [username, setUsername] = useState(myProfile?.username ?? '');
  const [bio, setBio] = useState(myProfile?.bio ?? '');
  const [dob, setDob] = useState(toDateInput(myProfile?.date_of_birth));
  const [gender, setGender] = useState<string>(myProfile?.gender ?? '');
  const [avatarUrl, setAvatarUrl] = useState(myProfile?.avatar_url ?? '');

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getProfileApi();
        if (cancelled) return;
        const p = res.data;
        setMyProfile(p);
        setFullName(p.full_name ?? '');
        setUsername(p.username ?? '');
        setBio(p.bio ?? '');
        setDob(toDateInput(p.date_of_birth));
        setGender(p.gender ?? '');
        setAvatarUrl(p.avatar_url ?? '');
        setPhase('ready');
      } catch (e) {
        if (cancelled) return;
        setLoadError(extractApiMessage(e, 'Could not load profile.'));
        setPhase('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setMyProfile]);

  const handlePickFile = (f: File | null) => {
    setFormError(null);
    if (!f) {
      setPendingFile(null);
      setPendingPreview(null);
      return;
    }
    if (!f.type.startsWith('image/')) {
      setFormError('Please choose an image file.');
      return;
    }
    if (f.size > MAX_AVATAR_BYTES) {
      setFormError('Image must be 5 MB or smaller.');
      return;
    }
    setPendingFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPendingPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || uploading) return;
    setFormError(null);
    setSuccess(null);

    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedName) {
      setFormError('Full name is required.');
      return;
    }
    if (trimmedUsername && !/^[a-zA-Z0-9._-]{2,30}$/.test(trimmedUsername)) {
      setFormError('Username must be 2–30 chars: letters, numbers, . _ -');
      return;
    }
    if (!gender) {
      setFormError('Please select a gender.');
      return;
    }
    if (!dob) {
      setFormError('Date of birth is required.');
      return;
    }

    let nextAvatarUrl = avatarUrl;
    if (pendingFile) {
      setUploading(true);
      try {
        const sig = await getCloudinaryUploadSignatureApi();
        nextAvatarUrl = await uploadAvatarToCloudinary(pendingFile, sig);
        setAvatarUrl(nextAvatarUrl);
        setPendingFile(null);
        setPendingPreview(null);
      } catch (err) {
        setFormError(extractApiMessage(err, 'Could not upload photo.'));
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setSubmitting(true);
    try {
      const updated = await updateOwnProfile({
        full_name: trimmedName,
        username: trimmedUsername || undefined,
        gender,
        date_of_birth: dob,
        avatar_url: nextAvatarUrl || '',
        bio: bio.trim(),
      });
      patchMyProfile(updated);
      setSuccess('Profile updated.');
      // Stay on the page so the user sees the success state, but bring them
      // back to their profile after a short pause for context.
      window.setTimeout(() => navigate(ROUTES.PROFILE_ME), 700);
    } catch (err) {
      setFormError(extractApiMessage(err, 'Could not save profile.'));
    } finally {
      setSubmitting(false);
    }
  };

  const previewSrc = pendingPreview ?? avatarUrl;

  return (
    <AppPage mainClassName="max-w-2xl">
        <PageHeader
          eyebrow="Settings"
          title="Edit profile"
          description="Update how you appear across Navi."
          actions={
            <Link to={ROUTES.PROFILE_ME} className="chip-btn">
              ← Profile
            </Link>
          }
        />

        {phase === 'loading' && <LoadingState />}

        {phase === 'error' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {loadError ?? 'Could not load profile.'}
          </div>
        )}

        {phase === 'ready' && (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="surface-card flex flex-col gap-5 p-6"
          >
            {formError && (
              <div className="rounded-lg bg-error-bg px-3.5 py-2.5 text-center text-sm font-medium text-error">
                {formError}
              </div>
            )}
            {success && !formError && (
              <div className="rounded-lg bg-emerald-50 px-3.5 py-2.5 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                {success}
              </div>
            )}

            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 dark:border-slate-700 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 transition hover:border-accent dark:border-slate-700 dark:bg-slate-800"
                aria-label="Change avatar"
              >
                {previewSrc ? (
                  <img src={previewSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <UserAvatar
                      label={fullName || username || 'You'}
                      size="xl"
                      className="!ring-0 !shadow-none"
                    />
                  </div>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePickFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-sm font-medium text-accent hover:underline"
                  onClick={() => fileRef.current?.click()}
                >
                  {previewSrc ? 'Change photo' : 'Upload photo'}
                </button>
                {(pendingFile || avatarUrl) && (
                  <button
                    type="button"
                    className="text-sm font-medium text-slate-500 hover:underline dark:text-slate-400"
                    onClick={() => {
                      setPendingFile(null);
                      setPendingPreview(null);
                      setAvatarUrl('');
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                JPG / PNG / WebP · up to 5 MB
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputCls}
                  autoComplete="name"
                  placeholder="Your display name"
                />
              </Field>
              <Field label="Username">
                <div className="flex items-stretch overflow-hidden rounded-lg border-[1.5px] border-slate-300 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-bg dark:border-slate-600">
                  <span className="flex items-center bg-slate-50 px-2.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className="w-full bg-white px-2 py-2.5 text-[0.935rem] text-slate-900 outline-none placeholder:text-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    autoComplete="username"
                    placeholder="username"
                  />
                </div>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date of birth">
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Gender">
                <div className="flex gap-2">
                  {GENDER_OPTIONS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value)}
                      className={`flex-1 rounded-lg border-[1.5px] px-3 py-2 text-sm font-medium transition ${
                        gender === g.value
                          ? 'border-accent bg-accent-bg text-accent'
                          : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-500'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <Field label="Bio" hint={`${bio.length}/500`}>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                rows={3}
                maxLength={500}
                className={`${inputCls} resize-y min-h-[5rem]`}
                placeholder="A short intro about yourself"
              />
            </Field>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Link
                to={ROUTES.PROFILE_ME}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </Link>
              <Button
                type="submit"
                variant="primary"
                loading={submitting || uploading}
                className="!w-auto !min-w-[160px]"
              >
                {uploading ? 'Uploading…' : 'Save changes'}
              </Button>
            </div>
          </form>
        )}
    </AppPage>
  );
}

const inputCls =
  'w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-3.5 py-2.5 text-[0.935rem] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent-bg dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="flex items-center justify-between text-sm font-medium text-slate-900 dark:text-slate-100">
        {label}
        {hint && <span className="text-xs font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
