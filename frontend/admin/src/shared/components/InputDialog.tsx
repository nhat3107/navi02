import { useEffect, useId, useRef, type InputHTMLAttributes } from 'react';
import { Button } from './Button';
import { Input } from './Input';

export function InputDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  label,
  value,
  onChange,
  inputType = 'text',
  placeholder,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirming = false,
  error,
  confirmVariant = 'primary',
  inputProps,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputType?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirming?: boolean;
  error?: string | null;
  confirmVariant?: 'primary' | 'danger';
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'type' | 'placeholder'
  >;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || confirming) return;
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, confirming, onClose]);

  if (!open) return null;

  return (
    <div
      className="confirm-dialog"
      role="dialog"
      aria-modal
      aria-labelledby={`${inputId}-title`}
    >
      <button
        type="button"
        className="confirm-dialog__backdrop"
        aria-label="Close dialog"
        onClick={() => !confirming && onClose()}
      />
      <div className="confirm-dialog__panel">
        <h2 id={`${inputId}-title`} className="confirm-dialog__title">
          {title}
        </h2>
        {message ? <p className="confirm-dialog__message">{message}</p> : null}
        <div className="confirm-dialog__field">
          <Input
            ref={inputRef}
            id={inputId}
            label={label}
            type={inputType}
            value={value}
            placeholder={placeholder}
            error={error ?? undefined}
            disabled={confirming}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void onConfirm();
              }
            }}
            {...inputProps}
          />
        </div>
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
