import { useState } from 'react';
import { useAppStore } from './state/store';
import { DesignMode } from './design/DesignMode';
import { FlightMode } from './flight/FlightMode';
import { useUrlSync, copyShareLink } from './url/useUrlSync';
import { AboutModal } from './ui/AboutModal';

export default function App() {
  useUrlSync();
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const [copied, setCopied] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <header className="flex items-center gap-4 px-6 py-3 border-b border-nasa/15 bg-white">
        <h1 className="text-xl font-semibold tracking-tight text-nasa flex items-baseline">
          RocketModeler
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="ml-2 text-xs font-normal text-ink/50 hover:text-nasa underline-offset-2 hover:underline"
            title="About"
          >
            v1 · about
          </button>
        </h1>
        <nav className="ml-4 inline-flex rounded-full border border-nasa/20 p-1 bg-paper">
          <button
            type="button"
            onClick={() => setMode('design')}
            className={
              'px-4 py-1 rounded-full text-sm font-medium transition-colors ' +
              (mode === 'design'
                ? 'bg-nasa text-white shadow-sm'
                : 'text-nasa hover:bg-nasa/10')
            }
          >
            Design
          </button>
          <button
            type="button"
            onClick={() => setMode('flight')}
            className={
              'px-4 py-1 rounded-full text-sm font-medium transition-colors ' +
              (mode === 'flight'
                ? 'bg-nasa text-white shadow-sm'
                : 'text-nasa hover:bg-nasa/10')
            }
          >
            Launch ▸
          </button>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <SoundToggle />
          <button
            type="button"
            onClick={async () => {
              const ok = await copyShareLink();
              if (ok) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }
            }}
            className="text-xs text-nasa border border-nasa/20 rounded-full px-3 py-1 hover:bg-nasa/10 transition-colors"
          >
            {copied ? '✓ Link copied' : 'Copy share link'}
          </button>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        {mode === 'design' ? <DesignMode /> : <FlightMode />}
      </main>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

function SoundToggle() {
  const enabled = useAppStore((s) => s.flight.soundEnabled);
  const updateFlight = useAppStore((s) => s.updateFlight);
  return (
    <button
      type="button"
      onClick={() => updateFlight((f) => ({ ...f, soundEnabled: !f.soundEnabled }))}
      className="text-xs border border-nasa/20 rounded-full px-2.5 py-1 hover:bg-nasa/10 transition-colors"
      title={enabled ? 'Sound on' : 'Sound off'}
      aria-pressed={enabled}
    >
      {enabled ? '🔊' : '🔈'}
    </button>
  );
}
