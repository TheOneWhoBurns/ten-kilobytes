# Ten kilobytes — Room zero

A real-time procedural dungeon prototype. Each level is generated in full: six connected combat rooms, one single-phase boss in a far room, and a seventh, dedicated exit room directly behind the boss. There is exactly one landmark exit to the next dungeon level.

## Play

- Development: http://127.0.0.1:8010/dev/play.html
- Standalone release: http://127.0.0.1:8010/dist/
- Tile pantry: http://127.0.0.1:8010/dev/tiles.html
- Move with WASD/arrows. Release defaults: Space attacks, E interacts, R starts a new run. Development retains the user's bindings (currently I/O) and speed.
- Walk through open doors at the screen edges. Arrive through the opposite doorway in the neighboring room. Doors stay barred during combat. Cleared rooms and collected items remain cleared when revisited.
- The minimap marks the current room white, the boss warm orange, and the exit room with the area's complementary accent.
- Interact picks up the nearest item. A weapon replaces the current weapon. A potion replaces the single active power, removing both the old benefits and drawbacks. The pickup prompt states the replacement before committing.
- Defeat the boss, enter its dedicated exit room, and interact with the landmark to advance the dungeon level. Interact after death restarts the run.
- Sound starts only when the Sound button is enabled. The algorithm generates bass and melody using selected square/triangle sound palettes; there are no authored songs.

## Current generation and game loop

