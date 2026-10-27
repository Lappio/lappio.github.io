export default class ArticleIndex {
  data() {
    return { permalink: "articles.json", eleventyExcludeFromCollections: true };
  }

  render({ collections }) {
    return JSON.stringify(collections.publishedPosts.map(({ data }) => ({
      title: data.title,
      date: data.date,
      summary: data.summary,
      language: data.language,
      ...(typeof data.category === "string" && data.category.trim() ? { category: data.category } : {}),
      slug: data.slug,
      url: `blog/${data.slug}/`
    })));
  }
}
