# Editor Removal Implementation Plan

> Execute inline using superpowers:executing-plans in the existing feature checkout. The user authorized execution and two local commits; no remote changes.

**Goal:** Preserve the current handdrawn interface and remove the local editor without changing article publishing.
**Architecture:** Keep Eleventy + React/Vite and the shared Markdown decoder/validator. Delete the standalone writer UI, server and store; switch all active guidance to direct Markdown authoring.
**Tech Stack:** Node.js 22+, Eleventy, React, Vite, node:test, Playwright.
**Spec:** `docs/superpowers/specs/2026-11-10-remove-editor-design.md`

## Global Constraints
- Keep current handdrawn UI and all article files; do not edit generated output.
- Two local commits on `feat/handdrawn-ui`; no push, merge or branch deletion.
- No added dependencies. Keep JSON_SCHEMA date handling and executable-front-matter rejection.

## Review Focus
- The shared decoder remains required by production article validation.
- Build fixtures must stop copying the removed writer directory.
- Local `.archify/` diagrams must never enter public output.
- Active README/contributor guidance must not advertise removed commands.
- Search, bilingual routes and narrow layouts retain their current behavior.

## Task 1: Preserve the UI version
- [x] Run baseline tests with Chrome and production build; inspect desktop/mobile renders.
- [x] Add an `.archify/` build fixture and exclusion assertion; run it RED, then exclude `.archify/**` in Eleventy and `.archify/` in Git.
- [x] Run focused build tests; stage explicit UI/docs/config paths, review staged diff and commit `feat: preserve handdrawn notebook interface`.

## Task 2: Remove the editor
- [x] Change the build fixture to stop copying writer; add removal assertions for command/UI/server/store and observe RED.
- [x] Delete writer UI/server/store and three dedicated suites. Remove encoder from the shared decoder module and adapt its tests to decoder contracts.
- [x] Remove the npm write command and active editor guidance in README, AGENTS.md and CLAUDE.md; preserve historical design documents with retirement notes.
- [x] Run full tests with Chrome, build, source-reference and output inventory checks. Review the complete diff and request one read-only whole-branch review.
- [x] Commit `refactor: remove local article editor`; report local commit IDs and direct Markdown workflow.

## Execution record
- Baseline sandbox run could not bind local HTTP listeners (`EPERM`); rerun with approval, not a test-contract change.
- Baseline production build exposed `.archify/.../index.html`; fixture/exclusion fix belongs in the preservation commit.
- First local commit: `d5bf2d6` (`feat: preserve handdrawn notebook interface`).
- Baseline full suite with Chrome: 107 passed, 0 failed/skipped. Build passed; desktop 1440px and mobile 390px renders inspected.
- `.archify/` regression: failed because private diagram was emitted; passed after Eleventy exclusion. Local diagram retained, Git-ignored.
- Editor-removal regression: failed on the existing `scripts.write` command, passed after removal. Focused decoder/posts/build suites: 23 passed.
- Final full suite with Chrome: 77 passed, 0 failed/skipped. The decrease reflects deletion of three editor-only suites; retained decoder/validator coverage and added removal regression.
- Final `npm run build`: passed; public output contains 10 HTML pages and `articles.json`, with no writer, `.archify`, or contributor guides.
- `git diff HEAD --exit-code -- frontend content/posts assets _includes`: passed, confirming this removal does not alter the saved interface, articles or templates.
- Active guidance now documents Markdown authoring. Historical editor plans/specs retained with retirement notice.
- Final article render inspected at 390px; desktop/mobile home retain the handdrawn paper/ink system. Temporary browser space and preview server closed.
- Independent read-only whole-branch review: no Critical, Important or Minor findings; ready for the second local commit.
- Finish: keep `feat/handdrawn-ui` locally as requested; no pushes, merges or branch cleanup.
