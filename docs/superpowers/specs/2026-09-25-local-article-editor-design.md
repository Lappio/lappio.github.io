# Local article editor design

## Purpose and scope

Give the blog owner a comfortable browser interface for writing and revising articles. The owner can create a new article, import an existing `.md` file, edit its metadata and Markdown, inspect a live preview, and download a valid Markdown file. The owner then places the file in `content/posts/`, commits it, and pushes to GitHub using the existing workflow. This design adds a local authoring tool; it does not change the public article format or GitHub Pages deployment. It supersedes the earlier publishing spec's exclusion of a browser editor only for this local tool.

The tool is for the repository owner on their own computer. It has no login, GitHub token, GitHub API integration, or remote publish action. A download is never described as a publication.

## Runtime boundary

`npm run write` starts a small Node HTTP server bound to `127.0.0.1` and prints its local address. It serves the editor's HTML, CSS, and JavaScript and provides read-only parsing, validation, preview, and existing-slug information. It has no endpoint that writes source files, runs Git commands, or changes published output. Routes are explicit, request bodies have a size limit, and only local requests are accepted.

Editor source lives under a dedicated `writer/` directory, with a small server entry point under `scripts/`. Eleventy ignores `writer/**`; neither the page nor its assets appear in `_site/`. The existing public pages do not link to it. `npm run dev`, `npm run build`, and the Pages workflow keep their current roles.

## Authoring interface

The interface uses the blog's paper background, serif headings, restrained green accents, and typography. A compact header identifies it as a local writing tool and offers **Import Markdown** and **Download Markdown** actions. The main desktop layout has a structured editor on the left and an article preview on the right. At narrow widths, **Edit** and **Preview** tabs replace the side-by-side layout without losing entered text.

The editor exposes the current article fields: title, date, summary, language (`en` or `zh`), slug, an unpublished switch that writes `draft: true`, and a large Markdown body. A new article starts with today's local calendar date and an empty body. For an English title, the interface may suggest an ASCII slug until the owner edits the slug manually. Chinese titles do not receive an unreliable transliteration; the owner enters a lowercase URL name. A small status area distinguishes browser autosave from publication status and reports validation errors beside their fields.

The preview renders the article title, summary, date, and Markdown body in the visual style of a published article. It does not execute raw HTML from an imported file. The preview is an authoring aid; `npm run build` remains the definitive check for the final static page. The editor must work with keyboard navigation and visible focus states.

## Import, local recovery, and download

Import accepts a `.md` file from the user's file picker. The existing `gray-matter` parser reads YAML front matter and the Markdown body. A malformed file shows an error and leaves the current editor state intact. Importing over an existing unsaved session asks for confirmation. The original imported filename is retained as the suggested download filename; a new article downloads as `<slug>.md`.

Known front matter fields fill the form. Unknown fields are retained in memory and emitted again on download, with a notice that YAML formatting and comments may change. The editor never silently discards unknown metadata. The exported document uses the same required fields and optional `draft` value as the blog's current article format, with safely quoted YAML strings and an unchanged Markdown body. Export is blocked when required fields are invalid or the body is empty. A duplicate slug is reported against repository articles; an imported article with the same filename can be revised as a replacement. The browser download cannot overwrite a repository file by itself.

The current editor state is saved in browser local storage after changes and restored on reload. This recovery copy stays in that browser profile and is not a Markdown file in the repository. The interface shows when it saved and provides **Clear draft**. Clearing or replacing nonempty content asks for confirmation. If storage is unavailable or full, the editor remains usable and reports that recovery is unavailable. The `draft: true` publishing flag is labeled separately from this local recovery copy.

## Parsing and validation

The current `readPosts` logic is the source of truth for required strings, real `YYYY-MM-DD` dates, `en`/`zh` language, lowercase hyphenated slugs, boolean draft values, and nonempty bodies. Extract a reusable parser/validator so the local editor and Eleventy build apply the same rules. Keep duplicate-slug checking across `content/posts/*.md`; for editing an imported file, identify an existing post by its source filename when deciding whether a same-slug result is a replacement or a conflict. An import from elsewhere with the same filename still requires the owner to choose which repository file to replace when copying the download, and a later build remains the final collision check.

Preview uses a local Markdown renderer with raw HTML disabled. Its output is inserted only into the preview region. The server returns structured errors with field names so the UI can display actionable messages. The server reads repository posts for collision checks but never mutates them.

## Failure and empty states

- An empty new article shows a useful preview placeholder; it cannot be downloaded as a valid article.
- A malformed import, oversized file, unsupported file type, or server error shows a specific message without replacing the current editor content.
- An invalid field remains editable and receives a nearby explanation. A duplicate slug names the conflicting article.
- If local storage fails, editing and download continue with a visible recovery warning.
- If the preview request fails, the editor and download validation remain usable; the preview shows a retry state.

## Verification

- New and imported articles round-trip through the editor and export into Markdown accepted by `readPosts`; an imported article's body and unknown metadata survive.
- Invalid dates, slugs, missing fields, empty bodies, and conflicting slugs prevent an apparently valid export and show useful errors.
- Import failures preserve current work, autosave restores work after reload, and clearing or replacing work requires confirmation.
- Preview renders normal Markdown and displays template-looking code literally while not executing raw HTML.
- A clean Eleventy build excludes `writer/` and continues to produce the same public pages and article index.
- The local server listens only on loopback and has no write or Git route. Desktop and phone layouts are visually checked.

## Documentation

The README explains `npm run write`, import and download behavior, local recovery, and the remaining steps to place the file in `content/posts/`, run checks, commit, and push. It distinguishes this tool from the public blog and from the `draft: true` publication flag.
