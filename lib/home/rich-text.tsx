import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Teks berformat ringan untuk Blok Custom (Admin → Konten Beranda). Bukan HTML mentah → aman.
 *   **tebal**   *miring*   [teks tautan](/produk atau https://…)
 *   baris "- " / "• " = poin, "1. " = nomor, baris kosong = paragraf baru.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join("\n"))}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={list.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const bullet = line.match(/^[-•]\s+(.*)$/);
    const num = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || num) {
      flushPara();
      const ordered = !!num;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? num)![1]);
    } else if (!line) {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return <div className={className}>{blocks}</div>;
}

const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of s.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push(...withBreaks(s.slice(last, i), out.length));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={out.length}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("[")) {
      const [, label, href] = t.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? [];
      if (href && href.startsWith("/")) out.push(<Link key={out.length} href={href} className="font-medium underline underline-offset-2">{label}</Link>);
      else if (href && /^https?:\/\//.test(href))
        out.push(<a key={out.length} href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">{label}</a>);
      else out.push(t); // tautan tak valid → tampil apa adanya
    } else out.push(<em key={out.length}>{t.slice(1, -1)}</em>);
    last = i + t.length;
  }
  if (last < s.length) out.push(...withBreaks(s.slice(last), out.length));
  return out;
}

/** Baris baru di dalam paragraf → <br/>. */
function withBreaks(s: string, keyBase: number): ReactNode[] {
  return s.split("\n").flatMap((part, i) => (i ? [<br key={`b${keyBase}-${i}`} />, part] : [part]));
}
