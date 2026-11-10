import { ArrowUpRight, BookOpen, FolderOpen, Heart, Mail, NotebookPen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HandArrow, Marker, WavyRule } from "./components/sketch";
import { sectionActions, sectionTitles } from "./copy";
import { HomeUsage } from "./components/home-usage";

function MoreLink({ section, href }) {
  return <a className="home-more" href={href(`${section}/`)} aria-label={sectionActions[section]}>{sectionActions[section]}<ArrowUpRight size={16} aria-hidden="true"/></a>;
}

function MarginNote({ section, t, href, Icon, children, notes = [] }) {
  return <section className={`home-section home-section-${section} sticky-note`} aria-labelledby={`home-${section}-title`}>
    <div className="note-heading"><Icon size={23} strokeWidth={1.6} aria-hidden="true"/><h2 id={`home-${section}-title`}>{sectionTitles[section]}</h2></div>
    <p className="note-description">{t[`discover${section[0].toUpperCase()}${section.slice(1)}`]}</p>
    {section === "notes" && notes.length ? <ul className="home-note-links">{notes.slice(0, 3).map(note => <li key={note.slug}><a href={href(note.url)} lang={note.language}>{note.title}<ArrowUpRight size={14} aria-hidden="true"/></a></li>)}</ul> : <p className="home-section-note">{t[`home${section[0].toUpperCase()}${section.slice(1)}`]}</p>}
    {children}
    <MoreLink section={section} href={href}/>
  </section>;
}

export function Home({ t, href, posts, notes, language, status, reload }) {
  return <div className="notebook-home">
    <section className="notebook-hero home-section home-section-about" aria-labelledby="home-about-title">
      <div className="hero-writing">
        <div className="hero-intro"><span className="intro-dot"/>{t.intro}<h2 id="home-about-title" className="sr-only">About</h2></div>
        {t.heroFirst || t.heroSecond ? <h1>{t.heroFirst ? <>{t.heroFirst}{t.heroSecond && <br/>}</> : null}{t.heroSecond ? <Marker>{t.heroSecond}</Marker> : null}</h1> : <h1 className="sr-only">{t.intro}</h1>}
        <p className="hero-description">{t.aboutBody}</p>
        <div className="hero-actions"><a className="home-open sketch-button" href="#writing"><BookOpen size={18} aria-hidden="true"/>{t.openNotebook}<ArrowUpRight size={18} aria-hidden="true"/></a><a className="hero-about-link" href={href("about/")}>{t.meet}<ArrowUpRight size={17} aria-hidden="true"/></a></div>
      </div>
      <div className="hero-collage">
        <span className="collage-caption">a work in progress</span>
        <div className="profile-photo"><span className="paper-tape" aria-hidden="true"/><img src={href("assets/lappio-avatar-240.webp")} alt={t.avatar} width="240" height="240"/><div className="photo-signature">Lappio <Heart size={19} strokeWidth={1.5} aria-hidden="true"/></div></div>
        <div className="notebook-stamp">OPEN<br/>NOTEBOOK<Sparkles size={16} aria-hidden="true"/></div>
        <div className="collage-note"><HandArrow/><span>{t.takeYourTime}</span></div>
      </div>
    </section>
    <WavyRule/>
    <HomeUsage language={language} t={t}/>
    <div className="notebook-layout">
      <section className="home-section home-section-blog notebook-manuscript" id="writing" aria-labelledby="home-blog-title">
        <div className="manuscript-heading"><div><p className="handwritten-label">fresh from the notebook</p><div className="manuscript-title"><h2 id="home-blog-title">Blog</h2><span className="heading-caption">{t.recentWriting}</span></div></div><BookOpen size={29} strokeWidth={1.4} aria-hidden="true"/></div>
        {posts.length > 0 ? <ul className="home-posts">{posts.slice(0, 3).map(post => <li key={post.slug}>
          <a className="home-post-link" href={href(post.url)} lang={post.language}>
            <div className="home-post-meta"><time dateTime={post.date}>{new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${post.date}T00:00:00Z`))}</time><small>{post.category || (post.language === "zh" ? "中文" : "EN")}</small></div>
            <span>{post.title}</span><ArrowUpRight className="post-arrow" size={20} aria-hidden="true"/><p>{post.summary}</p>
          </a>
        </li>)}</ul> : <div className="manuscript-status"><NotebookPen size={36} strokeWidth={1.4} aria-hidden="true"/><p className="home-section-note" role="status">{status === "loading" ? t.loading : status === "error" ? t.loadError : t.homeBlog}</p>{status === "error" && <Button variant="outline" onClick={reload} className="home-retry">{t.retry}</Button>}</div>}
        <div className="manuscript-bottom"><span className="handwritten-label">one page at a time.</span><MoreLink section="blog" href={href}/></div>
      </section>
      <aside className="notebook-margin" aria-label={t.notebookMargin}>
        <MarginNote section="notes" t={t} href={href} Icon={NotebookPen} notes={notes}><div className="pencil-lines" aria-hidden="true"><i/><i/><i/></div></MarginNote>
        <MarginNote section="projects" t={t} href={href} Icon={FolderOpen}/>
      </aside>
    </div>
    <div className="notebook-bottom">
      {[{ section: "links", Icon: Heart }, { section: "contact", Icon: Mail }].map(({ section, Icon }) => <section key={section} className={`home-section home-section-${section} notebook-pocket`} aria-labelledby={`home-${section}-title`}>
        <div className="pocket-icon"><Icon size={24} strokeWidth={1.5} aria-hidden="true"/></div><div className="pocket-content"><h2 id={`home-${section}-title`}>{sectionTitles[section]}</h2><p>{t[`home${section[0].toUpperCase()}${section.slice(1)}`]}</p><MoreLink section={section} href={href}/></div>
      </section>)}
    </div>
    <p className="notebook-closing"><Sparkles size={18} strokeWidth={1.5} aria-hidden="true"/>{t.footer}</p>
  </div>;
}