All room geometry, room connections, enemy rosters, behaviors, hazards, pickups, palette and boss are generated once at level creation. Room transitions use the existing level state. Room geometry is carved from seeds, not shuffled premade room templates. Like the [Isaac reference screenshots](https://store.steampowered.com/app/250900/The_Binding_of_Isaac_Rebirth/), ordinary rooms fill the screen and doors sit in the surrounding walls.

Rooms use 68 pantry tiles across floor textures, masonry, plants and objects. Floors, architecture, vegetation, ornaments, weapons and enemies receive coordinated hues, including complementary accents. No barrels are spawned. Enemy art comes from Urizen columns 114–200: development includes the entire 87-character range, while release includes twelve representative characters spanning that range to meet the file budget. The player starts as 104. Release includes only that player character; development retains the 104–200 player selector.

Enemies combine approach/keep-distance movement with aimed, fan and radial attacks. They navigate around the generated obstacles using a shared distance field. Attack warnings precede shots; projectiles collide with walls; health, damage flashes and invulnerability windows support readable combat. Bosses use the same vocabulary at larger scale with one persistent pattern, without health-triggered phase changes or enemy relationship mechanics.

Player weapons: immediate fist, straight lance projectile, three-shot fan, and returning disc. Potion generation selects a signed magnitude for Damage, Speed or Reach. There is one active potion effect, never a stack. Area rules currently include pulsing traps and slowing tar. Music is generated from seed-dependent scale walks, phrase resets, rhythmic gaps and bass pulses.

The dedicated exit room has a quiet, symmetric composition and geometry selected for its landmark. Current landmark variants: tiny palace, portal, giant mirror, hole, giant mouth, hollow tree, skull stairs, buried elevator, whirlpool and folded doorway. Exactly one is selected per level; normal room connections remain doors. These are the first playable versions, with room for further visual and balance iteration.

## Controls and development

Attack hits immediately. Holding attack locks facing across animation and cooldown gaps, allowing strafing. Releasing it preserves facing until a new movement intention; idle never turns the player. Animation speed and the minimum interval between attack starts are independent. Defaults: 83 ms animation, 150 ms attack interval. Early taps are ignored rather than queued. Pickup cannot redirect an active attack.

The compact, collapsible dev bar controls movement speed, bindings, animation rates, attack cooldown, Press/Hold modes, pause, collision, grid, hitbox, seed and sprite. Room selection and Clear room support quick inspection of every encounter and the exit room. These inspection controls never ship in release. Existing bindings, speed and display settings remain in local storage.

Character 104 uses a 72×48 transparent sheet with four direction rows and six poses (idle, two walk frames, punch, recovery, pickup). Original Urizen walking frames are retained. Generated front/back/action poses and their prompts are preserved in `assets/generated/`. Per the user's correction, only horizontal idle/walking frames are swapped; horizontal action frames remain unchanged. `node tools/prepare-104.cjs` reproduces the fitted sheet. Enlarged sprites use nearest-neighbor rendering.

## Build and verify

### Next redesign — requested, not yet implemented

The current playable version is a checkpoint. The next pass must begin with a full sprite classification: semantic categories, variants, actual animation families, environment roles, enemy identities and boss candidates. Use that catalogue to redesign the visuals and generate missing art where needed.

- Replace enemy aiming lines with readable behavior and appropriate sprite animation. Enemies must stand apart from decoration in silhouette and palette.
- Generate coherent room functions and environmental stories, with deliberately placed objects instead of decorative scatter.
- Make weapons more interesting and rarer: **weapons are boss drops only**. Current ordinary-room weapon pickups must be removed.
- Reduce explicit highlighting and guide the player through composition, contrast, motion and recognizable affordances.
- Make the single active power meaningfully change both player behavior and appearance; preserve replacement-only effects.
- Add appropriate sound effects, richer sprite animation and a more sophisticated, classically inspired procedural music system.
- Reassess combat, enemy/boss algorithms and the complete gameplay loop for clarity and fun while retaining the 10 KB target.

### Commands

Node.js only. No development dependencies ship with the game.

```sh
npm ci
npm run build
npm test
npm run dev
```

`src/room.js` owns room geometry/collision. `src/world.js` owns complete levels, enemies, weapons, powers, doors, exit landmarks and synthesized audio. `src/actions.js` handles action timing, facing and animation; `src/game.js` handles input/rendering. `src/dev.js` and `src/dev.html` are excluded from release.

The build produces `dev/play.html`, `dist/index.html`, `dist/game.zip` and `dist/size-report.json`. The release gate requires both the self-contained HTML and its upload ZIP to be at most **10,000 bytes**. Development output is not the submission. An over-budget iteration updates development and `dev/release-preview.html` while leaving the last passing release untouched.

The release is minified with esbuild/Terser, then Zopfli-Deflate packed. Its binary payload sits in a Windows-1252 HTML script data block; bytes affected by HTML parsing are escaped and round-trip checked. A tiny loader uses native `DecompressionStream` to expand UTF-8 game HTML. This avoids base64 expansion and needs a modern browser with that API. No remote runtime libraries or assets are fetched. `tools/read-build.cjs` decodes the same payload for tests. `unpacked_html_bytes` reports expanded size separately; `html_bytes` includes the loader and payload. Keep the binary release as bytes when copying; do not resave it as UTF-8 text.

Checks cover 2,000 generated rooms; 200 complete levels for deterministic generation, graph connectivity, reciprocal edge doors, safe arrivals, one boss and one dedicated exit; action timing at 30/60/144 fps; input/facing regressions; persistent cleared rooms; replacing positive/negative powers; weapons/projectile limits; boss gating; next-level progression; death/restart; pause; and sprite orientation. Browser inspection also checks the binary loader, edge-door presentation and palettes.

## Sources and scope

Urizen by vurmux is CC0: https://vurmux.itch.io/urizen-onebit-tileset. Original downloads, hashes and provenance are preserved in `assets/source/`. Original tile sheets are unchanged. Main tiles are 12×12, origin (1,1), spacing one pixel; coordinates are zero-based.

Jam: https://itch.io/jam/10-kilobytes-jam-. The page's 10 KB wording did not clarify packed versus expanded measurement when checked on October 4, 2026. This project measures the actual delivered standalone file and ZIP against 10,000 bytes, with expanded size disclosed separately. Nothing has been submitted or published.

The scope deliberately excludes enemy relationship systems, stacked powerups and boss phase changes. The later clarification permits multiple reciprocal doors and branches within a fully generated level; it supersedes the earlier rejection of a branching-dungeon proposal. Special inter-level exits occur only after the boss.
