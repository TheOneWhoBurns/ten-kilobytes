# Ten kilobytes — Room zero

**Current optimization candidate: 11,064-byte standalone HTML; 11,104-byte ZIP.** This saves 2,546 HTML bytes (18.7%) from the expanded checkpoint, but remains 1,064 bytes above the 10,000-byte target. All requested nonempty enemy and weapon art remains. The expanded pre-optimization game is committed and pushed as `6bbe65a`; `b4a5653` preserves the 8,454-byte pre-expansion game. See `dist/size-report.json` for the latest measured artifact.

A real-time procedural dungeon prototype. Every new run and death restart begins in a safe, fixed room: a one-tile-wide path winding inward from the left edge, with a detour around the title and controls in the gaps. The route reaches a walkable 4×4 spell ring built from road corners (65–68, 4), enlarged 2×. Press O near its center to align the player exactly and descend into level 1. The title and control labels now use the browser’s monospace font, retaining the control icon at (80,36). The control legend reads `(80,36 icon) -> WASD`, `"I" -> ATTACK` and `"O" -> INTERACT`, with half-tile clear margins and stepped corridor detours. The ring shares the path’s base color. Player coordinates anchor the feet; the sprite is drawn above that collision position. The prologue is outside the dungeon floor count. Each floor has five ordinary combat rooms, one boss room and one dedicated exit room behind the boss. Rooms connect through reciprocal screen-edge doors; the complete floor is generated before exploration.

## Play

- Development: http://127.0.0.1:8010/dev/play.html
- Release: http://127.0.0.1:8010/dist/
- Tile pantry: http://127.0.0.1:8010/dev/tiles.html
- Sprite catalogue: http://127.0.0.1:8010/dev/catalog.html
- WASD/arrows move. I attacks and O interacts in both builds. Development preserves custom bindings and speed; legacy Space/E defaults migrate to I/O.
- Hold attack to repeat and strafe with locked facing. The starting attack interval is 300 ms, independent of the roughly 83 ms animation. Interact picks up a weapon or armor, activates the dungeon exit or restarts after death. R begins a fresh run.
- Music and effects are enabled automatically on the first key press or pointer interaction. There is no sound toggle or bottom status strip.

The run score stays hidden while alive and appears only on death. Player kills award 10 points per ordinary enemy and 100 per boss, once per kill. Score carries across rooms and floors, freezes on death and resets with a new run.

## Current combat

The player has **2 HP**. One unprotected hit removes one HP and triggers a short red screen flash, a two-part impact sound and 0.8 seconds of invulnerability with blinking. The second hit kills the player. A dedicated 12×12 fallen pose remains visible until restart; movement and attacks stop on death. The pose is code-native pixel art in `assets/player-death.json`, packed as one extra binary frame. Room entry grants one second of protection without showing a damage flash.

There are **13 ordinary enemy recipes across nine families**, each with **1 body HP**:

- **Swarm:** 20–27 slow pursuers.
- **Arrow shooters:** single short-range arrow, five-arrow fan, double-speed unlimited-range single arrow with slow cadence, and rapid fan. Boss projectiles retain their old appearance.
- **Shield wall:** 4–9 side-by-side enemies. Five additional frontal armor points; rear hits bypass armor. The formation validates the space needed before advancing or slowly turning.
- **Kamikaze:** slowly approaches, warns a 3×3 area, then burns it and dies.
- **Conga:** 8–12 enemies following traveled paths at speed 11. Dead leaders are skipped; trails are bounded.
- **Charge:** the previous windup and committed melee charge, with the requested replacement art.
- **Horse:** immediate straight charges at speed 12; the slow variant moves at speed 3.
- **Mage:** progressively marks a line, cross, fork, expanding rings, distant 3×3 patch, or self-centered patch. Marks brighten, briefly disappear, then ignite with three generated fire frames.
- **Medusa:** a forward gaze cone blocked by walls. Four overhead icons progress across six seconds of continuous exposure, then deal one hit. Leaving the cone or taking cover resets exposure.

The **Skull remains the only boss**, with **120 + 20 × depth HP** (140 on floor one), one phase, a health bar and its ring with one moving opening.

There are **nine weapons including the starting fist**: Fist, Arrow, Returning fang, Nunchucks, Whirlwind, One-two, Thrust, Heavy hit, and Rune line. Nunchucks sweep continuously in front; Whirlwind surrounds the player; One-two hits immediately and again after 70 ms; Thrust charges for 240 ms then dashes in its locked direction; Heavy hit covers a large frontal area; Rune line uses the mage's forward spell. Arrow projectiles have no short lifetime cutoff and end at walls or room bounds. Returning fang uses tile 43,10 for its pickup and projectile. Each projectile remembers which enemies it has hit and keeps its own traits when weapons change.

**Weapons are boss-only drops.** Each boss drops one of the eight upgrades; a new weapon replaces the current one. Pickup artwork is selected independently of weapon type so all 43 nonempty weapon icons can appear. All requested nonempty enemy art is retained in 246 pool entries. The coordinate manifest records the complete supplied ranges and explicitly identifies blank source cells.

**All old powerups are removed. Armor is the only health gain:** each pickup grants +1 current HP and +1 maximum HP. Twelve nonempty armor icons are available. In this preview, ordinary room clears have a 25% chance of awarding armor, selected during floor generation and awarded once. Boss kills and floor changes do not heal. Health, maximum health, equipment and score carry between floors; a new run returns to 2 HP and Fist. There is no final victory floor.

