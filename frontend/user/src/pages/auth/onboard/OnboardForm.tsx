import { type FormEvent, useRef, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { useOnboard } from '../../../features/auth/hooks/useOnboard';

const GENDERS = ['Male', 'Female', 'Other'] as const;

export function OnboardForm() {
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [errors, setErrors] = useState<{
    username?: string;
    dob?: string;
    gender?: string;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { onboard, loading, error } = useOnboard();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatar(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatar(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!username.trim()) {
      newErrors.username = 'Username is required';
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
      const [year, month, day] = dob.split('-');
      onboard({
        avatar,
        username: username.trim(),
        dob: `${day}/${month}/${year}`,
        gender: gender.toLowerCase(),
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

      {/* Avatar picker */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 cursor-pointer overflow-hidden transition-all duration-150 hover:border-accent hover:bg-accent-bg group"
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 group-hover:text-accent transition-colors">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-full">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </button>
          {avatarPreview && (
            <button
              type="button"
              onClick={removeAvatar}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-error text-white flex items-center justify-center text-xs cursor-pointer shadow-sm transition-transform hover:scale-110"
              aria-label="Remove avatar"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {avatar ? avatar.name : 'Upload photo (optional)'}
        </span>
      </div>

      {/* Username */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
          Username
        </label>
        <input
          type="text"
          placeholder="e.g. nhat317"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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

      {/* Date of birth */}
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

      {/* Gender */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
          Gender
        </label>
        <div className="flex gap-2">
          {GENDERS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg border-[1.5px] cursor-pointer transition-all duration-150 ${
                gender === g
                  ? 'border-accent bg-accent-bg text-accent'
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              {g}
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
