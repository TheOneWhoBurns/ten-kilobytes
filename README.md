# Ten kilobytes — Room zero

**Standalone HTML: 8,454 bytes. Submission ZIP: 8,493 bytes. HTML headroom: 1,546 bytes; ZIP headroom: 1,507 bytes.**

A real-time procedural dungeon prototype. Every new run and death restart begins in a safe, fixed room: one-tile-wide stairs winding inward from the left edge, with a detour around the title and controls in the gaps. The route reaches a walkable 4×4 spell ring built from road corners (65–68, 4), enlarged 2×. Press O near its center to align the player exactly and descend into level 1. The title and control labels use the gothic sprite alphabet beginning at (97, 47). The control legend reads `(80,36 icon) -> WASD`, `"I" -> ATTACK` and `"O" -> INTERACT`, with half-tile clear margins and stepped corridor detours. The ring shares the stairs’ base color. Player coordinates anchor the feet; the sprite is drawn above that collision position. The prologue is outside the dungeon floor count. Each floor has five ordinary combat rooms, one boss room and one dedicated exit room behind the boss. Rooms connect through reciprocal screen-edge doors; the complete floor is generated before exploration.

## Play

- Development: http://127.0.0.1:8010/dev/play.html
- Release: http://127.0.0.1:8010/dist/
- Tile pantry: http://127.0.0.1:8010/dev/tiles.html
- Sprite catalogue: http://127.0.0.1:8010/dev/catalog.html
- WASD/arrows move. I attacks and O interacts in both builds. Development preserves custom bindings and speed; legacy Space/E defaults migrate to I/O.
- Hold attack to repeat and strafe with locked facing. The default attack interval is 150 ms, independent of the roughly 83 ms animation. Interact picks up a weapon, activates the dungeon exit or restarts after death. R begins a fresh run.
- Music and effects are enabled automatically on the first key press or pointer interaction. There is no sound toggle or bottom status strip.

## Current combat

The player has **2 HP**. One unprotected hit removes one HP and triggers a short red screen flash, a two-part impact sound and 0.8 seconds of invulnerability with blinking. The second hit kills the player. A dedicated 12×12 fallen pose remains visible until restart; movement and attacks stop on death. The pose is code-native pixel art in `assets/player-death.json`, packed as one extra binary frame. Room entry grants one second of protection without showing a damage flash.

There are **two ordinary enemy types**, each with **1 HP at every depth**:

- **Sentinel:** approaches, captures aim, compresses into a windup, then charges along that fixed line and recovers. Six appearance variants cover the three areas.
- **Slime:** animates between two poses and fires a five-shot aimed fan.

The **Skull is the only boss**, used across all areas. It fires a ring with one moving opening. Generated density gives 6, 8 or 10 actual projectiles. Its health is five times its previous scaling: **120 + 20 × depth**, starting at **140 HP**. It retains a health bar and hit flash, with one phase throughout the fight. Watcher, Serpent and Spider definitions and their unused artwork have been removed from the live build.

All four weapons remain: **Fist**, **Bone needle** (piercing), **Silk bow** (three curving shots) and **Returning fang** (outward then homing back). The Skull drops exactly one of the three reward weapons, chosen when that floor is generated. Normal enemies drop no items. Equipment replaces the previous weapon. Boss pattern still modifies the reward's damage and applicable spread/lifetime. Returning shots can hit several ordinary enemies but damage the single boss only once per projectile.

**All powerups are removed.** There are no potions, cursed effects, transformation modifiers, power trails, orbiting effects or power HUD slot. A future power system needs a new design.

Boss victory refills a surviving player's health to 2; descending refills to 2 again. A late projectile killing a boss cannot revive a dead player. Weapons carry between floors. Page loads, R and death restarts begin a fresh run. Interact after death resets equipment and health and returns to the safe starting room. There is no final victory floor or persistent upgrade progression yet.

## Rooms and atmosphere

Three area families remain:

- **Ossuary:** winding tomb passages, burial pockets, candles and pulsing needle plates.
- **Cistern:** irregular dry banks, narrow routes through water and plants. Mud/debris hazards and their tile placement are removed.
- **Archive:** shelves, chairs, books, branching alcoves and large connected web patches that slow movement to 55%.

Webs and needle plates grow across connected open floor into two irregular patches, targeting 18–30 cells each and rejecting fragments smaller than 12. Patches can meet. All needle cells in one room share their warning/activation timing. The central arrival pocket and doorway approaches remain clear; other narrow passages can contain hazards. Cistern, entrance, boss and exit rooms have no hazards.

