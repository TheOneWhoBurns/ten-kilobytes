# Room Zero — gameplay reference

Current as of October 6, 2026, gameplay commit `4781f28`. This describes the code now in the repository; the [original expansion](history/original-combat-expansion-prd.md) is historical.

## Controls and survival

| Input | Action |
| --- | --- |
| WASD / arrows | Move at 10 tiles/s by default |
| Space | Attack; hold to repeat and strafe with locked facing |
| R | Fresh run |

The player starts with the sun/moon blade and 2 HP. One unprotected hit removes one HP, flashes the screen and grants 0.8 seconds of invulnerability. Room entry grants one second of protection. The collision position is at the character's feet. Death leaves a fallen pose and stops movement and attacks. Restart is locked for 0.75 seconds; afterwards a fresh key press starts a new run. Held-key repeats do not restart.

Walking over armor collects it once and grants **+1 current HP and +1 maximum HP**. An ordinary room has a 25% chance of awarding it once when cleared. The four icons are (30,11), (26,12), (39,12) and (2,44). Neither bosses nor descent heal. There are no other powerups or healing items.

Score is hidden until death. Player kills award **5–15 points per ordinary enemy** and **75–125 per boss**, randomly. It carries between rooms and floors, freezes on death and resets with a new run. Kamikaze self-destruction bypasses the player-kill reward. Player kills leave one shared corpse sprite, tile (201,0). The player keeps its separate fallen pose.

## Entrance and progression

Room Zero is an enemy-free open chamber. The player starts on the left; centered text shows the title and controls. Four enlarged road-corner tiles form its 4×4 ring. Walking onto the center descends automatically using the same trigger as the boss-room swirl. There is no Interact control. The earlier spiral path is gone.

A floor contains **six rooms: five ordinary encounters and one spacious final arena**. One of six boss encounters is chosen for the final arena. Only the current floor is retained; the next floor is generated when descending. Reciprocal doors connect rooms in a branching tree, including one-door dead ends. Doors stay locked until their room is cleared. Clearing a room removes remaining hostile arrows and spell fire, preventing hits after the final kill. Room state persists on revisits; there is no minimap.

Exactly one level exit sits at the back of the final arena, randomly chosen from five styles: the puddle, lit wall door, framed portal, shrine portal and ring portal. The puddle artwork is hidden until the boss encounter is cleared. The fountain head appears first, the puddle follows after 0.3 seconds, and the swirl appears after 0.6 seconds. The exit unlocks with the swirl. Walking within 0.45 tiles of its center descends automatically. A short chime and transition lead to the newly generated floor. Remaining on the trigger during the transition cannot skip floors.

Exit appearances are defined in `assets/exits.json`: one center tile plus decoration tiles with relative grid offsets, colors and an optional center rotation rate. One appearance is selected per floor and stays fixed on revisits. The first appearance is a **3×2 puddle touching the back wall**: tiles **3,41** and **5–8,41**, plus a solid water square, surround **78,18**, which spins in the front-right square. The wall forms the missing edge. Its position shifts sideways when necessary to avoid a room door. Exit puddles must not use 3×3 layouts; a corner version may use 2×2. Fountain head **20,40** occupies the opposite back-left corner. Additional appearances reuse existing atlas art when possible. The clearing keeps all exit decoration on the floor and leaves the front approachable. The exit remains locked until all living members of the boss encounter are defeated.

The lit-door exit embeds closed tile **4,1** in the top wall during combat. After the entire boss encounter dies, it becomes open tile **13,1** and casts a generated 12×12 light sprite onto the floor directly below. Both appear together after the 0.6-second unlock delay. Walking onto the light uses the same trigger as the puddle and Room Zero.

Three more exits assemble the supplied tiles into 3×3 structures: **26–28,42–44**, **52–54,21–23** with its center omitted, and the perimeter of **48–50,45–47**. The first two share the animated center **78,21 → 79,21 → 80,21**, cycling at six frames per second. The last ring has an empty, static walk-on center. The first frame also retains tile **27,43** underneath the animation. All appear after boss clearance and descend when walked onto at their center. Their full footprint is reserved as connected floor.

Uranium remains a stationary floor hazard. It cannot be picked up or dropped. Its radiation still builds toward damage to the player and lethal hits to enemies, including bosses; leaving the radius resets exposure.

There is no separate exit room or final victory floor. Health, maximum health, equipment and score carry forward.

## Enemies

There are **nine ordinary recipes across eight families**, with **11 ordinary sprite entries**. The bosses use twelve separate sprite tiles, including a four-tile composite slime, for **23 unique enemy/boss tiles**. Every ordinary enemy has one body HP. Shield walls and their frontal armor are removed.

Ordinary encounters choose a swarm pack, a conga line or a small mixed group. Enemies draw from the wider room floor rather than only the door-to-center paths. All spawn positions stay at least six tiles from every door, with protected routes back to the central clearing. Mixed groups make up to nine rerolls to avoid swarm/conga recipes, rather than enforcing an absolute exclusion. Their size is capped at four and increases with floor depth and room index.

| Family | Recipes | Behavior |
| --- | ---: | --- |
| Swarm | 1 | 20–27 slow pursuers at 1.25 tiles/s |
| Arrow shooters | 2 | Five-arrow fan or fast, long-lived sniper arrow with slow cadence |
| Kamikaze | 1 | Approaches slowly; within one tile and clear sight, starts a 0.3-second fuse and a self-centered 3×3 burn, then dies |
| Conga | 1 | 5–8 enemies at speed 7; followers retain line spacing and skip dead leaders. Every member uses sprite 79,11, without radiation |
| Charge | 1 | Telegraphs a committed melee lunge |
| Horse | 1 | Approaches at 2.5 tiles/s; within four tiles and clear sight, charges straight at 10 tiles/s for 0.4 seconds. After a brief 0.1-second recovery, walks for 1.2 seconds before another charge. |
| Mage | 1 | Casts a forward line, cross or distant 3×3 patch at the player |
| Medusa | 1 | Approaches when farther than four tiles, turning its gaze toward the player at up to 2.5 radians/s |

