import { useMemo } from 'react';
import { useAppStore } from '../state/store';
import { computeStageCg } from '../physics/cg';

// SVG renders the rocket side-on. Internal "world" is in cm; we map to SVG
// units with a scale factor and let the SVG viewBox handle responsiveness.
const PIXELS_PER_CM = 6;
const VIEW_WIDTH = 360;
const VIEW_HEIGHT = 460;
const BASELINE_Y = VIEW_HEIGHT - 30;

export function RocketViewer() {
  const rocket = useAppStore((s) => s.rocket);
  const stagesShowing = useAppStore((s) => s.stagesShowing);

  const { cg } = useMemo(() => computeStageCg(rocket, stagesShowing), [rocket, stagesShowing]);

  const bodyLengthPx = rocket.body.length * PIXELS_PER_CM;
  const bodyWidthPx = rocket.body.diameter * PIXELS_PER_CM;
  const noseConeLengthPx = rocket.noseCone.length * PIXELS_PER_CM;
  const finLengthPx = rocket.fins.length * PIXELS_PER_CM;
  const finWidthPx = rocket.fins.width * PIXELS_PER_CM;
  const finHeightPx = rocket.fins.height * PIXELS_PER_CM;

  const centerX = VIEW_WIDTH / 2;
  const bodyLeft = centerX - bodyWidthPx / 2;
  const bodyRight = centerX + bodyWidthPx / 2;
  const bodyTopY = BASELINE_Y - bodyLengthPx;
  const noseTipY = bodyTopY - noseConeLengthPx;

  const finTopY = BASELINE_Y - finHeightPx - finLengthPx;
  const finBottomY = BASELINE_Y - finHeightPx;

  const leftFin = `${bodyLeft},${finBottomY} ${bodyLeft - finWidthPx},${finBottomY} ${bodyLeft},${finTopY}`;
  const rightFin = `${bodyRight},${finBottomY} ${bodyRight + finWidthPx},${finBottomY} ${bodyRight},${finTopY}`;

  const cgY = BASELINE_Y - cg * PIXELS_PER_CM;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className="w-full h-full max-h-[600px]"
      role="img"
      aria-label="Rocket diagram"
    >
      {/* baseline */}
      <line
        x1={0}
        y1={BASELINE_Y}
        x2={VIEW_WIDTH}
        y2={BASELINE_Y}
        stroke="#0B3D91"
        strokeOpacity={0.2}
        strokeDasharray="4 3"
      />
      {/* body tube */}
      <rect
        x={bodyLeft}
        y={bodyTopY}
        width={bodyWidthPx}
        height={bodyLengthPx}
        fill="#4A90E2"
        stroke="#1A1A1A"
        strokeWidth={1}
      />
      {/* nose cone */}
      <polygon
        points={`${bodyLeft},${bodyTopY} ${centerX},${noseTipY} ${bodyRight},${bodyTopY}`}
        fill="#D63333"
        stroke="#1A1A1A"
        strokeWidth={1}
      />
      {/* fins */}
      <polygon points={leftFin} fill="#1A1A1A" />
      <polygon points={rightFin} fill="#1A1A1A" />
      {/* center fin line (suggests the 3rd/4th fin behind) */}
      <line
        x1={centerX}
        y1={finBottomY}
        x2={centerX}
        y2={finTopY}
        stroke="#1A1A1A"
        strokeWidth={1}
      />

      {/* CG marker — yin-yang style circle */}
      <g transform={`translate(${centerX}, ${cgY})`}>
        <circle r={9} fill="white" stroke="#0B1320" strokeWidth={1.2} />
        <path
          d="M -9,0 A 9 9 0 0 1 9,0 L 0,0 A 0 0 0 0 0 0,0 Z"
          fill="#0B1320"
        />
        <path d="M -9 0 A 9 9 0 0 0 0 0 L 0 0 Z" fill="#0B1320" />
        <path d="M 0 0 A 9 9 0 0 1 9 0 L 0 0 Z" fill="#0B1320" />
      </g>
    </svg>
  );
}
