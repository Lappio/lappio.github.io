import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { readPosts } from "./lib/posts.mjs";
import yaml from "js-yaml";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export default function (eleventyConfig) {
  eleventyConfig.addFilter("postDate", (date, language) =>
    new Intl.DateTimeFormat(language === "en" ? "en-US" : "zh-CN", {
      year: "numeric", month: "short", day: "numeric", timeZone: "UTC"
    }).format(new Date(`${date}T00:00:00Z`))
  );
  eleventyConfig.addPlugin(syntaxHighlight, { preAttributes: { tabindex: 0 } });
  eleventyConfig.setFrontMatterParsingOptions({ engines: {
    yaml: input => yaml.load(input, { schema: yaml.JSON_SCHEMA })
  } });
  for (const ignored of ["README.md", "docs/**", "tests/**", "lib/**", "writer/**", "frontend/**", "artifacts/**", ".superpowers/**"]) {
    eleventyConfig.ignores.add(ignored);
  }
  eleventyConfig.addPassthroughCopy({ ".ui-build": "ui" });
  eleventyConfig.addWatchTarget("frontend/");
  eleventyConfig.addWatchTarget("vite.config.js");
  // React owns the mounted DOM; preview updates must reload the page.
  eleventyConfig.setServerOptions({ domDiff: false });
  eleventyConfig.addTransform("react-interface", function (content) {
    if (typeof this.page.outputPath !== "string" || !this.page.outputPath.endsWith(".html")) return content;
    const prefix = content.match(/data-root-prefix="([^"]+)"/)?.[1]
      || (content.includes('data-page="home"') ? "./" : "../");
    return content
      .replace(/<script src="[^"]*script\.js" defer><\/script>/, "")
      .replace(/(<link rel="stylesheet" href="[^"]*styles\.css")/, '$1 data-static-fallback')
      .replace('content="#f7f1e6"', 'content="#eeebf5"')
      .replace("</head>", `<link rel="stylesheet" href="${prefix}ui/app.css" /><script type="module" src="${prefix}ui/app.js"></script></head>`)
      .replace(/(<body[^>]*>)/, '$1<div id="react-root">')
      .replace("</body>", "</div></body>");
  });
  for (const copied of ["assets", "styles.css", "script.js", "favicon.svg", ".nojekyll"]) {
    eleventyConfig.addPassthroughCopy(copied);
  }
  eleventyConfig.on("eleventy.before", () => {
    readPosts("content/posts");
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
  eleventyConfig.setNunjucksEnvironmentOptions({ autoescape: true });
  return {
    dir: { input: ".", output: "_site", includes: "_includes" },
    htmlTemplateEngine: false,
    markdownTemplateEngine: false,
    templateFormats: ["html", "md", "11ty.js"]
  };
}
