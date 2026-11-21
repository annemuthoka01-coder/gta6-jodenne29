# Cielo Heat

**Cielo Heat** is an original top-down open-world crime game built entirely in vanilla JavaScript (ES modules, single 2D HTML5 canvas, zero external libraries or network dependencies). Explore the sun-soaked coastal city of Cielo, steal vehicles, evade police chases, complete story missions, and build your criminal empire.

## Getting Started

No build step or bundler is required. Run a local static server from the repository root:

```bash
node serve.ts --port 8080
```

Then open [http://localhost:8080](http://localhost:8080) in your web browser.

## Controls

- **Movement / Steering**: `W`, `A`, `S`, `D` or Arrow Keys
- **Enter / Exit Vehicle**: `F` or `Enter`
- **Sprint / Handbrake (Vehicle)**: `Shift` / `Space`
- **Fire Weapon / Attack**: `Mouse Click`
- **Cycle Weapons**: `Q` or `E`
- **Pause / Menu**: `Escape` or `P`

## Game Systems

- **Procedural Open-World City**: Grid-based layout featuring blocks, avenues, vertical & horizontal road networks, a coastal beach strip, palm trees, street lamps, and docks.
- **Traffic & Pedestrians**: Intelligent AI citizens walking sidewalks and autonomous vehicles navigating roads and obeying intersections or reacting to player actions.
- **Vehicle Theft & Driving**: Seamlessly carjack parked or moving vehicles with realistic acceleration, steering, drifting, and collision physics.
- **Wanted Level & Police AI**: Dynamic 5-star heat system where police patrol, spot crimes, pursue at high speeds, deploy sirens, and attempt to bust or eliminate the player.
- **Story Missions**: Multi-stage narrative campaign featuring contacts like Lu Prado with objectives, pickups, shootouts, and cash rewards.
- **Combat & Arsenal**: Pistol, shotgun, and automatic weapons with muzzle flashes, bullet physics, sound effects, and health/life mechanics.
- **HUD & Minimap**: Real-time minimap radar displaying player, cars, and police dots, alongside money, health, weapons, wanted stars, and context dialogue.
- **Audio & Save System**: Generated procedural WebAudio sound effects and engine/siren drones, with persistent game state saving.

## Technology Stack

- **Vanilla JavaScript (ES Modules)**: Clean, modular architecture across `config.js`, `city.js`, `world.js`, `render.js`, `player.js`, `cars.js`, `peds.js`, `police.js`, `combat.js`, `missions.js`, `hud.js`, `audio.js`, `input.js`, and `main.js`.
- **HTML5 Canvas**: High-performance 2D rendering pipeline with camera smoothing, day/night cycles, and atmospheric lighting.
- **Zero Dependencies**: Pure standard library execution with no external packages or npm build tooling.

---

Built by an AI agent for make.fun — https://make.fun/r/1htpds3w
