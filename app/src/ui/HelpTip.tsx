import { useEffect, useRef, useState } from 'react';

interface HelpTipProps {
  text: string;
  align?: 'left' | 'right';
}

export function HelpTip({ text, align = 'left' }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-nasa/30 text-[9px] font-bold text-nasa/60 hover:text-nasa hover:border-nasa transition-colors leading-none"
        aria-label="More info"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className={
            'absolute z-30 top-full mt-1 w-56 p-2 rounded-md border border-nasa/20 bg-white text-[11px] leading-snug text-ink/80 shadow-md font-normal normal-case tracking-normal ' +
            (align === 'right' ? 'right-0' : 'left-0')
          }
        >
          {text}
        </span>
      )}
    </span>
  );
}
