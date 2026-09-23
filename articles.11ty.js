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
      slug: data.slug,
      url: `blog/${data.slug}/`
    })));
  }
}
