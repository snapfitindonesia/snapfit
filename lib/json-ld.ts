/**
 * Isi <script type="application/ld+json"> yang aman: `<` di-escape agar teks seperti "</script>" di
 * deskripsi produk/artikel (impor marketplace, ketikan admin) tak bisa menutup tag script (XSS).
 */
export function jsonLdHtml(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\u003c") };
}
