# Implementation plan

- [x] Create the requested branch and install React, Vite, Tailwind, and shadcn component dependencies.
- [x] Add a portable UI build and Eleventy enhancement transform. Keep static HTML fallback, Markdown articles, relative links, local writer exclusion, and existing GitHub Pages output.
- [x] Implement shared React navigation, bilingual copy, homepage, honest empty states, interior routes, article rendering, and accessible search using shadcn components.
- [x] Implement the airy visual design, responsive layouts, entrance/hover animations, and reduced-motion behavior.
- [x] Run the existing suite and production build; exercise production pages in a real browser, including search, persisted language, all routes, mobile overflow, article content, and keyboard interaction. Capture desktop and mobile screenshots.

Review focus: generated asset paths under nested routes, failed article loading, untrusted article-index URLs, language/storage errors, focus return after search, reduced motion, and hidden drafts.

## Verification record

- Production build succeeds. Existing content/editor tests and new index validation/build integration checks pass: 76 passing tests, two environment skips (legacy automated browser layout detector and Windows file symlink permission). Browser QA below covers the new interface's responsive layout separately.
- Browser QA: 42 combinations of seven routes, Chinese/English, and 320/390/768px widths; no document overflow, current mobile navigation item fully visible. Language remains selected across navigation.
- Keyboard search: Ctrl K opens; focus stays in the dialog; Escape returns focus to the trigger; no-result state works. A temporary real Markdown article verifies search selection, relative article assets, source-language preservation, lists, blockquotes, and highlighted code.
- Independent review found two issues, both fixed: duplicate-title search results now use unique article URLs with title/summary keywords; informational text now uses a palette with at least 4.5:1 contrast on its surfaces. Duplicate title/summary regression was reproduced before the fix, then verified with ArrowDown and Enter opening the second article. All temporary articles were removed.
- Reduced-motion stylesheet disables entrance, floating, and transition effects; browser inspection confirms both motion preference rules are present.
- Screenshots and responsive check details are saved locally under ignored `artifacts/`.
- Preview follow-up: cleaning/recreating the generated UI directory while the custom output watcher was active caused runaway memory on Windows. Development now watches frontend source and builds Vite in Eleventy's pre-build hook, using full-page reloads because React owns the DOM. No generated-output watcher or second long-running bundler is needed.
