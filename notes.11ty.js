export default class NotesIndex {
  data() {
    return { permalink: "notes.json", eleventyExcludeFromCollections: true };
  }

  render({ collections }) {
    return JSON.stringify(collections.publishedNotes.map(({ data }) => ({
      title: data.title,
      date: data.date,
      summary: data.summary,
      language: data.language,
      ...(typeof data.category === "string" && data.category.trim() ? { category: data.category } : {}),
      slug: data.slug,
      url: `notes/${data.slug}/`
    })));
  }
}
