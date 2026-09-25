import matter from "gray-matter";

export function decodeArticle(markdown, source = "<editor>") {
  let parsed;
  try {
    parsed = matter(markdown);
  } catch (error) {
    throw new Error(`${source}: invalid front matter: ${error.message}`, { cause: error });
  }
  const { title, date, summary, language, slug, draft, ...extraFields } = parsed.data;
  const calendarDate = date instanceof Date && !Number.isNaN(date.valueOf()) &&
    date.toISOString().endsWith("T00:00:00.000Z") ? date.toISOString().slice(0, 10) : date;
  return {
    fields: {
      title, date: calendarDate, summary, language, slug,
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
