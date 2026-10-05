# Ten kilobytes — Room zero

**Standalone HTML: 9,601 bytes. Submission ZIP: 9,616 bytes. Spare budget: 384 bytes.**

A real-time procedural dungeon prototype. Every new run and death restart begins in a safe, fixed room: one-tile-wide stairs winding inward from the left edge, with a detour around the title and controls in the gaps. The route reaches a walkable 4×4 spell ring built from road corners (65–68, 4), enlarged 2×. Press O near its center to align the player exactly and descend into level 1. The title and control labels use the gothic sprite alphabet beginning at (97, 47). The prologue is outside the dungeon floor count. Each floor has five ordinary combat rooms, one boss room and one dedicated exit room behind the boss. Rooms connect through reciprocal screen-edge doors; the complete floor is generated before exploration.

## Play

- Development: http://127.0.0.1:8010/dev/play.html
- Release: http://127.0.0.1:8010/dist/
- Tile pantry: http://127.0.0.1:8010/dev/tiles.html
- Sprite catalogue: http://127.0.0.1:8010/dev/catalog.html
- WASD/arrows move. I attacks and O interacts in both builds. Development preserves custom bindings and speed; legacy Space/E defaults migrate to I/O.
- Hold attack to repeat and strafe with locked facing. The default attack interval is 150 ms, independent of the roughly 83 ms animation. Interact picks up a weapon, activates the dungeon exit or restarts after death. R begins a new seeded run.
- Enable Sound for music and effects. Browser audio starts through that explicit interaction.

## Current combat

The player has **2 HP**. One unprotected hit removes one HP and triggers a short red screen flash, a two-part impact sound and 0.8 seconds of invulnerability with blinking. The second hit kills the player. A dedicated 12×12 fallen pose remains visible until restart; movement and attacks stop on death. The pose is code-native pixel art in `assets/player-death.json`, packed as one extra binary frame. Room entry grants one second of protection without showing a damage flash.

There are **two ordinary enemy types**, each with **1 HP at every depth**:

- **Sentinel:** approaches, captures aim, compresses into a windup, then charges along that fixed line and recovers. Six appearance variants cover the three areas.
- **Slime:** animates between two poses and fires a five-shot aimed fan.

The **Skull is the only boss**, used across all areas. It fires a ring with one moving opening. Seeded density gives 6, 8 or 10 actual projectiles. Its health is five times its previous scaling: **120 + 20 × depth**, starting at **140 HP**. It retains a health bar and hit flash, with one phase throughout the fight. Watcher, Serpent and Spider definitions and their unused artwork have been removed from the live build.

All four weapons remain: **Fist**, **Bone needle** (piercing), **Silk bow** (three curving shots) and **Returning fang** (outward then homing back). The Skull drops exactly one of the three reward weapons, chosen deterministically from the run and depth. Normal enemies drop no items. Equipment replaces the previous weapon. Boss pattern still modifies the reward's damage and applicable spread/lifetime. Returning shots can hit several ordinary enemies but damage the single boss only once per projectile.

**All powerups are removed.** There are no potions, cursed effects, transformation modifiers, power trails, orbiting effects or power HUD slot. A future power system needs a new design.

Boss victory refills a surviving player's health to 2; descending refills to 2 again. A late projectile killing a boss cannot revive a dead player. Weapons carry between floors. Page loads, R and death restarts create a fresh random run seed. Interact after death resets equipment and health and returns to the safe starting room. There is no final victory floor or persistent upgrade progression yet.

## Rooms and atmosphere

Three area families remain:

- **Ossuary:** winding tomb passages, burial pockets, candles and pulsing needle plates.
- **Cistern:** irregular dry banks, narrow routes through water and plants. Mud/debris hazards and their tile placement are removed.
- **Archive:** shelves, chairs, books, branching alcoves and large connected web patches that slow movement to 55%.

Webs and needle plates grow across connected open floor into two irregular patches, targeting 18–30 cells each and rejecting fragments smaller than 12. Patches can meet. All needle cells in one room share their warning/activation timing. The central arrival pocket and doorway approaches remain clear; other narrow passages can contain hazards. Cistern, entrance, boss and exit rooms have no hazards.

Rooms use a 31×21 viewport with irregular walkable outlines. A wandering carving brush changes direction, periodically restarts on existing floor and changes width. Three width ranges create narrow ribbons, branching passages or broad caves. It targets 140–319 carved cells before door connections, bounded by 2,000 steps. Every new branch attaches to existing floor. Uncarved ground becomes water in Cisterns or dark solid space elsewhere; themed fixtures and decoration follow the edges. There are no stored room templates or repeated rectangular bays.

