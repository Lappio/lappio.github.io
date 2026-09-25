import matter from "gray-matter";

export function decodeArticle(markdown, source = "<editor>") {
  let parsed;
  try {
    parsed = matter(markdown);
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

export function encodeArticle({ fields, extraFields = {} }) {
  const metadata = {
    ...extraFields,
    title: fields.title,
    date: fields.date,
    summary: fields.summary,
    language: fields.language,
    slug: fields.slug
  };
  if (fields.draft !== false && fields.draft !== undefined) metadata.draft = fields.draft;
  return matter.stringify(fields.body, metadata);
}
