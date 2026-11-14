/**
 * MoonWalk VR - Global Simulation & Scientific Configuration
 * References: NASA Apollo 11-17 Lunar Surface Journals & Lunar Sourcebook
 */

export interface SimulationSettings {
  physics: {
    lunarGravity: number; // m/s^2 (Moon is 1.62 m/s^2, ~0.165 of Earth's 9.81 m/s^2)
    timeStep: number;
  };
  player: {
    height: number; // meters (1.82m eye height in Apollo A7L spacesuit)
    walkSpeed: number; // m/s (~1.6 m/s)
    sprintSpeed: number; // m/s (~3.8 m/s bounding gait)
    jumpVelocity: number; // m/s (produces an authentic 3.5-second lunar float)
    mouseSensitivity: number;
    headBobIntensity: number;
    headlightRange: number;
    headlightIntensity: number;
  };
  rover: {
    wheelRadius: number; // 0.41m (81.8cm diameter Apollo wire-mesh wheels)
    wheelBase: number; // 2.29m
    trackWidth: number; // 1.83m
    maxSpeedKmh: number; // 13.0 km/h (Apollo LRV top speed ~11.2 mph)
    acceleration: number; // m/s^2
    brakingForce: number;
    maxSteerAngle: number; // radians (~0.5 rad / 28 degrees)
    suspensionStiffness: number;
    suspensionDamping: number;
  };
  terrain: {
    size: number; // 1200 meters local exploration field
    resolution: number; // Grid segments
    maxElevation: number; // meters
    craters: Array<{
      x: number;
      z: number;
      radius: number;
      depth: number;
      rimHeight: number;
      hasCentralPeak: boolean;
    }>;
  };
  lighting: {
    sunElevation: number; // degrees above horizon (Apollo missions landed at 10-25 deg for optimal shadow contrast)
    sunAzimuth: number; // degrees
    sunIntensity: number;
    earthLightIntensity: number;
  };
  audio: {
    enabled: boolean;
    masterVolume: number;
    suitAirflowVolume: number;
    footstepVolume: number;
    roverVolume: number;
  };
  vr: {
    movementMode: 'smooth' | 'teleport';
    turnMode: 'smooth' | 'snap';
    snapAngle: number; // degrees (45)
    comfortVignette: boolean;
  };
}

export const SETTINGS: SimulationSettings = {
  physics: {
    lunarGravity: 1.622,
    timeStep: 1 / 60,
  },
  player: {
    height: 1.82,
    walkSpeed: 1.7,
    sprintSpeed: 3.8,
    jumpVelocity: 3.5,
    mouseSensitivity: 0.0022,
    headBobIntensity: 0.05,
    headlightRange: 45,
    headlightIntensity: 2.2,
  },
  rover: {
    wheelRadius: 0.41,
    wheelBase: 2.3,
    trackWidth: 1.85,
    maxSpeedKmh: 13.5,
    acceleration: 2.2,
    brakingForce: 4.5,
    maxSteerAngle: 0.45,
    suspensionStiffness: 25.0,
    suspensionDamping: 6.0,
  },
  terrain: {
    size: 1400,
    resolution: 180,
    maxElevation: 120,
    craters: [
      // Primary Major Impact Crater (Central exploration feature)
      { x: 120, z: -160, radius: 140, depth: 32, rimHeight: 8.5, hasCentralPeak: true },
      // Secondary Western Crater
      { x: -280, z: 90, radius: 95, depth: 22, rimHeight: 5.5, hasCentralPeak: false },
      // North Ridge Crater
      { x: 20, z: 320, radius: 75, depth: 16, rimHeight: 4.0, hasCentralPeak: false },
      // Southeast Complex
      { x: 260, z: 240, radius: 110, depth: 26, rimHeight: 6.8, hasCentralPeak: true },
      // South Micro-crater cluster
      { x: -90, z: -110, radius: 32, depth: 7, rimHeight: 2.0, hasCentralPeak: false },
      { x: 45, z: -60, radius: 22, depth: 4.5, rimHeight: 1.4, hasCentralPeak: false },
      { x: -160, z: -260, radius: 60, depth: 13, rimHeight: 3.5, hasCentralPeak: false },
    ],
  },
  lighting: {
    sunElevation: 19.5, // Authentic Apollo low-sun landing geometry
    sunAzimuth: 115.0,
    sunIntensity: 3.8,
    earthLightIntensity: 0.35,
  },
  audio: {
    enabled: true,
    masterVolume: 0.8,
    suitAirflowVolume: 0.25,
    footstepVolume: 0.7,
    roverVolume: 0.65,
  },
  vr: {
    movementMode: 'smooth',
    turnMode: 'smooth',
    snapAngle: 45,
    comfortVignette: false,
  },
};
