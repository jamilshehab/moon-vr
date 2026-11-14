/**
 * MoonWalk VR - Professional Photorealistic Lunar Exploration Simulator
 * Entry Point (ES Modules)
 */

import './index.css';
import { Experience } from './core/Experience';

window.addEventListener('DOMContentLoaded', () => {
  const webglContainer = document.getElementById('webgl-container');
  const uiContainer = document.getElementById('ui-container');

  if (!webglContainer || !uiContainer) {
    console.error('Failed to locate WebGL or UI container elements.');
    return;
  }

  // Initialize the MoonWalk VR experience
  try {
    const experience = new Experience(webglContainer, uiContainer);
    // Expose experience on window for development debugging
    (window as any).experience = experience;
  } catch (err) {
    console.error('Failed to initialize MoonWalk VR experience:', err);
  }
});
