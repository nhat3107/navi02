import { Link } from 'react-router-dom';
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
  onImageClick,
}: {
  urls: string[];
  className?: string;
  variant?: Variant;
  /** When set (and `onImageClick` is not), images in the `feed` variant link to this route. */
  linkTo?: string;
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
          className={`flex w-full justify-center bg-neutral-50 dark:bg-black ${className}`.trim()}
        >
          {renderItem(urls[0], 0)}
        </div>
      );
    }

    return (
      <div
        className={`flex w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden bg-neutral-50 dark:bg-black [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`.trim()}
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
          className="overflow-hidden rounded-2xl border border-slate-200 bg-neutral-50 dark:border-slate-700 dark:bg-black/30"
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
