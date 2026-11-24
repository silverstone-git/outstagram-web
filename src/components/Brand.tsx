import mark from '../assets/brand/mark.svg';

/** The Outstagram gradient mark (logo kit: assets/01-icon-gradient.svg). */
export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return <img src={mark} alt="" aria-hidden="true" className={`shrink-0 select-none ${className}`} draggable={false} />;
}

/** Mark + "Outsta"/"gram" wordmark. The wordmark is live text so it follows the theme and has no gap. */
export function BrandLogo({ size = 'md', showMark = true, className = '' }: {
  size?: 'sm' | 'md' | 'lg';
  showMark?: boolean;
  className?: string;
}) {
  const text = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' }[size];
  const markCls = { sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-12 w-12' }[size];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="Outstagram" role="img">
      {showMark && <BrandMark className={markCls} />}
      <span className={`${text} font-extrabold tracking-tight leading-none`} aria-hidden="true">
        <span className="text-foreground">Outsta</span><span className="text-primary">gram</span>
      </span>
    </span>
  );
}
