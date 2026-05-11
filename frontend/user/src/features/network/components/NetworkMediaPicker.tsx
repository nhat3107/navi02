import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
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
  /** Fires whenever the in-flight upload count crosses 0 ↔ >0. */
  onBusyChange?: (busy: boolean) => void;
};

/**
 * Modern media picker for posts/comments.
 * - Drag-and-drop or click to add.
 * - Responsive square grid with hover remove control.
 * - Local blob previews + spinner overlay while each upload is in-flight.
 * - `panel` shows a large dropzone when empty; `compact` only shows tiles.
 * - Parent can call `openFilePicker()` via ref (e.g. from a custom toolbar).
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
      onBusyChange,
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [pending, setPending] = useState<Pending[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const dragDepth = useRef(0);

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

    function onDrop(e: React.DragEvent<HTMLElement>) {
      e.preventDefault();
      dragDepth.current = 0;
      setDragOver(false);
      if (disabled) return;
      const dropped = e.dataTransfer?.files;
      const files = dropped && dropped.length > 0 ? Array.from(dropped) : [];
      if (files.length) void processFiles(files);
    }

    function onDragOver(e: React.DragEvent<HTMLElement>) {
      if (disabled) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }

    function onDragEnter(e: React.DragEvent<HTMLElement>) {
      if (disabled) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragOver(true);
    }

    function onDragLeave(e: React.DragEvent<HTMLElement>) {
      if (disabled) return;
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragOver(false);
    }

    function remove(url: string) {
      const next = urls.filter((u) => u !== url);
      urlsRef.current = next;
      onUrlsChange(next);
    }

    // --- Empty state (panel only) -------------------------------------------
    if (!isCompact && !hasAny) {
      return (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          className={`group relative w-full overflow-hidden rounded-2xl border-2 border-dashed text-center transition ${
            dragOver
              ? 'border-accent bg-accent-bg'
              : 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900/60 dark:hover:border-neutral-600'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={pickFromInput}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-3 px-6 py-10 text-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:text-neutral-100 sm:py-12"
          >
            <span
              aria-hidden
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-neutral-700 shadow-sm ring-1 ring-neutral-200 transition group-hover:scale-105 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-700"
            >
              <PhotoIcon size={26} />
            </span>
            <span className="text-base font-semibold">{addLabel}</span>
            <span className="text-xs text-neutral-600 dark:text-neutral-300">
              Drag &amp; drop, paste, or click to upload — up to {maxFiles}
            </span>
          </button>

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

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          className={`relative rounded-2xl ${
            dragOver
              ? 'ring-2 ring-accent ring-offset-1 ring-offset-white dark:ring-offset-neutral-950'
              : ''
          }`}
        >
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
                />
              ) : (
                <Tile
                  key={`pending-${tile.item.id}`}
                  src={tile.item.previewUrl}
                  isVideo={tile.item.isVideo}
                  pending
                  compact={isCompact}
                />
              ),
            )}

            {canAddMore && (
              <li
                className={
                  isCompact ? 'h-16 w-16 shrink-0' : 'aspect-square'
                }
              >
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-neutral-100"
                  aria-label="Add more media"
                >
                  <PlusIcon />
                  {!isCompact && (
                    <span className="text-[0.7rem] font-medium">Add more</span>
                  )}
                </button>
              </li>
            )}
          </ul>

          {dragOver && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-accent-bg/70 text-sm font-semibold text-accent backdrop-blur-sm dark:bg-accent-bg/40">
              Drop to upload
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 text-[0.7rem]">
          <span className="text-neutral-600 dark:text-neutral-300">
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
  pending,
  compact,
}: {
  src: string;
  isVideo: boolean;
  onRemove?: () => void;
  pending?: boolean;
  compact?: boolean;
}) {
  return (
    <li
      className={`group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 ${
        compact ? 'h-16 w-16 shrink-0' : 'aspect-square'
      }`}
    >
      {isVideo ? (
        <video
          src={src}
          className="h-full w-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      )}

      {isVideo && (
        <span
          aria-hidden
          className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[0.6rem] font-semibold text-white backdrop-blur-sm"
        >
          <PlayGlyph /> Video
        </span>
      )}

      {pending && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
          <UploadingSpinner />
        </div>
      )}

      {onRemove && !pending && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove attachment"
          className={`absolute right-1.5 top-1.5 flex items-center justify-center rounded-full bg-black/65 text-white shadow-md backdrop-blur-sm transition hover:bg-black/85 ${
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
