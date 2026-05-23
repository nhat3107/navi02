import { useState } from 'react';

function truncateRough(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastNl = slice.lastIndexOf('\n');
  const lastSp = slice.lastIndexOf(' ');
  const breakAt = Math.max(
    lastNl > maxChars * 0.45 ? lastNl : -1,
    lastSp > maxChars * 0.5 ? lastSp : -1,
  );
  const cut = breakAt > 0 ? slice.slice(0, breakAt) : slice;
  return `${cut.trimEnd()}…`;
}

/**
 * Long plain-text bodies: collapsed preview + “Show more” / “Show less”.
 * `stopCardNavigation` — call on button clicks so parent card `onClick` does not fire.
 */
export function ExpandablePlainText({
  text,
  maxCollapsedChars,
  paragraphClassName,
  moreClassName = 'mt-2 text-sm font-semibold text-accent hover:text-accent-hover dark:text-accent',
  stopCardNavigation = false,
}: {
  text: string;
  maxCollapsedChars: number;
  paragraphClassName: string;
  moreClassName?: string;
  /** Use in feed cards so “Show more” does not open the post overlay. */
  stopCardNavigation?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  const needsToggle = trimmed.length > maxCollapsedChars;
  const displayText =
    !needsToggle || expanded ? trimmed : truncateRough(trimmed, maxCollapsedChars);

  return (
    <div className="min-w-0">
      <p className={paragraphClassName}>{displayText}</p>
      {needsToggle ? (
        <button
          type="button"
          className={moreClassName}
          onClick={(e) => {
            if (stopCardNavigation) {
              e.preventDefault();
              e.stopPropagation();
            }
            setExpanded((v) => !v);
          }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  );
}
