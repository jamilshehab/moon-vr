import { SETTINGS } from '../config/settings';
import { CameraMode } from '../core/Camera';

export interface HUDCallbacks {
  onToggleLocomotion: () => void;
  onCycleCamera: () => void;
  onToggleHeadlight: () => void;
  onSunElevationChange: (elev: number) => void;
  onToggleAudio: () => void;
  onLaunchVR: () => void;
  onOpenSettings: () => void;
  onTeleportToLandmark: (name: string) => void;
}

export class HUD {
  private container: HTMLElement;
  private callbacks: HUDCallbacks;
  private isDockCollapsed: boolean = false;
  private isVisorActive: boolean = true;

  // DOM Elements
  private telemetryCoords!: HTMLElement;
  private telemetryElevation!: HTMLElement;
  private telemetrySpeed!: HTMLElement;
  private telemetryHeading!: HTMLElement;
  private telemetryEvaTime!: HTMLElement;
  private telemetryFps!: HTMLElement;
  private promptEl!: HTMLElement;
  private dockEl!: HTMLElement;
  private collapseBtn!: HTMLElement;
  private audioBtn!: HTMLElement;
  private headlightBtn!: HTMLElement;
  private vrBtn!: HTMLElement;
  private cameraBtn!: HTMLElement;
  private modeBtn!: HTMLElement;

