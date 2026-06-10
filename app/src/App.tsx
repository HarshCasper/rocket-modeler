import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './state/store';
import { DesignMode } from './design/DesignMode';
import { FlightMode } from './flight/FlightMode';
import { useUrlSync, copyShareLink } from './url/useUrlSync';
import { AboutModal } from './ui/AboutModal';
import { ToastHost, pushToast } from './ui/Toast';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function App() {
  useUrlSync();
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const [copied, setCopied] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setMode('design');
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setMode('flight');
      } else if (e.key === '?') {
        e.preventDefault();
        setAboutOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setAboutOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setMode]);

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
            v1.1 · about
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
                pushToast('Share link copied to clipboard', 'success');
              } else {
                pushToast('Could not access clipboard', 'error');
              }
            }}
            className="text-xs text-nasa border border-nasa/20 rounded-full px-3 py-1 hover:bg-nasa/10 transition-colors"
          >
            {copied ? '✓ Link copied' : 'Copy share link'}
          </button>
        </div>
      </header>
      <main className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            className="absolute inset-0"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {mode === 'design' ? <DesignMode /> : <FlightMode />}
          </motion.div>
        </AnimatePresence>
      </main>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <ToastHost />
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
      className="inline-flex items-center gap-1 text-xs border border-nasa/20 rounded-full px-2.5 py-1 hover:bg-nasa/10 transition-colors"
      title={enabled ? 'Sound on — click to mute' : 'Sound off — click to enable'}
      aria-label={enabled ? 'Mute sound' : 'Enable sound'}
      aria-pressed={enabled}
    >
      <span aria-hidden="true">{enabled ? '🔊' : '🔈'}</span>
      <span className="sr-only">{enabled ? 'Sound on' : 'Sound off'}</span>
    </button>
  );
}
