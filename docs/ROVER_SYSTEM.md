# Lunar Roving Vehicle (LRV) Physics & Engineering

The **Lunar Roving Vehicle (LRV)** was one of NASA's greatest engineering triumphs. Deployed on Apollo 15, 16, and 17, it expanded the astronauts' exploration radius from a few hundred meters to tens of kilometers across the lunar surface.

This document details the historical engineering of the LRV and how **MoonWalk VR** recreates its physical driving dynamics.

---

## 1. Historical LRV Specifications vs Earth Cars

| Parameter | Apollo LRV Specification | Modern Terrestrial SUV |
| :--- | :--- | :--- |
| **Empty Mass** | $210\text{ kg}$ ($462\text{ lbs}$) | $2,100\text{ kg}$ ($4,600\text{ lbs}$) |
| **Lunar Weight** | $\sim 35\text{ kg-force}$ ($76\text{ lbs}$) | $350\text{ kg-force}$ |
| **Powertrain** | $4 \times 0.25\text{ hp}$ DC electric motors ($1.0\text{ hp}$ total) | $250 \dots 400\text{ hp}$ internal combustion |
| **Wheel Design** | Woven zinc-coated steel wire mesh | Solid rubber pneumatic radial |
| **Tire Cleats** | Titanium chevrons covering $50\%$ | Molded rubber sipes |
| **Steering System** | Dual electric 4-wheel counter-steering | Front-wheel Ackermann steering |
| **Turning Radius** | **$3.1\text{ meters}$ ($10\text{ feet}$)** | $5.5 \dots 6.2\text{ meters}$ |
| **Top Speed** | $13.5\text{ km/h}$ ($8.4\text{ mph}$) &bull; Apollo 17 record: $18\text{ km/h}$ | $180\text{ km/h}$ |

### Why Wire-Mesh Wheels?
Pneumatic rubber tires could not be used on the Moon:
1. The vacuum would cause rubber tires to rupture.
2. Lunar temperature extremes range from $-150^\circ\text{C}$ in shadow to $+120^\circ\text{C}$ in direct sunlight, which turns ordinary synthetic polymers brittle or gummy.
3. Boeing developed an open wire-mesh tire consisting of $800$ woven steel piano wires, with chevron-shaped titanium cleats riveted across the tread to paddle through powdery regolith.

---

## 2. 4-Wheel Independent Suspension & Terrain Pitch/Roll

Rather than faking vehicle movement with simple translation, `src/rover/RoverPhysics.ts` implements a multi-point raycast suspension model:

```text
       Wheelbase (2.3m)
     ◄──────────────────►
  FL (Front-Left)     RL (Rear-Left)
     [o]───────────────[o]        ▲
      │                 │         │ Track Width (1.85m)
      │     Chassis     │         ▼
     [o]───────────────[o]
  FR (Front-Right)    RR (Rear-Right)
```

At every frame tick, the physics engine samples the ground elevation at all four wheel hub coordinates using our analytical terrain function:
```typescript
for (let i = 0; i < 4; i++) {
  const w = this.wheels[i];
  const wx = this.position.x + (w.relX * cosH + w.relZ * sinH);
  const wz = this.position.z + (-w.relX * sinH + w.relZ * cosH);
  const gy = this.terrain.getElevationAt(wx, wz);
  w.groundHeight = gy;
}
```

### Computing Dynamic Pitch and Roll
- **Chassis Pitch** (nose up / nose down) is the angle between average front wheel elevation and average rear wheel elevation over the wheelbase:
  $$\theta_{\text{pitch}} = \arctan\left(\frac{Y_{\text{front}} - Y_{\text{rear}}}{\text{Wheelbase}}\right)$$
- **Chassis Roll** (body lean left / right) is the angle between average left wheel elevation and average right wheel elevation over the track width:
  $$\theta_{\text{roll}} = \arctan\left(\frac{Y_{\text{left}} - Y_{\text{right}}}{\text{Track Width}}\right)$$

We smoothly damp pitch and roll using exponential relaxation ($10\text{ s}^{-1}$), producing authentic chassis suspension swaying as the rover climbs crater slopes and traverses boulder fields.

---

## 3. Apollo 4-Wheel Counter-Steering Kinematics

Conventional terrestrial vehicles steer only with their front wheels. The Apollo LRV featured **dual electric steering motors** on both axles:
- When the astronaut deflected the center T-handle left, the front wheels turned left by angle $\delta$, and the rear wheels turned right by angle $-\delta$.
- This counter-steering geometry effectively halved the turning circle to a tiny $3.1\text{ meters}$, allowing astronauts to navigate tight boulder mazes with exceptional agility.

In `src/rover/RoverPhysics.ts`:
```typescript
this.wheels[0].steerAngle = this.steerAngle;   // Front-Left
this.wheels[1].steerAngle = this.steerAngle;   // Front-Right
this.wheels[2].steerAngle = -this.steerAngle;  // Rear-Left (Counter-Steer)
this.wheels[3].steerAngle = -this.steerAngle;  // Rear-Right (Counter-Steer)
```

---

## 4. Wheel Spin Integration

To prevent wheels from sliding unnaturally across the ground, each wheel's visual spin angle is calculated from true ground distance traveled:
$$\Delta \theta_{\text{spin}} = \frac{v \cdot \Delta t}{r_{\text{wheel}}}$$
where $r_{\text{wheel}} = 0.41\text{ meters}$.
When braking, wheels lock; when reversing, wheel spin reverses synchronously.
