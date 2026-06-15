import { useId, useState, useEffect } from 'react';

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (next: number) => void;
  disabled?: boolean;
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit,
  onChange,
  disabled,
}: SliderFieldProps) {
  const id = useId();
  const [text, setText] = useState(value.toString());

  useEffect(() => {
    setText(value.toFixed(step >= 1 ? 0 : 1));
  }, [value, step]);

  function commitText() {
    const parsed = parseFloat(text);
    if (!Number.isFinite(parsed)) {
      setText(value.toString());
      return;
    }
    const clamped = Math.max(min, Math.min(max, parsed));
    onChange(clamped);
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <label htmlFor={id} className="text-xs font-medium text-ink/70 dark:text-paper/70">
          {label}
        </label>
        <div className="flex items-baseline gap-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            }}
            disabled={disabled}
            className="w-16 text-right font-mono text-sm tabular-nums bg-paper dark:bg-ink/40 dark:text-paper border border-nasa/15 dark:border-white/15 rounded px-1.5 py-0.5 focus:outline-none focus:border-nasa dark:focus:border-rocket-tube disabled:opacity-50"
          />
          {unit && <span className="text-xs text-ink/50 dark:text-paper/50">{unit}</span>}
        </div>
      </div>
      <input
        id={id}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-nasa cursor-pointer disabled:opacity-50"
      />
    </div>
  );
}
