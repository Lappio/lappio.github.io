# Repository Guidelines

## Project Structure & Module Organization

This bilingual blog uses Eleventy for static HTML and React/Vite for the public interface.

- `frontend/`: React views, bilingual copy (`copy.js`), styles, and shadcn/ui primitives in `components/ui/`.
- `content/posts/`: Markdown articles with YAML front matter.
- `_includes/post.njk` and section `index.html` files: static templates and fallback markup.
- `lib/`: article parsing, validation, and local writer storage.
- `writer/` and `scripts/writer-server.mjs`: private local editor and server.
- `assets/`: public images, fonts, and other static assets.
- `tests/`: automated tests; `docs/`: design notes and plans.

`.ui-build/` and `_site/` are generated, Git-ignored output; edit their sources instead.

## Build, Test, and Development Commands

Use Node.js 22 or newer.

- `npm ci`: install dependencies from the lockfile.
- `npm run dev`: serve Eleventy locally and rebuild the React interface on changes.
- `npm run write`: start the local article editor, normally at `http://127.0.0.1:4173/`.
- `npm test`: run all `tests/*.test.mjs` with Node's test runner.
- `npm run build`: build Vite assets, then generate the complete `_site/` site.

## Coding Style & Naming Conventions

Follow nearby code: two-space indentation, ES modules, and double-quoted strings. Handwritten JavaScript generally uses semicolons; preserve the existing semicolon-free style in shadcn/ui TypeScript files. Use PascalCase for React components and camelCase for functions and variables. No formatter or lint script is configured.

Keep interface translations in `frontend/copy.js`. Article slugs must be unique lowercase words separated by hyphens, such as `a-new-article`. Include `title`, quoted `date` (`YYYY-MM-DD`), `summary`, `language` (`en` or `zh`), and `slug`; use `draft: true` for unpublished work.

## Testing Guidelines

Tests use `node:test`, strict assertions, jsdom, and Playwright. Name suites `tests/<feature>.test.mjs`; add regression cases for changed behavior. Run a focused suite with `node --test tests/posts.test.mjs`.

Browser cases require Chrome; set `CHROME_PATH` to its executable when not auto-detected. Otherwise, these cases skip. No numerical coverage threshold is configured. Before submitting, run `npm test` and `npm run build`; inspect UI changes at mobile and desktop sizes.

## Commit & Pull Request Guidelines

History mixes descriptive English/Chinese subjects and prefixes such as `fix:`, `test:`, and `chore:`. Prefer a concise, scoped subject following those examples. Keep unrelated changes separate.

PRs should explain the change, link relevant issues, report test/build results and skips, and include screenshots for visual changes. Pushes to `main` trigger GitHub Pages testing, build, and deployment via `.github/workflows/pages.yml`.