  constructor(container: HTMLElement, callbacks: HUDCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.render();
    this.setupListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <!-- Top Mission Header & Telemetry -->
      <div id="hud-top" class="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <!-- Mission Branding & Coordinates -->
        <div class="glass-panel rounded-lg px-4 py-3 pointer-events-auto border-l-2 border-l-sky-400">
          <div class="flex items-center space-x-2">
            <span class="inline-block w-2 h-2 rounded-full bg-sky-400"></span>
            <span class="font-tech text-xs tracking-widest text-sky-400 font-bold uppercase">MoonWalk VR // EVA SIMULATION</span>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-telemetry text-slate-300">
            <div>POS: <span id="tel-coords" class="text-white">00.000°N, 00.000°E</span></div>
            <div>ELEV: <span id="tel-elev" class="text-white">0.0m</span></div>
            <div>SPEED: <span id="tel-speed" class="text-white">0.0 km/h</span></div>
            <div>HDG: <span id="tel-hdg" class="text-white">000°</span></div>
          </div>
        </div>

        <!-- Mission Clock & FPS -->
        <div class="glass-panel rounded-lg px-3 py-2 flex items-center space-x-3 text-xs font-telemetry pointer-events-auto">
          <div>MET: <span id="tel-evatime" class="text-sky-300">00:00:00</span></div>
          <div class="text-slate-500">|</div>
          <div>FPS: <span id="tel-fps" class="text-emerald-400">60</span></div>
          <button id="btn-settings-top" class="ml-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition border border-slate-700">
            ⚙ Settings
          </button>
        </div>
      </div>

      <!-- Center Reticle / Interaction Crosshair -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="w-1.5 h-1.5 rounded-full bg-white/70 shadow-sm"></div>
      </div>

      <!-- Context Proximity Prompt -->
      <div id="hud-prompt" class="absolute bottom-28 left-1/2 -translate-x-1/2 hidden pointer-events-auto">
        <div class="glass-panel px-5 py-2.5 rounded-full text-sm font-tech tracking-wider text-amber-300 border border-amber-500/40 shadow-lg animate-bounce flex items-center space-x-2">
          <kbd class="px-2 py-0.5 bg-amber-500/20 rounded border border-amber-400/30 text-xs">E</kbd>
          <span id="prompt-text">BOARD LUNAR ROVING VEHICLE</span>
        </div>
      </div>

      <!-- Collapsible Bottom Control Dock (Three.js Directive Compliant) -->
      <div id="hud-bottom-dock" class="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 pointer-events-auto transition-transform duration-300">
        <!-- Collapse/Expand Tab -->
        <div class="flex justify-center -mb-px">
          <button id="btn-collapse" class="glass-panel px-4 py-1 rounded-t-lg text-xs font-tech text-slate-400 hover:text-sky-400 hover:bg-slate-900 border-b-0 transition flex items-center space-x-1.5">
            <span id="collapse-icon">▾</span>
            <span id="collapse-label">HIDE CONTROLS (H)</span>
          </button>
        </div>

        <!-- Main Dock Container -->
        <div class="glass-panel rounded-xl p-3 border border-slate-700/60 shadow-2xl flex flex-wrap items-center justify-between gap-2">
          <!-- Locomotion Mode & Camera -->
          <div class="flex items-center space-x-2">
            <button id="btn-mode" class="glass-panel-interactive px-3 py-1.5 rounded-lg text-xs font-tech font-semibold flex items-center space-x-1.5 text-sky-300">
              <span>🚶</span>
              <span id="mode-label">ASTRONAUT WALK</span>
            </button>
            <button id="btn-camera" class="glass-panel-interactive px-3 py-1.5 rounded-lg text-xs font-tech flex items-center space-x-1.5 text-slate-200">
              <span>📷</span>
              <span id="camera-label">FIRST-PERSON</span>
            </button>
          </div>

          <!-- Quick Navigation / Landmarks -->
          <div class="flex items-center space-x-2">
            <label class="text-xs font-tech text-slate-400 hidden sm:inline">LANDMARK:</label>
            <select id="select-landmark" class="bg-slate-900/90 text-slate-200 text-xs rounded border border-slate-700 px-2 py-1 font-tech focus:outline-none focus:border-sky-400">
              <option value="landing-site">Central Exploration Valley</option>
              <option value="armstrong-crater">Major Crater Rim</option>
              <option value="rover-depot">Rover Staging Area</option>
              <option value="boulder-field">Megabreccia Boulders</option>
              <option value="overlook">Apennine Mountain Overlook</option>
            </select>
          </div>

          <!-- Sun Angle Slider -->
          <div class="flex items-center space-x-2 text-xs font-tech text-slate-300">
            <span title="Solar Elevation Angle">☀️ SUN:</span>
            <input id="slider-sun" type="range" min="2" max="65" value="${SETTINGS.lighting.sunElevation}" class="w-20 accent-sky-400 cursor-pointer" />
            <span id="sun-val" class="font-telemetry w-8 text-slate-400">${SETTINGS.lighting.sunElevation}°</span>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center space-x-2">
            <button id="btn-headlight" class="glass-panel-interactive p-1.5 rounded-lg text-xs text-amber-300" title="Toggle Suit Headlight (L)">
              💡
            </button>
            <button id="btn-audio" class="glass-panel-interactive p-1.5 rounded-lg text-xs text-slate-200" title="Mute/Unmute Audio (M)">
              🔊
            </button>
            <button id="btn-vr" class="px-3 py-1.5 rounded-lg text-xs font-tech font-bold bg-sky-600 hover:bg-sky-500 text-white transition flex items-center space-x-1 shadow-md">
              <span>🥽</span>
              <span id="vr-btn-label">ENTER VR</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Cache element references
    this.telemetryCoords = document.getElementById('tel-coords')!;
    this.telemetryElevation = document.getElementById('tel-elev')!;
    this.telemetrySpeed = document.getElementById('tel-speed')!;
    this.telemetryHeading = document.getElementById('tel-hdg')!;
    this.telemetryEvaTime = document.getElementById('tel-evatime')!;
    this.telemetryFps = document.getElementById('tel-fps')!;
    this.promptEl = document.getElementById('hud-prompt')!;
    this.dockEl = document.getElementById('hud-bottom-dock')!;
    this.collapseBtn = document.getElementById('btn-collapse')!;
    this.audioBtn = document.getElementById('btn-audio')!;
    this.headlightBtn = document.getElementById('btn-headlight')!;
    this.vrBtn = document.getElementById('btn-vr')!;
    this.cameraBtn = document.getElementById('btn-camera')!;
    this.modeBtn = document.getElementById('btn-mode')!;
  }

