# Room Zero — gameplay reference

Current as of October 6, 2026, gameplay commit `4781f28`. This describes the code now in the repository; the [original expansion](history/original-combat-expansion-prd.md) is historical.

## Controls and survival

| Input | Action |
| --- | --- |
| WASD / arrows | Move at 10 tiles/s by default |
| I | Attack; hold to repeat and strafe with locked facing |
| O | Pick up a weapon or armor, descend at the boss landmark, restart after death |
| R | Fresh run |

The player starts with Fist and 2 HP. One unprotected hit removes one HP, flashes the screen and grants 0.8 seconds of invulnerability. Room entry grants one second of protection. The collision position is at the character's feet. Death leaves a fallen pose and stops movement and attacks.

Armor grants **+1 current HP and +1 maximum HP**. An ordinary room has a 25% chance of awarding it once when cleared. The four icons are (30,11), (26,12), (39,12) and (2,44). Neither bosses nor descent heal. There are no other powerups or healing items.

Score is hidden until death. Player kills award **5–15 points per ordinary enemy** and **75–125 per boss**, randomly. It carries between rooms and floors, freezes on death and resets with a new run. Kamikaze self-destruction bypasses the player-kill reward. Player kills also leave one of five corpse sprites.

## Entrance and progression

Room Zero is an enemy-free open chamber. The player starts on the left; centered text shows the title and controls. Four enlarged road-corner tiles form its 4×4 ring. Stepping onto the center descends automatically; O also activates it nearby. The earlier spiral path is gone.

A floor contains **six rooms: five ordinary encounters and one Skull boss arena**. Only the current floor is retained. All rooms are generated when entering that floor, with reciprocal doors at offset positions on the screen edges. Branches, loops and one-door dead ends are possible. Doors stay locked until the room is cleared; cleared rooms and rewards persist on revisits. There is no minimap.

One special exit appears inside the boss arena after the boss dies. Interact near it to descend. Its appearance also influences the spacious arena's outline and decorative pillars. Possible landmarks:

- Tiny palace
- Portal
- Giant mirror
- Hole
- Giant mouth
- Hollow tree
- Skull stairs
- Buried elevator
- Whirlpool
- Folded doorway

There is no separate exit room or final victory floor. Health, maximum health, equipment and score carry forward.

## Enemies

There are **12 recipes across eight families**, with **69 sprite entries** in the selected enemy art pool. Every ordinary enemy has one body HP. Shield walls and their frontal armor are removed.

Ordinary encounters choose a swarm pack, a conga line or a small mixed group. Mixed groups make up to nine rerolls to avoid swarm/conga recipes, rather than enforcing an absolute exclusion. Their size is capped at four and increases with floor depth and room index.

| Family | Recipes | Behavior |
| --- | ---: | --- |
| Swarm | 1 | 20–27 slow pursuers at 1.25 tiles/s |
| Arrow shooters | 4 | Single arrow, five-arrow fan, fast long-lived sniper arrow with slow cadence, or rapid fan |
| Kamikaze | 1 | Approaches slowly; within one tile and clear sight, starts a 0.3-second fuse and a self-centered 3×3 burn, then dies |
| Conga | 1 | 5–8 enemies at speed 8; followers use bounded leader trails and skip dead leaders |
| Charge | 1 | Telegraphs a committed melee lunge |
| Horse | 2 | Immediate straight charges at speed 12, or speed 3 for the slow variant |
| Mage | 1 | Casts a forward line, cross or distant 3×3 patch at the player |
| Medusa | 1 | Approaches when farther than four tiles, turning its gaze toward the player at up to 2.5 radians/s |

Medusa's damaging gaze requires range below seven tiles, a roughly 60-degree cone and clear sight. Four overhead icons advance over six seconds of continuous exposure, then cause one hit. Leaving the cone or taking cover resets exposure; multiple Medusas do not multiply its accumulation rate. A visible purple sector indicates its direction, but the drawn sector itself is not clipped around walls; damage performs the occlusion check.

