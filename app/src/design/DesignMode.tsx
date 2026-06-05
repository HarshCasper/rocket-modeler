import { useState } from 'react';
import { DimensionsPanel } from './DimensionsPanel';
import { EnginesPanel } from './EnginesPanel';
import { RocketViewer } from './RocketViewer';
import { MetricsReadout } from './MetricsReadout';
import { MaterialsPanel } from './MaterialsPanel';
import { PRESETS } from '../domain/presets';
import { useAppStore } from '../state/store';
import { pushToast } from '../ui/Toast';

type PanelTab = 'geometry' | 'engines' | 'materials';

export function DesignMode() {
  const [tab, setTab] = useState<PanelTab>('geometry');
  const setRocket = useAppStore((s) => s.setRocket);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 p-4 h-full">
      <section className="rounded-lg border border-nasa/15 bg-white shadow-sm flex flex-col min-h-[400px]">
        <div className="flex items-center gap-2 border-b border-nasa/10 px-4 py-2 text-xs">
          <span className="text-ink/40 uppercase tracking-wider">Presets</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setRocket(p.rocket);
                pushToast(`Loaded ${p.name}`, 'info');
              }}
              className="px-2.5 py-0.5 rounded-full border border-nasa/15 bg-paper text-nasa hover:bg-nasa/10 transition-colors"
              title={p.blurb}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="flex-1 grid place-items-center bg-blueprint bg-grid overflow-hidden">
          <RocketViewer />
        </div>
        <div className="border-t border-nasa/15 px-4 py-3">
          <MetricsReadout />
        </div>
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
        {tab === 'materials' && <MaterialsPanel />}
      </aside>
    </div>
  );
}
