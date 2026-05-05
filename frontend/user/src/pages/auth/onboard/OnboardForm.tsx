import { type FormEvent, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { useOnboard } from '../../../features/auth/hooks/useOnboard';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
] as const;

type OnboardFormProps = {
  avatarUrl: string;
  onBackToPhoto: () => void;
};

export function OnboardForm({ avatarUrl, onBackToPhoto }: OnboardFormProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<
    (typeof GENDER_OPTIONS)[number]['value'] | ''
  >('');
  const [errors, setErrors] = useState<{
    full_name?: string;
    username?: string;
    dob?: string;
    gender?: string;
  }>({});
  const { onboard, loading, error } = useOnboard();

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!fullName.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!/^[a-zA-Z0-9._-]{2,30}$/.test(username.trim())) {
      newErrors.username =
        'Use 2–30 characters: letters, numbers, . _ -';
    }
    if (!dob) {
      newErrors.dob = 'Date of birth is required';
    }
    if (!gender) {
      newErrors.gender = 'Please select a gender';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onboard({
        full_name: fullName.trim(),
        username: username.trim(),
        dob,
        gender,
        bio: bio.trim(),
        avatar_url: avatarUrl.trim(),
      });
    }
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="px-3.5 py-2.5 bg-error-bg text-error rounded-lg text-sm font-medium text-center">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 p-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-500 dark:text-slate-400">
              —
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Profile photo
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {avatarUrl ? 'Uploaded' : 'None — you can add one now or later'}
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToPhoto}
          className="shrink-0 text-sm font-medium text-accent hover:underline"
        >
          {avatarUrl ? 'Change' : 'Add'}
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
          Full name
        </label>
        <input
          type="text"
          placeholder="Your display name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={`w-full px-3.5 py-2.5 text-[0.935rem] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-[1.5px] rounded-lg outline-none transition-all duration-150 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
            errors.full_name
              ? 'border-error focus:ring-2 focus:ring-error-bg'
              : 'border-slate-300 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent-bg'
          }`}
          autoComplete="name"
        />
        {errors.full_name && (
          <span className="text-xs text-error">{errors.full_name}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
          Username
        </label>
        <input
          type="text"
          placeholder="e.g. nhat317 (stored lowercase)"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          className={`w-full px-3.5 py-2.5 text-[0.935rem] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-[1.5px] rounded-lg outline-none transition-all duration-150 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
            errors.username
              ? 'border-error focus:ring-2 focus:ring-error-bg'
              : 'border-slate-300 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent-bg'
          }`}
          autoComplete="username"
        />
        {errors.username && (
          <span className="text-xs text-error">{errors.username}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
          Bio <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          placeholder="Short intro about you"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full px-3.5 py-2.5 text-[0.935rem] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-[1.5px] border-slate-300 dark:border-slate-600 rounded-lg outline-none transition-all duration-150 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent focus:ring-2 focus:ring-accent-bg resize-y min-h-[4.5rem]"
        />
        <span className="text-xs text-slate-400">{bio.length}/500</span>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
          Date of birth
        </label>
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className={`w-full px-3.5 py-2.5 text-[0.935rem] text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-[1.5px] rounded-lg outline-none transition-all duration-150 ${
            errors.dob
              ? 'border-error focus:ring-2 focus:ring-error-bg'
              : 'border-slate-300 dark:border-slate-600 focus:border-accent focus:ring-2 focus:ring-accent-bg'
          }`}
        />
        {errors.dob && (
          <span className="text-xs text-error">{errors.dob}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
          Gender
        </label>
        <div className="flex gap-2">
          {GENDER_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGender(value)}
              className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg border-[1.5px] cursor-pointer transition-all duration-150 ${
                gender === value
                  ? 'border-accent bg-accent-bg text-accent'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {errors.gender && (
          <span className="text-xs text-error">{errors.gender}</span>
        )}
      </div>

      <Button type="submit" variant="primary" loading={loading} className="mt-1">
        Complete setup
      </Button>
    </form>
  );
}
