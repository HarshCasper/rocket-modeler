import { useAppStore } from '../state/store';
import { FlightViewer } from './FlightViewer';
import { FlightHUD } from './FlightHUD';
import { FlightControls } from './FlightControls';
import { useSimulation } from './useSimulation';

export function FlightMode() {
  const rocket = useAppStore((s) => s.rocket);
  const flight = useAppStore((s) => s.flight);
  const sim = useSimulation({ rocket, config: flight });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 p-4 h-full">
      <section className="rounded-lg border border-nasa/15 bg-white shadow-sm overflow-hidden">
        <FlightViewer
          rocket={rocket}
          sample={sim.sample}
          launchAngle={flight.launchAngle}
          countdown={sim.countdown}
        />
      </section>
      <aside className="rounded-lg border border-nasa/15 bg-white shadow-sm p-4 space-y-4 overflow-y-auto">
        <FlightHUD sample={sim.sample} maxAlt={sim.maxAlt} />
        <FlightControls
          runState={sim.runState}
          onStart={sim.start}
          onPause={sim.pause}
          onResume={sim.resume}
          onReset={sim.reset}
        />
      </aside>
    </div>
  );
}
