export function validPostIndex(posts) {
  return Array.isArray(posts) && posts.every(post => post && typeof post === "object"
    && ["title", "date", "summary", "language", "slug", "url"].every(key => typeof post[key] === "string")
    && ["en", "zh"].includes(post.language)
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)
    && post.url === `blog/${post.slug}/`
    && /^\d{4}-\d{2}-\d{2}$/.test(post.date)
    && !Number.isNaN(Date.parse(`${post.date}T00:00:00Z`))
    && new Date(`${post.date}T00:00:00Z`).toISOString().slice(0, 10) === post.date);
}
