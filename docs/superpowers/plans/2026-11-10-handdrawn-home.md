# Handdrawn Home Implementation Plan

> Execute inline using superpowers:executing-plans; keep the existing user checkout and requested feature branch. Do not commit or publish without a user request.

**Goal:** Deliver the selected notebook-style frontend across home, interior pages and search.
**Architecture:** Reuse App's data/state contracts and shadcn primitives. Replace the old visual styles rather than stacking another override sheet. Home owns the notebook composition; a small sketch module owns reusable decorative SVG.
**Tech Stack:** React, Vite, Tailwind v4, Eleventy, node:test, Playwright.
**Spec:** `docs/superpowers/specs/2026-11-10-handdrawn-home-design.md`

## Global Constraints
- Supplied handdrawn-ui palette, 2px ink borders, zero-blur hard shadows, alternating radii, restrained rotations.
- Preserve article data, relative URLs, all six destinations, bilingual copy, static fallback and writer.
- No fabricated content, added dependencies or externally loaded fonts.

## Review Focus
- Narrow English navigation and long Chinese article titles must not overflow.
- No articles, failed fetch and retry must give usable feedback.
- Search portals need the same styling and reduced-motion handling as the main app.
- Article code/tables remain scrollable; prose never rotates.
- Keyboard focus, Escape dismissal, skip link and touch controls remain usable.

## Task 1: Notebook composition and styling
- [x] Extend the built-site browser suite with notebook layout, CTA and palette assertions; observe failure before implementation.
- [x] Create `frontend/components/sketch.jsx` for decorative marker/arrow/rule SVG.
- [x] Rebuild `Home({ t, href, posts, language, status, reload })` in `frontend/home.jsx`; retain `.home-post-link` and six semantic `.home-section` destinations.
- [x] Add paired hero/action strings in `frontend/copy.js`.
- [x] Replace `frontend/styles.css` and `frontend/home.css` with shared system and home layout. Keep App data fetching and routes unchanged; localize existing article back controls.
- [x] Verify browser/i18n/layout tests with CHROME_PATH.

## Task 2: Interaction and visual acceptance
- [x] Cover retry after index failure, empty index, search keyboard dismissal/focus restoration, desktop two columns, mobile stack and reduced motion in the browser suite.
- [x] Run `npm test` with Chrome and `npm run build`; inspect desktop, mobile, search and article renders using ego-browser.
- [x] Correct material defects, update README customization notes, and record evidence here.

## Progress
- Design: user selected notebook homepage; existing backend/data contracts remain unchanged.
- Native inline execution: one tightly coupled visual system; no delegation needed.

## Verification record
- Notebook-specific browser checks failed on the old interface, then passed with the new composition. Existing test selectors were narrowed only where the new markup added a second paragraph; all six destination headings remain covered.
- Full suite: `CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test` — 107 passed, 0 failed, 0 skipped. Sandbox-only listener denial was resolved by running the local-server tests with approval.
- Final production build: `npm run build` — passed. After the final theme-color change, `node --test tests/build.test.mjs` — 4 passed.
- Build correction: AGENTS.md was being emitted as a public page. Added an exclusion and a regression fixture (RED → GREEN); did not modify the guide. Theme color now matches paper #fffdf8, also checked RED → GREEN.
- Actual renders inspected: desktop 1440px, Chinese/English 390px home, mobile search, 390px article with code/blockquote/image, desktop About. The existing layout suite covers every section at 320/390/1280px in both languages.
- Search selection, Escape/focus restoration, language persistence, empty index, failed index/retry, reading shortcut, mobile prose and reduced motion passed browser checks. Keyboard skip-to-main was also exercised in the preview.
- Preview: http://localhost:8081/ (local Eleventy development server). No new dependencies, commits, push or deployment.

- Independent read-only review: no Important or Critical defects found; ready for delivery.
