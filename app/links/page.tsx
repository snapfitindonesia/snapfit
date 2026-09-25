import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, Store } from "lucide-react";
import { db } from "@/lib/db";

export const revalidate = 300;

async function getData() {
  try {
    const [profile, links] = await Promise.all([
      db.bioProfile.findUnique({ where: { id: "main" } }),
      db.bioLink.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    ]);
    return { profile, links };
  } catch {
    return { profile: null, links: [] };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await getData();
  const title = profile?.title ?? "SNAPFIT";
  return {
    title: `${title} — Links`,
    description: profile?.bio ?? "Semua link resmi SNAPFIT.",
    alternates: { canonical: "/links" },
    openGraph: profile?.avatar ? { images: [profile.avatar] } : undefined,
  };
}

/* Ikon brand (path Simple Icons, CC0) — lucide tidak menyediakan logo merek. */
const svg = (d: string) =>
  function Icon({ className }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
        <path d={d} />
      </svg>
    );
  };
const InstagramIcon = svg(
  "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.88 5.88 0 0 0-2.13 1.38A5.88 5.88 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13a5.88 5.88 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.88 5.88 0 0 0 2.13-1.38 5.88 5.88 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.88 5.88 0 0 0-1.38-2.13A5.88 5.88 0 0 0 19.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0Zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z",
);
const TiktokIcon = svg(
  "M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z",
);
const WhatsappIcon = svg(
  "M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41Z",
);
const YoutubeIcon = svg(
  "M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z",
);
const FacebookIcon = svg(
  "M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07",
);

function waUrl(v: string) {
  if (/^https?:/i.test(v)) return v;
  let n = v.replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  return `https://wa.me/${n}`;
}

export default async function LinksPage() {
  const { profile, links } = await getData();
  const title = profile?.title ?? "SNAPFIT";

  const socials = [
    { href: profile?.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: profile?.tiktok, label: "TikTok", Icon: TiktokIcon },
    { href: profile?.whatsapp ? waUrl(profile.whatsapp) : null, label: "WhatsApp", Icon: WhatsappIcon },
    { href: profile?.shopee, label: "Shopee", Icon: ShoppingBag },
    { href: profile?.tokopedia, label: "Tokopedia", Icon: Store },
    { href: profile?.youtube, label: "YouTube", Icon: YoutubeIcon },
    { href: profile?.facebook, label: "Facebook", Icon: FacebookIcon },
  ].filter((s): s is typeof s & { href: string } => !!s.href);

  const bg: React.CSSProperties = profile?.bgImage
    ? { backgroundImage: `url("${profile.bgImage}")`, backgroundSize: "cover", backgroundPosition: "center" }
    : profile?.bgColor && profile.bgColor2
      ? { backgroundImage: `linear-gradient(160deg, ${profile.bgColor}, ${profile.bgColor2})` }
      : profile?.bgColor
        ? { backgroundColor: profile.bgColor }
        : {};
  const light = !!profile?.textLight && (!!profile.bgImage || !!profile.bgColor);
  const muted = light ? "text-white/80" : "text-muted-foreground";

  return (
    <main className={`min-h-dvh bg-muted/40 px-4 py-12 ${light ? "text-white" : ""}`} style={bg}>
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        {profile?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar} alt={title} className="size-24 rounded-full border border-border bg-background object-cover shadow-sm" />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-full bg-foreground text-3xl font-bold text-background">
            {title.charAt(0)}
          </div>
        )}
        <h1 className="mt-4 text-xl font-bold tracking-tight">{title}</h1>
        {profile?.bio && <p className={`mt-1.5 whitespace-pre-line text-sm ${muted}`}>{profile.bio}</p>}

        {socials.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="flex size-10 items-center justify-center rounded-full bg-background text-foreground shadow-sm ring-1 ring-border transition hover:-translate-y-0.5"
              >
                <Icon className="size-[18px]" />
              </a>
            ))}
          </div>
        )}

        <div className="mt-8 flex w-full flex-col gap-3">
          {links.map((l) => {
            const external = !l.url.startsWith("/");
            return (
              <a
                key={l.id}
                href={`/links/go/${l.id}`}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={`relative flex min-h-14 items-center justify-center rounded-xl py-3 text-sm ${l.image ? "px-14" : "px-5"} font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  l.highlight
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground ring-1 ring-border"
                }`}
              >
                {l.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.image} alt="" className="absolute left-2 top-1/2 size-10 -translate-y-1/2 rounded-lg object-cover" />
                )}
                {l.title}
              </a>
            );
          })}
          {links.length === 0 && <p className={`text-sm ${muted}`}>Belum ada link.</p>}
        </div>

        <Link href="/" className={`mt-12 text-xs font-semibold tracking-widest hover:opacity-100 ${light ? "text-white/70" : "text-muted-foreground"}`}>
          SNAPFIT.ID
        </Link>
      </div>
    </main>
  );
}
