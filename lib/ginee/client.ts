// Klien Ginee OpenAPI — hanya untuk server (pakai Secret Key + node crypto).
//
// Auth (dari dokumentasi resmi Ginee, doc.ginee.com):
//   - Header:
//       Content-Type: application/json
//       X-Advai-Country: ID
//       Authorization: {AccessKey}:{Signature}
//   - Signature = Base64( HMAC-SHA256( SecretKey, "{HttpMethod}${RequestUri}$" ) )
//     · HttpMethod huruf besar (GET/POST)
//     · RequestUri = path endpoint SAJA (tanpa host, tanpa query string),
//       mis. "/openapi/product/master/v1/list". Diapit tanda "$".
//
// Tanpa kredensial (isGineeConfigured() false) → gineeRequest melempar error
// jelas, jadi caller bisa skip dengan aman.
import crypto from "crypto";
import {
  GINEE_HOST,
  GINEE_COUNTRY,
  GINEE_ACCESS_KEY,
  GINEE_SECRET_KEY,
  isGineeConfigured,
} from "./config";

/** Buat signature untuk satu request. */
function sign(method: string, uri: string): string {
  const stringToSign = `${method.toUpperCase()}$${uri}$`;
  return crypto
    .createHmac("sha256", GINEE_SECRET_KEY)
    .update(stringToSign)
    .digest("base64");
}

export type GineeResponse<T = unknown> = {
  code: number; // "SUCCESS" biasanya code 0 / "SUCCESS"
  message?: string;
  data?: T;
  // Ginee membungkus dgn { code, message, data, transactionId, ... }
  [k: string]: unknown;
};

export class GineeError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "GineeError";
  }
}

/**
 * Panggil endpoint Ginee OpenAPI. `uri` adalah path saja (diawali "/"),
 * mis. "/openapi/product/master/v1/list". `body` (untuk POST) di-JSON-kan.
 */
export async function gineeRequest<T = unknown>(
  method: "GET" | "POST",
  uri: string,
  body?: unknown,
): Promise<GineeResponse<T>> {
  if (!isGineeConfigured()) {
    throw new GineeError(
      "Ginee belum dikonfigurasi (GINEE_ACCESS_KEY / GINEE_SECRET_KEY kosong).",
    );
  }

  // Signature dihitung dari PATH saja (tanpa query). Utk GET, body → query string.
  const signature = sign(method, uri);
  const url =
    method === "GET" && body && typeof body === "object"
      ? `${GINEE_HOST}${uri}?${new URLSearchParams(body as Record<string, string>).toString()}`
      : `${GINEE_HOST}${uri}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Advai-Country": GINEE_COUNTRY,
      Authorization: `${GINEE_ACCESS_KEY}:${signature}`,
    },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    // Ginee OMS bukan data statis — jangan cache.
    cache: "no-store",
  });

  const text = await res.text();
  let json: GineeResponse<T>;
  try {
    json = text ? JSON.parse(text) : ({ code: res.status } as GineeResponse<T>);
  } catch {
    throw new GineeError(`Respons Ginee bukan JSON: ${text.slice(0, 200)}`, res.status, text);
  }

  if (!res.ok) {
    throw new GineeError(
      `Ginee ${method} ${uri} gagal: ${res.status} ${json.message ?? ""}`.trim(),
      res.status,
      json,
    );
  }
  return json;
}
