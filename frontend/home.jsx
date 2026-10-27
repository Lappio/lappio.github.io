import { ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const destinations = [
  { key: "about", label: "About" },
  { key: "blog" },
  { key: "notes" },
  { key: "projects" },
  { key: "links" },
  { key: "contact" },
];

function MoreLink({ section, t, href }) {
  return <Button asChild variant="ghost" size="sm" className="home-more">
    <a href={href(`${section}/`)}>{t.openSection}{t[section]}<ArrowUpRight size={15} strokeWidth={1.5}/></a>
  </Button>;
}

export function Home({ t, href, posts, language, status, reload }) {
  return <div className="vertical-home">
    <header className="home-profile">
      <Avatar className="home-avatar"><AvatarImage src={href("assets/lappio-avatar-240.webp")} alt={t.avatar}/><AvatarFallback>L</AvatarFallback></Avatar>
      <h1>Lappio</h1><span className="home-profile-caption">OPEN NOTEBOOK</span>
    </header>
    <div className="home-sections">{destinations.map(({ key, label }) =>
      <section key={key} className={`home-section home-section-${key}`} aria-labelledby={`home-${key}-title`}>
        <h2 id={`home-${key}-title`}>{label || t[key]}</h2>
        <div className="home-section-content">
          {key === "blog" && posts.length > 0 ? <ul className="home-posts">{posts.slice(0, 3).map(post =>
            <li key={post.slug}><a href={href(post.url)} lang={post.language}>
              <time dateTime={post.date}>{new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${post.date}T00:00:00Z`))}</time>
              <span>{post.title}</span>
            </a></li>
          )}</ul> : <p className="home-section-note" role={key === "blog" ? "status" : undefined}>{key === "blog" && status === "loading" ? t.loading : key === "blog" && status === "error" ? t.loadError : t[`home${key[0].toUpperCase()}${key.slice(1)}`]}</p>}
          {key === "blog" && status === "error" && <Button variant="link" onClick={reload} className="home-retry">{t.retry}</Button>}
          <div className="home-section-actions"><MoreLink section={key} t={t} href={href}/></div>
        </div>
      </section>
    )}</div>
  </div>;
}
