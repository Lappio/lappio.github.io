export default {
  layout: "post.njk",
  pageKind: "note",
  sectionPath: "notes",
  sectionLabel: "笔记",
  allLabel: "所有笔记",
  eleventyComputed: {
    permalink: data => data.draft === true ? false : `notes/${data.slug}/index.html`
  }
};
