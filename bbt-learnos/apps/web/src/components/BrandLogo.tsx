import Image from 'next/image';
import Link from 'next/link';

interface BrandLogoProps {
  href?: string;
  compact?: boolean;
  priority?: boolean;
}

export function BrandLogo({ href = '/', compact = false, priority = false }: BrandLogoProps): React.JSX.Element {
  const content = (
    <>
      <Image
        src="/bbt-emblem.png"
        alt="Big Binary Tech"
        width={48}
        height={64}
        className={compact ? 'h-10 w-auto' : 'h-12 w-auto'}
        priority={priority}
      />
      <span className="flex flex-col leading-none text-left">
        <span className="font-display text-2xl tracking-wide text-[var(--bbt-text-1)]">LEARNOS</span>
        {!compact && (
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--bbt-text-3)]">
            Train Intern Shadow Expert
          </span>
        )}
      </span>
    </>
  );

  return (
    <Link href={href} className="inline-flex items-center justify-center gap-3" aria-label="BBT LearnOS home">
      {content}
    </Link>
  );
}
