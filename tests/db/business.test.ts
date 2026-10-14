// Server Action formulir Kerja Sama Bisnis (email dimatikan di tes → hanya dicatat, tak terkirim).
import { describe, expect, it, vi } from "vitest";
import { sendBusinessInquiry } from "@/lib/actions/business";

const ok = { name: "Rina Uji", company: "Toko Uji", email: "rina@example.com", phone: "081234567890", type: "Reseller / toko", volume: "50–200 pcs", message: "Halo" } as const;

describe("kirim permintaan kerja sama", () => {
  it("isian valid → berhasil & email ke admin dibuat", async () => {
    const log = vi.spyOn(console, "log");
    expect(await sendBusinessInquiry({ ...ok })).toEqual({ ok: true });
    expect(log.mock.calls.flat().join(" ")).toMatch(/Permintaan kerja sama: Reseller \/ toko — Toko Uji/);
    log.mockRestore();
  });
  it("kolom jebakan bot terisi → pura-pura berhasil, TIDAK ada email", async () => {
    const log = vi.spyOn(console, "log");
    expect(await sendBusinessInquiry({ ...ok, website: "http://spam" })).toEqual({ ok: true });
    expect(log.mock.calls.flat().join(" ")).not.toMatch(/kerja sama/);
    log.mockRestore();
  });
  it("isian salah → pesan error yang jelas", async () => {
    expect(await sendBusinessInquiry({ ...ok, email: "salah" })).toEqual({ ok: false, error: "Email tidak valid" });
  });
});
