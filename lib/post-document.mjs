import matter from "gray-matter";
import yaml from "js-yaml";

export function decodeArticle(markdown, source = "<article>") {
  let parsed;
  try {
    const content = markdown.startsWith("\uFEFF") ? markdown.slice(1) : markdown;
    if (!/^---[ \t]*(?:\r?\n|$)/.test(content)) {
      throw new Error("only YAML front matter is supported");
    }
    parsed = matter(content, { engines: {
      yaml: input => yaml.load(input, { schema: yaml.JSON_SCHEMA }),
      javascript: () => { throw new Error("executable front matter is not supported"); }
    } });
  } catch (error) {
    throw new Error(`${source}: invalid front matter: ${error.message}`, { cause: error });
  }
  const { title, date, summary, language, slug, draft, ...extraFields } = parsed.data;
  return {
    fields: {
      title, date, summary, language, slug,
      draft: draft === undefined ? false : draft,
      body: parsed.content
    },
    extraFields
  };
}
