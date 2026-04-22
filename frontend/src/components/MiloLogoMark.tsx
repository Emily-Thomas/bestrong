import Image from 'next/image';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg' | 'header';

const styles: Record<
  Size,
  { box: string; img: string; width: number; height: number; rounded: string }
> = {
  sm: {
    box: 'h-9 w-9 p-0.5',
    img: 'h-7 w-7',
    width: 120,
    height: 120,
    rounded: 'rounded-lg',
  },
  md: {
    box: 'h-10 w-10 p-1',
    img: 'h-8 w-8',
    width: 120,
    height: 120,
    rounded: 'rounded-xl',
  },
  lg: {
    box: 'h-12 w-12 p-1',
    img: 'h-9 w-9',
    width: 160,
    height: 160,
    rounded: 'rounded-xl',
  },
  /** Portrait-friendly tile for full lockup (dog + wordmark) */
  header: {
    box: 'h-16 w-[4.25rem] min-w-0 sm:h-[4.25rem] sm:w-24 px-1.5 py-1',
    img: 'h-full w-full object-contain object-center',
    width: 200,
    height: 280,
    rounded: 'rounded-2xl',
  },
};

interface MiloLogoMarkProps {
  size?: Size;
  className?: string;
  /** When false, use alt="" for lockups with adjacent visible text (a11y) */
  withAlt?: boolean;
}

/**
 * Gold Milo mark in a warm tile so the PNG’s cream background blends with the UI.
 */
export function MiloLogoMark({
  size = 'md',
  className,
  withAlt = true,
}: MiloLogoMarkProps) {
  const s = styles[size];
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden border border-amber-200/50 bg-amber-50/90 shadow-sm dark:border-amber-800/40 dark:bg-amber-950/30',
        s.rounded,
        s.box,
        className
      )}
    >
      <Image
        src="/milo-logo-gold.png"
        alt={withAlt ? 'Milo' : ''}
        width={s.width}
        height={s.height}
        className={s.img}
        priority={size === 'header'}
      />
    </div>
  );
}
