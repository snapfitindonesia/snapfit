import { db } from "@/lib/db";
(async () => {
  const s = (await db.siteSetting.findUnique({ where: { key: "home.sections" } }))!.value as any[];
  for (const x of s) { if (x.image) console.log(x.id, x.image); for (const b of x.blocks ?? []) console.log(x.id, b.image, b.title); }
  process.exit(0);
})();
