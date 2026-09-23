export default {
  layout: "post.njk",
  eleventyComputed: {
    permalink: data => data.draft === true ? false : `blog/${data.slug}/index.html`
  }
};
