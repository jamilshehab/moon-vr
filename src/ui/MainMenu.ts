export class MainMenu {
  private container: HTMLElement;
  private onStartCallback: () => void;
  private onOpenVRGuide: () => void;
  private menuEl: HTMLElement | null = null;

  constructor(
    container: HTMLElement,
    onStart: () => void,
    onOpenVRGuide: () => void
  ) {
    this.container = container;
    this.onStartCallback = onStart;
    this.onOpenVRGuide = onOpenVRGuide;

    this.render();
  }

  private render(): void {
    const el = document.createElement('div');
    el.id = 'main-menu-overlay';
    el.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md pointer-events-auto transition-opacity duration-500';

    el.innerHTML = `
      <div class="glass-panel w-full max-w-2xl rounded-2xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl relative overflow-hidden">
        <!-- Accent Glow -->
        <div class="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Header -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-sky-400 text-xs font-tech tracking-wider uppercase mb-2">
            <span>NASA SCIENTIFIC EXPLORATION SUITE</span>
          </div>
          <h1 class="text-3xl sm:text-4xl font-extrabold font-tech tracking-tight text-white">
            MOONWALK <span class="text-sky-400">VR</span>
          </h1>
          <p class="text-sm font-sans text-slate-300 mt-1 max-w-lg mx-auto">
            Photorealistic Lunar Surface Simulation &bull; Mare Tranquillitatis & Hadley Basin
          </p>
        </div>

        <!-- Simulation Capabilities Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
            <div class="text-2xl mb-1">🌕</div>
            <div class="text-xs font-tech text-white font-semibold">1/6th LUNAR GRAVITY</div>
            <div class="text-[11px] text-slate-400 mt-1">Authentic 1.62 m/s² floating astronaut bounding gait</div>
          </div>
          <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
            <div class="text-2xl mb-1">🛞</div>
            <div class="text-xs font-tech text-white font-semibold">APOLLO 15-17 LRV</div>
            <div class="text-[11px] text-slate-400 mt-1">4-wheel independent drive with counter-steering</div>
          </div>
          <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
            <div class="text-2xl mb-1">🥽</div>
            <div class="text-xs font-tech text-white font-semibold">WEBXR IMMERSIVE VR</div>
            <div class="text-[11px] text-slate-400 mt-1">Compatible with Quest, Vision Pro, & PC VR</div>
          </div>
        </div>

        <!-- Controls Overview -->
        <div class="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs font-telemetry mb-6">
          <div class="font-tech text-sky-300 font-bold mb-2 flex items-center space-x-1.5">
            <span>COMMAND INPUTS (DESKTOP)</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
            <div><kbd class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white">W A S D</kbd> Move / Drive</div>
            <div><kbd class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white">MOUSE</kbd> Look Around</div>
            <div><kbd class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white">SPACE</kbd> Jump / Brake</div>
            <div><kbd class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white">E</kbd> Board / Exit Rover</div>
            <div><kbd class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white">C</kbd> Camera Mode</div>
            <div><kbd class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white">L</kbd> Suit Headlight</div>
            <div><kbd class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white">H</kbd> Cinema Mode</div>
            <div><kbd class="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white">SHIFT</kbd> Lunar Sprint</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
          <button id="btn-vr-info" class="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-tech text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition">
            🥽 WebXR Setup & Requirements
          </button>
          <button id="btn-start" class="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-tech font-bold text-white bg-sky-500 hover:bg-sky-400 transition shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2">
            <span>BEGIN EXPLORATION</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(el);
    this.menuEl = el;

    document.getElementById('btn-start')?.addEventListener('click', () => {
      this.close();
      this.onStartCallback();
    });

    document.getElementById('btn-vr-info')?.addEventListener('click', () => {
      this.onOpenVRGuide();
    });
  }

  public close(): void {
    if (this.menuEl) {
      this.menuEl.style.opacity = '0';
      this.menuEl.style.pointerEvents = 'none';
      setTimeout(() => {
        if (this.menuEl && this.menuEl.parentNode) {
          this.menuEl.parentNode.removeChild(this.menuEl);
          this.menuEl = null;
        }
      }, 500);
    }
  }
}
