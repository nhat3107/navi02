import { Button } from './Button';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirming = false,
  confirmVariant = 'danger',
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  confirmVariant?: 'primary' | 'danger';
}) {
  if (!open) return null;

  return (
    <div
      className="confirm-dialog"
      role="dialog"
      aria-modal
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        className="confirm-dialog__backdrop"
        aria-label="Close dialog"
        onClick={() => !confirming && onClose()}
      />
      <div className="confirm-dialog__panel">
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {title}
        </h2>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <Button
            type="button"
            variant="secondary"
            disabled={confirming}
            onClick={() => !confirming && onClose()}
            className="confirm-dialog__btn"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant === 'danger' ? 'danger' : 'primary'}
            loading={confirming}
            onClick={() => void onConfirm()}
            className="confirm-dialog__btn"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
