/** Short relative time (feed / headers), Instagram-style brevity. */
export function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const ms = d.getTime();
  if (Number.isNaN(ms)) return '';
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 10) return 'now';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  if (s < 31449600) return `${Math.floor(s / 604800)}w`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