Mage warnings appear progressively, brighten, briefly disappear, then burn for **1.2 seconds** with three flame frames. The retained mage patterns are line, cross and distant patch. Kamikazes share the field system with a self-centered patch. The old fork and expanding-ring ground spells are gone.

Pursuit uses local wall avoidance, not global pathfinding; creatures can take indirect routes or stall in complicated pockets. Ordinary projectiles use arrows. “Unlimited” sniper range is a 1,000-second lifetime, still stopped by walls and room bounds.

## Boss

**Skull** is the only boss. It has one phase and projectile rings with a moving opening. Its HP is `(6 + floor) × 40 / 3`: about 93.33 on floor one, increasing by about 13.33 per floor. There is no boss health bar. Boss shots retain their cross-shaped appearance.

Defeating Skull drops one of the eight weapon upgrades and unlocks the arena landmark. It does not heal the player.

## Weapons

Nine weapons remain. Each has one fixed icon; a pickup replaces the current weapon. Upgrades come only from bosses. Temper modifiers and alternate pickup-art pools are removed.

Cooldowns below are release defaults: 150 ms multiplied by the weapon's cadence. Animation rates are separate; the development bar can override them.

| Weapon | Icon (column,row) | Cooldown | Attack |
| --- | --- | ---: | --- |
| Fist | Compiler default | 300 ms | Immediate frontal melee |
| Arrow | 26,10 | 360 ms | Straight arrow with a 1,000-second lifetime; walls stop it |
| Returning fang | 43,10 | 510 ms | Same icon for pickup/projectile; turns toward the player after 0.4 seconds, lasts 1.2 seconds |
| Nunchucks | 48,10 | 540 ms | Continuous forward sweep lasting 0.36 seconds |
| Whirlwind | 36,9 | 750 ms | Surrounding melee, with four rotating weapon images |
| One-two | 92,33 | 450 ms | Immediate hit plus a second jab after 70 ms |
| Thrust | 31,8 | 975 ms | Charges for 240 ms, then dashes at speed 28 until 420 ms |
| Heavy hit | 26,7 | 1,125 ms | Raises the weapon for 300 ms, then hits a frontal rectangle 2.8 tiles deep and 2.4 wide |
| Rune line | 47,13 | 1,050 ms | Randomly casts a line, cross or 3×3 patch four tiles ahead; its current name understates the variety |

Release attack animation rates are respectively 14, 12, 10, 9, 7, 14, 6, 4 and 6. Shared blow records draw the held weapon. Heavy hit enlarges it; One-two's second jab is a plain fist. Thrust prevents ordinary movement while charging/dashing.

Projectiles remember previously hit enemies and retain their own traits when weapons change. The live caps are 96 projectiles and 12 spell fields.

## Environment, presentation and sound

Rooms use a 31×21 grid and connected growth, then carve an arrival pocket and passages to doors. Palettes keep scenery subdued and enemies brighter. Walls and floors use flat tile textures.

| Area | Decoration and hazards |
| --- | --- |
| Ossuary | Tomb fixtures and synchronized pulsing needle plates |
| Cistern | Water-themed decoration; no mud/debris or ground hazard patches |
| Archive | Shelves/books and webs that reduce movement speed to 55% |

Webs and needles target two connected patches of 18–30 cells, rejecting fragments below 12. Patches may meet, and narrow routes can contain hazards. The arrival pocket and doorway approaches stay clear. Room Zero and boss arenas have no hazards.

Character 104 has idle, walking, attack, pickup and death poses. Release stores 18 living frames plus death, mirroring the right-facing row for left-facing poses; development retains 24 living frames plus death. Side-view head corrections and enemy horizontal facing fixes are part of the current build.

Sound starts with the first key or pointer interaction. Music uses a four-bar minor loop with triangle bass, square arpeggio and a floor-dependent sine melody. Contextual synthesized effects cover footsteps, attacks, warnings, hits, deaths, pickups and doors. The earlier FM arrangement is removed; no recorded songs ship.

Release floors use native randomness. Development floor generation accepts seeds, but score, corpse and player-spell choices use `Math.random`, so an identical seed does not reproduce an entire play session.