Rooms use a 31×21 viewport with irregular walkable outlines. A wandering carving brush changes direction, periodically restarts on existing floor and changes width. Three width ranges create narrow ribbons, branching passages or broad caves. It targets 140–319 carved cells before door connections, bounded by 2,000 steps. Every new branch attaches to existing floor. Uncarved ground becomes water in Cisterns or dark solid space elsewhere; themed fixtures and decoration follow the edges. There are no stored room templates or repeated rectangular bays.

Doors occupy generated, offset positions on the actual screen edges, aligned with the reciprocal door in the next room. Each connects to the nearest floor through a narrow bent passage and has a wider arrival throat. There is no mandatory central cross. The six combat rooms can branch, loop or form one-door dead ends; every room and the boss remain reachable. Boss rooms carve a broad, unobstructed elliptical arena with varying width and height into their generated shape. The boss starts within this open arena. Fixtures stay dark, enemies use a brighter complementary accent, and the player remains legible. There are no barrels, aiming lines or yellow hazard squares.

Run `node tools/preview-rooms.cjs` to render a twelve-seed contact sheet from the actual development game at `dev/screenshots/organic-rooms.png`.

The minimap draws only visited rooms. Unvisited rooms, including the boss and exit, have no marker or outline; visiting a room reveals only that room. Cleared rooms and collected items stay cleared when revisited. Ordinary doors lock during combat. Each level has exactly one special exit, in its own peaceful room behind the boss. Its landmark is one of ten: tiny palace, portal, giant mirror, hole, giant mouth, hollow tree, skull stairs, buried elevator, whirlpool or folded doorway. The landmark influences the room's boundary and symmetric decoration. All currently advance one dungeon level without additional puzzle rules.

Each floor generates only when entered; descending replaces the previous floor rather than retaining a dungeon history. Topology, shapes, doors, hazards, enemies, boss rewards and music share one random source. Release uses native Math.random and generates only on descent. Development keeps the small seeded generator so explicit seeds reproduce a floor.

The generated score develops a procedural motif over an eight-bar harmonic cycle, using bass, broken chords, a reflected answer and a cadence. FM bass, plucks and lead provide the classical influence. Footsteps, attacks, anticipation, hits, deaths, pickups and doors have contextual effects. No recorded songs ship.

