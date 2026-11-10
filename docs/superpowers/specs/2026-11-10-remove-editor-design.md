# Preserve the notebook UI and remove the local editor

## Approved scope
The user approved two local commits on `feat/handdrawn-ui`: preserve the existing handdrawn interface first, then remove the private article editor completely. Keep Markdown articles, article validation, search, relative URLs, bilingual UI and the Eleventy/React/Vite publishing pipeline. Do not push, merge, delete branches or alter article content.

## Approach
Remove the editor rather than merely hiding its entry point: delete `writer/`, `scripts/writer-server.mjs`, `lib/writer-store.mjs` and their three dedicated test suites; remove `npm run write` and active editor guidance. Hiding the UI would leave an unwanted server and storage subsystem behind. Retain `lib/post-document.mjs` decoding because `lib/posts.mjs` uses it; remove the editor-only encoder and retain decoder/validation regression coverage. Keep historical design documents, marked as historical where appropriate.

## Versioning and acceptance
Commit existing UI sources, tests and contributor/design documentation as a recoverable baseline. Keep `.archify/` local and exclude it from both Git and public output: the initial build demonstrated that its repository diagram is otherwise emitted as a public page. Add a build regression for that exclusion. The second commit removes editor code and documents direct Markdown authoring. Verify the absence of editor files and command, unchanged article content and frontend sources, a green full suite with Chrome, production build, and desktop/mobile renders. No new dependencies.
