import { SETTINGS } from '../config/settings';

export class SettingsModal {
  private container: HTMLElement;
  private modalEl: HTMLElement | null = null;
  private onSettingChanged?: () => void;

  constructor(container: HTMLElement, onSettingChanged?: () => void) {
    this.container = container;
    this.onSettingChanged = onSettingChanged;
  }

  public open(): void {
    if (this.modalEl) return;

    const el = document.createElement('div');
    el.id = 'settings-modal-overlay';
    el.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto';

    el.innerHTML = `
      <div class="glass-panel w-full max-w-xl rounded-2xl p-6 border border-slate-700/80 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div class="flex items-center space-x-2">
            <span class="text-xl">⚙️</span>
            <h2 class="text-xl font-bold font-tech text-white">SIMULATION CONFIGURATION</h2>
          </div>
          <button id="btn-close-settings" class="text-slate-400 hover:text-white text-lg p-1">✕</button>
        </div>

        <!-- Section 1: Physics & Movement -->
        <div class="mb-5">
          <h3 class="text-xs font-tech text-sky-400 font-bold uppercase tracking-wider mb-3">1. Gravitational & Movement Physics</h3>
          <div class="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-slate-200 font-semibold">Surface Gravity</div>
                <div class="text-[11px] text-slate-400">Toggle between authentic Moon and Earth gravity</div>
              </div>
              <div class="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button id="btn-grav-moon" class="px-2.5 py-1 rounded text-xs font-tech font-bold ${SETTINGS.physics.lunarGravity < 5 ? 'bg-sky-500 text-white' : 'text-slate-400'}">
                  MOON (1.62 m/s²)
                </button>
                <button id="btn-grav-earth" class="px-2.5 py-1 rounded text-xs font-tech font-bold ${SETTINGS.physics.lunarGravity > 5 ? 'bg-sky-500 text-white' : 'text-slate-400'}">
                  EARTH (9.81 m/s²)
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div>
                <div class="text-slate-200 font-semibold">Mouse Look Sensitivity</div>
                <div class="text-[11px] text-slate-400">First-person look speed</div>
              </div>
              <input id="slider-mouse-sens" type="range" min="10" max="40" value="${SETTINGS.player.mouseSensitivity * 10000}" class="w-28 accent-sky-400 cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- Section 2: WebXR & VR Comfort -->
        <div class="mb-5">
          <h3 class="text-xs font-tech text-sky-400 font-bold uppercase tracking-wider mb-3">2. WebXR & Headset Comfort</h3>
          <div class="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-slate-200 font-semibold">VR Rotation Mode</div>
                <div class="text-[11px] text-slate-400">Right controller thumbstick turning</div>
              </div>
              <div class="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button id="btn-turn-smooth" class="px-2.5 py-1 rounded text-xs font-tech ${SETTINGS.vr.turnMode === 'smooth' ? 'bg-sky-500 text-white' : 'text-slate-400'}">
                  Smooth
                </button>
                <button id="btn-turn-snap" class="px-2.5 py-1 rounded text-xs font-tech ${SETTINGS.vr.turnMode === 'snap' ? 'bg-sky-500 text-white' : 'text-slate-400'}">
                  45° Snap
                </button>
              </div>
            </div>

            <!-- WebXR Hardware Guide -->
            <div class="p-3 rounded-lg bg-sky-950/30 border border-sky-800/40 text-[11px] text-sky-200/90 leading-relaxed">
              <div class="font-bold text-sky-300 mb-1">🥽 WebXR Requirements:</div>
              WebXR requires a secure origin (HTTPS or localhost) and a WebXR-compatible browser (e.g. Meta Quest Browser, Chrome with OpenXR/SteamVR, or Safari on Apple Vision Pro). Desktop simulation is 100% functional without a headset.
            </div>
          </div>
        </div>

        <!-- Section 3: Audio Synthesis -->
        <div class="mb-5">
          <h3 class="text-xs font-tech text-sky-400 font-bold uppercase tracking-wider mb-3">3. Vacuum Acoustic Synthesis</h3>
          <div class="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-slate-200 font-semibold">Spacesuit PLSS Fan Volume</div>
                <div class="text-[11px] text-slate-400">Internal life support airflow hum</div>
              </div>
              <input id="slider-plss-vol" type="range" min="0" max="100" value="${SETTINGS.audio.suitAirflowVolume * 100}" class="w-28 accent-sky-400 cursor-pointer" />
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <div>
                <div class="text-slate-200 font-semibold">LRV Electric Motor Volume</div>
                <div class="text-[11px] text-slate-400">Harmonic drive wheel motor whine</div>
              </div>
              <input id="slider-rover-vol" type="range" min="0" max="100" value="${SETTINGS.audio.roverVolume * 100}" class="w-28 accent-sky-400 cursor-pointer" />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end pt-2 border-t border-slate-800">
          <button id="btn-save-settings" class="px-5 py-2 rounded-xl text-xs font-tech font-bold text-white bg-sky-600 hover:bg-sky-500 transition">
            CLOSE & RESUME
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(el);
    this.modalEl = el;

    this.bindEvents();
  }

  private bindEvents(): void {
    const close = () => this.close();
    document.getElementById('btn-close-settings')?.addEventListener('click', close);
    document.getElementById('btn-save-settings')?.addEventListener('click', close);

    // Gravity buttons
    const btnMoon = document.getElementById('btn-grav-moon');
    const btnEarth = document.getElementById('btn-grav-earth');

    btnMoon?.addEventListener('click', () => {
      SETTINGS.physics.lunarGravity = 1.622;
      btnMoon.className = 'px-2.5 py-1 rounded text-xs font-tech font-bold bg-sky-500 text-white';
      if (btnEarth) btnEarth.className = 'px-2.5 py-1 rounded text-xs font-tech font-bold text-slate-400';
    });

    btnEarth?.addEventListener('click', () => {
      SETTINGS.physics.lunarGravity = 9.81;
      btnEarth.className = 'px-2.5 py-1 rounded text-xs font-tech font-bold bg-sky-500 text-white';
      if (btnMoon) btnMoon.className = 'px-2.5 py-1 rounded text-xs font-tech font-bold text-slate-400';
    });

    // Mouse sensitivity
    const sensSlider = document.getElementById('slider-mouse-sens') as HTMLInputElement;
    sensSlider?.addEventListener('input', (e) => {
      SETTINGS.player.mouseSensitivity = parseFloat((e.target as HTMLInputElement).value) / 10000;
    });

    // VR Turn mode
    const btnSmooth = document.getElementById('btn-turn-smooth');
    const btnSnap = document.getElementById('btn-turn-snap');

    btnSmooth?.addEventListener('click', () => {
      SETTINGS.vr.turnMode = 'smooth';
      btnSmooth.className = 'px-2.5 py-1 rounded text-xs font-tech bg-sky-500 text-white';
      if (btnSnap) btnSnap.className = 'px-2.5 py-1 rounded text-xs font-tech text-slate-400';
    });

    btnSnap?.addEventListener('click', () => {
      SETTINGS.vr.turnMode = 'snap';
      btnSnap.className = 'px-2.5 py-1 rounded text-xs font-tech bg-sky-500 text-white';
      if (btnSmooth) btnSmooth.className = 'px-2.5 py-1 rounded text-xs font-tech text-slate-400';
    });

    // Audio sliders
    const plssSlider = document.getElementById('slider-plss-vol') as HTMLInputElement;
    plssSlider?.addEventListener('input', (e) => {
      SETTINGS.audio.suitAirflowVolume = parseFloat((e.target as HTMLInputElement).value) / 100;
    });

    const roverSlider = document.getElementById('slider-rover-vol') as HTMLInputElement;
    roverSlider?.addEventListener('input', (e) => {
      SETTINGS.audio.roverVolume = parseFloat((e.target as HTMLInputElement).value) / 100;
    });
  }

  public close(): void {
    if (this.modalEl) {
      this.modalEl.parentNode?.removeChild(this.modalEl);
      this.modalEl = null;
    }
  }
}