The [master gameplay document](https://chatgpt.com/space/page_00aa60efc2908191b9abd6aa6af56fb2) records the playable rules and separates future design intentions.

## Development

The collapsible dev bar controls movement, bindings, animation rates, cooldown, Press/Hold modes, pause, collision, grid, hitbox, seed and character. Room selection and Clear room support inspection. These controls do not ship in release.

Character 104 retains 24 directional idle, walking, punch, recovery and pickup frames plus the new death frame. Horizontal idle/walk corrections are preserved. Original sheets and generation provenance remain in `assets/source/` and `assets/generated/`.

```sh
npm ci
npm run build
npm test
npm run test:checkpoint
npm run dev
npm run measure:content
npm run catalog
node tools/preview-rooms.cjs
```

`src/room.js` owns geometry/collision, `src/world.js` owns levels/combat/audio, `src/actions.js` owns action timing/facing/poses, and `src/game.js` handles input/rendering. `assets/content.json` supplies the current enemy and weapon recipes. Its compiler validates fields, deduplicates weapon icons and removes uniform rule columns. Extra enemy recipes can reuse shared charge, fan and ring behavior; optional sequences and biome/weight pools only enter the release when used. The live roster uses one characteristic attack per type. `tools/specialize-release.cjs` replaces the configurable dev controller with fixed release defaults and gives each enemy a direct reference to its immutable recipe. It runs before column specialization, so future weapons retain their data-defined cadence and art. Guards reject controller source drift: update the adapter and its tests together when changing those functions.

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
| Lossless representation and byte-stream pass | 9,188 | 9,228 |
| Release controller, direct recipes and native randomness | 9,008 | 9,047 |
| Bottom UI removed; automatic audio | 8,446 | 8,485 |
| Spaced entrance legends and feet anchor | 8,516 | 8,555 |
| Final function order and keyboard-only held flag | 8,485 | 8,524 |
| Encore: obsolete focus references, trait mask and compressor tuning | 8,454 | 8,493 |

The two-hit revision saved **622 HTML bytes / 622 ZIP bytes** before the entrance was added. The entrance and visited-only map add **345 HTML bytes / 344 ZIP bytes**. Most comes from the requested scope reduction. Retuning the compressor and the final projectile representation save **18 HTML bytes / 17 ZIP bytes** after those gameplay changes. Flattening recipe tables measured larger and was rejected. No further art color reduction or music simplification was introduced.

Projectiles no longer allocate a Set of previously hit enemies. Ordinary enemies die on their first hit; a single boss-hit flag prevents repeat damage to the surviving boss. Returning and piercing flags share one integer, and positive player damage also identifies friendly projectiles. This removes redundant per-shot fields. There can be at most 96 shots. Exact JS object/allocator overhead varies by engine, so file savings are not presented as total browser RAM savings.

Rooms share a byte grid for appearance and collision: 0 wall, 1 floor, 2 fixture, 4 water; only floor is walkable. Seven grids for the current floor occupy 4,557 bytes. Seven room coordinates occupy seven bytes. Previous floor references and navigation grids are released on transitions. A four-note music motif is packed into one base-5 integer (0–624); playback extracts notes without reseeding a generator or allocating a motif array each beat. These changes reduce temporary allocation; they do not shrink the room grids or imply a measured total-browser-memory saving. Navigation reuses its distance field until the player changes cell or the room changes. The grid and coordinate representations remain unchanged.

The release atlas has **86 slots / 1,548 binary bitmap bytes**, including the new 18-byte death frame. Player poses are drawn directly from that atlas in release; development keeps a separate sheet for character selection. Expanded minified HTML is **20,187 bytes**. The ring and lettering add four road tiles and eighteen legend tiles used by release (396 raw bitmap bytes); development includes the full uppercase alphabet. The entrance path uses twenty-one bytes, each combining direction and corridor length, rather than an allocated coordinate array. The irregular-room revision adds 132 bytes to both packed HTML and ZIP without additional art. Roadroller's temporary decode model remains approximately **9.16 MiB**. Packed file size, expanded source and runtime memory are different metrics.

The earlier lossless pass saved **413 HTML bytes / 388 ZIP bytes** from the 9,601-byte checkpoint. Hazard tiles now serve both rendering and collision: each room stores one timing offset instead of allocating a second set of hazard objects. Room spawns use one tile index, with a shared tile-center conversion. Actions reuse their existing state object; movement intent is an integer rather than a newly constructed string. The tunnelling brush reuses the door direction table. Existing worlds, sprite pixels, HUD and scheduled audio remain unchanged.

The preceding round saved another **703 HTML bytes** from 9,188, including the user-requested removal of the bottom UI. The smaller release controller, direct recipe references and native random source first reached 9,008 bytes without removing art, music or mechanics. The entrance edits then added 70 bytes before final packing. Release uses one boolean held-attack flag; development still tracks keyboard and multiple pointers separately. No further palette, sprite or music simplification was adopted.

The encore saves **31 more HTML bytes**, retaining all existing visuals, audio and game rules. It removes obsolete footer-button focus references from release, combines the two projectile persistence bits into one mask check, and retunes the compressor. Temporary decoder model allocation remains 9.16 MiB. Full tests, seven-stream pixel/audio/atlas comparisons and browser startup pass.

The final expansion benchmark adds **10 enemy recipes and 6 weapons for 154 HTML bytes**, producing an 8,608-byte file (24 bytes smaller than the previous expanded benchmark). Single examples measured +22 bytes for an enemy using existing art, +40 with one new 12×12 sprite, +49 for a charge/ring/fan sequence, and +26 for a weapon using existing art. These are complete-file deltas, not fixed per-item prices. Benchmark recipes reuse existing mechanics; new primitives and a future powerup system need additional code. They were not added to the live catalog. See `dev/content-costs.json`.

The release resolves immutable atlas offsets during the build and encodes six silhouette pixels per character. Roadroller's statistical model writes base-253 byte digits directly, avoiding a printable JavaScript string around the large compressed payload. Native Deflate stores the small decoder; a reversible ISO-8859-5 HTML envelope transports both. Roadroller is pinned to 2.1.0 because the build adapts its generated decoder. Every build verifies the reconstructed parsed program before writing release files. The HTML source size is the primary selection metric, with ZIP size breaking ties; both budget checks still apply.

An alternative measured before the latest UI changes uses **0.763 MiB** for the temporary decoder model and produces **9,712-byte HTML / 9,751-byte ZIP**. That is a 12× reduction of the model allocation only, at the cost of a larger file. It is recorded in `dev/optimization-results.json`; the default retains the smaller file. Total browser RAM has not been measured. No tenfold file reduction was achieved. Colors retain the previously accepted RGB444 rounding (at most 8/255 channel error); this pass introduces no further visual or audio loss.

## Verification and reference fixtures

`npm test` first builds an ignored release diagnostic variant with hidden DOM probes for control/combat assertions. These probes, their strings and pointer buttons do not ship. Separate tests exercise the actual canvas-only release, including automatic audio, keyboard actions, restart and entrance traversal. `npm test` also checks 2,000 generated rooms; 1,000 complete floors with connected geometry, branching/dead ends, offset reciprocal doors, clear arrivals and one boss/exit; all ten landmarks; controls at 30/60/144 fps; attack locking, cooldown, pause and focus; all weapons and their boss-only rewards; 1-HP ordinary enemies; 5× boss scaling; 2-HP survival, invulnerability, hit cues, dedicated corpse and restart; single boss hits from returning projectiles; 500 levels of connected hazard patches, safe routes, Cistern removal, web slowdown and synchronized needle damage; navigation caching; deterministic audio; and compiler specialization with new recipe IDs.

Gameplay changes intentionally supersede the old combat/visual fixtures. `game-two-hit-before-optimization.html` captures the revised game before the final lossless pass, and `world-two-hit.json` preserves the earlier world snapshot hash. `world-large-hazards.json` records the intentional hazard-generation revision over 2,000 whole-world snapshots. The new prologue and minimap intentionally change pixels and startup behavior again. `world-organic.json` preserves the first irregular-room revision. The current `world-stream.json` captures the shared random stream and spacious boss arenas over 2,000 whole-world snapshots. Older fixtures remain intact. Current equivalence tests compare the packed release with its expanded build source across seven seeds, physically traversing the entrance before exercising combat, and checking pixels, HUD and audio scheduling. Historical visual fixtures remain intact. Dedicated tests check safe waiting, full narrow stair traversal, blocked shortcuts, sprite control labels, exact centering within the walkable ring, interaction to level 1, restart, and visited-only minimap state in both builds. The independent 80-frame landmark checks remain. Packing tests exercise 64 binary envelopes, eight split code/data bootstraps (including the actual byte-rANS decoder), all 256 byte values, Unicode and exact recovery through the native asynchronous loader. `npm run test:checkpoint` compares seven controlled random streams against `tools/fixtures/game-feet-entrance.html`, captured after the requested footer/audio, entrance-label and feet-anchor changes. The older 9,601-byte spiral fixture remains unchanged. The 9,008-byte optimization candidate matched that older fixture before the intentional UI/gameplay changes. Test-only random injection gives the seeded engine and native-random release the same choices. Keep these historical fixtures unchanged when intentionally extending gameplay.

The sprite catalogue inventories all 10,300 pantry slots: 5,552 occupied sprites, 4,548 empty slots and 200 separators. Exact metadata matches are distinguished from inferred families and uncertain animation groupings. The live build uses only selected art; the full source catalogue remains available for future design.

## Size inventory snapshot

Measured against the 8,454-byte release (7db379c8fc35). Reproduce with `npm run measure:inventory`; machine-readable scope and evidence are in `dev/size-inventory.json`. The release and ZIP are checked unchanged after measurement.

Feature figures below are **independent omission-test deltas**, including dead-code elimination and compression changes. They overlap and do not sum to the file size. The omitted-feature builds are measurement probes, not playable products; these figures are not guaranteed savings from a shippable feature removal. Sprite probes blank their pixels while retaining atlas dimensions and decoder code.

| Feature | Marginal HTML bytes |
| --- | ---: |
| Dungeon generation: room shapes, graph, doors, placement and hazard patches | 1,351 |
| All sprite bitmap content; keeps decoder and atlas dimensions | 849 |
| Weapon attacks, shared projectiles, damage and boss drops | 639 |
| Room Zero route, labels and stair/ring painting, including its exclusive art | 550 |
| All music and sound synthesis | 545 |
| Keyboard/focus/visibility handling and dependent player action dispatch | 437 |
| Static room painting: walls, stairs, textures, props, palettes and ring | 391 |
| Enemy/boss decisions, attack timing and shared pathfinding | 320 |
| Exit landmarks and visible room-door drawing | 230 |
| Enemy/boss rendering, squash/bob animation and boss health bar | 162 |
| Player pose selection, rendering and punch effect | 139 |
| Shared movement integration and tile collision | 118 |
| Visited-room minimap | 63 |

The exact, additive file breakdown is:

| Stored part | Bytes |
| --- | ---: |
| Compressed game program and embedded art | 7,637 |
| Compressed decompressor | 487 |
| HTML bootstrap and transport decoder | 327 |
| Transport escape bytes | 3 |

Within the bitmap content, the independently measured groups are:

| Art group | Tiles | Raw mask bytes | Marginal HTML bytes |
| --- | ---: | ---: | ---: |
| environment | 24 | 432 | 276 |
| legend | 18 | 324 | 194 |
| player | 25 | 450 | 140 |
| enemies | 8 | 144 | 79 |
| boss | 4 | 72 | 59 |
| ring | 4 | 72 | 46 |
| weapons | 3 | 54 | 27 |

Known runtime payloads are separate from the jam's file budget. This is **not total browser RAM**:

| Allocation or storage equivalent | Bytes | Basis |
| --- | ---: | --- |
| Temporary decompression model | 9,600,000 | Packer-reported allocation; temporary during startup, not measured browser RSS. |
| Main and background canvases | 749,952 | Two observed 372×252 canvases × 4 bytes/pixel; RGBA-equivalent storage, not measured GPU/browser allocation. |
| Runtime sprite atlas | 49,536 | Observed atlas dimensions × 4 bytes/pixel; RGBA-equivalent storage. |
| Seven room tile grids | 4,557 | Exact Uint8Array payload bytes; excludes objects and buffer headers. |
| Active navigation distance field | 1,302 | Exact Int16Array payload bytes; excludes headers and temporary BFS queue. |
| Floor graph coordinates | 7 | Exact Uint8Array payload bytes; excludes room/door objects. |

JS engine/JIT and browser overhead, model scratch storage, decoded strings, Web Audio internals, GPU buffers, enemies/props/doors/projectile object overhead and transient queues are not measured. No total browser RAM claim.

## Optimization ideas parked for later

These are **unproven hypotheses**, not savings included in the budget. Test complete standalone HTML, including every decoder and lookup table, against both the small live roster and a larger representative catalog.

| Idea | Why it might help | Next experiment and acceptance condition |
| --- | --- | --- |
| Remove unused behavior capabilities at build time | Uniform recipe columns are already removed, but the compiler could also eliminate code paths that no selected recipe can invoke. | Derive capability masks from the entire catalog, including bosses. Test catalogs that add each capability back. Keep it only if both the baseline and expanded game improve without hard-coding the current roster. |
| Encode enemy families as a base recipe plus sparse overrides | Stronger variants often change only speed, timings, art or a few attack parameters. Full rows may eventually cost more than a shared family and short patches. | Compare flat rows, field masks and a numeric dictionary with 10/30/60 varied enemies and weapons. Include reconstruction code and preserve exact numeric values. Current tiny catalogs may be cheaper as flat rows. |
| Encode related sprite families with exact deltas | The later pantry sections contain related silhouettes. A build-time choice of whole bitmap, mirrored base or changed-pixel mask might become worthwhile with many variants. | Benchmark actual proposed sprite families and compare every decoded pixel. Earlier whole-atlas XOR/mirroring trials were larger; retry only with a materially different, larger family corpus. |
| Describe future attacks and single-slot powers with shared primitives | New enemies, weapons and powers could reuse movement, targeting, burst, timing and modifier operations instead of each adding a bespoke loop. | Prototype against approved new mechanics, comparing direct code with short sequences. Include the interpreter and reset/replacement rules. Existing charge/fan/ring sequences already work; another abstraction must earn its overhead. |
| Give code and bitmap data different compression contexts | JavaScript tokens and silhouette runs have different statistics. A shared decoder with context routing might outperform the current single input stream. | Measure the complete loader, split markers, startup time and model allocation. Earlier native-Deflate splits of HTML/sprites grew the file; a different model is still only a hypothesis. |

The encore also rejected smaller-looking controller expressions that increased packed size, an unclamped cooldown that saved source characters but grew the file, and an exact-cardinal facing shortcut that would mishandle arbitrary pickup-facing angles. A shifted sprite alphabet improved an isolated build but lost to the chosen combination. Do not count isolated savings as additive.

## Sources and scope

Urizen by vurmux is CC0: https://vurmux.itch.io/urizen-onebit-tileset. Original downloads, licenses, hashes and metadata remain under `assets/source/` and `assets/catalog/source/`. Main tiles are 12×12 with one-pixel margin and spacing; coordinates are zero-based.

The [official jam rules](https://itch.io/jam/10-kilobytes-jam-) and [host audio clarification](https://itch.io/jam/10-kilobytes-jam-/topic/7063481/a-question), checked October 5, 2026, permit compression into the delivered game file or folder. The self-contained packed HTML is our interpretation of that rule, not a separate organizer ruling on its decoder. The build conservatively checks both HTML and ZIP against 10,000 bytes. Nothing has been submitted.

Enemy relationships, stacked power combinations and health-triggered boss phases remain outside the agreed scope. The master gameplay document's future ideas are not claims of shipped content.
