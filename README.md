# TNT Velocity Preview

<p align="center"><img src="assets/logo.png" alt="TNT Velocity Preview logo" width="120"></p>

Live demo: https://cbrusmcyt.github.io/tnt-velocity-preview/

A small, dependency-free web tool that previews how exploding TNT pushes other primed TNT in Minecraft Bedrock Edition. Spawn TNT at any position, set its fuse and starting velocity, and watch the knockback in 2D (side or top view) or 3D. Save setups as presets, record the result as a video, or export the TNT as a Bedrock `.mcstructure` file.

## Features

- **TNT Simulation Chamber** (the main screen): 2D with a side view (X-Y) and a top view (X-Z), and a 3D orbit view with textured TNT cubes.
- **Menu (three-line button, top left):** the chamber, a full **Guide (How to use)** that explains every button and setting, and **themes**.
- **Themes:** Light (default), Dark, Light Bordered (dark border), Dark Bordered (white border), **OreUI** (a square, beveled look modeled on the Minecraft Bedrock menus) and a **Custom** theme you can edit almost completely (colors, border, corner radius) and export or import as a `.tntheme` file.
- **Spawn TNT** with `At` (X, Y or X, Y, Z), `Tick` (Normal = 80, or an integer; `0` explodes instantly), `Velocity` (initial X, Y, Z velocity in B/t, B/s, B/m or B/h), `Spawn Momentum` (true/false), a count (up to 500) and a Stack or Cube layout.
- **Presets** shown as cards: Play, Record and a More menu (Load, Save to .mcstructure, Edit, Export .tntpreset, Delete). Import and export presets as `.tntpreset` files.
- **Save to `.mcstructure`:** save the TNT you spawned (or a whole preset) as a Bedrock structure file with each TNT's position, starting velocity and fuse.
- **Recording** at 1024x1024, 60 FPS, with a theme, white, black, green or transparent background (transparent needs webm). The recording starts frozen, then plays, and stops by itself when every TNT has exploded.
- **Settings:** simulation speed, knockback formula (Bedrock or Custom), explosion order (one after another, or all at once), recording background, and toggles for velocity arrows, trails, the floor and a border around each TNT. They are remembered in `localStorage`.
- **Camera tools:** Focus (frame everything), Center Camera (move the camera center to 0, 0, 0), pan, zoom and rotate.

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
| `B` | Toggle the TNT border |
| `Esc` | Close the menu |

The full explanation of every button is in the in-app **Guide** (menu > Guide).

### OreUI theme and fonts

The OreUI theme uses the Ore UI grey ramp (`#d0d1d4`, `#b1b2b5`, `#8c8d90`, `#58585a`, `#48494a`, `#313233`, `#242425`, `#1e1e1f`) and Minecraft green (`#3c8527`), with square corners and beveled buttons. It is an approximation and not an official Mojang theme. For the pixel look, the Minecraft Ten font is used if it is installed or placed at `fonts/minecraft-ten.ttf` (Mojangles at `fonts/Mojangles.ttf` is the second choice). The fonts are not included in this repository; without them the theme falls back to a normal font.

## Run it

Open `index.html` in a browser, or serve the folder (recommended):

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

> If you open `index.html` straight from disk (`file://`), browsers treat the PNG textures as another origin, so **recordings are made without textures**. The on-screen view is textured either way. Serving the folder (or using GitHub Pages) avoids this.

### GitHub Pages

Push the folder to a repository, then enable Pages (Settings > Pages > deploy from the branch root). Keep `assets/` and `textures/` next to `index.html`.

## File formats

### `.tntpreset`

A JSON text file. Each preset has a `tnt` list, and each entry describes one Spawn TNT setup:

```json
{
  "format": "tntpreset",
  "version": 1,
  "presets": [
    {
      "name": "Example",
      "tnt": [
        {
          "position": [2, 0.5, 0],
          "amount": 16,
          "layout": "stack",
          "momentum": false,
          "fuse": 1,
          "velocity": { "value": [10, 0, 10], "type": "bps" }
        }
      ]
    }
  ]
}
```

- `position`: X, Y, Z. `amount`: integer from 1 to 500. `layout`: `"stack"` or `"cube"`. `momentum`: true or false. `fuse`: ticks (`0` = instant).
- `velocity.value`: X, Y, Z. `velocity.type`: `"bpt"` (blocks per tick), `"bps"` (per second), `"bpm"` (per minute) or `"bph"` (per hour).
- Importing a preset with the same name replaces the existing one. The older `items` format is still accepted.

