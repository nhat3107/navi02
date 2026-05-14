import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Button } from '../../../shared/components/Button';
import { UserAvatar } from '../../user/components/UserAvatar';
import type { PostVisibility } from '../types/network.types';
import { createPost } from '../api/network.api';
import {
  NetworkMediaPicker,
  type NetworkMediaPickerHandle,
} from './NetworkMediaPicker';

const MAX_POST_MEDIA = 8;
const MAX_LENGTH = 5000;

export function FeedComposer({
  displayName,
  avatarUrl,
  onPosted,
}: {
  displayName: string;
  avatarUrl: string | null;
  onPosted: () => void;
}) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<NetworkMediaPickerHandle>(null);

  const hasDraft = content.trim().length > 0 || mediaUrls.length > 0;
  const canSubmit = !submitting && !uploadBusy && hasDraft;
  const firstName = displayName.split(' ')[0] || 'friend';

  // Autosize the textarea up to a comfortable max height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const next = Math.min(Math.max(el.scrollHeight, 56), 280);
    el.style.height = `${next}px`;
  }, [content]);

  async function submit() {
    if (uploadBusy) {
      setError('Hold on — your media is still uploading.');
      return;
    }
    const text = content.trim();
    if (!text && mediaUrls.length === 0) {
      setError('Add a caption or a photo.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createPost({
        content: text || undefined,
        visibility,
        mediaUrls: mediaUrls.length ? mediaUrls : undefined,
      });
      setContent('');
      setMediaUrls([]);
      setVisibility('public');
      setFocused(false);
      onPosted();
    } catch {
      setError('Could not publish. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Create post"
      className={`mb-5 overflow-hidden rounded-2xl border bg-white transition-all dark:bg-neutral-950 ${
        focused
          ? 'border-neutral-300 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.12)] dark:border-neutral-700 dark:shadow-none'
          : 'border-neutral-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-neutral-800 dark:shadow-none'
      }`}
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-4 sm:px-6 sm:pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar label={displayName} src={avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {displayName}
            </p>
            <AudiencePicker value={visibility} onChange={setVisibility} />
          </div>
        </div>
      </header>

      <div className="px-5 pt-4 sm:px-6">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={2}
          maxLength={MAX_LENGTH}
          placeholder={`What's on your mind, ${firstName}?`}
          className="block w-full resize-none bg-transparent text-lg leading-relaxed text-neutral-900 outline-none placeholder:text-neutral-500 dark:text-neutral-100 dark:placeholder:text-neutral-400 sm:text-xl"
          aria-label="Post content"
        />
      </div>

      <div className="px-5 pb-4 pt-2 sm:px-6">
        <NetworkMediaPicker
          ref={pickerRef}
          urls={mediaUrls}
          onUrlsChange={setMediaUrls}
          onBusyChange={setUploadBusy}
          maxFiles={MAX_POST_MEDIA}
          disabled={submitting}
          variant="compact"
          toolbarOnly
        />

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </p>
        )}
      </div>

      <div className="border-t border-neutral-100 bg-neutral-50/60 px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900/60 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ToolbarButton
              onClick={() => pickerRef.current?.openFilePicker()}
              disabled={submitting}
              title="Add photos or videos"
            >
              <PhotoIcon />
              <span className="hidden sm:inline">Photo / Video</span>
            </ToolbarButton>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            <span
              className={`text-[0.7rem] tabular-nums ${
                content.length > MAX_LENGTH * 0.9
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
              aria-live="polite"
            >
              {content.length} / {MAX_LENGTH}
            </span>
            <Button
              type="button"
              disabled={!canSubmit}
              loading={submitting}
              onClick={() => void submit()}
              className="w-auto min-w-[112px] rounded-full px-6 py-2.5 text-sm font-semibold"
            >
              {uploadBusy ? 'Uploading…' : 'Share'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
    >
      {children}
    </button>
  );
}

type AudienceOption = {
  value: PostVisibility;
  label: string;
  description: string;
  Icon: (props: { size?: number }) => ReactElement;
};

const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    value: 'public',
    label: 'Public',
    description: 'Anyone on or off Navi can see',
    Icon: GlobeIcon,
  },
  {
    value: 'followers',
    label: 'Followers',
    description: 'Only people who follow you',
    Icon: PeopleIcon,
  },
  {
    value: 'private',
    label: 'Only me',
    description: 'Visible to you, hidden from feeds',
    Icon: LockIcon,
  },
];

/**
 * Custom dropdown so the privacy chooser is touch-friendly, theme-aware, and
 * shows a description for each audience (native `<select>` cannot do that).
 */
function AudiencePicker({
  value,
  onChange,
}: {
  value: PostVisibility;
  onChange: (v: PostVisibility) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const current =
    AUDIENCE_OPTIONS.find((o) => o.value === value) ?? AUDIENCE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative mt-1 inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-1 text-[0.72rem] font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-200/70 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
      >
        <span
          aria-hidden
          className="inline-flex h-4 w-4 items-center justify-center text-neutral-700 dark:text-neutral-200"
        >
          <current.Icon size={13} />
        </span>
        <span>{current.label}</span>
        <ChevronDown open={open} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose who can see this post"
          className="absolute left-0 top-full z-30 mt-2 w-[18rem] overflow-hidden rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.35)] ring-1 ring-black/5 dark:border-neutral-700 dark:bg-neutral-900 dark:shadow-[0_18px_45px_-15px_rgba(0,0,0,0.7)] dark:ring-white/5"
        >
          <p className="px-3 pb-1.5 pt-2 text-[0.68rem] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Who can see this post?
          </p>
          {AUDIENCE_OPTIONS.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  selected
                    ? 'bg-accent-bg text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    selected
                      ? 'bg-accent text-white'
                      : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <opt.Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-tight">
                    {opt.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-neutral-600 dark:text-neutral-300">
                    {opt.description}
                  </span>
                </span>
                {selected && (
                  <span aria-hidden className="text-accent">
                    <CheckIcon />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GlobeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function PeopleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function ChevronDown({ open }: { open?: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-emerald-500 dark:text-emerald-400"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="9" r="1.6" />
      <path d="m21 16-5-5-9 9" />
    </svg>
  );
}
