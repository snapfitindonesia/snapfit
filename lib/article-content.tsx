import type { ReactNode } from "react";
import Image from "@/components/ui/image";
import { inline } from "@/lib/home/rich-text";

/**
 * Isi artikel berformat ringan (Admin → Artikel). Bukan HTML mentah → aman.
 *   ## Judul bagian   ### Subjudul   > kutipan   ![keterangan](https://…foto)
 *   **tebal**  *miring*  [teks](/tautan)   baris "- " = poin, "1. " = nomor, baris kosong = paragraf baru.
 */
export function ArticleContent({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  let quote: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join("\n"))}</p>);
    para = [];
  };
  const flushQuote = () => {
    if (quote.length) blocks.push(<blockquote key={blocks.length}>{inline(quote.join("\n"))}</blockquote>);
    quote = [];
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  const flushAll = () => {
    flushPara();
    flushQuote();
    flushList();
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    const img = line.match(/^!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)$/);
    const q = line.match(/^>\s?(.*)$/);
    const bullet = line.match(/^[-•]\s+(.*)$/);
    const num = line.match(/^\d+[.)]\s+(.*)$/);
    if (h) {
      flushAll();
      const Tag = h[1] === "##" ? "h2" : "h3";
      blocks.push(<Tag key={blocks.length}>{inline(h[2])}</Tag>);
    } else if (img) {
      flushAll();
      blocks.push(
        <figure key={blocks.length}>
          <Image src={img[2]} alt={img[1]} width={1200} height={800} sizes="(min-width: 768px) 720px, 100vw" className="h-auto w-full" />
          {img[1] && <figcaption>{img[1]}</figcaption>}
        </figure>,
      );
    } else if (q) {
      flushPara();
      flushList();
      quote.push(q[1]);
    } else if (bullet || num) {
      flushPara();
      flushQuote();
      const ordered = !!num;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? num)![1]);
    } else if (!line) {
      flushAll();
    } else {
      flushQuote();
      flushList();
      para.push(line);
    }
  }
  flushAll();
  return <>{blocks}</>;
}

/** Teks polos dari isi berformat (deskripsi meta / perkiraan). */
export function plainText(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{2,3}\s+|^>\s?|^[-•]\s+|^\d+[.)]\s+/gm, "")
    .replace(/\*\*?([^*]+)\*\*?/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
