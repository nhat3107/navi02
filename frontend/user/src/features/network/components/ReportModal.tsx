import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import type { ReportTargetType } from '../types/network.types';
import { createReport } from '../api/network.api';

export function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
  title = 'Report content',
}: {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  title?: string;
}) {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    const text = description.trim();
    if (text.length < 8) {
      setError('Please add a bit more detail (at least 8 characters).');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createReport({ targetId, targetType, description: text });
      setDescription('');
      onClose();
    } catch {
      setError('Could not send report. Try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="report-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close report dialog"
        onClick={() => !submitting && onClose()}
      />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <h2
          id="report-modal-title"
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Moderators review reports. Describe what is wrong.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="What should we know?"
          className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-accent/30 placeholder:text-slate-500 focus:border-accent focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
        />
        {error && (
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={() => !submitting && onClose()}
            className="w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className="w-auto"
          >
            Submit report
          </Button>
        </div>
      </div>
    </div>
  );
}
