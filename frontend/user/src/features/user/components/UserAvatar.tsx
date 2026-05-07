import type { CSSProperties } from 'react';

/**
 * Reusable circular avatar — image when `src` is set, gradient initials
 * otherwise. Used by profile pages, discover page, follower/following rows
 * and the home navbar so visual identity stays consistent.
 *
 * Sizing is controlled with discrete tokens so any tailwind purge can pre-
 * generate the classes. `xl` and `2xl` exist for the profile header hero.
 */
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const SIZE_CLASS: Record<Size, string> = {
  xs: 'h-7 w-7 text-[0.65rem]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-2xl',
  '2xl': 'h-28 w-28 text-3xl',
};

function pickInitials(label: string): string {
  const t = label.replace(/^@/, '').trim();
  if (!t) return '?';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

interface UserAvatarProps {
  /** Falls back to initials when no image url is provided. */
  src?: string | null;
  /** Display name used to render initials and the alt text. */
  label: string;
  size?: Size;
  className?: string;
  style?: CSSProperties;
}

export function UserAvatar({
  src,
  label,
  size = 'md',
  className = '',
  style,
}: UserAvatarProps) {
  const sz = SIZE_CLASS[size];
  const photo = src?.trim();
  if (photo) {
    return (
      <span
        style={style}
        className={`flex shrink-0 overflow-hidden rounded-full bg-slate-200 shadow-sm ring-2 ring-white dark:bg-slate-700 dark:ring-slate-900 ${sz} ${className}`}
        aria-hidden
      >
        <img src={photo} alt={label} className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 font-semibold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 ${sz} ${className}`}
      aria-hidden
    >
      {pickInitials(label)}
    </span>
  );
}
