# Context-aware Explore Cards Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this small change directly, with test-first verification.

**Goal:** Keep only A LITTLE FURTHER above four cards that exclude the current main section.

**Architecture:** Keep the existing Explore component and card styling. Pass the interior page into Explore and filter the ordered Blog, Notes, Projects, Links, Contact list; About retains Notes, Projects, Links, Contact.

**Tech Stack:** React, bilingual copy.js, CSS, Node test runner and Playwright.

**Spec:** User-approved scope in the conversation on 2026-11-12: remove the two decorative phrases in both languages, retain A LITTLE FURTHER, exclude the current section in fixed order, preserve About's cards, home and article detail pages.

## Global Constraints
- Initial scope was local-only. The user subsequently authorized committing and pushing to main for deployment; no dependency changes.
- Preserve existing card appearance, responsive layout, icons and relative links.
- Keep translations in frontend/copy.js; add discoverBlog in zh and en.

## Review Focus
- Both languages must omit the removed heading and lead.
- All five main section routes must show exactly four correctly ordered destinations.
- About retains its original four destinations.
- Home and article detail pages still have no Explore section.
- Remaining heading must label its region; mobile cards must fit the viewport.

## Task 1: Simplify Explore and select cards by current section

**Files:** frontend/app.jsx, frontend/copy.js, frontend/styles.css, tests/browser.test.mjs.

**Interfaces:** Explore({ page, t, href }) consumes the existing interior page, translations and root-aware link builder; renders one labelled section with four links.

- [x] Add browser regressions for heading simplification and ordered destinations in both languages, including About and unchanged home/article scope.
- [x] Run browser suite with CHROME_PATH set to the installed Chrome executable; confirm new regressions fail for existing copy/static cards.
- [x] Update Explore, bilingual copy, and obsolete heading CSS without changing card styles.
- [x] Run npm test with Chrome enabled, then npm run build.
- [x] Inspect actual desktop and mobile renders and exercise a card navigation.
- [x] Review the final diff against approved scope and record acceptance evidence.

## Acceptance Evidence
- Before implementation, heading regression and eight section/language cases failed as expected; existing Blog and About destinations passed.
- After synchronizing 11 English copy fields from the user's earlier Chinese edits, the full suite with installed macOS Chrome passed 102 tests, zero failed or skipped. Production build succeeded.
- Inspected Notes at 1280px and Blog at 390px; heading, original card styling, and responsive grid are intact. Clicking Notes' Blog card navigated to /blog/ and showed Notes, Projects, Links, Contact.
- English home was inspected at 1280px and About at 390px. The removed hero remains hidden in both languages, the updated English identity text fits, and no horizontal overflow was observed.
