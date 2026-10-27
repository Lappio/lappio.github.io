import { ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { sectionActions, sectionTitles } from "./copy";

const destinations = ["about", "blog", "notes", "projects", "links", "contact"];

function MoreLink({ section, href }) {
  const label = sectionActions[section];
  return <Tooltip>
    <TooltipTrigger asChild>
      <Button asChild variant="ghost" size="sm" className="home-more">
        <a href={href(`${section}/`)} aria-label={label}>{label}<ArrowUpRight size={15} strokeWidth={1.5}/></a>
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>;
}

export function Home({ t, href, posts, language, status, reload }) {
  return <div className="vertical-home">
    <header className="home-profile">
      <Avatar className="home-avatar"><AvatarImage src={href("assets/lappio-avatar-240.webp")} alt={t.avatar}/><AvatarFallback>L</AvatarFallback></Avatar>
      <h1>Lappio</h1><span className="home-profile-caption">OPEN NOTEBOOK</span>
    </header>
    <div className="home-sections">{destinations.map(key =>
      <section key={key} className={`home-section home-section-${key}`} aria-labelledby={`home-${key}-title`}>
        <h2 id={`home-${key}-title`}>{sectionTitles[key]}</h2>
        <div className="home-section-content">
          {key === "blog" && posts.length > 0 ? <ul className="home-posts">{posts.slice(0, 3).map(post =>
            <li key={post.slug}><a className="home-post-link" href={href(post.url)} lang={post.language}>
              <time dateTime={post.date}>{new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${post.date}T00:00:00Z`))}</time>
              <span>{post.title}</span>
            </a></li>
          )}</ul> : <p className="home-section-note" role={key === "blog" ? "status" : undefined}>{key === "blog" && status === "loading" ? t.loading : key === "blog" && status === "error" ? t.loadError : t[`home${key[0].toUpperCase()}${key.slice(1)}`]}</p>}
          {key === "blog" && status === "error" && <Button variant="link" onClick={reload} className="home-retry">{t.retry}</Button>}
          <div className="home-section-actions"><MoreLink section={key} href={href}/></div>
        </div>
      </section>
    )}</div>
  </div>;
}
