> Historical snapshot, archived October 6, 2026. Descriptions, sizes and validation claims below apply to earlier builds, not the current game. See [README](../../README.md) and [current PRD](../../PRD.md). Repository-relative paths in this snapshot refer to the repository root.

# Combat roster expansion

## Problem Statement

The dungeon needs surprising creatures and genuinely different attacks. Cosmetic reskins alone do not provide the requested encounters. The expanded preview must preserve the full requested sprite pools, even when it exceeds the eventual 10,000-byte standalone budget.

## Solution

Implement the enemy and weapon lists supplied by Andres, using the seven enemy drawings and weapon drawing as behavioral references. Keep the existing real-time room exploration, Room Zero, I/O controls, procedural floors, single boss, and boss-only weapon rewards. Replace powerups with permanent armor and show score only on death.

## User Stories

1. As a player, I want 20 or more slow swarm creatures to pursue me, so that crowd pressure changes my movement.
2. As a player, I want four arrow-shooter variants, so that single shots, fans, fast unlimited-range shots, and rapid fans pose different problems.
3. As a player, I want four to nine shield enemies to advance side by side, so that flanking their five frontal armor points matters.
4. As a player, I want slow kamikazes to burn a three-by-three patch and die, so that approaching creatures create an escape decision.
5. As a player, I want conga creatures to follow each other at speed 11, so that their line can catch my speed-10 character.
6. As a player, I want the existing windup charge with the requested replacement art, so that its readable behavior survives.
7. As a player, I want horses to charge immediately in straight lines at speed 12, with a speed-3 variant, so that I dodge their committed direction.
8. As a player, I want mage tiles to appear progressively, brighten, briefly disappear, then burn, so that I can learn the timing.
9. As a player, I want mage lines, crosses, forks, expanding rings, distant patches, and nearby patches, so that spell geometry varies.
10. As a player, I want walls to interrupt Medusa's gaze and four overhead icons to count six seconds of exposure, so that taking cover prevents damage.
11. As a player, I want all listed enemy sprite candidates available, so that unusual creatures remain surprising.
12. As a player, I want the starting attack retained with a longer cooldown, so that its cadence differs from the double attack.
13. As a player, I want arrows without a timed range limit, so that ranged weapons can cross a room.
14. As a player, I want the returning weapon's pickup and projectile to share tile 43,10, so that the weapon is recognizable.
15. As a player, I want nunchucks to make one continuous forward slash, so that the attack feels like a sweep.
16. As a player, I want an attack around my character, so that being surrounded calls for a different weapon.
17. As a player, I want an immediate one-two punch, so that double attack has no sluggish opening delay.
18. As a player, I want thrust to charge then dash quickly in a locked direction, so that commitment produces strong movement.
19. As a player, I want a large frontal heavy attack, so that its area differs from both thrust and spin.
20. As a player, I want magic to share the mage's straight-line spell, so that enemy and player magic obey consistent rules.
21. As a player, I want weapons only from bosses and one equipped at a time, so that upgrades remain meaningful.
22. As a player, I want armor to add one current and maximum HP, so that it is my only way to recover health.
23. As a player, I want damage and health to carry between rooms and floors, so that no hidden healing undermines armor.
24. As a player, I want score displayed only after death, so that combat remains uncluttered.
25. As a player, I want facing to remain locked during attacks while ordinary movement stays responsive, so that strafing is predictable.
26. As a developer, I want behavioral tests and measured build sizes, so that new content does not silently break controls or hide its byte cost.

## Implementation Decisions

- The content compiler owns validated sprite pools and compact enemy and weapon recipes. Every listed nonempty sprite remains available; empty source cells and duplicate coordinates are recorded, not substituted with unrelated art.
- The encounter generator owns pack size, safe placement, formation orientation, and room persistence. A room chooses an encounter family; swarms contain 20–27, shield walls 4–9, and conga lines 8–12 members. Other families use small groups.
- The combat engine owns geometry, delayed effects, collision, projectiles, hit memory, directional armor, and gaze. Shared spell geometry serves both mages and the player.
- Spells advance tile warnings approximately every 0.1 seconds, followed by stronger warning, a short blank interval, and animated fire. Both mage and kamikaze attacks use the new fire masks.
- Ordinary enemies have one body HP. Shields additionally absorb five points only from their front. The retained boss keeps its existing increased HP and one phase.
- Shooter variants are single, existing fan, double-speed single with slow cadence, and rapid fan. Ordinary projectiles use arrows; boss projectiles retain their existing appearance. Unlimited range means no short lifetime cutoff; walls and room boundaries still stop projectiles.
- Shield facing turns slowly as a group, prioritizing its side-by-side line. Conga followers use their leader's traveled path rather than pursuing the player independently.
- Medusa uses an occluded forward cone. Continuous exposure advances four icons across six seconds, then deals one hit. Breaking exposure resets the counter. Multiple observers do not multiply the rate.
- Input and animation keep WASD/arrows, I attack, O interact, foot collision, held attack direction, and development tuning. Thrust locks ordinary movement during its charge and dash.
- Rewards own weapon replacement, remembered pickup art, armor health increments, and death-only score. Ordinary enemies award 10 points; the boss awards 100; death freezes score; restart resets it.
- Armor defaults to an occasional cleared-room reward because its source was not specified. Boss weapons are unchanged in exclusivity. No boss kill or floor change heals the player.
- Each floor is generated when entered, retaining only current-floor room state. The boss leads to the sole dedicated floor exit. Visited-only map and safe spiral Room Zero remain.

## Testing Decisions

Test observable outcomes: pack counts and valid placement, boss reachability, frontal versus rear hits, follower trails, charge speeds and commitment, shooter cadence and distance, all six spell shapes and their stages, gaze occlusion and timing, weapon geometry, armor persistence, and death-only scoring. Run both authoring and specialized release controllers against the same contracts. Retain existing room, input, art, packing, and entrance tests; preserve historical optimization fixtures instead of presenting changed gameplay as lossless equivalence.

## Out of Scope

New bosses, boss phases, enemy relations, powerup combinations, healing consumables, new dungeon architecture, and deleting requested art to meet 10 KB are outside this expansion. The preview is allowed to exceed the limit; the eventual jam target remains 10,000 bytes.

## Further Notes

The original enemy and weapon messages are authoritative. Coordinates are zero-based and range endpoints inclusive. The charge typo `111-3 to 11-28` is interpreted as column 111, rows 3–28. The repeated third shooter is the fourth variant. The repeated thrust coordinate 35,8 is one visual candidate. All coordinates are retained in the roster manifest. Baseline commit `b4a5653` preserves the 8,454-byte game before this expansion.

The expanded preview is implemented and validated with the complete test suite. The standalone HTML is 13,610 bytes (ZIP 13,712), so it is a preview rather than a budget-compliant submission. The playable build includes 13 enemy recipes, nine weapons, 43 nonempty weapon icons and 12 nonempty armor icons.

The subsequent optimization candidate is 11,064 HTML bytes (11,104 ZIP), compared with the preserved 13,610-byte expanded checkpoint `6bbe65a`. It retains this roster and its combat contracts. Authorized changes use flat tiled walls, browser text in Room Zero, connected frontier growth, local pursuit steering, compact grid decoration tags and geometric spell fields. The 10,000-byte target remains unmet.
