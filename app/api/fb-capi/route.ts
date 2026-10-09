import { NextResponse } from "next/server";
import { sendServerEvent, isCapiConfigured } from "@/lib/fb-capi";
import { db } from "@/lib/db";
import { limitAction } from "@/lib/security/ratelimit";

export const runtime = "nodejs";

// Hanya event yang memang dikirim situs (lib/tracking.ts). Selain ini ditolak.
const EVENTS = new Set(["ViewContent", "AddToCart", "InitiateCheckout", "Contact", "Purchase"]);
const PAID = ["PAID", "PROCESSING", "SHIPPED", "DONE"];

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(v, max) : undefined);

/** customData: hanya kunci yang dipakai lib/tracking.ts, tipe & panjang dibatasi. */
function cleanCustomData(c: unknown): Record<string, unknown> {
  const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>;
  const ids = Array.isArray(o.content_ids) ? o.content_ids.filter((x) => typeof x === "string").slice(0, 50).map((x) => (x as string).slice(0, 64)) : undefined;
  const out: Record<string, unknown> = {
    content_ids: ids,
    content_name: str(o.content_name, 200),
    content_type: o.content_type === "product" ? "product" : undefined,
    content_category: str(o.content_category, 80),
    num_items: num(o.num_items, 999),
    value: num(o.value, 1_000_000_000),
    currency: o.currency === "IDR" ? "IDR" : undefined,
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

// Terima event dari client (dgn eventId yg sama seperti Pixel browser) lalu
// teruskan ke Meta CAPI, diperkaya IP + User-Agent + cookie _fbp/_fbc dari request.
// Dibatasi agar tak jadi "proxy terbuka": event & data disaring, per IP dibatasi, Purchase diverifikasi
// ke pesanan lunas di DB (nilai diambil dari DB, bukan dari browser).
export async function POST(request: Request) {
  if (!isCapiConfigured()) return NextResponse.json({ ok: false, skipped: true });

  const h = request.headers;
  const clientIp = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || undefined;
  const rl = await limitAction("fb-capi", clientIp ?? "anon", 60, "60 s");
  if (!rl.success) return NextResponse.json({ ok: false, error: "rate" }, { status: 429 });

  let body: {
    eventName?: unknown;
    eventId?: unknown;
    eventSourceUrl?: unknown;
    customData?: unknown;
    email?: unknown;
    phone?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const eventName = str(body.eventName, 40);
  const eventId = str(body.eventId, 100);
  if (!eventName || !eventId || !EVENTS.has(eventName)) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  const customData = cleanCustomData(body.customData);
  if (eventName === "Purchase") {
    // event_id = "purchase_<nomor pesanan>" (components/tracking/purchase-tracker.tsx) → wajib pesanan nyata & lunas.
    const orderNo = eventId.startsWith("purchase_") ? eventId.slice("purchase_".length) : "";
    const order = orderNo
      ? await db.order.findFirst({ where: { OR: [{ midtransOrderId: orderNo }, { id: orderNo }] }, select: { status: true, total: true } })
      : null;
    if (!order || !PAID.includes(order.status)) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
    customData.value = order.total;
    customData.currency = "IDR";
  }

  const sourceUrl = str(body.eventSourceUrl, 500);
  const userAgent = h.get("user-agent") ?? undefined;
  const cookie = h.get("cookie") ?? "";
  const readCookie = (name: string) =>
    cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1];

  await sendServerEvent({
    eventName,
    eventId,
    eventSourceUrl: sourceUrl && /^https?:\/\//.test(sourceUrl) ? sourceUrl : undefined,
    customData,
    userData: {
      email: str(body.email, 160),
      phone: str(body.phone, 30),
      clientIp,
      userAgent,
      fbp: readCookie("_fbp"),
      fbc: readCookie("_fbc"),
    },
  });

  return NextResponse.json({ ok: true });
}
