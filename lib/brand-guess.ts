/**
 * Tebak merek aksesori dari judul produk (dipakai saat impor Ginee).
 * Hanya mengembalikan merek yang TERDAFTAR di Admin → Merek; judul yang
 * diawali nama merek diutamakan. Tak ketemu → null (produk "Tanpa Merek").
 */
const ALIASES: [RegExp, string][] = [
  [/\bSNAPFIT\b/i, "SNAPFIT"],
  [/\bRINGKE\b/i, "Ringke"],
  [/\bVRS(\s*DESIGN)?\b/i, "VRS Design"],
  [/\bARAREE\b/i, "Araree"],
  [/\bSUPCASE\b/i, "SUPCASE"],
  [/\bSWITCH\s*EASY\b/i, "SwitchEasy"],
  [/\bMAG\s*EASY\b/i, "MagEasy"],
  [/\bI-?BLASON\b/i, "i-Blason"],
  [/\bDUX\s*DUCIS\b/i, "DUX DUCIS"],
  [/\bUAG\b|URBAN\s*ARMOR/i, "UAG"],
  [/\bESR\b/i, "ESR"],
  [/\bCASE\s*ME\b|\bCASEME\b/i, "CaseMe"],
  [/\bGKK\b/i, "GKK"],
];

export function guessMerek(title: string, registered: string[]): string | null {
  const reg = new Map(registered.map((n) => [n.toLowerCase(), n]));
  const hits: string[] = [];
  for (const [re, name] of ALIASES) if (re.test(title) && !hits.includes(name)) hits.push(name);
  // Merek terdaftar lain yang tak punya alias: cocokkan nama persis sebagai kata.
  for (const n of registered) {
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!hits.some((h) => h.toLowerCase() === n.toLowerCase()) && new RegExp(`\\b${esc}\\b`, "i").test(title)) hits.push(n);
  }
  const valid = hits.map((h) => reg.get(h.toLowerCase())).filter((h): h is string => !!h);
  if (!valid.length) return null;
  const lead = valid.find((b) => new RegExp(`^\\W*${b.split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}`, "i").test(title));
  return lead ?? valid[0];
}