The supplied ranges contain empty cells, including magic (48,13) and armor (29,12); they stay recorded in the manifest but cannot be invisible drops. The charge range typo is interpreted as column 111, rows 3–28. The full implementation requirements and assumptions are in [PRD.md](PRD.md).

## Rooms and atmosphere

Three area families remain:

- **Ossuary:** winding tomb passages, burial pockets, candles and pulsing needle plates.
- **Cistern:** irregular dry banks, narrow routes through water and plants. Mud/debris hazards and their tile placement are removed.
- **Archive:** shelves, chairs, books, branching alcoves and large connected web patches that slow movement to 55%.

Webs and needle plates grow across connected open floor into two irregular patches, targeting 18–30 cells each and rejecting fragments smaller than 12. Patches can meet. All needle cells in one room share their warning/activation timing. The central arrival pocket and doorway approaches remain clear; other narrow passages can contain hazards. Cistern, entrance, boss and exit rooms have no hazards.

Rooms use a 31×21 viewport with irregular walkable outlines. One connected frontier-growth routine creates both room outlines and hazard patches. A random bias varies growth between broad branching patches and narrow paths; rooms target 140–319 floor cells before the central pocket and door connections. Theme-specific decoration follows the edges. Walls and closed space use one flat tiled treatment, with a faint second texture on open floor. There are no stored room templates or repeated rectangular bays.

Doors occupy generated, offset positions on the actual screen edges, aligned with the reciprocal door in the next room. Each tunnels inward until it reaches existing floor and has a wider arrival throat. There is no mandatory central cross. The six combat rooms can branch, loop or form one-door dead ends; every room and the boss remain reachable. Boss rooms carve a broad, unobstructed elliptical arena with varying width and height into their generated shape. The boss starts within this open arena. Fixtures stay dark, enemies use a brighter complementary accent, and the player remains legible. There are no barrels, aiming lines or yellow hazard squares.

Run `node tools/preview-rooms.cjs` to render a twelve-seed contact sheet from the actual development game at `dev/screenshots/organic-rooms.png`.

The minimap draws only visited rooms. Unvisited rooms, including the boss and exit, have no marker or outline; visiting a room reveals only that room. Cleared rooms and collected items stay cleared when revisited. Ordinary doors lock during combat. Each level has exactly one special exit, in its own peaceful room behind the boss. Its landmark is one of ten: tiny palace, portal, giant mirror, hole, giant mouth, hollow tree, skull stairs, buried elevator, whirlpool or folded doorway. The landmark influences the room's boundary and symmetric decoration. All currently advance one dungeon level without additional puzzle rules.

Each floor generates only when entered; descending replaces the previous floor rather than retaining a dungeon history. Topology, shapes, doors, hazards, enemies, boss rewards and music share one random source. Release uses native Math.random and generates only on descent. Development keeps the small seeded generator so explicit seeds reproduce a floor.

The generated score develops a procedural motif over an eight-bar harmonic cycle, using bass, broken chords, a reflected answer and a cadence. FM bass, plucks and lead provide the classical influence. Footsteps, attacks, anticipation, hits, deaths, pickups and doors have contextual effects. No recorded songs ship.

