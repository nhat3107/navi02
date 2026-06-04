import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatRelativeTime } from './formatRelativeTime';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string for invalid input', () => {
    expect(formatRelativeTime('')).toBe('');
    expect(formatRelativeTime('not-a-date')).toBe('');
  });

  it('formats seconds, minutes, hours, and days', () => {
    expect(formatRelativeTime('2026-05-21T11:59:55.000Z')).toBe('now');
    expect(formatRelativeTime('2026-05-21T11:59:30.000Z')).toBe('30s');
    expect(formatRelativeTime('2026-05-21T11:30:00.000Z')).toBe('30m');
    expect(formatRelativeTime('2026-05-21T08:00:00.000Z')).toBe('4h');
    expect(formatRelativeTime('2026-05-19T12:00:00.000Z')).toBe('2d');
  });
});
