# Room Zero — current product requirements

Updated October 6, 2026 against gameplay commit `4781f28`. This document describes the current implementation after the recent scope reductions and combat revisions. The [original expansion PRD](docs/history/original-combat-expansion-prd.md) is preserved as history; its full-roster and seven-room requirements no longer describe this build.

## Objective

Deliver a real-time procedural dungeon game as a self-contained HTML file of at most **10,000 bytes**, with responsive combat, varied encounters, boss-only weapons and generated floors. Include graphics, synthesized sound, game logic and startup decoding in that file. ZIP size and runtime memory are separate metrics.

The rebuilt current release is **9,248 HTML bytes**, **9,288 ZIP bytes**, leaving **752 HTML bytes**. Expanded minified HTML is 21,463 bytes. This is a size result for the current reduced scope, not a lossless compression result for the original expansion.

## Current scope

The detailed playable rules are in [docs/gameplay.md](docs/gameplay.md).

- Safe, open Room Zero with title, controls and centered ring. Walking onto the ring descends automatically; nearby interaction also works.
- Six connected rooms per floor: five ordinary encounters and one boss arena. Offset reciprocal screen-edge doors, irregular outlines, branches and possible dead ends. No minimap.
- One descent landmark inside the boss arena, unlocked after the boss dies. Ten landmark appearances remain. Each new floor replaces the previous floor's state.
- WASD/arrows, I attack, O interact, R restart. Held attack repeats and locks facing for strafing. Feet-based collision and per-weapon timing remain.
- Twelve enemy recipes across eight families, with 69 selected sprite entries. Swarm and conga packs coexist with mixed encounters in other rooms.
- One single-phase Skull boss, with `(6 + floor) × 40 / 3` HP and moving-gap projectile rings. No boss health bar.
- Nine weapons, one icon per weapon, one equipped at a time. Eight upgrades drop only from bosses. No temper modifiers.
- Two starting HP. Armor grants one current and maximum HP, with four available icons and a 25% ordinary-room clear reward chance. No other healing or powerups.
- Random kill score: 5–15 for ordinary enemies and 75–125 for bosses. Display only after death. Corpses persist in the current room.
- Three area palettes, connected needle/web patches and flat tiled walls/floors. Three mage patterns and one kamikaze blast pattern.
- Plain-oscillator procedural music and contextual effects. Side-view player heads and enemy horizontal facing are corrected.

## Implementation boundaries

`assets/content.json` defines the current roster and weapon parameters. `assets/roster-pools.json` retains the original coordinate requests and selection metadata; it is not a claim that every originally requested sprite is shipped. The current build has 148 atlas slots, including reserved blank pantry slots, and 2,664 bytes of raw binary masks.

`src/room.js` supplies grid generation and movement; `src/world.js` owns floor topology, encounters, rewards, progression and audio; `src/combat.js` shares melee and spell geometry; `src/actions.js` handles action timing and poses. `src/game.js` integrates input and rendering. Development controls remain outside the standalone release.

Release uses native randomness. Development floor generation is seeded, but runtime score, corpse and player-spell choices use `Math.random`; full-session determinism is not a contract.

The compiler specializes the release controller and recipes before minification and packing. Controller source guards must be updated with corresponding behavior tests when those functions change. The release stores 18 living player frames plus death, deriving the other side view by reflection; development retains 24 living frames plus death.

Temporary decoder tables occupy 14 MiB. This does not measure total browser RAM, audio allocation, canvas storage or JavaScript object overhead.

## Acceptance criteria

1. `npm run build` produces a self-contained `dist/index.html` no larger than 10,000 bytes, with no external runtime assets, and reports ZIP size separately.
2. Room Zero is safe, traversable and starts a new floor through its ring. Restart returns to 2 HP, Fist and zero score.
3. Every generated floor has six connected rooms, reciprocal screen-edge doors and a reachable boss. The boss arena owns the only descent landmark.
4. Cleared rooms and collected rewards stay cleared while revisiting a floor. Equipment, health and score persist on descent; previous-floor rooms do not.
5. Controls support movement, held attacks, facing lock, cooldowns, pickup and restart, and clear held input on blur/visibility changes.
6. The current enemy families retain their distinct pursuit, firing, trail-following, charge, spell and gaze behavior. Walls interrupt damaging gaze, and breaking exposure resets its timer.
7. Weapon cooldowns, geometry and delayed effects match the gameplay reference. Projectiles retain hit history and motion traits after equipment changes.
8. Armor is the only health increment. Death stops combat, freezes score and displays it; score remains hidden while alive.
9. Packing restores the current source correctly. Art selection uses current pools, player facing remains consistent, and development diagnostics remain usable.

## Validation recorded for this update

`npm run build` reproduced 9,248 HTML bytes and `npm test` passed on October 6, 2026. The suite exercised room connectivity and collision; 1,000 generated floors; controls and action timing; survival, rewards and progression; hazards and audio; content extensions; entrance traversal; score; combat; sprite encoding; landmark rendering; and packing recovery/current-source pixel and audio equality.

Some test success labels still use historical wording such as “seven-byte coordinates,” “5x boss scaling” and “complete requested … pools.” Those labels must not override the current six-room source, boss formula or reduced content definitions. These checks do not constitute a new subjective playtest, total RAM measurement or organizer acceptance of a jam submission.

## Superseded scope

The current implementation removes shield walls/front armor, the spiral entrance corridor, the separate exit room, the minimap, the boss health bar, fork/expanding-ring ground spells, weapon temper, most art variants and the FM music arrangement. Conga packs are smaller and slower. Weapons have distinct rates and reworked effects; Medusa now follows the player with a visible turning cone. These changes are intentional descriptions of the checked-in version, not pending requests to restore the original design.

Additional bosses, multi-phase fights, stacked powers, healing consumables and a final victory floor are not implemented.
