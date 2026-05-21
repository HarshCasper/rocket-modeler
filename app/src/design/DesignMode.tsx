import { useState } from 'react';
import { DimensionsPanel } from './DimensionsPanel';
import { EnginesPanel } from './EnginesPanel';
import { RocketViewer } from './RocketViewer';

type PanelTab = 'geometry' | 'engines' | 'materials';

export function DesignMode() {
  const [tab, setTab] = useState<PanelTab>('geometry');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 p-4 h-full">
      <section className="rounded-lg border border-nasa/15 bg-white shadow-sm grid place-items-center min-h-[400px] bg-blueprint bg-grid">
        <RocketViewer />
      </section>
      <aside className="rounded-lg border border-nasa/15 bg-white shadow-sm p-4 space-y-3 overflow-y-auto">
        <div className="inline-flex rounded-full border border-nasa/15 p-0.5 bg-paper">
          {(['geometry', 'engines', 'materials'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                'px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ' +
                (tab === t
                  ? 'bg-nasa text-white'
                  : 'text-nasa hover:bg-nasa/10')
              }
            >
              {t}
            </button>
          ))}
        </div>
        {tab === 'geometry' && <DimensionsPanel />}
        {tab === 'engines' && <EnginesPanel />}
        {tab === 'materials' && (
          <div className="text-sm text-ink/40">Materials panel — coming soon.</div>
        )}
      </aside>
    </div>
  );
}
