import { useEffect, useRef, useState } from 'react';
import { MoonWalkEngine } from './core/MoonWalkEngine';
import {
  ExperiencePhase,
  type ExperienceSnapshot,
} from './experience/ExperienceState';
import { ExperienceHud } from './ui/ExperienceHud';

const INITIAL_SNAPSHOT: ExperienceSnapshot = {
  phase: ExperiencePhase.BOOTSTRAP,
  vrSupported: false,
  inVr: false,
  isSoftwareGl: false,
  contextLost: false,
  assetsLoaded: 0,
  assetsTotal: 8,
  maxTextureSize: 4096,
  pointerLocked: false,
  isGrounded: false,
  descentProgress: 0,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<MoonWalkEngine | null>(null);
  const [snapshot, setSnapshot] = useState<ExperienceSnapshot>(INITIAL_SNAPSHOT);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const engine = new MoonWalkEngine(mountEl);
    engineRef.current = engine;

    const unsubscribe = engine.state.subscribe(setSnapshot);
    engine.start().catch((err) => {
      console.error('MoonWalkEngine failed to start:', err);
    });

    return () => {
      unsubscribe();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleToggleVr = () => {
    engineRef.current?.toggleVrSession();
  };

  const handleRestartDescent = () => {
    engineRef.current?.restartDescent();
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#020307]">
      {/* Isolated WebGL canvas host; React never re-creates this element on HUD updates */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 h-full w-full cursor-crosshair"
        aria-label="MoonWalk VR 3D Viewport"
      />
      <ExperienceHud
        snapshot={snapshot}
        onToggleVr={handleToggleVr}
        onRestartDescent={handleRestartDescent}
      />
    </main>
  );
}
