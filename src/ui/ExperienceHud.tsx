import {
  ExperiencePhase,
  type ExperienceSnapshot,
} from '../experience/ExperienceState';

interface ExperienceHudProps {
  snapshot: ExperienceSnapshot;
  onToggleVr: () => void;
  onRestartDescent: () => void;
}

const PHASE_LABEL: Record<ExperiencePhase, string> = {
  [ExperiencePhase.BOOTSTRAP]: 'Preparing NASA Imagery',
  [ExperiencePhase.SPACE_IDLE]: 'Outer Space · Orbiting Moon',
  [ExperiencePhase.FALLING]: 'Descending Toward the Moon',
  [ExperiencePhase.TRANSITION]: 'Approaching Taurus-Littrow',
  [ExperiencePhase.SURFACE_EXPLORATION]: 'Lunar Surface · Taurus-Littrow',
};

/**
 * Clean, minimal viewport HUD layered over the full-screen WebGL canvas.
 * Preserves 100% unobstructed viewport center with zero menus, zero region selectors,
 * zero backdrop-blur over WebGL, and zero pulsing dots.
 */
export function ExperienceHud({
  snapshot,
  onToggleVr,
  onRestartDescent,
}: ExperienceHudProps) {
  const isExploring = snapshot.phase === ExperiencePhase.SURFACE_EXPLORATION;
  const isDescending =
    snapshot.phase === ExperiencePhase.FALLING ||
    snapshot.phase === ExperiencePhase.TRANSITION;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-6">
      <header className="flex items-start justify-between gap-6">
        <div className="pointer-events-auto select-none">
          <h1
            className="text-xl font-semibold tracking-tight text-slate-100"
            style={{ fontFamily: '"Syne", sans-serif' }}
          >
            MoonWalk VR
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <span>{PHASE_LABEL[snapshot.phase]}</span>
            {snapshot.phase === ExperiencePhase.BOOTSTRAP && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-300">
                  {snapshot.assetsLoaded}/{snapshot.assetsTotal} Photos
                </span>
              </>
            )}
            {isDescending && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-slate-300">
                  {Math.round(snapshot.descentProgress * 100)}%
                </span>
              </>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          {isExploring && (
            <button
              type="button"
              onClick={onRestartDescent}
              className="cursor-pointer rounded-md border border-slate-700/80 bg-slate-950/90 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap shrink-0"
            >
              Replay Descent
            </button>
          )}
          {snapshot.vrSupported ? (
            <button
              type="button"
              onClick={onToggleVr}
              className="cursor-pointer rounded-md border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              {snapshot.inVr ? 'Exit VR' : 'Enter VR'}
            </button>
          ) : (
            <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
              Desktop Mode · WebXR Ready
            </span>
          )}
        </div>
      </header>

      {snapshot.contextLost && (
        <div className="pointer-events-auto mx-auto rounded-md border border-amber-500/40 bg-slate-950 px-4 py-2 text-xs text-amber-200">
          WebGL rendering context interrupted — awaiting GPU restoration.
        </div>
      )}

      <footer className="flex items-end justify-between gap-4 text-xs text-slate-400">
        {isExploring ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-300">
            <span>
              {snapshot.pointerLocked
                ? 'Mouse Look Active (Esc to release)'
                : 'Click or Drag to Look Around'}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>WASD Walk</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>Space Jump</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="font-mono tabular-nums text-slate-400">
              {snapshot.isGrounded ? 'Grounded' : 'Lunar Airborne (1.62 m/s²)'}
            </span>
          </div>
        ) : (
          <span className="text-slate-400">
            Click or Drag Viewport to Look Around
          </span>
        )}

        <span className="font-mono tabular-nums text-slate-500 whitespace-nowrap shrink-0">
          NASA Apollo &amp; LRO Photography
        </span>
      </footer>
    </div>
  );
}
