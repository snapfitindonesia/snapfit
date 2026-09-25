import Link from "next/link";
import Image from "@/components/ui/image";
import logo from "@/logosnapfit.png";

export function AuthShell({
  title,
  subtitle,
  panelTitle,
  panelSub,
  children,
}: {
  title: string;
  subtitle: string;
  panelTitle: string;
  panelSub: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4 sm:p-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-xl md:grid-cols-2">
        {/* Panel kiri (branding) — sembunyi di mobile */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand to-[#b8410c] p-8 text-white md:flex">
          {/* dekorasi */}
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 size-64 rounded-full bg-white/10" />

          <div className="relative">
            <h2 className="text-3xl font-extrabold leading-tight">{panelTitle}</h2>
            <p className="mt-3 max-w-xs text-sm text-white/80">{panelSub}</p>
          </div>

          {/* Ilustrasi sederhana: HP + case */}
          <div className="relative mt-8 flex items-end justify-center">
            <svg viewBox="0 0 220 200" className="w-56" aria-hidden>
              <rect x="70" y="30" width="80" height="150" rx="16" fill="#ffffff" opacity="0.95" />
              <rect x="80" y="46" width="60" height="110" rx="8" fill="#b8410c" opacity="0.25" />
              <circle cx="110" cy="168" r="6" fill="#b8410c" opacity="0.4" />
              <circle cx="120" cy="58" r="7" fill="#fff" />
              <circle cx="120" cy="58" r="3" fill="#b8410c" opacity="0.5" />
              <g opacity="0.9">
                <circle cx="40" cy="60" r="10" fill="#fff" opacity="0.5" />
                <circle cx="185" cy="120" r="8" fill="#fff" opacity="0.5" />
                <path d="M175 45 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="#fff" opacity="0.7" />
              </g>
            </svg>
          </div>
        </div>

        {/* Form kanan */}
        <div className="p-7 sm:p-10">
          <Link href="/" className="flex items-center gap-2">
            <Image src={logo} alt="SNAPFIT" className="h-7 w-auto" priority />
          </Link>
          <h1 className="mt-7 text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
