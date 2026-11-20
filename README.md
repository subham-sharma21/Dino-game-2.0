# 🦖 Apex Dino: Extinction Run

A realistic, high-octane 16-bit pixel art runner built with pure HTML5 Canvas and JavaScript. Inspired by the classic Chrome T-Rex runner, upgraded with advanced physics, dynamic biomes, sound synthesis, and interactive threats.

---

## 🎮 How to Play

### Controls
| Key / Input | Action | Effect |
| :--- | :--- | :--- |
| **`Space`** / **`▲ Up`** / **`W`** | **Variable Leap** | Tap for quick hop, hold for maximum leap height. |
| **`▼ Down`** / **`S`** | **Skid Crouch** | Drops hitbox low to slide under swooping pterosaurs. In mid-air, fast-falls. |
| **`Shift`** / **`E`** | **Apex Roar** | Sonic shockwave blasting obstacles in front (6s cooldown). |
| **`M`** | **Mute Audio** | Toggles Web Audio synthesizer. |
| **Touch / Mobile** | **Virtual Buttons** | On-screen Jump, Crouch, and Roar controls. |

### Objective & Mechanics
- **Survive and Distance**: Run as far as possible. Speed scales gradually as distance increases.
- **Biomes**:
  - `0m – 600m`: **Arid Badlands** (Ancient cacti clusters, rock fossils).
  - `600m – 1400m`: **Primeval Jungle** (Giant cycads, mossy terrain, swooping pterosaurs).
  - `1400m+`: **Volcanic Cataclysm** (Fiery ash, rushing raptors, intense speeds).
- **Pickups**:
  - 🥩 **Prime Meat**: Grants temporary invulnerable frenzy shield, destroying obstacles on contact and resetting roar cooldown.

---

## ✨ Features
- **Deterministic 60 FPS Engine**: Display refresh-rate independent logic (no speed glitches on 144Hz/240Hz monitors).
- **Zero Dependencies**: Pure HTML5 Canvas + Web Audio API. No frameworks, runs out of the box.
- **Dynamic Parallax**: Multi-layer scrolling with smoking volcanoes, distant mountain mist, and prehistoric flora.
- **Synthesized Sound FX**: Procedurally generated 8-bit/16-bit audio for footsteps, jumps, roars, and milestone jingles.
- **Responsive & Crisp**: Pixelated crisp scaling on desktop and mobile screens.

---

## 🚀 Quick Start
No install needed. Simply open `index.html` in any modern web browser:

```bash
# Double-click or open via command line:
start index.html
```

---

## 📁 File Structure
```
game/
├── index.html     # Game shell and mobile UI
├── style.css      # Retro arcade responsive styling
├── sprites.js     # 16-bit procedural pixel art cache
├── audio.js       # Web Audio API procedural sound engine
├── game.js        # Main 60 FPS physics loop & state machine
└── README.md      # Game manual and documentation
```
