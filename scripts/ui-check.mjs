// Cek tampilan otomatis (lokal, sebelum deploy) — membuka halaman penting di ukuran HP, tablet & desktop lalu
// mencari masalah yang mudah lolos dari mata:
//  1. Posisi elemen tertimpa CSS lain (kelas `absolute`/`fixed`/`sticky` tapi hasilnya beda — mis. ikon mata
//     password melorot ke bawah kolom karena aturan CSS di luar @layer, Okt 2026).
//  2. Ikon di dalam kolom isian (mata password, dll.) tidak berada di dalam kolomnya.
//  3. Halaman bisa digeser ke samping (ada elemen lebih lebar dari layar).
//  4. Foto gagal dimuat (404/timeout) & error JavaScript di halaman.
// Screenshot tiap halaman disimpan di .ui-check/ (tidak di-commit) untuk dilihat sekilas.
//
// Pakai:  npm run dev   (terminal lain)  lalu  npm run ui:check
//         npm run ui:check -- https://www.snapfit.id      (cek situs live)
// Butuh Google Chrome terpasang (atau CHROME_PATH=/path/ke/chrome). Tidak jalan di build Vercel.
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";

const BASE = (process.argv[2] || process.env.UI_CHECK_URL || "http://localhost:3000").replace(/\/$/, "");
const OUT = ".ui-check";

const VIEWPORTS = [
  { name: "hp", width: 375, height: 812, isMobile: true, hasTouch: true },
  { name: "tablet", width: 768, height: 1024, isMobile: true, hasTouch: true },
  { name: "desktop", width: 1440, height: 900, isMobile: false, hasTouch: false },
];

const PAGES = [
  { name: "beranda", path: "/" },
  { name: "produk", path: "/produk" },
  { name: "detail-produk", path: null }, // diisi otomatis: produk pertama di /produk
  { name: "keranjang", path: "/keranjang" },
  { name: "masuk", path: "/masuk" },
  { name: "daftar", path: "/daftar" },
  { name: "lupa-password", path: "/lupa-password" },
  { name: "bisnis", path: "/bisnis" },
  { name: "tentang", path: "/tentang" },
  { name: "lacak", path: "/lacak" },
];

function chromePath() {
  const list = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ];
  return list.find((p) => p && existsSync(p));
}

/** Dijalankan DI DALAM halaman: kembalikan daftar masalah tata letak. */
function inspectLayout() {
  const issues = [];
  const desc = (e) => {
    const id = e.id ? `#${e.id}` : "";
    const label = e.getAttribute("aria-label") || e.getAttribute("name") || e.getAttribute("placeholder") || (e.textContent || "").trim().slice(0, 30);
    return `<${e.tagName.toLowerCase()}${id}>${label ? ` "${label}"` : ""}`;
  };
  const visible = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };

  // 1. Kelas posisi Tailwind vs hasil sebenarnya. Elemen dengan varian posisi (mis. `lg:static`) dilewati.
  const POS = ["absolute", "fixed", "sticky"];
  for (const e of document.querySelectorAll("[class]")) {
    const cls = typeof e.className === "string" ? e.className.split(/\s+/) : [];
    const want = POS.find((p) => cls.includes(p));
    if (!want) continue;
    if (cls.some((c) => /^[a-z0-9-]+:(static|relative|absolute|fixed|sticky)$/.test(c))) continue;
    const got = getComputedStyle(e).position;
    if (got !== want && visible(e)) issues.push(`posisi tertimpa CSS: ${desc(e)} berkelas "${want}" tapi hasilnya "${got}"`);
  }

  // 2. Ikon/tombol absolut di samping kolom isian (mata password, dll.) harus berada di dalam kolomnya.
  for (const input of document.querySelectorAll("input, textarea")) {
    if (!visible(input)) continue;
    const ir = input.getBoundingClientRect();
    for (const btn of input.parentElement?.querySelectorAll(":scope > button") ?? []) {
      if (getComputedStyle(btn).position !== "absolute" || !visible(btn)) continue;
      const br = btn.getBoundingClientRect();
      const cx = (br.left + br.right) / 2;
      const cy = (br.top + br.bottom) / 2;
      if (cx < ir.left || cx > ir.right || cy < ir.top || cy > ir.bottom) {
        issues.push(`ikon di luar kolom isian: ${desc(btn)} tidak berada di dalam ${desc(input)}`);
      }
    }
  }

  // 3. Halaman bisa digeser ke samping.
  const vw = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) {
    const clipped = (e) => {
      for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
        if (["auto", "scroll", "hidden", "clip"].includes(getComputedStyle(p).overflowX)) return true;
      }
      return false;
    };
    const wide = [...document.querySelectorAll("body *")]
      .filter((e) => e.getBoundingClientRect().right > vw + 1 && getComputedStyle(e).position !== "fixed" && visible(e) && !clipped(e))
      .slice(0, 3)
      .map(desc);
    issues.push(`halaman bisa digeser ke samping: lebar ${sw}px > layar ${vw}px${wide.length ? ` — mis. ${wide.join(", ")}` : ""}`);
  }
  return issues;
}

