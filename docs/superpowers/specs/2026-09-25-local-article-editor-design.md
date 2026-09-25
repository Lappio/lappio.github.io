# Local article editor design

## Purpose and scope

Give the blog owner a comfortable browser interface for creating articles and managing the articles already in the repository. The owner can browse local articles, open one for editing, import an external `.md` file, edit metadata and Markdown, inspect a live preview, save into `content/posts/`, and download a Markdown copy. The owner still commits and pushes changes to GitHub manually. This design adds a local authoring tool; it does not change the public article format or GitHub Pages deployment. It supersedes the earlier publishing spec's exclusion of a browser editor only for this local tool.

The tool is for the repository owner on their own computer. It has no login, GitHub token, GitHub API integration, or remote publish action. The article list reflects the local `content/posts/` directory, not the current state of the deployed website. Neither saving to disk nor downloading is described as publication. Deleting articles is outside this interface; an owner can mark an article `draft: true`, save, and push to withdraw it from a later build.

## Runtime boundary

`npm run write` starts a small Node HTTP server bound to `127.0.0.1` and prints its local address. It serves the editor's HTML, CSS, and JavaScript and provides article list/read, parsing, validation, preview, and save operations. Only the save operation writes source files. It never runs Git commands or changes published output. Routes are explicit, request bodies have a size limit, and write requests require a same-origin session token so another website cannot use the local server to alter articles.

Editor source lives under a dedicated `writer/` directory, with a small server entry point under `scripts/`. Eleventy ignores `writer/**`; neither the page nor its assets appear in `_site/`. The existing public pages do not link to it. `npm run dev`, `npm run build`, and the Pages workflow keep their current roles.

## Authoring interface

The interface uses the blog's paper background, serif headings, restrained green accents, and typography. A compact header identifies it as a local writing tool and offers **New article**, **Import Markdown**, **Save to repository**, and **Download Markdown** actions. The main desktop layout has an article list, a structured editor, and an article preview. At narrow widths, **Articles**, **Edit**, and **Preview** tabs replace the columns without losing entered text.

The list scans `content/posts/*.md`, including drafts. It has search and **All / Ready to publish / Drafts** filters and shows title, date, language, slug, and draft state. An invalid article remains listed with a repair warning and can still be opened for correction. The status text explains that `draft: false` means eligible for the next build, not verified live on GitHub Pages. An empty repository shows a new-article invitation.

The editor exposes the current article fields: title, date, summary, language (`en` or `zh`), slug, an unpublished switch that writes `draft: true`, and a large Markdown body. A new article starts with today's local calendar date and an empty body. For an English title, the interface may suggest an ASCII slug until the owner edits the slug manually. Chinese titles do not receive an unreliable transliteration; the owner enters a lowercase URL name. A small status area distinguishes browser recovery, saved repository content, unsaved changes, and the `draft` flag. Validation errors appear beside their fields. Changing an existing article's slug warns that its public URL will change after pushing.

The preview renders the article title, summary, date, and Markdown body in the visual style of a published article. It does not execute raw HTML from an imported file. The preview is an authoring aid; `npm run build` remains the definitive check for the final static page. The editor must work with keyboard navigation and visible focus states.

## Open, import, local recovery, and download

Opening a listed article reads its `.md` source and retains its filename and content fingerprint for later conflict detection. Import accepts an external `.md` file from the user's file picker as a new unsaved document. The existing `gray-matter` parser reads YAML front matter and the Markdown body. A malformed import shows an error and leaves the current editor state intact. Switching articles or importing over unsaved changes asks for confirmation. An imported article retains its original filename as the suggested download filename; a new article downloads as `<slug>.md`.

Known front matter fields fill the form. Unknown fields are retained in memory and emitted again on save or download, with a notice that YAML formatting and comments may change. The editor never silently discards unknown metadata. The resulting document uses the same required fields and optional `draft` value as the blog's current article format, with safely quoted YAML strings and an unchanged Markdown body. Save and download are blocked when required fields are invalid or the body is empty. A duplicate slug is reported against other repository articles. The browser download cannot overwrite a repository file by itself.

Each open document's unsaved editor state is saved in browser local storage after changes. On reload or reopening an article, the owner can restore that copy or use the repository file. Recovery copies stay in that browser profile and are not Markdown files in the repository. The interface shows when it saved and provides **Clear recovery copy**. Clearing or replacing nonempty content asks for confirmation. If storage is unavailable or full, the editor remains usable and reports that recovery is unavailable. The `draft: true` publishing flag is labeled separately from this local recovery copy.

## Saving to the repository

Saving a new or externally imported article creates `content/posts/<slug>.md`; it refuses to replace an existing file. Saving an article opened from the list updates that same source filename, even if its slug has changed. Before writing, the server validates the complete article and checks slug uniqueness against other files, including drafts. It verifies that an opened file still matches the fingerprint from when it was read; if another program changed it, save stops and offers reload or download of the current editor content. The UI never silently overwrites changed work.

The server accepts only a safe article filename in the fixed `content/posts/` directory, rejects traversal and symlink targets, and writes through a temporary file followed by an atomic replacement. It does not delete files. A successful save refreshes the list and clears that document's recovery copy. The interface reminds the owner to review the change, run checks, commit, and push; a saved file alone does not update the public site.

## Parsing and validation

The current `readPosts` logic is the source of truth for required strings, real `YYYY-MM-DD` dates, `en`/`zh` language, lowercase hyphenated slugs, boolean draft values, and nonempty bodies. Extract a reusable parser/validator so the local editor and Eleventy build apply the same rules. Keep duplicate-slug checking across `content/posts/*.md`, excluding only the exact file being edited. A later clean build remains the definitive publication check.

Preview uses a local Markdown renderer with raw HTML disabled. Its output is inserted only into the preview region. The server returns structured errors with field names so the UI can display actionable messages. List/read operations may inspect repository posts; only a validated save mutates one article file.

## Failure and empty states

- An empty new article shows a useful preview placeholder; it cannot be saved or downloaded as a valid article.
- A malformed import, oversized file, unsupported file type, or server error shows a specific message without replacing the current editor content.
- An invalid field remains editable and receives a nearby explanation. A duplicate slug names the conflicting article.
- If a file changed after it was opened, save refuses to overwrite it and preserves the current editor content.
- If local storage fails, editing, saving, and download continue with a visible recovery warning.
- If the preview request fails, the editor and download validation remain usable; the preview shows a retry state.

## Verification

- The list includes valid published candidates and drafts, retains invalid files for repair, and opens an existing article with its original filename.
- New, existing, and imported articles round-trip through save or download into Markdown accepted by `readPosts`; body and unknown metadata survive.
- Invalid dates, slugs, missing fields, empty bodies, and conflicting slugs prevent save or download and show useful errors.
- Import failures preserve current work, recovery copies restore work after reload, and clearing or replacing work requires confirmation.
- Save creates only a new safe path or updates the exact opened file. A changed file, collision, traversal attempt, or symlink cannot be overwritten.
- Preview renders normal Markdown and displays template-looking code literally while not executing raw HTML.
- A clean Eleventy build excludes `writer/` and continues to produce the same public pages and article index.
- The local server listens only on loopback, rejects cross-origin writes, and has no Git route. Desktop and phone layouts are visually checked.

## Documentation

The README explains `npm run write`, article listing, import, save, download, local recovery, and the remaining steps to run checks, commit, and push. It distinguishes this tool from the public blog and from the `draft: true` publication flag.
