# Lappio Blog

A bilingual personal blog site with a homepage and separate Blog, Notes, Projects, Links, About, and Contact pages.

## Preview

Run `python3 -m http.server 4173 --bind 127.0.0.1` in this folder, then open `http://127.0.0.1:4173/`.

## Customize

- Edit bilingual interface copy and the sample blog, note, and project entries in `script.js`.
- Edit the six page layouts in their respective `index.html` files.
- Replace the six entries in `friendLinks` in `script.js` with your friends’ names, bilingual descriptions, and full website URLs. Each URL makes a “Visit site” link appear when that friend is selected.
- The Links network uses the cropped avatar at `assets/lappio-avatar.png`. Change `friendAvatarSource` in `script.js` to swap it later.
- The generated star chart background is `assets/star-chart-background.png`; the connections and circular friend avatars are rendered by `script.js` and `styles.css`.
- Replace `hello@example.com`, the generic GitHub URL, and the generic Are.na URL in the homepage and Contact page with your own details.
- Adjust colors and typography in `styles.css`.

The post, project, and friend entries are samples. Add detail pages or connect a publishing system when real content is ready.
