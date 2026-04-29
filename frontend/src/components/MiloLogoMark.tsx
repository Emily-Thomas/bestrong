import Image from 'next/image';
import { cn } from '@/lib/utils';

/** @see `/public/milo-mark.svg` (asset from brand package) */
const MARK = '/milo-mark.svg';
/** @see `/public/milo-wordmark.svg` (mark + “milo” wordmark) */
const WORDMARK = '/milo-wordmark.svg';

const MARK_VIEW = 120;

const markSizeClass: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
};

type MiloMarkProps = {
  size?: keyof typeof markSizeClass;
  className?: string;
  withAlt?: boolean;
};

/**
 * Logomark only (round dog + signal collar). For nav icons and compact touchpoints.
 */
export function MiloMark({
  size = 'md',
  className,
  withAlt = true,
}: MiloMarkProps) {
  return (
    <Image
      src={MARK}
      alt={withAlt ? 'Milo' : ''}
      width={MARK_VIEW}
      height={MARK_VIEW}
      unoptimized
      className={cn('shrink-0 object-contain', markSizeClass[size], className)}
    />
  );
}

type MiloWordmarkProps = {
  className?: string;
  withAlt?: boolean;
  /** Tailwind height utilities (default keeps ~3.1:1 width via w-auto) */
  heightClass?: string;
  priority?: boolean;
};

/**
 * Mark + “milo” typesetting. SVG text uses General Sans; ensure the font is loaded
 * in `app/layout.tsx` or accept system-ui fallback in the wordmark.
 */
export function MiloWordmark({
  className,
  withAlt = true,
  heightClass = 'h-7',
  priority = false,
}: MiloWordmarkProps) {
  return (
    <Image
      src={WORDMARK}
      alt={withAlt ? 'Milo — AI training companion' : ''}
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

export { MiloMark as MiloLogoMark };
