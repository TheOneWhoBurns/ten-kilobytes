# itch.io build

As of 2026-10-17, the game no longer includes the leaderboard client. Starting, dying and restarting make no score-server requests and create no player identity. The death screen still displays the run score, and its 0.75-second restart delay is unchanged.

`npm run build` selects the smaller game-plus-loader release by default; the build fails if its combined files reach 10,000 bytes. `npm run build:itch` creates `dist/hipocrene-itch.zip`. Upload it as the browser-playable HTML game. Its two required files are `index.html` and `g`. The short binary filename reduces loader overhead. The loader inflates the decoder and decodes the game directly in the itch embed, without an extra iframe.

`npm run test:itch` checks archive contents, native decompression, the death score, restart, and absence of leaderboard requests or identity storage. `dist/itch-size-report.json` records the complete extracted byte count and ZIP size. The standalone game remains `dist/index.html`.

The former public leaderboard is https://hipocrene-scores.solm2508.chatgpt.site . Its source remains in the sibling `hipocrene-leaderboard` project, project ID `appgprj_6acaab3ab384819197abd71409ec1da7`. The old client source remains in `src/itch/leaderboard.js` for reference and is not included by the build. This change does not modify the hosted service or existing scores.
