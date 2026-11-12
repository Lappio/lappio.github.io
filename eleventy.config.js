import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { readPosts } from "./lib/posts.mjs";
import { readNotes } from "./lib/notes.mjs";
import yaml from "js-yaml";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { copy } from "./frontend/copy.js";

export default function (eleventyConfig) {
  eleventyConfig.addGlobalData("copy", copy);
  // Keep article HTML inert inside JSON, even when it contains </script>.
  eleventyConfig.addFilter("scriptJson", value => JSON.stringify(value).replaceAll("<", "\\u003c"));
  eleventyConfig.addPlugin(syntaxHighlight, { preAttributes: { tabindex: 0 } });
  eleventyConfig.setFrontMatterParsingOptions({ engines: {
    yaml: input => yaml.load(input, { schema: yaml.JSON_SCHEMA })
  } });
  for (const ignored of ["README.md", "AGENTS.md", "CLAUDE.md", "docs/**", "tests/**", "lib/**", "frontend/**", "artifacts/**", ".archify/**", ".superpowers/**"]) {
    eleventyConfig.ignores.add(ignored);
  }
  eleventyConfig.addPassthroughCopy({ ".ui-build": "ui" });
  eleventyConfig.addWatchTarget("frontend/");
  eleventyConfig.addWatchTarget("vite.config.js");
  // React owns the mounted DOM; preview updates must reload the page.
  eleventyConfig.setServerOptions({ domDiff: false });
  for (const copied of ["assets", "favicon.png", ".nojekyll"]) {
    eleventyConfig.addPassthroughCopy(copied);
  }
  eleventyConfig.on("eleventy.before", () => {
    readPosts("content/posts");
    readNotes("content/notes");
    if (process.env.LAPPIO_DEV === "1") {
      const vite = fileURLToPath(new URL("./node_modules/vite/bin/vite.js", import.meta.url));
      const result = spawnSync(process.execPath, [vite, "build"], { stdio: "inherit" });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error("React UI build failed");
    }
  });
  eleventyConfig.addCollection("publishedPosts", api =>
    api.getFilteredByGlob("./content/posts/*.md")
      .filter(item => item.data.draft !== true)
      .sort((a, b) => String(b.data.date).localeCompare(String(a.data.date))
        || a.data.slug.localeCompare(b.data.slug))
  );
  eleventyConfig.addCollection("publishedNotes", api =>
    api.getFilteredByGlob("./content/notes/*.md")
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
