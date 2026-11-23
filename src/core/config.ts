/**
 * Central configuration constants for MoonWalk VR.
 * Keeping physical, optical, and rendering constants in one place prevents
 * magic numbers from scattering across modules.
 */
export const MOONWALK_CONFIG = {
  camera: {
    /** Desktop vertical field of view in degrees. WebXR overrides this with headset optics. */
    fov: 72,
    /** Close near-plane (5 cm) so nearby lunar ground does not clip in VR. */
    near: 0.05,
    /** Deep far-plane (25 km) so distant starfield and celestial photos never clip. */
    far: 25000,
  },
  player: {
    /** Average human eye height above the ground plane in meters (desktop mode). */
    eyeHeightMeters: 1.65,
    /** Comfortable walking speed on the lunar surface (m/s). */
    walkSpeedMetersPerSec: 3.2,
    /** Horizontal movement smoothing factor (higher = snappier response). */
    moveDamping: 10,
    /** Initial upward jump velocity calibrated for lunar 1/6g (m/s) -> ~2.08m apex. */
    jumpVelocityMetersPerSec: 2.6,
    /** Safe walkable radius inside the multi-plane lunar photographic arena (meters). */
    explorationRadiusMeters: 44,
  },
  physics: {
    /** Real lunar surface gravitational acceleration (m/s^2), ~1/6th of Earth's 9.81 m/s^2. */
    lunarGravity: 1.62,
  },
  space: {
    /** Radius of the 360-degree equirectangular photographic star dome (meters). */
    starDomeRadius: 8000,
    /** Starting position of the player rig in outer space (meters). */
    playerStartPos: { x: 0, y: 22, z: 245 },
    /** Position of the Moon photographic disc ahead of the descent path. */
    moonPos: { x: 0, y: 0, z: -75 },
    /** World scale of the global LRO Moon photograph at initial distance. */
    moonDiscDiameter: 110,
    /** Distant Earth Blue Marble photograph placement visible in space. */
    earthPos: { x: -135, y: 90, z: -135 },
    /** World scale of the Earth photograph. */
    earthDiscDiameter: 46,
  },
  descent: {
    /** Brief pause in SPACE_IDLE before the automatic fall begins (seconds). */
    idleHoldSeconds: 2.8,
    /** Total duration of the automatic space-to-moon falling sequence (seconds). */
    fallDurationSeconds: 14.0,
    /** Duration of the orbital-to-surface photographic landing transition (seconds). */
    transitionDurationSeconds: 3.6,
    /** Altitude (meters) at the handoff from space fall to surface landing transition. */
    transitionStartAltitudeY: 14,
  },
  rendering: {
    /** Deep space background hex color. */
    spaceBackgroundColor: 0x020307,
    /** Tone mapping exposure calibrated for high-contrast space and Apollo photography. */
    exposure: 1.05,
    /** Cap pixel ratio at 2.0 to keep fragment fill-rate fast on high-DPI displays. */
    maxPixelRatio: 2,
  },
} as const;