Doors occupy seeded, offset positions on the actual screen edges, aligned with the reciprocal door in the next room. Each connects to the nearest floor through a narrow bent passage and has a wider arrival throat. There is no mandatory central cross. The six combat rooms can branch, loop or form one-door dead ends; every room and the boss remain reachable. Boss rooms carve a broad, unobstructed elliptical arena with varying width and height into their generated shape. The boss starts within this open arena. Fixtures stay dark, enemies use a brighter complementary accent, and the player remains legible. There are no barrels, aiming lines or yellow hazard squares.

Run `node tools/preview-rooms.cjs` to render a twelve-seed contact sheet from the actual development game at `dev/screenshots/organic-rooms.png`.

The minimap draws only visited rooms. Unvisited rooms, including the boss and exit, have no marker or outline; visiting a room reveals only that room. Cleared rooms and collected items stay cleared when revisited. Ordinary doors lock during combat. Each level has exactly one special exit, in its own peaceful room behind the boss. Its landmark is one of ten: tiny palace, portal, giant mirror, hole, giant mouth, hollow tree, skull stairs, buried elevator, whirlpool or folded doorway. The landmark influences the room's boundary and symmetric decoration. All currently advance one dungeon level without additional puzzle rules.

Each floor generates only when entered; descending replaces the previous floor rather than retaining a dungeon history. All generation uses one seeded random stream, shared by topology, shapes, doors, hazards, enemies, boss rewards and music. Explicit dev seeds still reproduce a floor. Ordinary page loads and new runs use fresh browser entropy.

The generated score develops a seeded motif over an eight-bar harmonic cycle, using bass, broken chords, a reflected answer and a cadence. FM bass, plucks and lead provide the classical influence. Footsteps, attacks, anticipation, hits, deaths, pickups and doors have contextual effects. No recorded songs ship.

