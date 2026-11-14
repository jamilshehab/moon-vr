# WebXR Immersive-VR Architecture & Integration Guide

This guide explains how **MoonWalk VR** implements the **W3C WebXR Device API** to enable full virtual reality exploration across standalone headsets and PC VR platforms.

---

## 1. WebXR vs WebVR: Modern Standards

Older tutorials often reference the deprecated *WebVR API*. Modern browser-based VR requires the **WebXR Device API**:

- **Unified Architecture**: WebXR handles both Virtual Reality (`immersive-vr`) and Augmented Reality (`immersive-ar`) through a single unified pipeline.
- **Reference Spaces**: Manages tracking origins (`local-floor`, `bounded-floor`, `viewer`), automatically handling headset standing height calibration.
- **Input Sources**: Provides standardized Gamepad API integration for 6DoF hand controllers (Meta Touch, Index Knuckles, Apple Vision Pro gestures).

---

## 2. Technical Prerequisites & Security Policies

The WebXR specification enforces strict browser security constraints:

1. **Secure Origin Requirement (HTTPS)**:
   WebXR sessions can **only** be initiated from a secure origin:
   - `https://...` (production deployments or Cloud Run URLs).
   - `http://localhost:...` or `http://127.0.0.1:...` (local development).
   *Attempting to call `navigator.xr.requestSession` over an insecure HTTP IP address will immediately reject with a `SecurityError`.*

2. **User Gesture Activation**:
   A WebXR session cannot start automatically on page load. It must be triggered directly inside a user interaction handler (such as clicking the "ENTER VR" button).

---

## 3. Three.js WebXR Implementation Pipeline

### Step 1: Enable WebXR on the Renderer
In `src/core/Renderer.ts`:
```typescript
this.instance.xr.enabled = true;
```

### Step 2: Adopt `renderer.setAnimationLoop()`
In standard desktop Three.js, you might use window `requestAnimationFrame()`. However, in WebXR, the VR headset display has its own hardware compositor clock running at $72\text{ Hz}$, $90\text{ Hz}$, or $120\text{ Hz}$.

Using `window.requestAnimationFrame()` in VR causes severe frame tearing and judder. Three.js provides `renderer.setAnimationLoop()`, which automatically delegates to the headset's high-priority `XRSession.requestAnimationFrame`:

In `src/core/Experience.ts`:
```typescript
this.renderer.instance.setAnimationLoop(() => this.update());
```

### Step 3: Negotiating the Session
In `src/vr/VRManager.ts`:
```typescript
const isSupported = await navigator.xr.isSessionSupported('immersive-vr');

if (isSupported) {
  const session = await navigator.xr.requestSession('immersive-vr', {
    optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
  });
  await this.renderer.xr.setSession(session);
}
```

---

## 4. VR Locomotion & 6DoF Controller Input

In `src/vr/VRControls.ts`, we track both hand controllers:
- Controller 0: Right hand
- Controller 1: Left hand

```typescript
this.controller1 = this.renderer.xr.getController(0);
this.controller2 = this.renderer.xr.getController(1);
```

### Reading Controller Thumbsticks
When an active WebXR session is running, input sources contain standard gamepad axis mappings:
- `axes[2]`: Thumbstick horizontal axis ($-1.0$ left, $+1.0$ right).
- `axes[3]`: Thumbstick vertical axis ($-1.0$ forward, $+1.0$ backward).

```typescript
if (source.handedness === 'left') {
  // Left thumbstick drives astronaut walking or rover throttle
  this.player.movement.keys.forward = thumbY < -0.2;
  this.player.movement.keys.backward = thumbY > 0.2;
} else if (source.handedness === 'right') {
  // Right thumbstick handles rotation (smooth or 45-degree snap turn)
  if (SETTINGS.vr.turnMode === 'snap' && Math.abs(thumbX) > 0.6) {
    this.player.movement.rotation.y += THREE.MathUtils.degToRad(45) * (thumbX > 0 ? -1 : 1);
  }
}
```

### Comfort Settings: Snap Turn vs Smooth Turn
Simulating horizontal rotation in VR without corresponding inner-ear vestibular feedback can cause motion sickness.
- **Snap Turn ($45^\circ$)**: Instantly snaps the camera yaw in $45^\circ$ increments, eliminating rotational optic flow across the peripheral retina.
- **Smooth Turn**: Continuously rotates the view with damping for experienced VR users. Users can switch modes anytime via the Settings modal.

---

## 5. Supported Hardware & Setup Guide

- **Meta Quest 2 / Quest 3 / Quest Pro**: Open the **Meta Quest Browser**, navigate to the app URL, and click **ENTER VR**.
- **Apple Vision Pro**: Supported via visionOS Safari. Enable WebXR in *Settings > Safari > Advanced > Feature Flags > WebXR*.
- **PC VR (Valve Index, HTC Vive, Oculus Rift)**: Connect headset to PC, launch **SteamVR** or Oculus Desktop, open Chrome/Edge, and click **ENTER VR**.
