import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { isCloudinaryVideoUrl } from '../../../shared/lib/cloudinary';
import { uploadNetworkMediaFile } from '../lib/uploadNetworkMedia';

type Pending = {
  id: string;
  previewUrl: string;
  isVideo: boolean;
};

type Variant = 'panel' | 'compact';

export type NetworkMediaPickerHandle = {
  /** Programmatically open the OS file picker (for external "Add photo" buttons). */
  openFilePicker: () => void;
};

type Props = {
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  addLabel?: string;
  variant?: Variant;
  /**
   * No empty-state panel and no inline “add” tile — parent opens the file input via ref only
   * (e.g. post composer toolbar Photo / Video).
   */
  toolbarOnly?: boolean;
  /** Fires whenever the in-flight upload count crosses 0 ↔ >0. */
  onBusyChange?: (busy: boolean) => void;
};

/**
 * Media picker for posts/comments.
 * - Browse (file input) only — no drag-and-drop UI.
 * - Responsive square grid; click a tile to open a fullscreen preview.
 * - Local blob previews + spinner overlay while each upload is in-flight.
 * - `panel` shows an add prompt when empty; `compact` only shows tiles.
 * - `toolbarOnly`: hide empty UI and inline add tile; use ref `openFilePicker()` from parent.
 */