The [master gameplay document](https://chatgpt.com/space/page_00aa60efc2908191b9abd6aa6af56fb2) records the playable rules and separates future design intentions.

## Development

The collapsible dev bar controls movement, bindings, animation rates, cooldown, Press/Hold modes, pause, collision, grid, hitbox, seed and character. Room selection and Clear room support inspection. These controls do not ship in release.

Character 104 retains 24 directional idle, walking, punch, recovery and pickup frames plus the new death frame. Horizontal idle/walk corrections are preserved. Original sheets and generation provenance remain in `assets/source/` and `assets/generated/`.

```sh
npm ci
npm run build
npm test
npm run dev
npm run measure:content
npm run catalog
node tools/preview-rooms.cjs
```

`src/room.js` owns geometry/collision, `src/world.js` owns levels/combat/audio, `src/actions.js` owns action timing/facing/poses, and `src/game.js` handles input/rendering. `assets/content.json` supplies the current enemy and weapon recipes. Its compiler validates fields, deduplicates weapon icons and removes uniform rule columns. Extra enemy recipes can reuse shared charge, fan and ring behavior; optional sequences and biome/weight pools only enter the release when used. The live roster uses one characteristic attack per type.

The build outputs `dev/play.html`, `dist/index.html`, `dist/game.zip` and `dist/size-report.json`. It fails if either HTML or ZIP exceeds **10,000 bytes**. All assets, audio synthesis, game code and startup decoding are embedded, without external runtime dependencies. `npm run measure` reports an over-budget candidate without failing. `npm run measure:source` builds the optional expanded-source experiment; run the normal build afterwards to restore release.

## Size and memory

The previous shared engine increased the ZIP from 8,804 to 9,199 bytes to make later recipes inexpensive. This revision removes the unwanted content and the associated power engine, HP tables, art and effects.

| Checkpoint | HTML | ZIP |
| --- | ---: | ---: |
| Previous extensible game | 9,184 | 9,199 |
| Revised roster, survival and feedback before final packing pass | 8,580 | 8,594 |
| Two-hit revision | 8,562 | 8,577 |
| With playable entrance and visited-only map | 8,907 | 8,921 |
| With larger hazard patches and no mud | 9,091 | 9,106 |
| With irregular rooms and offset doors | 9,223 | 9,238 |
| Spiral, I/O, spacious bosses and shared floor randomness | 9,243 | 9,258 |
| Narrow inward spiral, road ring and sprite lettering | 9,601 | 9,616 |

The two-hit revision saved **622 HTML bytes / 622 ZIP bytes** before the entrance was added. The entrance and visited-only map add **345 HTML bytes / 344 ZIP bytes**. Most comes from the requested scope reduction. Retuning the compressor and the final projectile representation save **18 HTML bytes / 17 ZIP bytes** after those gameplay changes. Flattening recipe tables measured larger and was rejected. No further art color reduction or music simplification was introduced.

Projectiles no longer allocate a Set of previously hit enemies. Ordinary enemies die on their first hit; a single boss-hit flag prevents repeat damage to the surviving boss. Returning and piercing flags share one integer, and positive player damage also identifies friendly projectiles. This removes redundant per-shot fields. There can be at most 96 shots. Exact JS object/allocator overhead varies by engine, so file savings are not presented as total browser RAM savings.

Rooms share a byte grid for appearance and collision: 0 wall, 1 floor, 2 fixture, 4 water; only floor is walkable. Seven grids for the current floor occupy 4,557 bytes. Seven room coordinates occupy seven bytes. Previous floor references and navigation grids are released on transitions. A four-note music motif is packed into one base-5 integer (0–624); playback extracts notes without reseeding a generator or allocating a motif array each beat. These changes reduce temporary allocation; they do not shrink the room grids or imply a measured total-browser-memory saving. Navigation reuses its distance field until the player changes cell or the room changes. The grid and coordinate representations remain unchanged.

The release atlas has **82 slots / 1,476 binary bitmap bytes**, including the new 18-byte death frame. Player poses are drawn directly from that atlas in release; development keeps a separate sheet for character selection. Expanded minified HTML is **22,459 bytes**. The ring and lettering add four road tiles and only the fourteen glyphs used by the release (324 raw bitmap bytes); development includes the full uppercase alphabet. The entrance path uses nineteen bytes, each combining direction and corridor length, rather than an allocated coordinate array. The irregular-room revision adds 132 bytes to both packed HTML and ZIP without additional art. Roadroller's temporary decode model remains approximately **9.16 MiB**. Packed file size, expanded source and runtime memory are different metrics.

The standalone release uses Roadroller plus native Deflate and a reversible Windows-1252 binary HTML envelope. Build checks validate exact decompression and parsed-program equivalence. Colors retain the previously accepted RGB444 rounding (at most 8/255 channel error); silhouettes are binary and music is unchanged. No tenfold reduction is claimed.

## Verification and reference fixtures

`npm test` checks 2,000 generated rooms; 1,000 complete floors with connected geometry, branching/dead ends, offset reciprocal doors, clear arrivals and one boss/exit; all ten landmarks; controls at 30/60/144 fps; attack locking, cooldown, pause and focus; all weapons and their boss-only rewards; 1-HP ordinary enemies; 5× boss scaling; 2-HP survival, invulnerability, hit cues, dedicated corpse and restart; single boss hits from returning projectiles; 500 levels of connected hazard patches, safe routes, Cistern removal, web slowdown and synchronized needle damage; navigation caching; deterministic audio; and compiler specialization with new recipe IDs.

Gameplay changes intentionally supersede the old combat/visual fixtures. `game-two-hit-before-optimization.html` captures the revised game before the final lossless pass, and `world-two-hit.json` preserves the earlier world snapshot hash. `world-large-hazards.json` records the intentional hazard-generation revision over 2,000 whole-world snapshots. The new prologue and minimap intentionally change pixels and startup behavior again. `world-organic.json` preserves the first irregular-room revision. The current `world-stream.json` captures the shared random stream and spacious boss arenas over 2,000 whole-world snapshots. Older fixtures remain intact. Current equivalence tests compare the packed release with its expanded build source across seven seeds, physically traversing the entrance before exercising combat, and checking pixels, HUD and audio scheduling. Historical visual fixtures remain intact. Dedicated tests check safe waiting, full narrow stair traversal, blocked shortcuts, sprite control labels, exact centering within the walkable ring, interaction to level 1, restart, and visited-only minimap state in both builds. The independent 80-frame landmark and 32 binary-envelope checks remain.

The sprite catalogue inventories all 10,300 pantry slots: 5,552 occupied sprites, 4,548 empty slots and 200 separators. Exact metadata matches are distinguished from inferred families and uncertain animation groupings. The live build uses only selected art; the full source catalogue remains available for future design.

## Sources and scope

Urizen by vurmux is CC0: https://vurmux.itch.io/urizen-onebit-tileset. Original downloads, licenses, hashes and metadata remain under `assets/source/` and `assets/catalog/source/`. Main tiles are 12×12 with one-pixel margin and spacing; coordinates are zero-based.

The [official jam rules](https://itch.io/jam/10-kilobytes-jam-) and [host audio clarification](https://itch.io/jam/10-kilobytes-jam-/topic/7063481/a-question), checked October 5, 2026, permit compression into the delivered game file or folder. The self-contained packed HTML is our interpretation of that rule, not a separate organizer ruling on its decoder. The build conservatively checks both HTML and ZIP against 10,000 bytes. Nothing has been submitted.

Enemy relationships, stacked power combinations and health-triggered boss phases remain outside the agreed scope. The master gameplay document's future ideas are not claims of shipped content.
