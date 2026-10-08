// Skala tipografi SERAGAM untuk semua bagian beranda & halaman konten (permintaan client, Okt 2026).
// Hero tetap paling besar (judul utama halaman); selain itu SEMUA bagian memakai ukuran di bawah ini.
// Warna sengaja tidak diatur di sini (tiap bagian bisa berlatar terang/gelap).
export const TYPE = {
  /** Judul bagian — 28 / 32 / 40px */
  h2: "text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] text-balance sm:text-[32px] lg:text-[40px]",
  /** Subjudul / teks pembuka bagian — 16 / 17px */
  sub: "text-base leading-relaxed text-pretty sm:text-[17px]",
  /** Judul kartu / blok — 20 / 24px */
  h3: "text-xl leading-snug font-semibold tracking-[-0.01em] text-balance sm:text-2xl",
  /** Paragraf kartu / blok — 14 / 15px */
  body: "text-sm leading-relaxed sm:text-[15px]",
} as const;
