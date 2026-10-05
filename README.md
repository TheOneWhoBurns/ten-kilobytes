# Ten kilobytes — Room zero

**Standalone HTML: 9,184 bytes. Submission ZIP: 9,199 bytes. Both fit the conservative 10,000-byte limit.**

A real-time procedural dungeon prototype. Each level is generated in full: six connected combat rooms, one single-phase boss in a far room, and a seventh, dedicated exit room directly behind the boss. There is exactly one landmark exit to the next dungeon level.

## Play

- Development: http://127.0.0.1:8010/dev/play.html
- Standalone release: http://127.0.0.1:8010/dist/
- Tile pantry: http://127.0.0.1:8010/dev/tiles.html
- Searchable classification: http://127.0.0.1:8010/dev/catalog.html
- Move with WASD/arrows. Release defaults: Space attacks, E interacts, R starts a new run. Development retains the user's bindings (currently I/O) and speed.
- Walk through open doors at the screen edges. Arrive through the opposite doorway in the neighboring room. Doors stay barred during combat. Cleared rooms and collected items remain cleared when revisited.
- The minimap marks the current room white, the boss warm orange, and the exit room with the area's complementary accent.
- Interact picks up the nearest item. A weapon replaces the current weapon. A potion replaces the single active power, removing both the old benefits and drawbacks. The pickup prompt names the new effect; only one effect is ever active.
- Defeat the boss, enter its dedicated exit room, and interact with the landmark to advance the dungeon level. Interact after death restarts the run.
- Sound starts only when the Sound button is enabled. The algorithm develops a seeded motif over an eight-bar harmonic cycle, with bass, broken chords, a reflected answer and a dominant–tonic cadence. Enveloped FM synthesis supplies rounded bass, bell-like plucks and a soft lead, with quiet delayed notes for depth. Web Audio processes these signals as 32-bit floats; “8-bit” described the earlier timbre, not stored audio precision. There are no recorded songs in the release.

## Current generation and game loop

