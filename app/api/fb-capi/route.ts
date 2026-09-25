import { NextResponse } from "next/server";
import { sendServerEvent, isCapiConfigured } from "@/lib/fb-capi";

export const runtime = "nodejs";

// Terima event dari client (dgn eventId yg sama seperti Pixel browser) lalu
// teruskan ke Meta CAPI, diperkaya IP + User-Agent + cookie _fbp/_fbc dari request.
export async function POST(request: Request) {
  if (!isCapiConfigured()) return NextResponse.json({ ok: false, skipped: true });

  let body: {
    eventName?: string;
    eventId?: string;
    eventSourceUrl?: string;
    customData?: Record<string, unknown>;
    email?: string;
    phone?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const { eventName, eventId, eventSourceUrl, customData, email, phone } = body;
  if (!eventName || !eventId) return NextResponse.json({ ok: false, error: "missing" }, { status: 400 });

  const h = request.headers;
  const clientIp = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || undefined;
  const userAgent = h.get("user-agent") ?? undefined;
  const cookie = h.get("cookie") ?? "";
  const readCookie = (name: string) =>
    cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1];

  await sendServerEvent({
    eventName,
    eventId,
    eventSourceUrl,
    customData,
    userData: {
      email,
      phone,
      clientIp,
      userAgent,
      fbp: readCookie("_fbp"),
      fbc: readCookie("_fbc"),
    },
  });

  return NextResponse.json({ ok: true });
}