export const NetworkMediaPicker = forwardRef<NetworkMediaPickerHandle, Props>(
  function NetworkMediaPicker(
    {
      urls,
      onUrlsChange,
      maxFiles = 8,
      disabled,
      addLabel = 'Add photos & videos',
      variant = 'panel',
      toolbarOnly = false,
      onBusyChange,
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [pending, setPending] = useState<Pending[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<{
      src: string;
      isVideo: boolean;
    } | null>(null);

    // Mirror the latest committed `urls` so concurrent uploads can append
    // without stomping each other (React state is async).
    const urlsRef = useRef(urls);
    useEffect(() => {
      urlsRef.current = urls;
    }, [urls]);

    const totalCount = urls.length + pending.length;
    const remaining = Math.max(0, maxFiles - totalCount);
    const hasAny = totalCount > 0;
    const canAddMore = remaining > 0 && !disabled;
    const isCompact = variant === 'compact';
    const busy = pending.length > 0;

    // Stable handle — read-time refs (no deps) so it survives every re-render.
    // Policy (disabled / remaining) is enforced inside `processFiles`.
    useImperativeHandle(
      ref,
      () => ({
        openFilePicker: () => inputRef.current?.click(),
      }),
      [],
    );

    // Notify parent on busy transitions only (avoids spamming on every render).
    const wasBusyRef = useRef(false);
    useEffect(() => {
      if (busy !== wasBusyRef.current) {
        wasBusyRef.current = busy;
        onBusyChange?.(busy);
      }
    }, [busy, onBusyChange]);

    useEffect(() => {
      return () => {
        pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      };
      // We only want to release blob URLs once when the component unmounts.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function processFiles(rawFiles: File[]) {
      if (!rawFiles.length) return;
      if (disabled) {
        setError('Posting in progress — please wait.');
        return;
      }
      const room = maxFiles - urlsRef.current.length - pending.length;
      if (room <= 0) {
        setError(`You've reached the limit of ${maxFiles} attachments.`);
        return;
      }
      const accepted = rawFiles
        .filter(
          (f) => f.type.startsWith('image/') || f.type.startsWith('video/'),
        )
        .slice(0, room);
      if (accepted.length < rawFiles.length) {
        setError('Only images and videos are supported.');
      } else {
        setError(null);
      }
      if (!accepted.length) return;

      const queued: Pending[] = accepted.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        previewUrl: URL.createObjectURL(file),
        isVideo: file.type.startsWith('video/'),
      }));
      setPending((prev) => [...prev, ...queued]);

      await Promise.all(
        accepted.map(async (file, i) => {
          const item = queued[i];
          try {
            const url = await uploadNetworkMediaFile(file);
            const next = [...urlsRef.current, url];
            urlsRef.current = next;
            onUrlsChange(next);
          } catch (err) {
            console.error('[NetworkMediaPicker] upload failed', {
              name: file.name,
              type: file.type,
              size: file.size,
              error: err,
            });
            const msg =
              err instanceof Error && err.message
                ? err.message
                : 'Upload failed. Try another file.';
            setError(msg);
          } finally {
            URL.revokeObjectURL(item.previewUrl);
            setPending((prev) => prev.filter((p) => p.id !== item.id));
          }
        }),
      );
    }

    function pickFromInput(e: React.ChangeEvent<HTMLInputElement>) {
      // Snapshot the FileList BEFORE clearing input value: in some browsers
      // (and React 19 strict mode) `e.target.files` is a live collection that
      // empties the moment we reset the value, dropping the upload silently.
      const list = e.target.files;
      const files = list && list.length > 0 ? Array.from(list) : [];
      e.target.value = '';
      if (files.length === 0) return;
      void processFiles(files);
    }

    const closePreview = useCallback(() => setPreview(null), []);

    useEffect(() => {
      if (!preview) return;
      function onKey(e: KeyboardEvent) {
        if (e.key === 'Escape') closePreview();
      }
      document.addEventListener('keydown', onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', onKey);
        document.body.style.overflow = prev;
      };
    }, [preview, closePreview]);

    function remove(url: string) {
      const next = urls.filter((u) => u !== url);
      urlsRef.current = next;
      onUrlsChange(next);
    }

    // --- Toolbar-only: hidden input, no empty UI (parent opens picker) -------
    if (toolbarOnly && !hasAny) {
      return (
        <div className="min-h-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={pickFromInput}
          />
          {error ? (
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          ) : null}
        </div>
      );
    }

    // --- Empty state (panel only) -------------------------------------------
    if (!isCompact && !hasAny && !toolbarOnly) {
      return (
        <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-900/60">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={pickFromInput}
          />
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 sm:py-12">
            <span
              aria-hidden
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
            >
              <PhotoIcon size={26} />
            </span>
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                {addLabel}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Up to {maxFiles} photos or videos. Click preview after adding.
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Browse files
            </button>
          </div>

          {error && (
            <p className="px-4 pb-4 text-xs text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
        </div>
      );
    }

    // --- Tile grid -----------------------------------------------------------
    const tiles: Array<
      | { kind: 'url'; url: string }
      | { kind: 'pending'; item: Pending }
    > = [
      ...urls.map((url) => ({ kind: 'url' as const, url })),
      ...pending.map((item) => ({ kind: 'pending' as const, item })),
    ];

    return (
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={pickFromInput}
        />

        {preview
          ? createPortal(
              <MediaPreviewModal preview={preview} onClose={closePreview} />,
              document.body,
            )
          : null}

        <div className="relative rounded-2xl">
          <ul
            className={
              isCompact
                ? 'flex flex-wrap gap-2'
                : 'grid grid-cols-3 gap-2 sm:grid-cols-4'
            }
          >
            {tiles.map((tile) =>
              tile.kind === 'url' ? (
                <Tile
                  key={`url-${tile.url}`}
                  src={tile.url}
                  isVideo={isCloudinaryVideoUrl(tile.url)}
                  onRemove={!disabled ? () => remove(tile.url) : undefined}
                  compact={isCompact}
                  onPreview={() =>
                    setPreview({
                      src: tile.url,
                      isVideo: isCloudinaryVideoUrl(tile.url),
                    })
                  }
                />
              ) : (
                <Tile
                  key={`pending-${tile.item.id}`}
                  src={tile.item.previewUrl}
                  isVideo={tile.item.isVideo}
                  pending
                  compact={isCompact}
                  onPreview={() =>
                    setPreview({
                      src: tile.item.previewUrl,
                      isVideo: tile.item.isVideo,
                    })
                  }
                />
              ),
            )}

            {canAddMore && !toolbarOnly && (
              <li
                className={
                  isCompact ? 'h-16 w-16 shrink-0' : 'aspect-square'
                }
              >
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border border-slate-300 bg-slate-50 text-slate-600 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  aria-label="Browse to add more media"
                >
                  <PlusIcon />
                  {!isCompact && (
                    <span className="text-[0.7rem] font-medium">Browse</span>
                  )}
                </button>
              </li>
            )}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2 text-[0.7rem]">
          <span className="text-slate-600 dark:text-slate-300">
            {totalCount} / {maxFiles} attached
            {busy && (
              <span className="ml-1 font-semibold text-accent">· uploading…</span>
            )}
          </span>
          {error && (
            <span className="font-medium text-red-700 dark:text-red-300">{error}</span>
          )}
        </div>
      </div>
    );
  },
);

function Tile({
  src,
  isVideo,
  onRemove,
  onPreview,
  pending,
  compact,
}: {
  src: string;
  isVideo: boolean;
  onRemove?: () => void;
  onPreview: () => void;
  pending?: boolean;
  compact?: boolean;
}) {
  return (
    <li
      className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900 ${
        compact ? 'h-16 w-16 shrink-0' : 'aspect-square'
      }`}
    >
      <button
        type="button"
        onClick={onPreview}
        className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
        aria-label={pending ? 'Preview media (still uploading)' : 'Preview media'}
      />

      {isVideo ? (
        <video
          src={src}
          className="pointer-events-none relative z-0 h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={src}
          alt=""
          className="pointer-events-none relative z-0 h-full w-full object-cover"
          loading="lazy"
        />
      )}

      {isVideo && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1.5 top-1.5 z-[1] inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[0.6rem] font-semibold text-white backdrop-blur-sm"
        >
          <PlayGlyph /> Video
        </span>
      )}

      {pending && (
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
          <UploadingSpinner />
        </div>
      )}

      {onRemove && !pending && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove attachment"
          className={`absolute right-1.5 top-1.5 z-[3] flex items-center justify-center rounded-full bg-black/65 text-white shadow-md backdrop-blur-sm transition hover:bg-black/85 ${
            compact
              ? 'h-5 w-5 text-[11px]'
              : 'h-7 w-7 text-sm opacity-0 group-hover:opacity-100 focus:opacity-100'
          }`}
        >
          <CloseGlyph />
        </button>
      )}
    </li>
  );
}

function MediaPreviewModal({
  preview,
  onClose,
}: {
  preview: { src: string; isVideo: boolean };
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Media preview"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close preview"
        className="absolute right-4 top-4 z-[101] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <CloseGlyphLarge />
      </button>
      <div
        className="max-h-[min(90vh,900px)] max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {preview.isVideo ? (
          <video
            src={preview.src}
            controls
            playsInline
            className="max-h-[min(90vh,900px)] max-w-full rounded-lg shadow-2xl"
          />
        ) : (
          <img
            src={preview.src}
            alt=""
            className="max-h-[min(90vh,900px)] max-w-full rounded-lg object-contain shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}

function CloseGlyphLarge() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PhotoIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="9" r="1.6" />
      <path d="m21 16-5-5-9 9" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function UploadingSpinner() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.55" />
    </svg>
  );
}