All room geometry, room connections, enemy rosters, behaviors, hazards, pickups, palette and boss are generated once at level creation. Room transitions use the existing level state. Room geometry is carved from seeds, not shuffled premade room templates. Like the [Isaac reference screenshots](https://store.steampowered.com/app/250900/The_Binding_of_Isaac_Rebirth/), ordinary rooms fill the screen and doors sit in the surrounding walls.

The visual grammar has three area families. **Ossuary** rooms arrange memorials into aisles, candles and disturbed burial bays. **Cisterns** arrange flooded basins with dry circulation and plants along the banks. **Archives** arrange shelves, chairs, books and webs. The seed chooses bay count, spacing, widths, depth and a damaged bay; abandoned, overgrown and breached conditions alter the fixtures and debris. These are algorithms that construct geometry and compositions, not a pool of finished room layouts. A circulation cross keeps edge doors legible. Boss arenas reserve a larger fighting floor, and exit rooms remain dedicated compositions.

Twenty-two distinct environment sprites in 24 fixed family slots replace the former random 68-tile scatter. Architecture stays dark, fixtures use complementary accents, enemies use a brighter complementary color, and the player stays brightest. The catalogue makes the much larger art pool available for continued expansion without treating every sprite as interchangeable. No barrels, enemy aiming lines, pickup outline boxes or yellow hazard squares remain.

Creature identity determines the attack grammar. Sentinels wind up, lunge along a captured direction, then recover; watchers throw aimed fans; slimes animate between atlas poses and spit a wider fan. They navigate a shared distance field and projectiles stop at walls. Warnings use body compression and sound, followed by extension and recovery. Hits cause recoil and a brief damage flash. The original 24×24 skull, serpent and spider composites replace enlarged humanoid bosses. The skull casts rings with a changing gap, the serpent coils and lunges, and the spider spreads volleys. Seeds vary cadence and density within those identities. Each boss keeps one behavior throughout its health bar—there are no health-triggered phase changes or enemy relationships.

**Weapons are boss drops only:** one reward per boss, no initial room weapons and no normal-enemy weapon drops. Bone needle pierces; Silk bow sends three curving shots; Returning fang travels out and homes back. The reward inherits a generated variation from its boss, affecting damage, spread and reach where applicable. A new weapon replaces the old one. Existing projectiles retain their own piercing behavior when equipment changes.

Potions are rarer (two placed per level, plus occasional normal-enemy drops), and replace the previous effect entirely:

- **Ember:** adds a short fire shot to every attack, changes damage, and gives the body and particles a warm color. A cursed dose reduces direct damage.
- **Wraith:** moving lets enemy projectiles pass through the player; stopping removes that protection. Damage taken doubles. Speed varies with the dose, and the body becomes cyan with a movement trail.
- **Thorn:** retaliates against nearby enemies on damage, changes reach, slows movement, and adds violet orbiting spines. A cursed dose shortens reach.

Ossuary needle plates pulse before damaging the player. Cistern mud and archive webs slow movement. These hazards belong to damaged bays and debris, rather than arbitrary highlighted squares. Audio now includes quiet footsteps, creature anticipation, hits, death, doors and pickups alongside the procedural score. Melodic strong beats follow the current chord and the score runs at roughly 107–125 BPM by area. Music starts only after the sound button is enabled.

The dedicated exit room has a quiet, symmetric composition and geometry selected for its landmark. Current landmark variants: tiny palace, portal, giant mirror, hole, giant mouth, hollow tree, skull stairs, buried elevator, whirlpool and folded doorway. Exactly one is selected per level; normal room connections remain doors. These are the first playable versions, with room for further visual and balance iteration.

## Controls and development

Attack hits immediately. Holding attack locks facing across animation and cooldown gaps, allowing strafing. Releasing it preserves facing until a new movement intention; idle never turns the player. Animation speed and the minimum interval between attack starts are independent. Defaults: 83 ms animation, 150 ms attack interval. Early taps are ignored rather than queued. Pickup cannot redirect an active attack.

The compact, collapsible dev bar controls movement speed, bindings, animation rates, attack cooldown, Press/Hold modes, pause, collision, grid, hitbox, seed and sprite. Room selection and Clear room support quick inspection of every encounter and the exit room. These inspection controls never ship in release. Existing bindings, speed and display settings remain in local storage.

Character 104 uses a 72×48 transparent sheet with four direction rows and six poses (idle, two walk frames, punch, recovery, pickup). Original Urizen walking frames are retained. Generated front/back/action poses and their prompts are preserved in `assets/generated/`. Per the user's correction, only horizontal idle/walking frames are swapped; horizontal action frames remain unchanged. `node tools/prepare-104.cjs` reproduces the fitted sheet. Enlarged sprites use nearest-neighbor rendering.

## Build and verify

### Sprite classification

`node tools/catalog.cjs` inventories all 10,300 grid slots: 5,552 occupied sprites, 4,548 empty slots and 200 separator tiles. The searchable catalogue includes 1,049 exact silhouette matches to the creator's older metadata, 5,519 distinct binary silhouettes, mirrored matches, equipment/pose families, ten assembled boss candidates, two-cell banners and verified 104/female movement groups. Every entry records coordinates, evidence confidence and current runtime use.

Exact metadata matches retain all ambiguous source matches. Remaining names are **inferred region/family classifications**, not 5,552 individually verified artist labels. Equipment variants are explicitly distinguished from verified animation frames; boss quadrants are marked as parts of a composite. This is a complete slot inventory with conservative classification, not a claim that every animation or individual item has been identified. One very dark tile at (145,7) is counted by raw non-black occupancy even though the runtime packer's brightness threshold would discard it.

The original art already supplies the selected bosses, props and slime poses, so this pass reuses those assets. It adds no new AI-generated sheet; the previously generated 104 sheet is retained. Source metadata and images from the creator's [Urizen repository](https://github.com/vurmux/urizen/tree/master/urizen/data/tilesets) are preserved under `assets/catalog/source/`. Runtime choices are recorded in `assets/catalog/runtime-selection.json`.

### Commands

Node.js only. No development dependencies ship with the game.

```sh
npm ci
node tools/catalog.cjs
npm run measure:content # measures adding recipes without changing the release
npm run measure # builds and reports sizes without failing the budget check
npm test
npm run build   # fails if either standalone HTML or submission ZIP exceeds 10,000 bytes
npm run dev
```

`src/room.js` owns room geometry/collision. `src/world.js` owns complete levels, enemies, weapons, powers, doors, exit landmarks and synthesized audio. `src/actions.js` handles action timing, facing and animation; `src/game.js` handles input/rendering. `src/dev.js` and `src/dev.html` are excluded from release.

The build produces `dev/play.html`, `dist/index.html`, `dist/game.zip` and `dist/size-report.json`. The default gate checks both the self-contained HTML and its submission ZIP against **10,000 bytes**. The ZIP contains only that HTML; sprites, music synthesis, game code and the startup decoder are all embedded. There are no external runtime assets or libraries. The report separately records the expanded minified source size, currently **21,647 bytes**, and the decoder's approximately **9.16 MiB** temporary model allocation. File size and runtime memory are separate measurements.

The release uses Roadroller plus native Deflate. The binary HTML envelope selects a reversible byte permutation and a rare escape byte to reduce encoding overhead; a hidden plaintext data element lets the browser preserve the binary payload without tag/comment escaping. Its load handler expands the embedded program and replaces the temporary document. The asynchronous bootstrap is independently executed against 32 test payloads and checked in the browser. Top-level function declarations use a measured compression order while executable statements keep their original order. The release canvas uses CSS containment and aspect fitting instead of a JavaScript resize observer. The build verifies exact Deflate/ZIP round trips and parsed-program equivalence after Roadroller preprocessing. Packing adds startup decoding. Fixed six-digit colors are rounded to RGB444, with a maximum per-channel change of 8/255. This is the only intentional lossy change: generated HSL palettes, sprite silhouettes, animations, controls, room and combat algorithms, and synthesized music remain intact. Current sizes are **9,184 bytes HTML / 9,199 bytes ZIP**, leaving **801 bytes** under the stricter check. The extensible combat engine adds 395 bytes to the previous 8,804-byte ZIP. This is an investment in lower incremental content cost, not a reduction in the current file. The preceding lossless pass saved 85 HTML bytes / 91 ZIP bytes, and the earlier RGB444/CSS pass saved 214 / 213. A tenfold file-size reduction has not been achieved.

`npm run measure:source` preserves the optional expanded-source experiment (previously measured at 18,600 bytes before the RGB444/CSS changes, using source factoring, literal pooling and encoding-aware identifiers). It overwrites the build outputs; run `npm run build` afterwards to restore the jam release. Those transformations helped uncompressed source but made the packed file larger, so the default release uses ordinary minification before packing.

### Adding enemies, weapons and transformations

Edit `assets/content.json`; `tools/content-data.cjs` validates it and compiles compact shared rows. Each creature stores its recipe ID and changing combat state, rather than copying its recipe or owning a behavior closure. Weapons remain an ID and powers remain one replaceable `{stat,value}` pair. There is one shared interpreter for enemy timing, volleys, melee and transformation hooks. Runtime heap cost is distinct from the file-size measurements below; JavaScript array/object overhead is engine-dependent.

- **Enemies:** choose `fan`, `charge` or `ring`, or a repeating sequence such as `["charge","ring","fan"]`. Configure windup, active duration, recovery, cooldown, projectile count/spread/speed/lifetime, charge speed, movement, standoff and HP scaling. The move stays fixed during its windup/attack/recovery. Sequences repeat throughout the fight, with no health-triggered boss phases. All steps currently share the recipe's timings and volley parameters.
- **Appearance and placement:** `enemySprites` contains zero-based pantry coordinates. An enemy's `art.base` indexes that list; `variants` bounds the contiguous frames, `animation` enables frame cycling, and `themeStride` selects themed art. Reuse existing frames freely; append coordinates for new silhouettes. Optional `biomes` (0 ossuary, 1 cistern, 2 archive) and integer `weight` (1–16) control spawns. The existing three boss composites remain tied to their biomes.
- **Weapons:** a zero `attack.count` means melee; otherwise it defines a volley. Combine `pierce`, `return` and `ring` traits with spread, curvature, speed and lifetime. `damage`, `reach` and `cooldown` are multipliers. Sprite coordinates are deduplicated. Append a weapon ID to a boss's `drop` array to put it in that boss's seeded reward pool. Each boss still drops exactly one weapon; ordinary enemies do not drop weapons.
- **Transformations:** combine damage/reach/speed modifiers, slowdown, damage taken, retaliation, an extra projectile, body/effect colors, orbit height and `phase`/`trail` traits. Signed potion strength scales damage/reach/speed modifiers; traits, slowdown, incoming damage and retaliation are fixed. A new power always replaces the old one. The existing character frames are reused with procedural visual effects; a new body silhouette needs additional art.

The compiler removes enemy/weapon columns that have the same value in every recipe and substitutes constants into the engine. A later entry that varies one of those fields automatically restores the column. Weighted spawn pools and sequence interpretation are omitted unless used. Names needed by the HUD ship; authoring IDs and field names do not. New mechanics outside these primitives still require code once, after which more recipes can reuse them.

Measured complete-file changes using `npm run measure:content`:

| Added test content | HTML bytes added | ZIP bytes added |
| --- | ---: | ---: |
| One enemy, existing art | 7 | 7 |
| One enemy with a new 12×12 silhouette | 30 | 29 |
| One charge/ring/fan enemy, activating sequences | 44 | 43 |
| One enemy with biome restriction and spawn weight | 25 | 24 |
| One weapon, existing icon, added to a boss reward pool | 8 | 8 |
| One transformation | 9 | 9 |
| Ten enemy recipes | 89 | 87 |
| Ten enemies + six weapons + six transformations | 211 | 211 |

The last test builds to **9,395 bytes HTML / 9,410 bytes ZIP**, leaving 590 bytes. These are extension fixtures, not 22 newly designed and balanced live additions. They reuse the shipped art except the explicitly named new-sprite case. Compression is nonlinear: names, parameters, silhouettes and newly activated fields change the cost. A 12×12 binary silhouette occupies 18 bytes before compression and 576 bytes of RGBA atlas pixels after decoding, excluding browser/GPU overhead. Results are saved in `dev/content-costs.json`; benchmark builds do not overwrite the playable release.

`tools/check-content.cjs` exercises new IDs through actual combat: weighted biome spawns, new art indices, attack sequences and their locked move selection, boss reward reachability, ranged and melee traits, weapon cadence, replacement transformations and the 96-projectile cap. It compares full and specialized recipes. At the cap, a rejected volley now leaves older bullets untouched instead of assigning its curvature to them. Existing default worlds, pixels, HUD and audio retain their regression fixtures.

### Compact data and source

Room appearance and collision share one byte grid: **0 wall, 1 floor, 2 fixture, 4 water**. Only `cell === 1` is walkable. Seven rooms require **4,557 bytes** of grid buffers, versus 9,114 after generation plus 651 per visited room in the old representation (13,671 after all seven). This concerns grid buffers, not total browser memory. Loot has one persistent room list. Navigation reuses its exact distance field until the player's cell or room grid changes; seven 240-frame movement scenarios reduced rebuilds from 1,673 to 261.

The six-room graph traversal uses its existing discovery queue for membership rather than duplicating it in a Set. Enemy navigation selects the first minimum-distance neighbor directly, preserving the old stable-sort tie order without allocating a filtered list or sorting it.

The graph stores seven coordinate pairs in seven bytes on a 16×16 lattice centered at (8,8). The six-room walk plus exit remains within six steps of that origin. Larger future floors must revisit this bound. Generation and the minimap share that representation. `tools/check-representation.cjs` reconstructs the previous schema and checks 2,000 complete worlds against a pre-change hash, including geometry, props, enemies, hazards, pickups, palettes, bosses and doors.

Landmarks are assembled from shared rectangle parts plus procedural oval and swirl operations. `assets/landmarks.json` keeps the editable coordinates; `tools/landmark-data.cjs` encodes those parts into printable data for the build. This is drawing data, not encoded JavaScript. All ten landmarks are compared against the previous renderer across 80 exact pixel frames. Two unused leading release tiles are omitted: **74 atlas slots / 1,332 bitmap bytes** remain. Development retains the entire character selection, while release rendering specializes to character 104. Release player frames are tinted and drawn directly in their existing atlas region. Removing the duplicate 12×456 player canvas eliminates 21,888 bytes of raw RGBA pixel storage (not a claim about total browser/GPU memory); no frame or silhouette is removed. Development keeps its separate sheet for arbitrary character selection.

`tools/compact-source.cjs` factors repeated math, distance, bearing and paint operations and assigns short Canvas operations on the game's own contexts. It groups suitable functions without changing constructors or functions using their own `this` or `arguments`. `tools/source-literals.cjs` shares repeated primitive values. The optional expanded-source build measures ordinary minification and an encoding-aware variant, then selects the smaller source file. The latter uses the standard Windows-1252 `l1` HTML encoding, allowing more one-byte JavaScript identifiers. Authoring files remain UTF-8. Keep generated release files as bytes; their declared encoding matters. `tools/read-build.cjs` reads that encoding correctly for tests.

Alternative sprite row dictionaries, difference frames, transposed bitmaps, run encodings and PNG atlases were measured. Two-bit room grids reduced buffers to 1,141 bytes but added source code; the smaller-source byte-grid representation is retained. Native Deflate and Roadroller are used by the default standalone release.

The October 5 optimization sweep also rejected simpler synthesis (roughly 50 bytes saved), a flattened palette (roughly 90), separately packed bitmap data, sprite prediction/delta graphs, hybrid native/logic packing, and extra grammar dictionaries. The small audio/palette gains did not justify their quality loss; the other formats grew after accounting for decoding. Search candidates remain under ignored `dev/snapshots/creative-budget/`.

`npm run test:equivalence` checks actual Canvas pixels, HUD/action state and audio scheduling against the immutable pre-optimization fixture across seven seeds. Its explicit `--rgb444` mode applies only the same bounded color rounding to the expected fixture; all resulting pixels must then match exactly. HUD and audio scheduling remain exact. The explicit `--shared-actor` mode folds the old vertical player sheet into the expected atlas before comparing every retained pixel; displayed frames are compared without that resource normalization. Every retained atlas pixel is checked; only the fixture's two unused leading tiles are explicitly excluded. Intentional future gameplay changes require reviewing and deliberately updating these fixtures. Tests also cover cell/room changes, backtracking and cached navigation against independent flood-fill distances.

Checks cover 2,000 generated rooms; 200 complete levels for deterministic generation, graph connectivity, reciprocal edge doors, safe arrivals, one boss and one dedicated exit; action timing at 30/60/144 fps; input/facing regressions; persistent cleared rooms; replacing positive/negative powers; weapons/projectile limits; boss gating; next-level progression; death/restart; pause; sprite orientation; boss-only single rewards; projectile snapshots; transformation mechanics; and frame-rate-independent lunges. Browser inspection also checks the binary loader, edge-door presentation and palettes.

## Sources and scope

Urizen by vurmux is CC0: https://vurmux.itch.io/urizen-onebit-tileset. Original downloads, hashes and provenance are preserved in `assets/source/`. Original tile sheets are unchanged. Main tiles are 12×12, origin (1,1), spacing one pixel; coordinates are zero-based.

The [official jam rules](https://itch.io/jam/10-kilobytes-jam-), checked October 5, 2026, limit the delivered game file and explicitly permit compression into one file or folder. The [host repeats this in the audio-size clarification](https://itch.io/jam/10-kilobytes-jam-/topic/7063481/a-question). Neither text imposes an expanded-source limit or prohibits a self-extracting HTML. Our interpretation is that the fully self-contained packed HTML qualifies; this is not a separate organizer ruling on our specific decoder. The build conservatively uses 10,000 bytes rather than 10,240 and includes every shipped asset. Nothing has been submitted or published.

The scope deliberately excludes enemy relationship systems, stacked powerups and boss phase changes. The later clarification permits multiple reciprocal doors and branches within a fully generated level; it supersedes the earlier rejection of a branching-dungeon proposal. Special inter-level exits occur only after the boss.
