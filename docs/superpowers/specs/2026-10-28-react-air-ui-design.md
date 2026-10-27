# React airy blog interface

User request: rebuild the blog UI with React and shadcn/ui, add a home entrance and restrained motion, work on a new branch, provide screenshots, and do not open a PR.

## Direction

Use an off-white canvas, sage accents, generous spacing, a translucent navigation bar, readable Chinese typography, and a softly floating abstract air sculpture. The homepage introduces Lappio, provides writing/notes/projects tabs, and links to the existing sections. Empty sections remain honestly empty. Preserve the avatar and bilingual interface.

## Architecture and alternatives

Keep Eleventy and Markdown as the publishing system, and progressively enhance its generated pages with a React application bundled by Vite. This avoids replacing the working local editor or GitHub Pages workflow. A complete SPA migration would discard useful static article output; a CSS-only refresh would not meet the React requirement. The React app replaces the static fallback after it loads and reads rendered article HTML before mounting.

Use locally owned shadcn components (Button, Badge, Card, Tabs, Avatar, Dialog, Tooltip) with Radix primitives and Tailwind. All seven sections and article pages share the same React shell. Preserve relative paths so repository-path GitHub Pages deployments work.

## Interaction and verification

Entrance animation uses a brief stagger, soft blur, and upward movement. The sculpture floats gently; links, buttons, and cards respond subtly on hover. Honor prefers-reduced-motion. Search supports keyboard shortcuts, focus trapping, Escape dismissal, real article results, loading/error/empty states, and existing section links. Language preference persists, with graceful failure when storage is unavailable. Mobile navigation remains accessible without document overflow.

Check existing content/editor tests, production build, React browser behavior, all routes, mobile layout, article rendering, reduced motion, and no-JavaScript fallback. Capture desktop and mobile screenshots. Keep all work local on codex/react-air-ui.
