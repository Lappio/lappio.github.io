# Handdrawn notebook redesign

## Direction
The user selected a notebook-style personal homepage on `feat/handdrawn-ui` rather than a visual-only refresh of the six stacked sections. Keep Eleventy, React, Vite, all article data, URLs, publishing and the private writer unchanged.

## Layout and visual system
A compact ink-rule navigation sits over a paper-white dotted canvas. The hero pairs a large Chinese serif introduction with the existing avatar as a taped photograph. Below, recent writing occupies a white manuscript sheet in the main column; a narrower margin holds rotated pastel notes for Notes and Projects. Links and Contact form a quiet bottom pair. About remains in the hero, so all six destinations remain reachable.

Use the supplied handdrawn-ui tokens: paper #fffdf8, ink #3a3a3a, yellow #ffe08a, mint #c3f5d8, pink #ffd6e0, sky #cdeaff, lilac #e3d7ff. Use 2px ink borders, alternating irregular radii, hard shadows only, sparse SVG marker strokes and arrows. Source reference files in ~/dev/interview-dashboard are unavailable; the user-supplied skill is the reference. Chinese headings use Songti SC/STSong/serif; body uses Noto Sans SC/PingFang SC/sans-serif; handwritten annotations reuse the local Caveat font. No external font request is required.

## Behavior and constraints
Keep search, keyboard shortcuts, language persistence, article navigation, loading/error/retry and empty states. Preserve existing English section names in both languages. Add bilingual hero/action copy. Do not invent projects, friends, contact details or biography. At narrow widths, use one column and reachable scrolling navigation. Preserve focus visibility, skip navigation, touch targets and reduced-motion support. Apply the same design system to interior pages, article prose, and the portaled search dialog; keep article text unrotated and readable.

## Acceptance
Desktop and 320/390px mobile layouts have no horizontal page overflow. Published article links, search selection, both language directions, keyboard dismissal/focus restoration and failure recovery work. Run the existing suite with Chrome configured and a production build. Inspect actual desktop/mobile renders and an article.
