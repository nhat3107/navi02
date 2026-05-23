import { type FormEvent, useRef, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { AuthAlert } from '../../../features/auth/components/AuthAlert';
import { getCloudinaryUploadSignatureApi } from '../../../features/auth/api/auth.api';
import { uploadAvatarToCloudinary } from '../../../features/auth/lib/uploadAvatarToCloudinary';
import { extractApiMessage } from '../../../shared/utils/api-error';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

type Props = {
  /** When user returns from step 2 after uploading */
  existingAvatarUrl?: string;
  onSkip: () => void;
  onUploaded: (secureUrl: string) => void;
};

export function OnboardAvatarStep({
  existingAvatarUrl = '',
  onSkip,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!f.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (f.size > MAX_AVATAR_BYTES) {
      setError('Image must be 5 MB or smaller.');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const removePhoto = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const existing = existingAvatarUrl.trim();
    if (!file) {
      if (existing) {
        onUploaded(existing);
        return;
      }
      setError('Choose a photo first, or use Skip.');
      return;
    }

    setLoading(true);
    try {
      const sig = await getCloudinaryUploadSignatureApi();
      const url = await uploadAvatarToCloudinary(file!, sig);
      onUploaded(url);
    } catch (err) {
      setError(
        extractApiMessage(
          err,
          'Could not upload photo. Try again or skip for now.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form gap-5">
      {error ? <AuthAlert>{error}</AuthAlert> : null}

      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="auth-avatar-drop group"
          >
            {preview || existingAvatarUrl ? (
              <img
                src={preview ?? existingAvatarUrl}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 group-hover:text-accent transition-colors">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
          </button>
          {(preview || file) && (
            <button
              type="button"
              onClick={removePhoto}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-error text-white flex items-center justify-center text-xs cursor-pointer shadow-sm transition-transform hover:scale-110"
              aria-label="Remove photo"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <span className="text-xs text-slate-500 dark:text-slate-400 text-center">
          JPG, PNG, or WebP · max 5 MB
        </span>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!file && !existingAvatarUrl.trim()}
          className="mt-1"
        >
          Continue with photo
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={onSkip}
          className="w-full"
        >
          Skip for now
        </Button>
      </form>
    </div>
  );
}
