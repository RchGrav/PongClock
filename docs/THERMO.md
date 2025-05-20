## Technical Design Specification – “Thermo-Trail Pong Ball”

### 1.  System Overview

1. **Goal** Add a physically flavoured heat-and-trail effect to the Pong ball that depends only on its *instantaneous* speed.
2. **Physics Assumptions**

   * Ball speed never changes due to friction; friction merely maps speed surplus to thermal energy.
   * Radiated colour follows a simplified black-body LUT.
   * Trail persistence shortens as temperature rises.

### 2.  Key Tunables

| Symbol              | Type      | Range   | Purpose                                                                                                            |
| ------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| `v0`                | **float** | > 0     | Ball’s initial (design) speed.                                                                                     |
| `heatStartFactor`   | **float** | 0 … 1.5 | Fraction of `v0` at which heating activates.<br>`1.1` → heats above 110 % `v0`; `0.5` → already hot at half-speed. |
| `frictionHeatCoeff` | **float** | 0 … 10  | “Friction” gain applied to convert speed surplus into temperature; higher ⇒ heats faster.                          |
| `Tmin`              | K         | \~900   | LUT start (dull red/orange).                                                                                       |
| `Tmax`              | K         | \~3000  | LUT end (pale blue-white).                                                                                         |
| `trailBase`         | ms        | 70      | CRT-style persistence at *cold*.                                                                                   |
| `trailSkew`         | –         | 4 … 6   | How much persistence shrinks when *hot*.                                                                           |

### 3.  Colour LUT  (sample stops)

| *T* (K) | Hex       | Note            |
| ------- | --------- | --------------- |
| 900     | `#FF5500` | orange ember    |
| 1500    | `#FFD700` | yellow-gold     |
| 2200    | `#FFEFE7` | white           |
| 2600    | `#D6EFFF` | warm blue-white |
| 3000    | `#9BD6FF` | pale sky-blue   |

(RGB values may be pre-converted to linear space for shaders.)

### 4.  Core Equations

```text
speed      = length(ball.velocity)
excess     = max(0, speed - heatStartFactor * v0)
normalized = excess / (maxSpeed - heatStartFactor * v0)   # clamp 0–1

# Thermal rise (friction controls steepness)
theta      = pow(normalized, frictionHeatCoeff)           # 0–1
T          = mix(Tmin, Tmax, theta)                       # Kelvin

# Trail persistence (shortens as theta → 1)
tau        = trailBase / (1 + trailSkew * theta)          # milliseconds
```

### 5.  Runtime Data Flow

```
ball.velocity  ─┐
                │         +────────────+        +─────────+
            (4) speed ───►│ Heat Module│──T────►│ Colour  │──► Shader uniform: uHeadRGB
                │         +────────────+        +─────────+
                │
                └─► Trail Manager (8) ──tau────► fade per-fragment
```

### 6.  Functions / Pseudocode

```cpp
// ---------------- core module ----------------
struct HeatState {
    float theta;   // 0–1
    float T;       // Kelvin
    float tau;     // ms
    vec3  rgb;     // linear colour
};

HeatState computeHeat(vec2 velocity) {
    HeatState h;
    float v      = length(velocity);
    float excess = max(0.0, v - heatStartFactor * v0);
    float norm   = clamp(excess / (vMax - heatStartFactor * v0), 0.0, 1.0);
    h.theta      = pow(norm, frictionHeatCoeff);
    h.T          = mix(Tmin, Tmax, h.theta);
    h.rgb        = sampleBlackBodyLUT(h.T);   // 4-stop LUT + lerp
    h.tau        = trailBase / (1.0 + trailSkew * h.theta);
    return h;
}

// ---------------- trail manager -------------
void updateTrail(float dt, HeatState h) {
    for (TrailVoxel& vx : trail) {
        vx.age += dt;
        float fade = exp(-vx.age / h.tau);
        vx.color  = mix(h.rgb, coolRGB, vx.age / tauMax) * fade;
    }
    pushFront(trail, {pos: ball.pos, age: 0});
    trimOlderThan(trail, tauMax);
}
```

### 7.  Shader Inputs & Usage

| Uniform    | Source                  | Usage                                    |
| ---------- | ----------------------- | ---------------------------------------- |
| `uHeadRGB` | `HeatState.rgb`         | Colour the ball sprite’s leading pixel.  |
| `uTau`     | `HeatState.tau`         | Decay rate inside trail fragment shader. |
| `uCoolRGB` | pre-set (`#FFFFFF` dim) | End-of-tail blend target.                |

### 8.  Tuning Workflow

1. **Pick `heatStartFactor`** based on desired trigger speed.
2. **Raise/lower `frictionHeatCoeff`** for steeper or gentler colour ramp.
3. Adjust `trailSkew` until trail length feels right across speeds.
4. Use the LUT to tweak subjective colour “feel” (not strict physics).

### 9.  Testing Checklist

| Test                                   | Expected                                  |
| -------------------------------------- | ----------------------------------------- |
| Ball at exactly `v0 * heatStartFactor` | Pure white, long CRT trail.               |
| Ball at mid-range speed                | Yellow-orange ball, mid-length trail.     |
| Ball near `vMax`                       | Blue-white core, razor-thin tracer.       |
| Adjust `frictionHeatCoeff` from 2 → 6  | Colour ramp becomes dramatically quicker. |

