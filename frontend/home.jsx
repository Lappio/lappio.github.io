import { ArrowUpRight, BookOpen, FolderOpen, Globe2, Mail, NotebookPen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const destinations = [
  { key: "blog", label: "WRITING", icon: BookOpen },
  { key: "notes", label: "NOTES", icon: NotebookPen },
  { key: "projects", label: "PROJECTS", icon: FolderOpen },
  { key: "links", label: "FRIENDS", icon: Globe2 },
  { key: "contact", label: "CONTACT", icon: Mail },
];

function CornerLink({ section, t, href }) {
  return <Button asChild variant="outline" size="icon" className="portal-link">
    <a href={href(`${section}/`)} aria-label={`${t.openSection}${t[section]}`}><ArrowUpRight size={19} strokeWidth={1.5}/></a>
  </Button>;
}

export function Home({ t, href }) {
  return <div className="portal">
    <section aria-labelledby="portal-about-title">
      <Card className="portal-tile portal-about"><CardContent>
        <span className="portal-index" aria-hidden="true">01 / ABOUT</span>
        <div className="portal-profile">
          <Avatar className="portal-avatar"><AvatarImage src={href("assets/lappio-avatar-240.webp")} alt={t.avatar}/><AvatarFallback>L</AvatarFallback></Avatar>
          <h1 id="portal-about-title">About</h1><span className="portal-name">Lappio</span>
        </div>
        <CornerLink section="about" t={t} href={href}/>
      </CardContent></Card>
    </section>
    <div className="portal-grid">{destinations.map(({ key, label, icon: Icon }, index) =>
      <section key={key} className={`portal-section portal-section-${key}`} aria-labelledby={`portal-${key}-title`}>
        <Card className={`portal-tile portal-${key}`}><CardContent>
          <span className="portal-index" aria-hidden="true">0{index + 2}</span>
          <Icon className="portal-icon" size={25} strokeWidth={1.25} aria-hidden="true"/>
          <div className="portal-title"><span className="portal-label" aria-hidden="true">{label}</span><h2 id={`portal-${key}-title`}>{t[key]}</h2></div>
          <CornerLink section={key} t={t} href={href}/>
        </CardContent></Card>
      </section>
    )}</div>
  </div>;
}
