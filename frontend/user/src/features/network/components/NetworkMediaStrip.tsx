import { Link } from 'react-router-dom';
import type { PostOverlayNavigationState } from '../../../shared/constants/routes';
import { isCloudinaryVideoUrl } from '../../../shared/lib/cloudinary';

type Variant = 'default' | 'feed';

/**
 * Renders post/comment attachments (images + Cloudinary videos).
 *
 * `feed` variant: images are shown at their full aspect ratio (no cropping).
 * Image interaction precedence: `onImageClick` (lightbox) > `linkTo` (route).
 * Videos always keep their native controls — a wrapping link/button would
 * intercept playback toggles and is intentionally skipped.
 */
export function NetworkMediaStrip({
  urls,
  className = '',
  variant = 'default',
  linkTo,
  linkState,
  onImageClick,
}: {
  urls: string[];
  className?: string;
  variant?: Variant;
  /** When set (and `onImageClick` is not), images in the `feed` variant link to this route. */
  linkTo?: string;
  /** Optional navigation state (e.g. modal overlay). */
  linkState?: PostOverlayNavigationState;
  /** Receives the index of the image clicked. Use this to open a fullscreen viewer. */
  onImageClick?: (index: number) => void;
}) {
  if (!urls.length) return null;

  if (variant === 'feed') {
    const renderItem = (url: string, index: number) => {
      if (isCloudinaryVideoUrl(url)) {
        return (
          <video
            src={url}
            controls
            playsInline
            preload="metadata"
            className="block max-h-[80vh] w-auto max-w-full object-contain"
          />
        );
      }

      const img = (
        <img
          src={url}
          alt=""
          className="block max-h-[80vh] w-auto max-w-full object-contain transition-opacity duration-150 hover:opacity-95"
          loading="lazy"
        />
      );

      if (onImageClick) {
        return (
          <button
            type="button"
            onClick={() => onImageClick(index)}
            aria-label="Open image"
            className="block w-auto max-w-full cursor-zoom-in"
          >
            {img}
          </button>
        );
      }
      if (linkTo) {
        return (
          <Link
            to={linkTo}
            state={linkState}
            aria-label="Open post"
            className="block w-auto max-w-full"
          >
            {img}
          </Link>
        );
      }
      return img;
    };

    const renderFeedMedia = (url: string, index: number, nestedInLink: boolean) => {
      if (isCloudinaryVideoUrl(url)) {
        return (
          <video
            src={url}
            controls={!nestedInLink}
            muted={nestedInLink}
            playsInline
            preload="metadata"
            className="block max-h-[80vh] w-auto max-w-full object-contain"
          />
        );
      }

      const img = (
        <img
          src={url}
          alt=""
          className="block max-h-[80vh] w-auto max-w-full object-contain transition-opacity duration-150 hover:opacity-95"
          loading="lazy"
        />
      );

      if (onImageClick) {
        return (
          <button
            type="button"
            onClick={() => onImageClick(index)}
            aria-label="Open image"
            className="block w-auto max-w-full cursor-zoom-in"
          >
            {img}
          </button>
        );
      }
      if (nestedInLink) return img;
      if (linkTo) {
        return (
          <Link
            to={linkTo}
            state={linkState}
            aria-label="Open post"
            className="block w-auto max-w-full"
          >
            {img}
          </Link>
        );
      }
      return img;
    };

    if (urls.length === 1) {
      return (
        <div
          className={`flex w-full justify-center bg-slate-50 dark:bg-slate-950 ${className}`.trim()}
        >
          {renderItem(urls[0], 0)}
        </div>
      );
    }

    if (linkTo && !onImageClick) {
      const extra = urls.length - 1;
      return (
        <Link
          to={linkTo}
          state={linkState}
          aria-label={`Open post — ${urls.length} media items`}
          className={`relative block w-full bg-slate-50 dark:bg-slate-950 ${className}`.trim()}
        >
          <div className="flex w-full justify-center">
            {renderFeedMedia(urls[0], 0, true)}
          </div>
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
            aria-hidden
          />
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
            <span className="rounded-full bg-black/60 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
              Click to see more
            </span>
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur-sm">
              +{extra}
            </span>
          </div>
        </Link>
      );
    }

    return (
      <div
        className={`flex w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden bg-slate-50 dark:bg-slate-950 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`.trim()}
      >
        {urls.map((url, i) => (
          <div
            key={url}
            className="flex w-full shrink-0 snap-center snap-always justify-center"
          >
            {renderItem(url, i)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className={`grid gap-2 sm:grid-cols-2 ${className}`.trim()}>
      {urls.map((url, i) => (
        <li
          key={url}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40"
        >
          {isCloudinaryVideoUrl(url) ? (
            <video
              src={url}
              controls
              playsInline
              preload="metadata"
              className="max-h-72 w-full object-contain"
            />
          ) : onImageClick ? (
            <button
              type="button"
              onClick={() => onImageClick(i)}
              aria-label="Open image"
              className="block w-full cursor-zoom-in"
            >
              <img
                src={url}
                alt=""
                className="max-h-72 w-full object-contain transition-opacity duration-150 hover:opacity-95"
                loading="lazy"
              />
            </button>
          ) : (
            <a href={url} target="_blank" rel="noreferrer" className="block">
              <img
                src={url}
                alt=""
                className="max-h-72 w-full object-contain"
                loading="lazy"
              />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