// Beacon pelacak (Meta Pixel, GA, TikTok) juga berupa "gambar" 1×1 — bukan foto, abaikan.
const TRACKER = /(^|\.)(facebook\.(com|net)|google-analytics\.com|googletagmanager\.com|doubleclick\.net|google\.com|tiktok\.com|analytics\.tiktok\.com)$/;
const isPhoto = (req) => {
  if (req.resourceType() !== "image") return false;
  try {
    return !TRACKER.test(new URL(req.url()).hostname);
  } catch {
    return true;
  }
};

/** Gulir pelan sampai bawah supaya foto lazy-load ikut dimuat, lalu kembali ke atas. */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(300, innerHeight * 0.8);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

async function findProductPath(browser) {
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE}/produk`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const href = await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="/produk/"]')].map((a) => a.getAttribute("href")).find((h) => h && !h.startsWith("/produk/filter")),
    );
    return href ?? null;
  } finally {
    await page.close();
  }
}

async function main() {
  const executablePath = chromePath();
  if (!executablePath) {
    console.error("Google Chrome tidak ditemukan. Pasang Chrome atau set CHROME_PATH.");
    process.exit(2);
  }
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath, headless: true });

  let up = false;
  for (let i = 0; i < 10 && !up; i++) {
    // dev server yang baru dinyalakan bisa belum siap → coba lagi beberapa detik
    up = await fetch(BASE, { method: "HEAD" }).then(() => true, () => false);
    if (!up) await new Promise((r) => setTimeout(r, 3000));
  }
  if (!up) {
    console.error(`Tidak bisa membuka ${BASE}. Jalankan dulu "npm run dev" (atau beri URL situs).`);
    await browser.close();
    process.exit(2);
  }

  const productPath = await findProductPath(browser);
  const pages = PAGES.map((p) => (p.path === null ? { ...p, path: productPath } : p)).filter((p) => p.path);
  if (!productPath) console.warn("⚠ Tidak menemukan halaman produk di /produk — detail produk dilewati.");

  console.log(`Cek tampilan ${BASE} — ${pages.length} halaman × ${VIEWPORTS.length} ukuran layar\n`);
  let total = 0;
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
      deviceScaleFactor: 1,
      locale: "id-ID",
    });
    for (const p of pages) {
      const page = await context.newPage();
      const issues = [];
      page.on("pageerror", (err) => issues.push(`error JavaScript: ${String(err.message).slice(0, 160)}`));
      page.on("response", (res) => {
        if (isPhoto(res.request()) && res.status() >= 400) issues.push(`foto gagal (${res.status()}): ${res.url().slice(0, 120)}`);
      });
      page.on("requestfailed", (req) => {
        const why = req.failure()?.errorText ?? "";
        if (isPhoto(req) && !/ERR_ABORTED/.test(why)) issues.push(`foto gagal (${why}): ${req.url().slice(0, 120)}`);
      });
      try {
        const res = await page.goto(BASE + p.path, { waitUntil: "load", timeout: 90_000 });
        if (res && res.status() >= 400) issues.push(`halaman membalas HTTP ${res.status()}`);
        await scrollThrough(page);
        issues.push(...(await page.evaluate(inspectLayout)));
        await page.screenshot({ path: `${OUT}/${vp.name}-${p.name}.png`, fullPage: false });
      } catch (e) {
        issues.push(`gagal dibuka: ${String(e instanceof Error ? e.message : e).split("\n")[0]}`);
      }
      const unique = [...new Set(issues)];
      total += unique.length;
      console.log(`${unique.length ? "✗" : "✓"} ${vp.name.padEnd(7)} ${p.path}`);
      for (const i of unique.slice(0, 8)) console.log(`    • ${i}`);
      if (unique.length > 8) console.log(`    • … dan ${unique.length - 8} lagi`);
      await page.close();
    }
    await context.close();
  }
  await browser.close();
  console.log(`\n${total ? `✗ ${total} masalah ditemukan` : "✓ Tidak ada masalah"} — screenshot di ${OUT}/`);
  process.exit(total ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
