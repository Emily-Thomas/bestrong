import Image from 'next/image';
import { cn } from '@/lib/utils';

/** @see `/public/scout-mark.svg` (asset from brand package) */
const MARK = '/scout-mark.svg';
/** @see `/public/scout-wordmark.svg` (mark + “scout” wordmark) */
const WORDMARK = '/scout-wordmark.svg';

const MARK_VIEW = 120;

const markSizeClass: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
};

type ScoutMarkProps = {
  size?: keyof typeof markSizeClass;
  className?: string;
  withAlt?: boolean;
};

/**
 * Logomark only. For nav icons and compact touchpoints.
 */
export function ScoutMark({
  size = 'md',
  className,
  withAlt = true,
}: ScoutMarkProps) {
  return (
    <Image
      src={MARK}
      alt={withAlt ? 'Scout' : ''}
      width={MARK_VIEW}
      height={MARK_VIEW}
      unoptimized
      className={cn('shrink-0 object-contain', markSizeClass[size], className)}
    />
  );
}

type ScoutWordmarkProps = {
  className?: string;
  withAlt?: boolean;
  /** Tailwind height utilities (default keeps ~3.1:1 width via w-auto) */
  heightClass?: string;
  priority?: boolean;
};

/**
 * Mark + “scout” typesetting. SVG text uses General Sans; ensure the font is loaded
 * in `app/layout.tsx` or accept system-ui fallback in the wordmark.
 */
export function ScoutWordmark({
  className,
  withAlt = true,
  heightClass = 'h-7',
  priority = false,
}: ScoutWordmarkProps) {
  return (
    <Image
      src={WORDMARK}
      alt={withAlt ? 'Scout — AI training companion' : ''}
      width={340}
      height={110}
      unoptimized
      priority={priority}
      className={cn(
        'w-auto max-w-full shrink-0 object-contain object-left',
        heightClass,
        className
      )}
    />
  );
}

export { ScoutMark as ScoutLogoMark };
