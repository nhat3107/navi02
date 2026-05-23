import type { AccountStatus } from '../types/accountStatus.types';
import { violationLevelLabel } from '../lib/violationLevelLabel';
import { PROFILE_ACCOUNT_STATUS_HASH } from '../../../shared/constants/routes';

function formatUntil(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const LEVEL_STYLES: Record<
  AccountStatus['violationLevel'],
  { badge: string; border: string; bg: string }
> = {
  clean: {
    badge: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
    border: 'border-emerald-200/80 dark:border-emerald-900/50',
    bg: 'bg-emerald-50/60 dark:bg-emerald-950/25',
  },
  warning: {
    badge: 'bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200',
    border: 'border-amber-200/80 dark:border-amber-900/50',
    bg: 'bg-amber-50/60 dark:bg-amber-950/25',
  },
  restricted: {
    badge: 'bg-orange-100 text-orange-950 dark:bg-orange-950/60 dark:text-orange-200',
    border: 'border-orange-200/80 dark:border-orange-900/50',
    bg: 'bg-orange-50/60 dark:bg-orange-950/25',
  },
  severe: {
    badge: 'bg-red-100 text-red-950 dark:bg-red-950/60 dark:text-red-200',
    border: 'border-red-200/80 dark:border-red-900/50',
    bg: 'bg-red-50/60 dark:bg-red-950/25',
  },
};

interface PenaltyStatusCardProps {
  status: AccountStatus;
  /** Brief pulse ring when navigated from a notification. */
  highlight?: boolean;
}

export function PenaltyStatusCard({ status, highlight }: PenaltyStatusCardProps) {
  const styles = LEVEL_STYLES[status.violationLevel];

  return (
    <section
      id={PROFILE_ACCOUNT_STATUS_HASH}
      className={`mt-5 scroll-mt-24 rounded-2xl border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5 dark:shadow-none ${styles.border} ${styles.bg} ${
        highlight ? 'ring-2 ring-accent ring-offset-2 dark:ring-offset-black' : ''
      }`}
      aria-label="Account status"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
            Account status
          </h2>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
            {status.summaryMessage}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${styles.badge}`}
        >
          {violationLevelLabel(status.violationLevel, status.violationCount)}
        </span>
      </div>

      {(status.isAccountBlocked || status.isPostBlocked) && (
        <dl className="mt-4 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
          {status.isAccountBlocked && status.block_until && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Account blocked until
              </dt>
              <dd className="font-medium">{formatUntil(status.block_until)}</dd>
            </div>
          )}
          {status.isPostBlocked && status.postBlockUntil && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Posting restricted until
              </dt>
              <dd className="font-medium">
                {formatUntil(status.postBlockUntil)}
              </dd>
            </div>
          )}
        </dl>
      )}

      {status.violationLevel === 'clean' && (
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
          Follow community guidelines to keep your account in good standing.
        </p>
      )}
    </section>
  );
}
