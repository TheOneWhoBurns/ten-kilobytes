# Hipocrene: scaled rendering and packing pass

This is a bounded optimization measurement, not a claim about the size or test status of later concurrent edits. The README was left untouched.

## Changes retained

- `tile` accepts an optional destination size, defaulting to the original 12 pixels. The gothic title and enlarged entrance sprites use the same helper.
- The sun/moon and ring share one centered four-tile rendering loop. Draw order, positions, sizes, selected sprite and random-call order remain the same.
- Packing uses 32 identifier abbreviations and a reciprocal model base count of 16, selected by complete-file measurements. The selected model still allocates 14 MiB of temporary decoder tables.

No sprites, controls or gameplay behaviors were removed by this pass.

## Controlled measurements

| Snapshot | Before | After | Saved |
| --- | ---: | ---: | ---: |
| `de813c5` entrance/title game | 9,546 HTML bytes | 9,500 HTML bytes | 46 bytes |
| First concurrent death-song revision | 9,539 HTML bytes | 9,492 HTML bytes | 47 bytes |

The first optimized file has a 9,540-byte ZIP and 22,106-byte expanded minified HTML. Later score/music changes occurred during verification, so these values must not be presented as the latest build size. Read `dist/size-report.json` after rebuilding the current source.

A broader four-tile helper shared with the boss measured 9,508 bytes on the first snapshot and was rejected in favor of the smaller 9,500-byte version.

## Verification

Seven controlled seeds (1, 2, 7, 19, 83, 104, 2026) preserved rendered pixels, atlas pixels and scheduled audio for both comparisons. Packing additionally verifies decoded program equivalence.

On the first concurrent death-song revision, the build succeeded, and the test chain passed generation, controls, content, art, current-source pixel/audio equality, world snapshots, landmarks, packing, sparse models, entrance and release checks. The chain stopped at the concurrently edited score test's assertion that the run song continues after death. Combat checks were then run separately and passed. No score/music source or test changes were made as part of this optimization. Those files continued changing afterwards; this is not a claim that the full current suite passes.

Probe scripts and artifacts are retained locally in the ignored `dev/snapshots/hipocrene-optimization-20261006/` directory.
