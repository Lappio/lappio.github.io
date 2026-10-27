import { useEffect, useState } from "react";
import { ArrowRight, FileText, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { sections } from "../copy";

export function SiteSearch({ t, href, posts, status, reload }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function shortcut(event) {
      if (event.target.closest?.('input, textarea, [contenteditable="true"]')) return;
      if ((event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey)) {
        event.preventDefault();
        setOpen(value => !value);
      }
    }
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="ghost" className="search-trigger" aria-label={t.search}><Search size={17}/><span>{t.search}</span><kbd>Ctrl K</kbd></Button></DialogTrigger>
    <DialogContent className="air-search" showCloseButton={false}>
      <DialogHeader className="sr-only"><DialogTitle>{t.searchTitle}</DialogTitle><DialogDescription>{t.searchDescription}</DialogDescription></DialogHeader>
      <Command className="air-command">
        <CommandInput placeholder={t.placeholder} aria-label={t.search}/>
        <CommandList>
          <CommandEmpty>{t.noResults}</CommandEmpty>
          {status === "loading" && <p role="status" className="search-status">{t.loading}</p>}
          {status === "error" && <div role="status" className="search-status">{t.searchError}<Button variant="link" onClick={reload}>{t.retry}</Button></div>}
          {!!posts.length && <CommandGroup heading={t.articles}>{posts.map(post => <CommandItem key={post.slug} value={post.url} keywords={[post.title, post.summary]} onSelect={() => { window.location.assign(href(post.url)); }}><FileText/><span>{post.title}</span><ArrowRight className="ml-auto"/></CommandItem>)}</CommandGroup>}
          <CommandSeparator/>
          <CommandGroup heading={t.pages}>{sections.map(section => <CommandItem key={section} value={`${t[section]} ${section}`} onSelect={() => { window.location.assign(href(section === "home" ? "" : `${section}/`)); }}><ArrowRight/><span>{t[section]}</span></CommandItem>)}</CommandGroup>
        </CommandList>
      </Command>
      <div className="search-bottom"><span><kbd>↑</kbd><kbd>↓</kbd> {t.searchMove} <kbd>↵</kbd> {t.searchHint}</span><Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label={t.close}><kbd>esc</kbd> {t.searchEsc}</Button></div>
    </DialogContent>
  </Dialog>;
}
