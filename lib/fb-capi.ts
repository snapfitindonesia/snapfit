// Facebook/Meta Conversions API (server-side). Kirim event dari server ke Meta
// dengan deduplication via event_id (samakan dgn Pixel browser). Aktif hanya bila
// FB_PIXEL_ID + FB_CAPI_ACCESS_TOKEN diisi (fail-closed: tanpa itu → no-op).
import crypto from "crypto";

const PIXEL_ID = process.env.FB_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID || "";
const TOKEN = process.env.FB_CAPI_ACCESS_TOKEN || "";
const TEST_CODE = process.env.FB_CAPI_TEST_CODE || ""; // opsional: utk Test Events di Events Manager
const API_VERSION = "v21.0";

export function isCapiConfigured(): boolean {
  return Boolean(PIXEL_ID && TOKEN);
}

function sha256(v: string): string {
  return crypto.createHash("sha256").update(v).digest("hex");
}
function hashEmail(v?: string): string | undefined {
  const e = v?.trim().toLowerCase();
  return e ? sha256(e) : undefined;
}
function hashPhone(v?: string): string | undefined {
  const d = v?.replace(/[^0-9]/g, "");
  return d ? sha256(d) : undefined;
}

export type CapiUserData = {
  email?: string;
  phone?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
};
export type CapiEvent = {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string;
  userData: CapiUserData;
  customData?: Record<string, unknown>;
};

/** Kirim 1 event ke Meta CAPI (best-effort; error tak dilempar). */
export async function sendServerEvent(ev: CapiEvent): Promise<void> {
  if (!isCapiConfigured()) return;

  const user_data: Record<string, unknown> = {};
  const em = hashEmail(ev.userData.email);
  if (em) user_data.em = [em];
  const ph = hashPhone(ev.userData.phone);
  if (ph) user_data.ph = [ph];
  if (ev.userData.clientIp) user_data.client_ip_address = ev.userData.clientIp;
  if (ev.userData.userAgent) user_data.client_user_agent = ev.userData.userAgent;
  if (ev.userData.fbp) user_data.fbp = ev.userData.fbp;
  if (ev.userData.fbc) user_data.fbc = ev.userData.fbc;

  const payload = {
    data: [
      {
        event_name: ev.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: ev.eventId,
        action_source: "website",
        ...(ev.eventSourceUrl ? { event_source_url: ev.eventSourceUrl } : {}),
        user_data,
        ...(ev.customData ? { custom_data: ev.customData } : {}),
      },
    ],
    ...(TEST_CODE ? { test_event_code: TEST_CODE } : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(TOKEN)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    );
    if (!res.ok) {
      console.error("FB CAPI gagal:", res.status, (await res.text().catch(() => "")).slice(0, 300));
    }
  } catch (e) {
    console.error("FB CAPI error:", e instanceof Error ? e.message : e);
  }
}
