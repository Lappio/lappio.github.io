# Minimal portal revision

Follow-up direction from the user: remove long homepage copy; make About the first section with a centered avatar; place writing, notes, projects, friends and contact below; remove green; use a gradient that starts light and becomes dark; give every section a clickable component at the bottom right.

Implementation: replace the editorial homepage with six concise shadcn cards. The About card spans the top with the existing avatar centered. Five section cards follow in the requested order, each with an accessible arrow link at the bottom right. Navigation begins with About. Purple-grey colors replace the green palette throughout the React interface; the page and card tones deepen downwards. Keep the existing section routes, article rendering, bilingual copy, search and restrained entrance/hover motion. Footer is reduced to copyright and a back-to-top control.

Validation: build and existing tests, browser checks of all six destination buttons, mobile/desktop geometry, centered avatar, absence of homepage paragraphs, language switching, and screenshots. Continue on codex/react-air-ui without pushing or creating a PR.

The deeper gradient is scoped to the homepage. Interior pages retain a stable, light purple-grey background so long article text remains readable throughout the page.