  private setupListeners(): void {
    this.collapseBtn.addEventListener('click', () => this.toggleDock());

    this.modeBtn.addEventListener('click', () => this.callbacks.onToggleLocomotion());
    this.cameraBtn.addEventListener('click', () => this.callbacks.onCycleCamera());
    this.headlightBtn.addEventListener('click', () => this.callbacks.onToggleHeadlight());
    this.audioBtn.addEventListener('click', () => this.callbacks.onToggleAudio());
    this.vrBtn.addEventListener('click', () => this.callbacks.onLaunchVR());

    document.getElementById('btn-settings-top')?.addEventListener('click', () => {
      this.callbacks.onOpenSettings();
    });

    const sunSlider = document.getElementById('slider-sun') as HTMLInputElement;
    const sunVal = document.getElementById('sun-val')!;
    sunSlider?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      sunVal.textContent = `${Math.round(val)}°`;
      this.callbacks.onSunElevationChange(val);
    });

    const landmarkSelect = document.getElementById('select-landmark') as HTMLSelectElement;
    landmarkSelect?.addEventListener('change', (e) => {
      const target = (e.target as HTMLSelectElement).value;
      this.callbacks.onTeleportToLandmark(target);
    });

    // Keyboard shortcut 'H' to toggle dock
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyH') {
        this.toggleDock();
      }
      if (e.code === 'KeyC') {
        this.callbacks.onCycleCamera();
      }
      if (e.code === 'KeyM') {
        this.callbacks.onToggleAudio();
      }
    });
  }

  public toggleDock(): void {
    this.isDockCollapsed = !this.isDockCollapsed;
    const icon = document.getElementById('collapse-icon')!;
    const label = document.getElementById('collapse-label')!;

    if (this.isDockCollapsed) {
      this.dockEl.style.transform = 'translate(-50%, calc(100% - 24px))';
      icon.textContent = '▴';
      label.textContent = 'SHOW CONTROLS (H)';
    } else {
      this.dockEl.style.transform = 'translate(-50%, 0)';
      icon.textContent = '▾';
      label.textContent = 'HIDE CONTROLS (H)';
    }
  }

  public setPrompt(visible: boolean, text: string = ''): void {
    if (visible) {
      document.getElementById('prompt-text')!.textContent = text;
      this.promptEl.classList.remove('hidden');
    } else {
      this.promptEl.classList.add('hidden');
    }
  }

  public updateTelemetry(
    x: number,
    y: number,
    z: number,
    speedKmh: number,
    headingDeg: number,
    elapsedSeconds: number,
    fps: number,
    isDriving: boolean,
    cameraMode: CameraMode
  ): void {
    // Convert local Cartesian position to lunar latitude/longitude coordinates
    // (Apollo 15 Hadley reference: 26.13°N, 3.63°E)
    const lat = (26.132 + z * 0.0003).toFixed(4);
    const lon = (3.633 + x * 0.0003).toFixed(4);

    this.telemetryCoords.textContent = `${lat}°N, ${lon}°E`;
    this.telemetryElevation.textContent = `${y >= 0 ? '+' : ''}${y.toFixed(1)}m`;
    this.telemetrySpeed.textContent = `${speedKmh.toFixed(1)} km/h`;

    const cleanHdg = ((Math.round(headingDeg) % 360) + 360) % 360;
    this.telemetryHeading.textContent = `${cleanHdg.toString().padStart(3, '0')}°`;

    // Format EVA time HH:MM:SS
    const hrs = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = Math.floor(elapsedSeconds % 60);
    this.telemetryEvaTime.textContent = `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    this.telemetryFps.textContent = `${fps}`;

    // Mode labels
    const modeLabel = document.getElementById('mode-label')!;
    if (isDriving) {
      modeLabel.textContent = 'LRV ROVER DRIVING';
      this.modeBtn.className = 'glass-panel-interactive px-3 py-1.5 rounded-lg text-xs font-tech font-semibold flex items-center space-x-1.5 text-amber-300';
    } else {
      modeLabel.textContent = 'ASTRONAUT WALK';
      this.modeBtn.className = 'glass-panel-interactive px-3 py-1.5 rounded-lg text-xs font-tech font-semibold flex items-center space-x-1.5 text-sky-300';
    }

    const camLabel = document.getElementById('camera-label')!;
    if (cameraMode === 'first-person') camLabel.textContent = 'FIRST-PERSON';
    else if (cameraMode === 'rover-cockpit') camLabel.textContent = 'ROVER COCKPIT';
    else camLabel.textContent = '3RD PERSON';
  }

  public updateVRStatus(isSupported: boolean, isPresenting: boolean): void {
    const vrLabel = document.getElementById('vr-btn-label')!;
    if (isPresenting) {
      vrLabel.textContent = 'EXIT VR';
      this.vrBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-tech font-bold bg-amber-600 hover:bg-amber-500 text-white transition flex items-center space-x-1 shadow-md';
    } else if (isSupported) {
      vrLabel.textContent = 'ENTER VR';
      this.vrBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-tech font-bold bg-sky-600 hover:bg-sky-500 text-white transition flex items-center space-x-1 shadow-md';
    } else {
      vrLabel.textContent = 'VR GUIDE';
      this.vrBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-tech font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1 border border-slate-700';
    }
  }

  public setAudioState(isMuted: boolean): void {
    this.audioBtn.textContent = isMuted ? '🔇' : '🔊';
  }

  public setHeadlightState(isOn: boolean): void {
    this.headlightBtn.className = isOn
      ? 'glass-panel-interactive p-1.5 rounded-lg text-xs text-amber-300 bg-amber-950/40 border-amber-500/50'
      : 'glass-panel-interactive p-1.5 rounded-lg text-xs text-slate-400';
  }
}
