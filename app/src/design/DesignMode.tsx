import { useRef, useState } from 'react';
import { DimensionsPanel } from './DimensionsPanel';
import { EnginesPanel } from './EnginesPanel';
import { RocketViewer } from './RocketViewer';
import { MetricsReadout } from './MetricsReadout';
import { MaterialsPanel } from './MaterialsPanel';
import { PRESETS } from '../domain/presets';
import { useAppStore } from '../state/store';
import { pushToast } from '../ui/Toast';

type PanelTab = 'geometry' | 'engines' | 'materials';

function exportSvgAsPng(svg: SVGSVGElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const cnv = document.createElement('canvas');
      const scale = 2;
      cnv.width = svg.clientWidth * scale;
      cnv.height = svg.clientHeight * scale;
      const ctx = cnv.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('no 2d context'));
        return;
      }
      ctx.fillStyle = '#F4F7FB';
      ctx.fillRect(0, 0, cnv.width, cnv.height);
      ctx.drawImage(img, 0, 0, cnv.width, cnv.height);
      cnv.toBlob((b) => {
        URL.revokeObjectURL(url);
        if (!b) {
          reject(new Error('toBlob failed'));
          return;
        }
        const downloadUrl = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        resolve();
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
  });
}

export function DesignMode() {
  const [tab, setTab] = useState<PanelTab>('geometry');
  const setRocket = useAppStore((s) => s.setRocket);
  const viewerSectionRef = useRef<HTMLElement>(null);

  async function handleExport() {
    const svg = viewerSectionRef.current?.querySelector('svg');
    if (!svg) return;
    try {
      await exportSvgAsPng(svg as SVGSVGElement, 'rocketmodeler-design.png');
      pushToast('Design exported as PNG', 'success');
    } catch {
      pushToast('PNG export failed', 'error');
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 p-4 h-full">
      <section ref={viewerSectionRef} className="rounded-lg border border-nasa/15 bg-white shadow-sm flex flex-col min-h-[400px] dark:bg-ink dark:border-white/10">
        <div className="flex items-center gap-2 border-b border-nasa/10 dark:border-white/10 px-4 py-2 text-xs flex-wrap">
          <span className="text-ink/40 dark:text-paper/40 uppercase tracking-wider">Presets</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setRocket(p.rocket);
                pushToast(`Loaded ${p.name}`, 'info');
              }}
              className="px-2.5 py-0.5 rounded-full border border-nasa/15 dark:border-white/15 bg-paper dark:bg-ink/40 text-nasa dark:text-rocket-tube hover:bg-nasa/10 dark:hover:bg-rocket-tube/15 transition-colors"
              title={p.blurb}
            >
              {p.name}
            </button>
          ))}
          <button
            type="button"
            onClick={handleExport}
            className="ml-auto px-2.5 py-0.5 rounded-full border border-nasa/15 dark:border-white/15 text-ink/60 dark:text-paper/60 hover:text-nasa dark:hover:text-rocket-tube hover:bg-nasa/5 dark:hover:bg-rocket-tube/15 transition-colors"
            title="Save the current rocket diagram as a PNG"
          >
            ↓ PNG
          </button>
        </div>
        <div className="flex-1 grid place-items-center bg-blueprint bg-grid overflow-hidden dark:bg-none dark:bg-ink/60">
          <RocketViewer />
        </div>
        <div className="border-t border-nasa/15 dark:border-white/10 px-4 py-3">
          <MetricsReadout />
        </div>
      </section>
      <aside className="rounded-lg border border-nasa/15 bg-white shadow-sm p-4 space-y-3 overflow-y-auto dark:bg-ink/80 dark:border-white/10 dark:text-paper">
        <div className="inline-flex rounded-full border border-nasa/15 dark:border-white/15 p-0.5 bg-paper dark:bg-ink/40">
          {(['geometry', 'engines', 'materials'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={
                'px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ' +
                (tab === t
                  ? 'bg-nasa text-white'
                  : 'text-nasa dark:text-rocket-tube hover:bg-nasa/10 dark:hover:bg-rocket-tube/15')
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
