import { readPosts } from "./lib/posts.mjs";

export default function (eleventyConfig) {
  for (const ignored of ["README.md", "docs/**", "tests/**", "lib/**", "writer/**", ".superpowers/**"]) {
    eleventyConfig.ignores.add(ignored);
  }
  for (const copied of ["assets", "styles.css", "script.js", "favicon.svg", ".nojekyll"]) {
    eleventyConfig.addPassthroughCopy(copied);
  }
  eleventyConfig.on("eleventy.before", () => readPosts("content/posts"));
  eleventyConfig.addCollection("publishedPosts", api =>
    api.getFilteredByGlob("./content/posts/*.md")
      .filter(item => item.data.draft !== true)
      .sort((a, b) => String(b.data.date).localeCompare(String(a.data.date))
        || a.data.slug.localeCompare(b.data.slug))
  );
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true });
  return {
    dir: { input: ".", output: "_site", includes: "_includes" },
    htmlTemplateEngine: false,
    markdownTemplateEngine: false,
    templateFormats: ["html", "md", "11ty.js"]
  };
}
