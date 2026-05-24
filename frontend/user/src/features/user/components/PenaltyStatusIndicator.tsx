import type { AccountStatus } from '../types/accountStatus.types';
import { PROFILE_ACCOUNT_STATUS_HASH } from '../../../shared/constants/routes';

function formatUntil(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function restrictedTitle(count: number): string {
  return `Restricted (${count} ${count === 1 ? 'time' : 'times'})`;
}

function tooltipContent(status: AccountStatus): {
  title: string;
  message?: string;
  until?: string;
} {
  if (status.isAccountBlocked && status.block_until) {
    return {
      title: restrictedTitle(status.violationCount),
      message: 'Your account is blocked until',
      until: formatUntil(status.block_until),
    };
  }

  if (status.isPostBlocked && status.postBlockUntil) {
    return {
      title: restrictedTitle(status.violationCount),
      message: 'You cannot create new posts until',
      until: formatUntil(status.postBlockUntil),
    };
  }

  if (status.violationLevel === 'warning') {
    return {
      title: `Warning (${status.violationCount}/3)`,
      message: status.summaryMessage,
    };
  }

  if (status.violationLevel === 'severe') {
    return {
      title: restrictedTitle(status.violationCount),
      message: status.summaryMessage,
    };
  }

  return {
    title: restrictedTitle(status.violationCount),
    message: status.summaryMessage,
  };
}

const LEVEL_STYLES: Record<
  AccountStatus['violationLevel'],
  { button: string; icon: 'warning' | 'restricted' | 'severe' | 'clean' }
> = {
  clean: {
    button:
      'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40',
    icon: 'clean',
  },
  warning: {
    button:
      'text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40',
    icon: 'warning',
  },
  restricted: {
    button:
      'text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950/40',
    icon: 'restricted',
  },
  severe: {
    button:
      'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40',
    icon: 'severe',
  },
};

interface PenaltyStatusIndicatorProps {
  status: AccountStatus;
  highlight?: boolean;
}

export function PenaltyStatusIndicator({
  status,
  highlight = false,
}: PenaltyStatusIndicatorProps) {
  const showIndicator =
    status.violationLevel !== 'clean' ||
    status.isAccountBlocked ||
    status.isPostBlocked;

  if (!showIndicator) return null;

  const level = status.isAccountBlocked
    ? 'severe'
    : status.isPostBlocked && status.violationLevel === 'clean'
      ? 'restricted'
      : status.violationLevel;
  const styles = LEVEL_STYLES[level];
  const tooltip = tooltipContent(status);

  const tooltipId = `${PROFILE_ACCOUNT_STATUS_HASH}-tooltip`;

  return (
    <span className="group/penalty relative inline-flex">
      <button
        type="button"
        id={PROFILE_ACCOUNT_STATUS_HASH}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${styles.button} ${
          highlight ? 'ring-2 ring-accent ring-offset-2 dark:ring-offset-slate-950' : ''
        }`}
        aria-label="Account penalty status"
        aria-describedby={tooltipId}
      >
        <PenaltyIcon kind={status.isAccountBlocked ? 'blocked' : styles.icon} />
      </button>

      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-max max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs leading-relaxed text-slate-700 opacity-0 shadow-lg transition-opacity duration-150 group-hover/penalty:opacity-100 group-focus-within/penalty:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <span className="block font-semibold text-slate-900 dark:text-slate-100">
          {tooltip.title}
        </span>
        {tooltip.message ? (
          <span className="mt-1 block text-slate-600 dark:text-slate-300">
            {tooltip.message}
          </span>
        ) : null}
        {tooltip.until ? (
          <span className="mt-1 block font-semibold text-orange-700 dark:text-orange-300">
            {tooltip.until}
          </span>
        ) : null}
      </span>
    </span>
  );
}

function PenaltyIcon({
  kind,
}: {
  kind: 'warning' | 'restricted' | 'severe' | 'clean' | 'blocked';
}) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (kind === 'warning') {
    return (
      <svg {...common}>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }

  if (kind === 'restricted' || kind === 'blocked') {
    return (
      <svg {...common}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }

  if (kind === 'severe') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6M9 9l6 6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
