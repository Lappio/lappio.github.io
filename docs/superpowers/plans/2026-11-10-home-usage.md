# Homepage usage overview Implementation Plan

> Execute inline with superpowers:executing-plans. Source specification: the user's screenshot and homepage integration request, plus `../dashboard/PLAN.md`.

**Goal:** Place only the usage card below the homepage introduction and above Blog, with the heading 用量总览 / Usage overview, shared language state, matching notebook styling, and daily public data publication.

**Architecture:** Vendor the existing portable React heatmap and notebook skin, adapting them to the website tokens and centralized translations. Import `frontend/data/usage.json` at build time; validate its public allowlist before building. Reuse the dashboard's existing daily sync and already-loaded 09:00 LaunchAgent, changing only its ignored local publish configuration after the website is deployed.

**Constraints:** No new dependencies, demo page, language toggle, private database metadata, or separate deployment pipeline. Preserve all-history metric semantics, 53-week calendars, collapse, snake, tooltips and reduced motion. Small screens scroll only the calendar and start at recent dates. User approved committing/pushing and enabling daily publication.

**Design:** Existing paper `#fffdf8`, ink `#3a3a3a`, pastel yellow/sky/mint/lilac cards, existing title/body/handwriting fonts and irregular-border tokens. Left-aligned title and full-width card; no extra dashboard chrome. Desktop four stats in a row; mobile two by two.

## Task 1: Integrate and verify the component
- [x] Add failing homepage browser assertions for location, translated values, collapse, responsive sizing, tooltips and reduced motion; add public snapshot validation cases.
- [x] Copy the component, move its translations into `frontend/copy.js`, add homepage wrapper and scoped site-token skin; export the initial public snapshot without modifying dashboard data.
- [x] Validate public data at build time and test failure for private/invalid snapshots. Run focused checks.

## Task 2: Deploy and connect daily publication
- [x] Run the full tests and build; inspect desktop/mobile renders and interactions. Review the complete diff.
- [x] Document the shared data contract and daily sync operation in README.
- [x] Commit only this feature's files and push normally to main; confirm Pages succeeds and the live component matches the snapshot.
- [x] Configure the existing dashboard daily task to publish only `frontend/data/usage.json`. Run once and check task status, public-file-only changes and deployment if data changes.

## Review focus
- Invalid/public data rejected before replacing production build; no `source` or machine paths.
- Shared language switching updates labels, month/day names, tooltip, title and collapse text.
- 320px mobile has no document overflow; calendar remains scrollable with sticky weekdays.
- Collapsed chart is not keyboard-accessible; reduced motion stops snake and transitions.
- Daily task uses the existing scheduler and a temporary clone, not this working tree; no forced push or unrelated commits.

## Evidence / progress
- Baseline: `npm test` → 25 pass, 2 browser suites skipped without CHROME_PATH.
- Existing LaunchAgent is already loaded, last exit 0, initially local-only (`publish: null`); no scheduler reinstall needed.
- Final local acceptance: Chrome-enabled `npm test` **80/80 passed, 0 skips**; `npm run build` and `git diff --check` passed. Desktop Chinese and 390px English renders inspected; 320px layout covered by browser tests.
- Independent review: no blocking findings. Fixed its English token-unit finding with a failing regression test, then the full suite passed.
- Regression fix: keep keyboard-focused date tooltips positioned during focus-triggered scrolling. Resize checks await the asynchronous positioning event.
- Added a 9.9 KB locally hosted Caveat numeric/symbol subset under the existing OFL license because the site font lacks numeric glyphs.
- Deployment: feature commit `8b7f594` passed [Pages](https://github.com/Lappio/lappio.github.io/actions/runs/42817485239); verified the card on https://lappio.top/.
- Daily publication enabled in the existing ignored dashboard config. Initial run succeeded at 20:40 local time, creating `9d227dd` with only `frontend/data/usage.json`; its [Pages run](https://github.com/Lappio/lappio.github.io/actions/runs/42817752343) also succeeded.
- Live acceptance: $276.51 / 8,800 requests / 885M tokens / 95.3%, matching the exported snapshot. Shared language switching verified on the live site. GitHub Pages static assets can remain browser-cached for up to ten minutes.
- Scheduler remains loaded: 09:00 calendar trigger, hourly interval, last exit 0; subsequent `--if-due` correctly skipped after success. Previous ignored config retained at `../dashboard/.usage-sync/pre-site-publish.config.json` for recovery.