Medusa's damaging gaze requires range below seven tiles, a roughly 60-degree cone and clear sight. Three overhead icons (88,34; 89,34; 90,34) advance over three seconds of continuous exposure, then cause one hit. Leaving the cone or taking cover resets exposure; multiple Medusas do not multiply its accumulation rate. A visible purple sector indicates its direction, but the drawn sector itself is not clipped around walls; damage performs the occlusion check.

Mage warnings appear progressively, brighten, briefly disappear, then burn for **1.2 seconds** with three flame frames. The retained mage patterns are line, cross and distant patch. Kamikazes share the field system with a self-centered patch. The old fork and expanding-ring ground spells are gone.

Pursuit follows shared flood-fill routes around obstacles. Beyond six tiles from the player, approach speed is capped at 2.5 tiles/s; naturally slower enemies keep their slower pace. Inside that range, each enemy uses its normal movement speed. Charges begin only within six tiles (or their shorter existing range), then finish in their committed direction. Conga follower spacing and staggered rests remain. Ordinary projectiles use arrows. “Unlimited” sniper range is a 1,000-second lifetime, still stopped by walls and room bounds.

## Bosses

Updated October 10, 2026. One encounter is selected per floor. All bosses have a single phase and use native-size sprites.

| Boss | Sprite(s) | Behavior |
| --- | --- | --- |
| Old horse | 113,42 | Original fast horse: committed straight charges at 12 tiles/s, without windup |
| Archmage | 127,40 | Cycles line, cross and distant-patch spells every 0.875 seconds, four times the normal mage rate |
| Spellblade | 202,6 | Telegraphs a forward thrust and independently cycles all three spells at normal mage rate |
| Radioactive conga | 78,12 | Three linked members moving at speed 7; nearby exposure builds for three seconds before a hit, with static sound |
| Kitty | 1,14 | One HP; does not move, attack or deal contact damage |
| Slime | 34–35,48–49; then 106,42 → 105,42 → 104,42 | Starts as one 2×2 slime. One hit splits it into four; each splits into two, then two again; the smallest pieces die on a hit |

The slime pursues the player at 1.5 tiles/s with contact damage. Every stage has one HP, and newborn pieces have 0.25 seconds of damage/contact protection so the spawning strike cannot consume another generation. Its hitbox shrinks with its artwork. The full tree contains 29 bodies, up to 16 alive at once; every piece must die before the exit opens. Splits do not leave corpses or award score; final deaths do.

Boss HP: **mage 3**, **horse 2**, **radioactive conga 1 per member**, **devil/spellblade 6**, and **kitty 1**. Boss HP does not scale with dungeon depth. Each sword swing damages each target once. Clearing the entire encounter unlocks the existing puddle exit; no healing or weapon drops are added. The dev panel's Boss selector previews each encounter.

## Weapon

Only the starting blade remains, with sun/moon art. It stays visible while idle and moving, then uses the custom eight-direction ready, pullback and thrust poses. Each swing deals two damage to an enemy at most once. Holding attack locks facing for strafing; after release and recovery, continued movement resumes normal facing. Attacks wait until the room-entry reveal finishes, without consuming cooldown during the reveal. Nonlethal hits have a sharper impact tone. The player retains forward displacement after the strike. Other weapons and weapon pickups are removed.

## Environment, presentation and sound

Rooms use a 31×21 grid and connected growth, then carve an arrival pocket and passages to doors. Palettes keep scenery subdued and enemies brighter. Walls and floors use flat tile textures.

Rooms independently choose from the retained floor, wall and decoration pools. Patch hazards are ice, permanent fire and cycling needles; some rooms have no patch hazard. Webs and their movement slowdown are removed. Permanent spikes, bear traps and radiation remain as singleton hazards.

Patch hazards target two connected patches of up to 24 cells, rejecting fragments below 12. Hazard-free routes connect doors and enemy positions to the central clearing. Room Zero and boss arenas have no hazards.

Character 104 has idle, walking, attack, pickup and death poses. Release stores 18 living frames plus death, mirroring the right-facing row for left-facing poses; development retains 24 living frames plus death. Side-view head corrections and enemy horizontal facing fixes are part of the current build.

Sound starts with the first key or pointer interaction. Music generates a new song per floor with triangle bass, square arpeggio and sine melody. Normal rooms use a medium tempo (about 94–120 BPM); living bosses raise it to about 144–185 BPM. Once every boss member is dead, it slows to about 59–75 BPM until the player leaves. The melody continues through tempo changes without restarting. Contextual synthesized effects cover footsteps, attacks, warnings, hits, deaths, pickups and doors. Kills have a short impact; player death layers a crunch, falling bass and descending tones over 0.65 seconds. Arrow volleys, spell ignition, snapping traps and armor each have distinct cues. A room-clear cue plays once; the boss-clear chime follows the exit reveal at 0, 0.3 and 0.6 seconds. Repeated effects of the same kind are limited to one per 70 ms, with player death always audible. The earlier FM arrangement is removed; no recorded songs ship.

Release floors use native randomness. Development floor generation accepts seeds, but score, corpse and player-spell choices use `Math.random`, so an identical seed does not reproduce an entire play session.