The [master gameplay document](https://chatgpt.com/space/page_00aa60efc2908191b9abd6aa6af56fb2) records the playable rules and separates future design intentions.

## Development

The collapsible dev bar controls movement, bindings, animation rates, cooldown, Press/Hold modes, pause, collision, grid, hitbox, seed and character. Room selection, Clear room, enemy/weapon preview selectors, and +1 armor support inspection. Movement defaults to 10 tiles/s. The cooldown control is a base multiplied by the selected weapon cadence. These controls do not ship in release.

Character 104 retains 24 directional idle, walking, punch, recovery and pickup frames plus the new death frame. Horizontal idle/walk corrections are preserved. Original sheets and generation provenance remain in `assets/source/` and `assets/generated/`.

```sh
npm ci
npm run measure
npm test
npm run dev
npm run measure:content
npm run catalog
node tools/preview-rooms.cjs
```

`src/room.js` owns geometry/collision, `src/world.js` owns levels/encounters/audio, `src/combat.js` owns shared spell and melee geometry and expanded behaviors, `src/actions.js` owns action timing/facing/poses, and `src/game.js` handles input/rendering. `assets/content.json` supplies the current enemy and weapon recipes. Its compiler validates fields, deduplicates weapon icons, normalizes unused behavior parameters, stores contiguous artwork pools as ranges and removes uniform rule columns. `tools/order-sprites.cjs` clusters nonanimated masks within each behavior pool during the build; it adds no runtime lookup. Extra enemy recipes can reuse shared charge, fan and ring behavior; optional sequences and biome/weight pools only enter the release when used. The expanded roster adds pack formations, path following, charges, ground spells and occluded gaze to those primitives. `tools/specialize-release.cjs` replaces the configurable dev controller with fixed release defaults and gives each enemy a direct reference to its immutable recipe. It runs before column specialization, so future weapons retain their data-defined cadence and art. Guards reject controller source drift: update the adapter and its tests together when changing those functions.

The build outputs `dev/play.html`, `dist/index.html`, `dist/game.zip` and `dist/size-report.json`. It fails if the standalone HTML exceeds **10,000 bytes**; ZIP size is reported separately. All assets, audio synthesis, game code and startup decoding are embedded, without external runtime dependencies. `npm run measure` reports an over-budget candidate without failing. `npm run measure:source` builds the optional expanded-source experiment; run the normal build afterwards to restore release.

## Size and memory

The historical optimization checkpoints below precede the expanded roster. The previous shared engine increased the ZIP from 8,804 to 9,199 bytes to make later recipes inexpensive. This revision removes the unwanted content and the associated power engine, HP tables, art and effects.

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
| Death-only score | 8,527 | 8,566 |
| Expanded enemies, weapons, armor and score | 13,610 | 13,712 |
| Shared growth/grid tags, geometric spells, compact input and flat tiled rooms | 12,356 | 12,395 |
| Shared melee records, recipe ranges, sprite ordering and declaration layout | 12,203 | 12,254 |
| Minimal release layout, native-safe compiler tuning, field liveness and rigid shield slots | 11,993 | 12,032 |
| Shared generation stream and grid-backed growth visitation | 11,940 | 12,046 |
| Refreshed context-model selection | 11,904 | 11,943 |
| Compact hit histories and shared spell damage convention | 11,893 | 11,932 |
| Remove obsolete terrain and biome metadata | 11,876 | 11,915 |
| Shared placement pool and combined decoration scan | 11,822 | 11,861 |
| Refreshed declaration order and bounded integer sampling | 11,801 | 11,840 |
| Native owned-page handlers and dev-only form focus handling | 11,767 | 11,806 |
| Static release entrance legends and direct control icon | 11,731 | 11,770 |
| Unified enemy update and shared contact handling | 11,665 | 11,704 |
| Shared-default enemy recipes and known sequence representation | 11,654 | 11,693 |
| Sparse decoder tables with a wider compression context | 11,524 | 11,563 |
| Sparse encoder, inline lookup, aligned sprite alphabet and shared-row ordering | 11,417 | 11,456 |
| Previous-sprite context alongside the local context model | 11,371 | 11,410 |
| Fixed compiler identifier alphabets | 11,289 | 11,329 |
| Shared superellipse brush and restored canvas opacity | 11,256 | 11,296 |
| Canvas cloning, named canvas and owned-page global handlers | 11,220 | 11,260 |
| State initialization before hoisted function declarations | 11,064 | 11,104 |

The two-hit revision saved **622 HTML bytes / 622 ZIP bytes** before the entrance was added. The entrance and visited-only map add **345 HTML bytes / 344 ZIP bytes**. Most comes from the requested scope reduction. Retuning the compressor and the final projectile representation save **18 HTML bytes / 17 ZIP bytes** after those gameplay changes. Flattening recipe tables measured larger and was rejected. No further art color reduction or music simplification was introduced.

The pre-expansion optimization replaced projectile hit sets with a single boss-hit flag. The expanded roster restores per-projectile hit memory because shields can now survive ordinary hits; returning shots must not repeatedly drain armor while overlapping a creature. Returning and piercing flags share one integer, and positive player damage also identifies friendly projectiles. The shared trait mask still avoids separate boolean fields. There can be at most 96 shots. Exact JS object/allocator overhead varies by engine, so file savings are not presented as total browser RAM savings.

The current candidate stores walkability in bit zero of each room cell and decoration index + 1 in its upper seven bits. Water and fixture flags became redundant after the flat-wall renderer and have been removed. This removes separate prop lists and repeated filtering. Seven grids occupy 4,557 bytes; seven floor coordinates occupy seven bytes. Ordinary pursuit uses local wall-avoidance steering instead of a cached global breadth-first distance field. It is smaller and may take less direct routes or stall in complex pockets. Conga followers still follow bounded leader trails; formations begin in a connected straight gallery. The four-note music motif still fits one base-5 integer.

Ground spells store their origin, angle, shape and timing; a shared geometric predicate determines warning tiles and damage. This replaces per-spell maps of tile records. Line, cross, fork, growing rings and both 3×3 patterns remain, with slightly different rasterized edges. Hazards now test the player’s foot cell. The kamikaze fuse starts closer so a stationary target is inside its own blast area.

The release atlas now has **370 slots / 6,660 binary bitmap bytes**. The savings come from removing the bitmap lettering; enemy, weapon, armor and player pixels remain exact. Expanded minified HTML is **28,347 bytes**. Room Zero retains its 21-byte route, four enlarged road-corner tiles, control icon and text. Release keyboard state uses a small numeric array; WASD/arrows, I/O, held attack, facing lock, focus clearing and R restart remain. Development retains configurable bindings. The temporary decoder tables now occupy **7 MiB**. Sparse lookup preserves a wider model’s context identities while allocating only visited states; the build-time encoder also stores only visited states.

Rejected experiments include mirrored/parent sprite deltas, block dictionaries, bit-plane transposition, custom sprite arithmetic coding, alternate character widths, PNG/WebP/AVIF atlases, numerical recipe dictionaries and generic drawing wrappers. Each was measured with its decoder in the complete HTML. Up to four peripheral pixel changes per tested sprite saved only 39 bytes and were rejected. Geometry and painting factoring gave small isolated wins that were not adopted without a combined-build improvement. Trials and backups are in the ignored `dev/snapshots/optimization-roster-20261006/` directory. These are measured failures, not promised future savings.

The follow-up saves another **153 bytes** without removing content. Thrust shares the melee-effect record and clock; heavy attacks share the melee collision loop while retaining their rectangular bounds. Thrust releases at exactly 420 ms and its weapon icon rotates with its attack direction. The compiler normalizes fields that a behavior never reads and stores contiguous weapon-art pools as ranges, with a full-list fallback for future noncontiguous pools. Build-only Hamming-distance ordering puts similar enemy masks next to one another within their original pools; animated, theme-strided and overlapping pools retain their order. All sprite pixels and selection probabilities remain intact. A measured declaration order provides the remaining lossless savings.

The next pass saves **210 bytes**. Release fills the viewport with one aspect-preserving canvas, removing obsolete footer layout rules and outer padding. Native-safe compiler tuning and recipe-field liveness remove redundant code/data; default weapon artwork now comes from its existing pool instead of a duplicate rule column. Omitted fields fail closed if runtime code reads them. Shield members take the group controller’s collision-checked positions directly, retaining its slow turn, spacing and frontal armor without a second movement solver. Full gameplay tests pass, and packed browser startup was checked. Before the shield-placement simplification, seven controlled streams also matched the prior build’s canvas pixels, atlas pixels and scheduled audio exactly.

This pass rejected preserved-name and byte-pair token encodings because complete files grew. Numeric-boolean minification was rejected after it changed native test-renderer flags; Boolean types and floating-point evaluation order are preserved. A separate action timestamp clock saved only four bytes and was not adopted because it introduced unnecessary cadence-rounding risk. Shared held-key storage and a four-corner collision rewrite both measured larger. Probe files remain in the ignored `dev/snapshots/optimization-token-20261006/` directory.

The generation cleanup saves **53 HTML bytes**. Frontier growth uses the room grid or hazard candidate set to remember claimed cells, eliminating a redundant visited set. Generation and hazards share one random-number helper; accepted cells, random draws and all 2,000 saved world snapshots remain exact. Full gameplay, packing and pixel/audio tests pass. ZIP grows by 14 bytes in this pass; standalone HTML remains the actual budget.

Additional sprite trials remain rejected: Burrows–Wheeler reordering produced complete files of 12,976 bytes (six-bit symbols) and 13,708 bytes (eight-bit symbols), both larger than 11,940. An opaque WebP/AVIF atlas with exact correction data reached 5,588 bytes for image plus corrections alone, already larger than the existing art estimate before any image loader; it was not integrated. Replacing FM music with native waveforms saved only 62 bytes in an isolated build and was not worth the timbre change. Probes and backups are in the ignored `dev/snapshots/optimization-growth-20261006/` directory.

A refreshed context-model search saves another **36 HTML bytes**, retaining the same 9.16 MiB model allocation and exact decoded program. A 36-candidate precision/count refinement did not improve it. Sprite row dictionaries and global Hamming/byte ordering with exact restoration maps all grew the complete file (12,124–13,058 and 12,365–12,622 bytes respectively). Deriving weapon variation from artwork or removing it saved only 12–25 bytes, so those gameplay changes were rejected. Experimental scripts remain in `dev/snapshots/optimization-rows-20261006/`.

The combat-record pass saves **11 HTML bytes**: bounded per-attack hit histories use arrays, and ground spells share projectiles' positive-damage convention for friendly attacks. Hit-history lookup is now linear in the number already hit; the shipped encounters have at most 27 ordinary enemies. No damage, timing, sprite or selection rule changes. The source is four bytes larger while the packed file is smaller, illustrating why source length alone is not the acceptance metric.

A shared hit-scan callback grew the packed file. Independent artwork/program streams saved only eight bytes before further tuning (which regressed); the extra decoder work was not adopted. Raw one-to-eight-bit image model trials, sprite LZ backreferences, alternate field names and a merged keyboard handler did not produce a worthwhile larger saving. Numeric action IDs saved 14 bytes in an isolated release but added specialization/diagnostic complexity; they were not adopted. Probes remain in `dev/snapshots/optimization-hits-20261006/`.

Removing obsolete terrain/biome metadata saves **17 HTML bytes**. Only walkability and decoration remain in each grid byte; the old fixture/water distinction no longer affected appearance or collision. Duplicate world-rule and per-room theme fields are also gone. The representation test reconstructs those redundant historical fields for comparison, so the existing 2,000-world fixture is unchanged rather than rebaselined. Seven previous-build comparisons retain exact rendered pixels, atlas pixels and audio scheduling.

Stateless reciprocal-door offsets did not reduce the complete file, so generation order and layouts remain unchanged. Longer compression contexts for corresponding positions in adjacent sprites grew the complete single-stream file. A raw six-bit split stream reduced its art payload to 2,916 bytes but saved only nine bytes overall while adding a second decoder run; it was not adopted. Spatial XOR, majority and median pixel predictors also grew complete files. Experiments are in `dev/snapshots/optimization-doors-20261006/`.

The combined placement pass saves **54 HTML bytes**. One post-door floor scan now decorates rooms and collects candidates for both enemy placement and hazard growth. Enemy centres stay more than four tiles from the room centre (previously five for individually placed enemies); hazards use that same four-tile clearance (previously three), retain their connected 12-tile minimum patches, and may extend one tile closer to outer walls. The shared pool contains bare floor, so decoration is not overwritten by hazard placement. Boss arenas remain spacious and have no new floor decoration in their fighting core. The same seeds now produce different layouts and placements; the older `world-compact.json` fixture is preserved, and `world-placement.json` records this intentional change. Full tests pass without relaxing existing door, connectivity, hazard-size or combat assertions; a four-tile enemy-arrival assertion was added. A native-browser preview produced no errors; see `dev/screenshots/shared-placement-room.png`. Prototypes remain in `dev/snapshots/optimization-placement-20261006/`.

The next lossless pass saves **21 HTML bytes**. A bounded 290-candidate search selected a better declaration order; random integer sampling uses truncation because its inputs are nonnegative bounded counts. All 2,000 saved worlds remain identical. Broader experiments were rejected: LZMA and Brotli payloads alone were larger than the existing complete file; a repeated-sequence model saved at most 59 payload bytes before its extra decoder; separate string/code weight banks saved at most six; mirrored row predictors and math aliases grew complete files. Fusing action dispatch saved four bytes but added specialization complexity and was left out. The atlas has only five exactly duplicated masks among its 370 slots. Evidence and scripts remain in `dev/snapshots/optimization-match-20261006/`.

The input pass saves **34 HTML bytes**. The owned page uses native keyboard, pointer, blur and visibility handler properties. Form-focus clearing remains registered with `addEventListener` in dev/diagnostic builds and is omitted from the canvas-only release. The browser exposed that `focusin` is not a supported handler property here; the source and test harness retain the proper listener API for it. All 256 key codes, modifier shortcuts and blur/visibility clearing pass. Seven controlled runs retain exact previous-build pixels and audio. Native-browser checks confirmed registration, I/O event dispatch and prevention of game-key defaults while an unrelated P key remained unblocked; there were no page errors. The temporary event observer was removed. Shared clearing callbacks and an integer key mask were measured but rejected because their combined builds grew. Evidence is in `dev/snapshots/optimization-focus-20261006/` and `dev/screenshots/native-input-room-zero.png`.

The following paragraphs describe earlier historical optimization passes. Their sizes and isolated deltas are not current marginal costs.

The earlier lossless pass saved **413 HTML bytes / 388 ZIP bytes** from the 9,601-byte checkpoint. Hazard tiles now serve both rendering and collision: each room stores one timing offset instead of allocating a second set of hazard objects. Room spawns use one tile index, with a shared tile-center conversion. Actions reuse their existing state object; movement intent is an integer rather than a newly constructed string. The tunnelling brush reuses the door direction table. Existing worlds, sprite pixels, HUD and scheduled audio remain unchanged.

The preceding round saved another **703 HTML bytes** from 9,188, including the user-requested removal of the bottom UI. The smaller release controller, direct recipe references and native random source first reached 9,008 bytes without removing art, music or mechanics. The entrance edits then added 70 bytes before final packing. Release uses one boolean held-attack flag; development still tracks keyboard and multiple pointers separately. No further palette, sprite or music simplification was adopted.

The encore saves **31 more HTML bytes**, retaining all existing visuals, audio and game rules. It removes obsolete footer-button focus references from release, combines the two projectile persistence bits into one mask check, and retunes the compressor. Temporary decoder model allocation remains 9.16 MiB. Full tests, seven-stream pixel/audio/atlas comparisons and browser startup pass.

The final expansion benchmark adds **10 enemy recipes and 6 weapons for 154 HTML bytes**, producing an 8,608-byte file (24 bytes smaller than the previous expanded benchmark). Single examples measured +22 bytes for an enemy using existing art, +40 with one new 12×12 sprite, +49 for a charge/ring/fan sequence, and +26 for a weapon using existing art. These are complete-file deltas, not fixed per-item prices. Benchmark recipes reuse existing mechanics; new primitives and a future powerup system need additional code. They were not added to the live catalog. See `dev/content-costs.json`.

The release resolves immutable atlas offsets during the build and encodes six silhouette pixels per character. Roadroller's statistical model writes base-253 byte digits directly, avoiding a printable JavaScript string around the large compressed payload. Native Deflate stores the small decoder; a reversible ISO-8859-5 HTML envelope transports both. Roadroller is pinned to 2.1.0 because the build adapts its generated decoder. Every build verifies the reconstructed parsed program before writing release files. The HTML source size is the primary selection metric, with ZIP size breaking ties; only the standalone HTML determines compliance.

An alternative measured before the latest UI changes uses **0.763 MiB** for the temporary decoder model and produces **9,712-byte HTML / 9,751-byte ZIP**. That is a 12× reduction of the model allocation only, at the cost of a larger file. It is recorded in `dev/optimization-results.json`; the default retains the smaller file. Total browser RAM has not been measured. No tenfold file reduction was achieved. Colors retain the previously accepted RGB444 rounding (at most 8/255 channel error); this pass introduces no further visual or audio loss.

## Verification and reference fixtures

`npm test` first builds an ignored release diagnostic variant with hidden DOM probes for control/combat assertions. These probes, their strings and pointer buttons do not ship. Separate tests exercise the actual canvas-only release, including automatic audio, keyboard actions, restart and entrance traversal. `npm test` also checks 2,000 generated rooms; 1,000 complete floors with connected geometry, branching/dead ends, offset reciprocal doors, clear arrivals and one boss/exit; all ten landmarks; controls at 30/60/144 fps; attack locking, cooldown, pause and focus; all weapons and their boss-only rewards; 1-HP ordinary enemies; 5× boss scaling; 2-HP survival, invulnerability, hit cues, dedicated corpse and restart; single boss hits from returning projectiles; 500 levels of connected hazard patches, safe routes, Cistern removal, web slowdown and synchronized needle damage; wall-avoiding pursuit and conga corner-following; deterministic audio; and compiler specialization with new recipe IDs. Expanded combat tests exercise all thirteen recipes and nine weapons in authoring, compact-table, and release-controller forms, including directional shields, trail following, all six spell geometries, gaze cover/timing, armor persistence and death-only score.

Gameplay changes intentionally supersede the old combat/visual fixtures. `game-two-hit-before-optimization.html` captures the revised game before the final lossless pass, and `world-two-hit.json` preserves the earlier world snapshot hash. `world-large-hazards.json` records the intentional hazard-generation revision over 2,000 whole-world snapshots. The new prologue and minimap intentionally change pixels and startup behavior again. `world-organic.json` preserves the first irregular-room revision. `world-stream.json` preserves the pre-expansion shared stream. `world-roster.json` preserves the expanded encounter generator. The earlier `world-compact.json` captures the first compact growth algorithm and grid tags. The current `world-placement.json` captures the combined decoration/placement scan over 2,000 whole-world snapshots. Older fixtures remain intact. Current equivalence tests compare the packed release with its expanded build source across seven seeds, physically traversing the entrance before exercising combat, and checking pixels, HUD and audio scheduling. Historical visual fixtures remain intact. Dedicated tests check safe waiting, full narrow stair traversal, blocked shortcuts, sprite control labels, exact centering within the walkable ring, interaction to level 1, restart, and visited-only minimap state in both builds. The independent 80-frame landmark checks remain. Packing tests exercise 64 binary envelopes, eight split code/data bootstraps (including the actual byte-rANS decoder), all 256 byte values, Unicode and exact recovery through the native asynchronous loader. `npm run test:checkpoint` is a historical optimization comparison, expected to differ after this gameplay expansion. It compares seven controlled random streams against `tools/fixtures/game-feet-entrance.html`, captured after the requested footer/audio, entrance-label and feet-anchor changes. The older 9,601-byte spiral fixture remains unchanged. The 9,008-byte optimization candidate matched that older fixture before the intentional UI/gameplay changes. Test-only random injection gives the seeded engine and native-random release the same choices. Keep these historical fixtures unchanged when intentionally extending gameplay.

The sprite catalogue inventories all 10,300 pantry slots: 5,552 occupied sprites, 4,548 empty slots and 200 separators. Exact metadata matches are distinguished from inferred families and uncertain animation groupings. The live build uses only selected art; the full source catalogue remains available for future design.

Room Zero’s release legends are now static strings, and its control icon is drawn directly. This removes runtime formatting that only configurable development controls need, saving **36 HTML bytes**. Seven seeded runs match the previous build’s rendered frames, atlas pixels and scheduled audio exactly. The full suite passes; the release equivalence test now explicitly requires a visited minimap marker after physical traversal, rather than relying on a missing text HUD to infer dungeon entry. Alternative graph traversals all measured larger and were rejected.

Combining the ordinary and special enemy updates saves another **66 HTML bytes**. Distance, direction, recipe lookup and contact handling are shared; behavior-specific updates retain their order and timing. All combat families pass their tests, and seven seeded runs match the preceding build’s pixels and audio. Twenty lossless sprite-band layouts (groups of 2–16 sprites, bands of 1–12 six-pixel characters) produced larger complete files, so the existing sprite encoding remains. These probes are in `dev/snapshots/optimization-bands-20261006/` and `dev/snapshots/optimization-enemy-frame-20261006/`.

Enemy recipes now store shared column defaults and sparse differences, reconstructing independent arrays at startup. Tiny or dense tables retain literal encoding. The compiler also removes an unnecessary array-type check: its existing sequence flag already determines whether modes are arrays. Together these save **11 HTML bytes**; expanded source shrinks by 388 bytes. All recipe values, zeros, sequence arrays, timing, art and behavior remain unchanged. Full tests and the seven-seed previous-build pixel/audio comparison pass.

Compiler experiments were kept outside the production dependencies. Closure plus Terser reduced expanded code but still produced larger complete files; 120 valid function-order trials reached 11,678 bytes against the then-current 11,665-byte baseline. Alternate canvas initialization, dictionary/Unicode/prototype recipe encodings, unused-cell substitutions, pickup tags and startup-initializer removal did not justify adoption. Sparse default rows won only for enemies; the weapon table stays literal. Evidence is under the ignored `optimization-compiler-20261006`, `optimization-tables-20261006`, `optimization-loot-20261006` and `optimization-startup-20261006` snapshots.

A sparse decoder lookup saves **130 HTML bytes** with no gameplay or artwork changes. The selected 24-bit context model has 201,326,592 possible context slots, but this program visits only 783,537. A collision-resolving table stores them in 1,048,576 slots using exactly 7,340,032 typed-array bytes, down from the previous 9,600,000-byte decoder tables. Complete dense and sparse decoders recover identical programs; an independent encoder trace verifies allocation for 7/8-bit inputs and quote modes. Tests cover three precisions, all gameplay, and previous-build pixels/audio. Native packed startup also passes with no console errors; proof is `dev/screenshots/sparse-decoder-room-zero.png`.

That initial sparse-decoder pass still used a 640 MiB dense encoder model budget. The subsequent pass below removes that requirement. The shipped decoder continues to use 7 MiB of typed-array tables; these figures exclude other JS/browser allocations. A three-state enemy-cycle experiment saved only three bytes while changing recovery movement and was rejected. Probes are in `dev/snapshots/optimization-sparse-model-20261006/` and `dev/snapshots/optimization-phases-20261006/`.

The next pass saves **153 HTML bytes**, including the final previous-sprite predictor. A build-time sparse encoder stores prediction/count pairs only for visited contexts and matches the dense encoder's byte stream exactly across three precisions, quote modes and 7/8-bit input. A small dense run supplies the pinned decoder template; its model budget is capped at 10 MiB. That cap is not total build RAM: sparse maps, source strings and other allocations are additional. Context widths beyond 24 bits did not improve the complete file.

The shipped decoder reuses its selector callback parameters for collision-resolving lookup, avoiding a second map and temporary array per decoded bit. The bitmap alphabet starts at character 55 and skips backslash and backtick, so every sprite occupies exactly 24 literal characters. Similar enemy masks are ordered within their original pools using changed-row count plus pixel distance. Two predictors reuse the previous sprite's corresponding character, with and without the immediately preceding character. Decoder tables remain 7 MiB.

All 370 atlas slots and every original pixel remain; a fixed seed can now select a different mask within the same enemy pool. Seven previous-build comparisons preserve drawing geometry/styles, background pixels, audio scheduling and canvas dimensions; they deliberately do not claim unchanged enemy-mask pixels after reordering. Exact current-source pixel/audio equivalence and the full gameplay suite pass. Native packed startup has no warnings or errors; proof is `dev/screenshots/sprite-compression-room-zero.png`.

A for-of decoder-loop trial grew to 11,429 bytes and was rejected. A separate spatial bitmap model exceeded the current marginal art cost before including its loader. Longer arbitrary-history predictors reached 11,360 bytes with 7 MiB tables or 11,359 with 14 MiB, but require a new custom history representation for only another 11–12 bytes; they remain isolated experiments. Evidence is in `dev/snapshots/optimization-sparse-encoder-20261006/` and `dev/snapshots/optimization-shared-art-20261006/`.

A fixed compiler identifier alphabet saves **82 HTML bytes**, with no source-length, art or gameplay changes. Single-character names use uppercase then lowercase letters; subsequent characters use the reversed letter order before digits. This avoids choosing names from the game's changing character-frequency histogram. The property allowlist and native API exclusions remain unchanged. Twenty thousand generated identifier candidates are unique and use valid character positions; Terser still excludes reserved words, and seven previous-build comparisons retain exact game pixels, atlas pixels and scheduled audio. The full test suite passes on the final alphabet, and native packed startup reports no warnings or errors; proof is `dev/screenshots/identifier-room-zero.png`. Temporary decoder tables remain 7 MiB.

This pass rejected several smaller-looking representations. Root/previous-context prediction backoff made complete files larger. Geometry factoring saved at most three bytes without changing collision size; a point collider saved 16 but changed contact geometry and was not adopted. A shared action clock saved 19–20 bytes but changed simultaneous action behavior. Per-sprite and global one-/two-/four-pixel row simplifications all increased file size, so every sprite pixel remains untouched. Parent-linked recipe rows also grew the file. Changing Roadroller’s identifier-abbreviation scoring saved only three bytes in the best isolated trial; that custom preprocessing hook was not adopted. Experiments are preserved in `dev/snapshots/optimization-backoff-20261006/`.

Sharing one superellipse brush between ordinary-room arrival pockets, boss arenas and exit chambers saves **33 bytes** with removal of a redundant post-restore opacity assignment. A radius of 3.1 includes exactly the old integer radius-three pocket cells. All 2,000 saved worlds remain identical; no geometry fixture was recaptured.

Canvas initialization and global event assignments save another **36 bytes**. The standalone page uses its named `game` canvas and clones it for the atlas and background; clones inherit dimensions and start with empty pixels. Development retains explicit canvas creation. VM tests now model these browser canvas features, while native startup was checked separately. The input inventory probe recognizes the bare handler assignments as well as the older window-property form.

Placing hoisted function declarations after the executable statements saves **156 more bytes**, with executable statement order unchanged. Frequently used state variables receive shorter compiled identifiers before helper functions. Expanded minified HTML drops to 28,347 bytes. The full suite passes on the final 11,064-byte artifact; seven controlled comparisons preserve prior pixels, atlas pixels and scheduled audio. Native startup has no warnings or errors; proof is `dev/screenshots/shared-shapes-room-zero.jpg`.

Other shape/paint factorizations and compiler switches were measured but did not beat the selected combination. Reusing frontier growth for the floor graph offered only a few bytes while changing every seeded floor, so it was not adopted. Nonzero initial compression-model weights also grew the file. Probes remain in `dev/snapshots/optimization-shapes-20261006/`.

## Size inventory — measured 11,220-byte checkpoint

This detailed inventory measures the 11,220-byte checkpoint (fe91b81b7d23), before the final declaration-placement saving. Current artifact size is reported above and in `dist/size-report.json`. Refresh attribution with `npm run measure:inventory`; machine-readable evidence is in `dev/size-inventory.json`. The measurement checks that the playable HTML and ZIP stay unchanged.

These are independent removal probes, not shippable builds. Values overlap, include dead-code elimination and compression-context changes, and cannot be added together as a savings plan.

| Feature | Marginal HTML bytes |
| --- | --- |
| All sprite bitmap content; keeps decoder and atlas dimensions | 2864 |
| Dungeon generation: room shapes, graph, doors, placement and hazard patches | 1112 |
| Weapon attacks, shared projectiles, damage and boss drops | 724 |
| Shared melee, dash and ground-spell effects | 703 |
| Enemy/boss decisions, attack timing and shared pathfinding | 595 |
| All music and sound synthesis | 571 |
| Keyboard/focus/visibility handling and dependent player action dispatch | 371 |
| Room Zero route, labels and stair/ring painting, including its exclusive art | 332 |
| Static room painting: walls, stairs, textures, props, palettes and ring | 254 |
| Exit landmarks and visible room-door drawing | 233 |
| Player pose selection, rendering and punch effect | 175 |
| Shared movement integration and tile collision | 165 |
| Enemy/boss rendering, squash/bob animation and boss health bar | 136 |
| Visited-room minimap | 63 |

Exact additive file breakdown for that measured checkpoint:

| Stored part | Bytes |
| --- | --- |
| Compressed game program and embedded art | 10326 |
| Compressed decompressor | 561 |
| HTML bootstrap and transport decoder | 327 |
| Transport escape bytes | 6 |

Independent bitmap-content probes:

| Art group | Tiles | Raw mask bytes | Marginal HTML bytes |
| --- | --- | --- | --- |
| enemies | 246 | 4428 | 1749 |
| weapons | 43 | 774 | 334 |
| environment | 24 | 432 | 269 |
| player | 25 | 450 | 126 |
| armor | 12 | 216 | 115 |
| boss | 4 | 72 | 57 |
| effects | 6 | 108 | 53 |
| spell_art | 5 | 90 | 51 |
| ring | 4 | 72 | 42 |
| legend | 1 | 18 | 13 |

Known runtime payloads are separate from the file budget and are not total browser RAM:

| Allocation or storage equivalent | Bytes | Basis |
| --- | --- | --- |
| Temporary decompression model | 7340032 | Generated decoder table allocation; temporary during startup, not measured browser RSS. |
| Main and background canvases | 749952 | Two observed 372×252 canvases × 4 bytes/pixel; RGBA-equivalent storage, not measured GPU/browser allocation. |
| Runtime sprite atlas | 213120 | Observed atlas dimensions × 4 bytes/pixel; RGBA-equivalent storage. |
| Seven room tile grids | 4557 | Exact Uint8Array payload bytes; excludes objects and buffer headers. |
| Floor graph coordinates | 7 | Exact Uint8Array payload bytes; excludes room/door objects. |

JS engine/JIT and browser overhead, model scratch storage, decoded strings, Web Audio internals, GPU buffers, enemies/props/doors/projectile object overhead and transient queues are not measured. No total browser RAM claim.

## Optimization ideas parked for later

These are **unproven hypotheses**, not savings included in the budget. Test complete standalone HTML, including every decoder and lookup table, against both the small live roster and a larger representative catalog.

| Idea | Why it might help | Next experiment and acceptance condition |
| --- | --- | --- |
| Remove unused behavior capabilities at build time | Uniform recipe columns are already removed, but the compiler could also eliminate code paths that no selected recipe can invoke. | Derive capability masks from the entire catalog, including bosses. Test catalogs that add each capability back. Keep it only if both the baseline and expanded game improve without hard-coding the current roster. |
| Family-specific recipe defaults | Column defaults are now implemented; groups of related future variants might benefit from different defaults. | Compare against the shipped sparse rows with a larger approved catalog. Include every additional family selector and decoder. |
| Encode related sprite families with exact deltas | The later pantry sections contain related silhouettes. A build-time choice of whole bitmap, mirrored base or changed-pixel mask might become worthwhile with many variants. | Benchmark actual proposed sprite families and compare every decoded pixel. Earlier whole-atlas XOR/mirroring trials were larger; retry only with a materially different, larger family corpus. |
| Describe future attacks and single-slot powers with shared primitives | New enemies, weapons and powers could reuse movement, targeting, burst, timing and modifier operations instead of each adding a bespoke loop. | Prototype against approved new mechanics, comparing direct code with short sequences. Include the interpreter and reset/replacement rules. Existing charge/fan/ring sequences already work; another abstraction must earn its overhead. |
| Give code and bitmap data different compression contexts | JavaScript tokens and silhouette runs have different statistics. A shared decoder with context routing might outperform the current single input stream. | Measure the complete loader, split markers, startup time and model allocation. Earlier native-Deflate splits of HTML/sprites grew the file; a different model is still only a hypothesis. |

The encore also rejected smaller-looking controller expressions that increased packed size, an unclamped cooldown that saved source characters but grew the file, and an exact-cardinal facing shortcut that would mishandle arbitrary pickup-facing angles. An earlier shifted sprite alphabet improved an isolated build but lost to that combination; the current aligned alphabet was measured with its final model and ordering. Do not count isolated savings as additive.

## Sources and scope

Urizen by vurmux is CC0: https://vurmux.itch.io/urizen-onebit-tileset. Original downloads, licenses, hashes and metadata remain under `assets/source/` and `assets/catalog/source/`. Main tiles are 12×12 with one-pixel margin and spacing; coordinates are zero-based.

The [official jam rules](https://itch.io/jam/10-kilobytes-jam-) and [host audio clarification](https://itch.io/jam/10-kilobytes-jam-/topic/7063481/a-question), checked October 5, 2026, permit compression into the delivered game file or folder. The self-contained packed HTML is our interpretation of that rule, not a separate organizer ruling on its decoder. The build checks the complete standalone HTML against 10,000 bytes and reports ZIP size separately. Nothing has been submitted.

Enemy relationships, stacked power combinations and health-triggered boss phases remain outside the agreed scope. The master gameplay document's future ideas are not claims of shipped content.
