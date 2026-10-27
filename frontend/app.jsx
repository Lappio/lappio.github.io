import { useEffect, useLayoutEffect, useState } from "react";
import { ArrowUp, ArrowUpRight, BookOpen, FolderOpen, Globe2, Leaf, Mail, NotebookPen, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { copy, sectionTitles, sections } from "./copy";
import { validPostIndex } from "./lib/posts";
import { Home } from "./home";
import { ArticlePage } from "./article-page";
import { SiteSearch } from "./components/search";

const icons = { blog: BookOpen, notes: NotebookPen, projects: FolderOpen, links: Globe2, contact: Mail };

function readLanguage() {
  try { return localStorage.getItem("lappio-language") === "en" ? "en" : "zh"; }
  catch { return "zh"; }
}

function EmptyState({ type = "blog", t, status, reload }) {
  const Icon = icons[type] || BookOpen;
  const key = `empty${type[0].toUpperCase()}${type.slice(1)}`;
  return <div className={`air-empty empty-${type}`} role="status">
    <div className="empty-illustration" aria-hidden="true"><span/><div><Icon size={28} strokeWidth={1.25}/></div><i>✧</i></div>
    <h3>{status === "loading" ? t.loading : status === "error" ? t.loadError : copy.en[key]}</h3>
    <p>{status === "error" ? t.errorBody : status === "loading" ? "" : t[`${key}Body`]}</p>
    {status === "error" && <Button variant="outline" size="sm" onClick={reload}>{t.retry}</Button>}
    <span className="empty-dots" aria-hidden="true">· &nbsp; · &nbsp; ·</span>
  </div>;
}

function PostList({ posts, language, t, href, status, reload }) {
  if (!posts.length) return <EmptyState t={t} status={status} reload={reload}/>;
  return <div className="air-post-list">{posts.map(post => <a className="air-post" href={href(post.url)} key={post.slug} lang={post.language}>
    <div className="air-post-meta"><Badge variant="secondary">{post.category || (post.language === "zh" ? "中文" : "EN")}</Badge><time dateTime={post.date}>{new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${post.date}T00:00:00Z`))}</time></div>
    <h3>{post.title}<ArrowUpRight size={18}/></h3><p>{post.summary}</p>
  </a>)}</div>;
}

function AboutCard({ t, href }) {
  return <Card className="air-about"><CardContent>
    <div className="about-top"><Avatar className="air-avatar"><AvatarImage src={href("assets/lappio-avatar-240.webp")} alt={t.avatar}/><AvatarFallback>L</AvatarFallback></Avatar><span className="about-small-star" aria-hidden="true">✳</span></div>
    <p className="mini-label">A NOTE FROM ME</p><h3>{t.intro}<span className="hello-wave" aria-hidden="true">✧</span></h3>
    <p className="about-description">{t.aboutBody}</p>
    <a className="text-link" href={href("about/")}>{t.meet}<ArrowUpRight size={15}/></a>
    <div className="about-signature">Lappio<span aria-hidden="true">↗</span></div>
  </CardContent></Card>;
}

function Explore({ t, href }) {
  return <section className="air-explore" aria-labelledby="explore-title"><div className="explore-heading"><div><p className="mini-label">A LITTLE FURTHER</p><h2 id="explore-title">{copy.en.explore}</h2></div><p>{t.exploreLead}</p></div>
    <div className="explore-grid">{["notes", "projects", "links", "contact"].map((section, index) => {
      const Icon = icons[section];
      return <a key={section} className={`explore-card explore-${index}`} href={href(`${section}/`)}><div className="explore-icon"><Icon size={20} strokeWidth={1.5}/><ArrowUpRight size={16}/></div><h3>{sectionTitles[section]}</h3><p>{t[`discover${section[0].toUpperCase()}${section.slice(1)}`]}</p></a>;
    })}</div>
  </section>;
}

function Interior({ page, t, href, posts, language, article, status, reload }) {
  if (page === "post" && article) return <ArticlePage article={article} language={language} href={href}/>;
  const title = sectionTitles[page] || page;
  return <div className="air-interior">
    <div className="interior-breadcrumb"><a href={href("")}>{sectionTitles.home}</a><span>/</span><span>{title}</span></div>
    <header className="interior-heading"><p className="mini-label">{page.toUpperCase()} / LAPPIO</p><h1>{title}<span>.</span></h1><p>{t[`${page}Lead`]}</p></header>
    {["blog", "notes", "projects", "links"].includes(page) && <Card className="interior-card"><CardContent>{page === "blog" ? <PostList {...{ posts, language, t, href, status, reload }}/> : <EmptyState type={page} t={t}/>}</CardContent></Card>}
    {page === "about" && <div className="about-page-grid"><Card className="about-story-card"><CardContent><p className="mini-label">{copy.en.aboutKicker}</p><h2>{copy.en.aboutTitle}</h2><p>{t.aboutBody}</p><div className="about-page-note"><Leaf size={22}/><div><h3>{copy.en.notebook}</h3><p>{t.notebookBody}</p></div></div><Button asChild className="primary-button"><a href={href("blog/")}>{t.read}<ArrowUpRight size={16}/></a></Button></CardContent></Card><AboutCard t={t} href={href}/></div>}
    {page === "contact" && <Card className="contact-page-card"><CardContent><div className="contact-icon"><Mail size={28} strokeWidth={1.2}/></div><h2>{copy.en.sayHello}</h2><p>{t.contactBody}</p><Badge variant="outline">{t.contactEmpty}</Badge></CardContent></Card>}
    <Explore t={t} href={href}/>
  </div>;
}

export function App({ page, rootPrefix, article }) {
  const [language, setLanguage] = useState(readLanguage);
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [loadKey, setLoadKey] = useState(0);
  const t = copy[language];
  const href = path => `${rootPrefix}${path}`;
  const reload = () => setLoadKey(key => key + 1);
  useLayoutEffect(() => {
    const fallback = document.querySelector("link[data-static-fallback]");
    if (fallback) fallback.disabled = true;
    return () => { if (fallback) fallback.disabled = false; };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetch(`${rootPrefix}articles.json`, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error("Article index unavailable");
      return response.json();
    }).then(data => {
      if (!validPostIndex(data)) throw new Error("Invalid article index");
      setPosts(data);
      setStatus("ready");
    }).catch(error => { if (error.name !== "AbortError") setStatus("error"); });
    return () => controller.abort();
  }, [rootPrefix, loadKey]);
  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = page === "home" ? "Lappio Blog" : `${page === "post" ? article?.title : sectionTitles[page] || t[page]} · Lappio Blog`;
    try { localStorage.setItem("lappio-language", language); } catch { /* Preference still works in memory. */ }
  }, [language, page, article, t]);
  useEffect(() => {
    const current = document.querySelector('.air-mobile-nav [aria-current="page"]');
    if (current) current.parentElement.scrollLeft = current.offsetLeft - current.parentElement.offsetLeft - 16;
  }, [language, page]);
  const currentPage = page === "post" ? "blog" : page;
  return <TooltipProvider delayDuration={250}><div className="air-app" id="top" data-page={page} data-language={language}>
    <a className="air-skip" href="#main">{t.skip}</a>
    <div className="air-top-glow" aria-hidden="true"/>
    <header className="air-header"><a className="air-brand" href={href("")} aria-label="Lappio Blog"><Wind size={24} strokeWidth={1.5}/><span>Lappio<span className="brand-period">.</span></span></a>
      <nav className="air-desktop-nav" aria-label={t.nav}>{sections.map(section => <a href={href(section === "home" ? "" : `${section}/`)} aria-current={currentPage === section ? "page" : undefined} key={section}>{t[section]}</a>)}</nav>
      <div className="air-header-actions"><SiteSearch {...{ t, href, posts, status, reload }}/><span className="header-divider"/><Tooltip><TooltipTrigger asChild><Button variant="ghost" className="language-toggle" onClick={() => setLanguage(value => value === "zh" ? "en" : "zh")} aria-label={t.switchLanguage}><Globe2 size={16}/><span>{language === "zh" ? "EN" : "中"}</span></Button></TooltipTrigger><TooltipContent>{t.switchLanguage}</TooltipContent></Tooltip></div>
    </header>
    <nav className="air-mobile-nav" aria-label={t.mobileNav}>{sections.map(section => <a href={href(section === "home" ? "" : `${section}/`)} aria-current={currentPage === section ? "page" : undefined} key={section}>{t[section]}</a>)}</nav>
    <main className="air-main" id="main" tabIndex={-1}>{page === "home" ? <Home {...{ t, href, posts, language, status, reload }}/> : <Interior {...{ page, t, href, posts, language, article, status, reload }}/>}</main>
    <footer className="air-footer portal-footer"><span>© {new Date().getFullYear()} Lappio</span><Tooltip><TooltipTrigger asChild><a href="#top" className="back-top" aria-label="Back to top"><ArrowUp size={16}/></a></TooltipTrigger><TooltipContent>Back to top</TooltipContent></Tooltip></footer>
  </div></TooltipProvider>;
}
