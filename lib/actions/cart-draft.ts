"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { limitAction, requestIp } from "@/lib/security/ratelimit";
import { normalizeEmail, normalizePhone, sellableDraftItems, type DraftItem } from "@/lib/cart-draft";

const draftSchema = z.object({
  clientId: z.string().regex(/^[A-Za-z0-9-]{16,64}$/),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  items: z
    .array(z.object({ variantId: z.string().min(1).max(64), qty: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
});

/**
 * Simpan/perbarui draf checkout (dipanggil dari /checkout saat kontak diisi).
 * Hanya disimpan bila ada email valid atau nomor HP. Draf yang sudah jadi
 * pesanan dibuka ulang sebagai draf baru (token & status pengingat direset).
 */
export async function saveCheckoutDraft(input: z.input<typeof draftSchema>): Promise<{ ok: boolean }> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const d = parsed.data;

  const email = d.email && z.string().email().safeParse(d.email).success ? normalizeEmail(d.email) : null;
  const phone = normalizePhone(d.phone);
  if (!email && !phone) return { ok: false };

  const rl = await limitAction("draft", await requestIp(), 20, "60 s");
  if (!rl.success) return { ok: false };

  const items = await sellableDraftItems(d.items);
  if (!items.length) return { ok: false };
  const lines = items.map((i) => ({ variantId: i.variantId, qty: i.qty }));
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const fields = { name: d.name || null, email, phone, items: lines, subtotal };

  const existing = await db.checkoutDraft.findUnique({ where: { clientId: d.clientId }, select: { convertedAt: true } });
  if (!existing) {
    await db.checkoutDraft.create({ data: { clientId: d.clientId, token: randomBytes(16).toString("hex"), ...fields } });
  } else if (existing.convertedAt) {
    await db.checkoutDraft.update({
      where: { clientId: d.clientId },
      data: { ...fields, token: randomBytes(16).toString("hex"), convertedAt: null, remindedAt: null, recoveredAt: null, createdAt: new Date() },
    });
  } else {
    await db.checkoutDraft.update({ where: { clientId: d.clientId }, data: fields });
  }
  return { ok: true };
}

/** Tautan "pulihkan keranjang" (email/WA) → item yang masih bisa dibeli. */
export async function restoreCheckoutDraft(token: string): Promise<{ ok: boolean; items: DraftItem[] }> {
  if (!/^[a-f0-9]{32}$/.test(token)) return { ok: false, items: [] };
  const rl = await limitAction("draft-restore", await requestIp(), 20, "60 s");
  if (!rl.success) return { ok: false, items: [] };

  const draft = await db.checkoutDraft.findUnique({ where: { token } });
  if (!draft) return { ok: false, items: [] };
  const items = await sellableDraftItems((draft.items as { variantId: string; qty: number }[]) ?? []);
  if (!draft.recoveredAt) await db.checkoutDraft.update({ where: { id: draft.id }, data: { recoveredAt: new Date() } });
  return { ok: true, items };
}

/** Halaman /berhenti: email pemilik draf tak dikirimi pengingat lagi. */
export async function optOutReminders(token: string): Promise<{ ok: boolean }> {
  if (!/^[a-f0-9]{32}$/.test(token)) return { ok: false };
  const draft = await db.checkoutDraft.findUnique({ where: { token }, select: { email: true } });
  if (!draft?.email) return { ok: false };
  await db.emailOptOut.upsert({ where: { email: draft.email }, create: { email: draft.email }, update: {} });
  return { ok: true };
}
