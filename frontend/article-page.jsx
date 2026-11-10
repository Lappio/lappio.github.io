import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ArticlePage({ article, language, href, t }) {
  const backPath = article.kind === "note" ? "notes/" : "";
  const backLabel = article.kind === "note" ? t.notes : t.backHome;
  const dateLabel = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  }).format(new Date(`${article.date}T00:00:00Z`));

  return <div className="air-interior air-article-page">
    <Button asChild variant="ghost" className="text-link back-link">
      <a href={href(backPath)}><ArrowLeft size={15}/>{backLabel}</a>
    </Button>
    <article className="air-article" lang={article.language}>
      <header>
        {article.category ? <Badge variant="secondary">{article.category}</Badge> : null}
        <h1>{article.title}</h1>
        {article.summary ? <p>{article.summary}</p> : null}
        <time dateTime={article.date}>{dateLabel}</time>
      </header>
      <div className="air-prose" dangerouslySetInnerHTML={{ __html: article.html }}/>
    </article>
    <Button asChild variant="outline" className="article-end">
      <a href={href(backPath)}><BookOpen size={18}/>{backLabel}<ArrowRight size={17}/></a>
    </Button>
  </div>;
}
