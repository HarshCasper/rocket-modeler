interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4">
      <div className="bg-white rounded-lg shadow-xl border border-nasa/20 w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-nasa">About RocketModeler</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink/40 hover:text-ink text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-ink/80">
          Inspired by NASA Glenn Research Center's RocketModeler (Eric Bishop, c. 2002). The
          original applet is public-domain US government work. This is an independent modern
          rebuild, not affiliated with or endorsed by NASA.
        </p>

        <div className="text-sm text-ink/70 space-y-2">
          <p>
            <strong>Built with:</strong> TypeScript, React, Vite, Tailwind CSS, Web Audio API.
          </p>
          <p>
            <strong>Physics:</strong> faithful CG calculation ported from the original applet,
            with upgraded Barrowman center-of-pressure and ISA atmosphere.
          </p>
          <p>
            <strong>Source:</strong>{' '}
            <span className="font-mono text-xs">github.com/harshcasper/rocket-modeler</span>
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded text-sm font-medium bg-nasa text-white hover:bg-nasa-light"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
