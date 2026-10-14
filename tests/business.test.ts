// Formulir Kerja Sama Bisnis (/bisnis): validasi isian publik.
import { describe, expect, it } from "vitest";
import { businessInquirySchema } from "@/lib/validations/business";

const ok = { name: "Rina", email: "rina@contoh.co.id", phone: "0812-3456-7890", type: "Reseller / toko", volume: "50–200 pcs" };

describe("formulir kerja sama", () => {
  it("isian minimal valid; kolom opsional jadi string kosong", () => {
    const r = businessInquirySchema.parse(ok);
    expect(r).toMatchObject({ company: "", city: "", message: "" });
  });
  it("menolak email/WA tidak valid & jenis kerja sama di luar daftar", () => {
    expect(businessInquirySchema.safeParse({ ...ok, email: "bukan-email" }).success).toBe(false);
    expect(businessInquirySchema.safeParse({ ...ok, phone: "123" }).success).toBe(false);
    expect(businessInquirySchema.safeParse({ ...ok, type: "Franchise" }).success).toBe(false);
  });
  it("membatasi panjang pesan (anti spam besar)", () => {
    expect(businessInquirySchema.safeParse({ ...ok, message: "x".repeat(2001) }).success).toBe(false);
  });
});