### `.tntheme`

A JSON text file with the custom theme:

```json
{
  "format": "tntheme",
  "version": 1,
  "name": "My theme",
  "colors": {
    "main": "#f1efe9", "panel": "#ffffff", "text": "#1b1b19", "mutedText": "#6a6862",
    "button": "#ffffff", "buttonText": "#1b1b19", "accent": "#c8402e", "accentText": "#ffffff",
    "canvas": "#faf9f5", "grid": "#bdbbb3", "ground": "#e9e0d0"
  },
  "border": { "enabled": false, "color": "#000000", "width": 1 },
  "radius": 14
}
```

### `.mcstructure`

`Save current state to .mcstructure` (in the control bar) writes an air-only structure with one primed TNT entity per TNT you spawned since the last Reset (`minecraft:tnt` with `Pos`, `Motion` and `Fuse`). It saves each TNT's **start state**, so it does not matter whether you pressed Play afterwards. A preset's `Save to .mcstructure` does the same for that preset alone, straight from the preset data, and leaves the scene untouched (a random Spawn Momentum angle is rolled each time you press it).

- Positions are relative to where the structure is loaded. If any TNT has a negative coordinate, everything is shifted so all positions are non-negative, and the log tells you the shift.
- The saved `Motion` is the initial velocity in blocks/tick: your `Velocity` plus the Spawn Momentum that was rolled when the TNT was spawned. Knockback from other TNT is not included, because the game applies that itself.
- `Fuse` is a byte in Bedrock, so values above 127 are capped. TNT with a fuse of `0` explode as soon as the structure loads.
- Large structures take longer to load in the game.
- The file uses the layout of the `.mcstructure` format (little-endian NBT). It has been checked with an NBT parser but not loaded in the game here, so test it in a world before relying on it.

> Some embedded viewers (for example inside Claude) only allow a fixed list of file types and refuse `.tntpreset`, `.tntheme` and `.mcstructure`. Open the page in a regular browser to save those files. The text boxes next to the export buttons always show the text so it can be copied.

## How it works

- **Movement** (per tick): gravity `-0.04`, air drag `0.98`, and on the ground an extra horizontal velocity `x0.4` and vertical `x-0.5`. The floor is at `Y = 0`.
- **Spawn Momentum:** `+0.2` upward and `0.02` horizontal in a random direction (`X = 0.02 cos a`, `Z = 0.02 sin a`). In 2D side view only X is used. The initial `Velocity` is added to this. With air drag 0.98 and ground friction 0.4, momentum alone moves a TNT about `0.166` blocks horizontally until it first lands (`0.177` blocks in total).
- **Chain explosions:** by default TNT are processed one after another within a tick. When several TNT explode in the same tick, each explosion pushes the TNT that have not exploded yet, so those move before they explode and the explosions happen at different heights, even if every TNT started in the same state. The **Explosion order** setting can make every TNT whose fuse ends in the same tick explode together instead.
- **Explosion** (power 4, centered `0.06125` above the TNT's position), Bedrock mode:
  `magnitude = 1 - (distance - width/2) / (2 * power)` with `width = 0.98`. `distance` is measured to the target TNT's feet, and the velocity added is `magnitude` blocks/tick along the explosion sphere, the vector from the explosion center to the target TNT's feet. If the target's origin (X, Y, Z) is exactly the same as the exploding TNT's, it is pushed straight up instead; any offset, however small, uses the sphere direction. Exposure is always `1`. The Custom formula is a linear push with a maximum of 4 blocks/s and a range of 4 blocks.

### Accuracy notes

The knockback formula matches the Minecraft Wiki's Bedrock section, which still marks parts of the Bedrock behavior unverified. Pushing a TNT with an identical origin straight up (and following the explosion sphere for every other TNT) is based on in-game observation. The movement constants (gravity 0.04, air drag 0.98, ground friction 0.4) and the spawn momentum values come from community input and are not verified against Bedrock here. Treat results as a close approximation and compare against the game.

## Files

```
index.html   page structure (chamber, guide, menu)
style.css    styling and themes
script.js    simulation, rendering, presets, themes, recording, exporters
assets/      logo and favicons
textures/    TNT top, side and bottom textures (PNG)
```

## License

The source code is released under the [MIT License](LICENSE). The logo in `assets/` and the TNT textures in `textures/` are not covered by this license.

## Credits

This project is not affiliated with or endorsed by Mojang or Microsoft.

The Bedrock knockback formula is based on the [Minecraft Wiki](https://minecraft.wiki/w/Explosion).
