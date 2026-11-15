# TNT Velocity Preview

A small, dependency-free web tool that previews how exploding TNT pushes other primed TNT in Minecraft Bedrock Edition. Spawn TNT at any position, set its fuse, and watch the knockback in 2D (side or top view) or 3D. Save setups as presets and record the result as a video.

## Features

- **2D and 3D views.** 2D has a side view (X-Y) and a top view (X-Z). 3D is an orbit camera with textured TNT cubes.
- **Spawn TNT** at `At` (X, Y or X, Y, Z), with `Tick` (Normal = 80, or an integer; `0` explodes instantly), `Spawn Momentum` (true/false), a count (up to 500), and a Stack or Cube layout.
- **Knockback formula switch.** Bedrock (default) or Custom (linear falloff, max 4 blocks/s, range 4 blocks).
- **Presets.** Add spawns to a draft, save it as a preset, then Play or Record it. Export and import presets as `.txt`.
- **Recording.** Records the canvas at 1024x1024, 60 FPS. Choose a theme, white, black, green or transparent background (transparent needs webm). The recording starts frozen, then plays, and stops by itself when every TNT has exploded.
- **Camera tools.** Focus (frame everything), Center Camera (move the camera center to 0, 0, 0), pan, zoom and rotate.
- **Display toggles.** Velocity arrows, trails, floor, and a border around TNT. Settings are remembered in `localStorage`.

## Controls

| Input | Action |
| --- | --- |
| Drag | Rotate (3D) or pan (2D) |
| Two-finger drag | Pan (and pinch to zoom) |
| Shift + drag, right-drag | Pan in 3D |
| Mouse wheel / pinch | Zoom |
| `Space` | Play / Pause |
| `S` | Advance one tick |
| `R` | Reset |
| `F` | Focus on all TNT |
| `C` | Center camera at 0, 0, 0 |
| `B` | Toggle border |

## How it works

- **Movement** (per tick): gravity `-0.04`, drag `0.98`, and on the ground horizontal velocity `x0.7` and vertical `x-0.5`. Floor is at `Y = 0`.
- **Explosion** (power 4, centered `0.06125` above the TNT's position), Bedrock mode:
  `magnitude = (1 - (distance - width/2) / (2 * power)) * exposure`, with `width = 0.98`, applied along the vector from the explosion center to the target TNT's feet.
  Exposure is always `1` (no blocks block the explosion).
- **Spawn Momentum:** a fixed horizontal vector of (0.4, 0.4) rotated by a random angle, plus `0.2` upward. In 2D side view only X is used.

### Accuracy notes

The Bedrock formula comes from the Minecraft Wiki, which still marks parts of the Bedrock behavior (such as the exact knockback direction for TNT entities) as unverified. Treat results as a close approximation and compare against the game. Movement constants follow commonly documented TNT physics and are not verified against Bedrock.

## Files

```
index.html   page structure
style.css    styling (light and dark themes)
script.js    simulation, rendering, presets, recording
textures/    TNT top, side and bottom textures (PNG)
```

## License

The source code is released under the [MIT License](LICENSE). The TNT textures in `textures/` are not covered by this license.

## Credits

This project is not affiliated with or endorsed by Mojang or Microsoft.

The Bedrock knockback formula is based on the [Minecraft Wiki](https://minecraft.wiki/w/Explosion).
