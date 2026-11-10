export default {
  layout: "post.njk",
  pageKind: "note",
  eleventyComputed: {
    permalink: data => data.draft === true ? false : `notes/${data.slug}/index.html`
  }
};
