# Player Movement & Lunar Gravitational Kinematics

This document explains the physics, math, and input architecture governing first-person astronaut movement in **MoonWalk VR**.

---

## 1. Gravitational Kinematics: Moon ($1.622\text{ m/s}^2$) vs Earth ($9.81\text{ m/s}^2$)

The Moon's surface gravity is:
$$g_{\text{moon}} = 1.622\text{ m/s}^2 \approx 0.165 \cdot g_{\text{earth}}$$

### Jump Trajectory Mathematics
When an astronaut jumps with an initial upward velocity $v_0 = 3.5\text{ m/s}$:
- **Apex Height Above Ground**:
  $$H_{\text{apex}} = \frac{v_0^2}{2g} = \frac{(3.5)^2}{2 \times 1.622} = \frac{12.25}{3.244} \approx 3.78\text{ meters}$$
  *(On Earth with $9.81\text{ m/s}^2$, the same jump would only reach $0.62\text{ meters}$)*.
- **Total Time of Flight (Airborne Duration)**:
  $$T_{\text{flight}} = \frac{2 v_0}{g} = \frac{2 \times 3.5}{1.622} \approx 4.32\text{ seconds}$$

In `src/player/PlayerMovement.ts`, this produces the signature slow-motion, floating arc seen in historical Apollo archival footage.

---

## 2. Locomotion Modes & Spacesuit Inertia

Astronauts on Apollo 11 through 17 discovered that conventional Earth walking was exhausting and inefficient in low gravity. The stiff pressurized joints of the Apollo A7L spacesuit resisted knee flexion, while low gravity reduced foot traction.

Instead, astronauts adopted two unique locomotion gaits:
1. **The Lunar Bounding Gait ("Kangaroo Skip")**: Pushing off both feet simultaneously or alternating long bounding strides.
2. **The Loping Stride**: Leaning the torso forward and gliding between footfalls.

### Modeling Suit Inertia in Code
Although an astronaut weighs only $\sim 22\text{ kg-force}$ on the Moon, their **inertial mass** is unchanged:
$$\text{Total Mass} = 80\text{ kg (body)} + 55\text{ kg (A7L suit + PLSS backpack)} = 135\text{ kg}$$

Because momentum ($p = m \cdot v$) depends on mass rather than weight, stopping or turning on the Moon requires significant horizontal braking force.

In `src/player/PlayerMovement.ts`, we simulate this with distinct ground and airborne acceleration coefficients:
```typescript
const accelRate = this.isGrounded ? 8.0 : 2.5; // Less control when floating in mid-air
this.velocity.x += (worldX * targetSpeed - this.velocity.x) * accelRate * delta;
this.velocity.z += (worldZ * targetSpeed - this.velocity.z) * accelRate * delta;
```
When airborne, the player has minimal thrust to alter horizontal trajectory, faithfully capturing the sensation of being committed to a floating ballistic arc.

---

## 3. Pointer Lock API & Gimbal Lock Prevention

To achieve standard desktop FPS mouse look, the cursor must be locked to the browser window and hidden.

In `src/player/PlayerMovement.ts`:
1. `document.body.requestPointerLock()` captures raw mouse movement deltas (`e.movementX`, `e.movementY`) independent of screen boundaries.
2. We maintain rotation using an Euler angle with order `'YXZ'`:
   - Yaw ($Y$-axis): Horizontal head turning, unconstrained ($0 \dots 2\pi$).
   - Pitch ($X$-axis): Vertical looking up/down.

### Preventing Gimbal Lock
If an Euler angle pitch reaches $\pm 90^\circ$ ($\pm \frac{\pi}{2}$ radians), the pitch and roll axes align, causing wild erratic spins (Gimbal Lock). We strictly clamp the vertical pitch:
```typescript
const maxPitch = Math.PI * 0.47; // ~84.6 degrees
this.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, this.rotation.x));
```

---

## 4. Stride Rhythm & Head-Bobbing

To communicate physical weight and cadence, we add subtle vertical sinusoidal bobbing during walking:
$$y_{\text{bob}} = \sin(\omega \cdot t) \cdot A$$

In `src/player/Player.ts`:
- Normal walk cadence: $\omega = 4.5\text{ rad/s}$ with amplitude $A = 0.05\text{m}$.
- Sprint bounding cadence: $\omega = 7.0\text{ rad/s}$.
- Every time footstep distance accumulates to $1.4\text{m}$, `onStepCallback()` triggers an acoustic soil crunch synthesized in real time via the Web Audio API.
