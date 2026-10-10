import { describe, expect, it } from "vitest";
import { ORDER_STATUSES, ORDER_TRANSITIONS, RESTOCK_ON_CANCEL } from "@/lib/validations/admin";
import { addressSchema, createOrderSchema } from "@/lib/validations/checkout";
import { bankAccountsSchema } from "@/lib/bank-accounts";
import { parseProductSegment, productPath, productSegment } from "@/lib/product-url";

describe("aturan perubahan status pesanan (admin)", () => {
  it("lunas TIDAK bisa diset manual dari Menunggu Bayar (wajib Konfirmasi Bayar)", () => {
    expect(ORDER_TRANSITIONS.PENDING).not.toContain("PAID");
    expect(ORDER_TRANSITIONS.PENDING).toEqual(["CANCELLED"]);
  });
  it("Dibatalkan bersifat final", () => {
    expect(ORDER_TRANSITIONS.CANCELLED).toEqual([]);
  });
  it("Selesai hanya bisa dibatalkan (cashback sudah diberikan)", () => {
    expect(ORDER_TRANSITIONS.DONE).toEqual(["CANCELLED"]);
  });
  it("setiap status bisa dibatalkan kecuali yang sudah batal", () => {
    for (const s of ORDER_STATUSES) if (s !== "CANCELLED") expect(ORDER_TRANSITIONS[s]).toContain("CANCELLED");
  });
  it("stok dikembalikan hanya bila batal sebelum barang dikirim", () => {
    expect([...RESTOCK_ON_CANCEL].sort()).toEqual(["PAID", "PROCESSING"]);
  });
  it("tak ada transisi ke status yang tidak dikenal", () => {
    for (const s of ORDER_STATUSES) for (const t of ORDER_TRANSITIONS[s]) expect(ORDER_STATUSES).toContain(t);
  });
});

const addr = (o: Record<string, string> = {}) => ({
  name: "Rina", phone: "081234567890", email: "", address: "Jl. Malioboro No. 1",
  provinceCode: "34", province: "Daerah Istimewa Yogyakarta", regencyCode: "34.71", city: "Kota Yogyakarta",
  districtCode: "34.71.01", district: "Mantrijeron", postalCode: "55111", ...o,
});

describe("validasi checkout", () => {
  it("alamat lengkap & konsisten → lolos", () => {
    expect(addressSchema.safeParse(addr()).success).toBe(true);
  });
  it("kecamatan harus berada di kabupaten terpilih", () => {
    expect(addressSchema.safeParse(addr({ districtCode: "33.71.01" })).success).toBe(false);
  });
  it("nama provinsi harus cocok dengan kodenya", () => {
    expect(addressSchema.safeParse(addr({ province: "Jawa Tengah" })).success).toBe(false);
  });
  it("batas panjang (anti spam): alamat ≤ 300, nama ≤ 80", () => {
    expect(addressSchema.safeParse(addr({ address: "x".repeat(301) })).success).toBe(false);
    expect(addressSchema.safeParse(addr({ name: "x".repeat(81) })).success).toBe(false);
  });
  it("kode pos 5 digit & nomor HP valid", () => {
    expect(addressSchema.safeParse(addr({ postalCode: "5511" })).success).toBe(false);
    expect(addressSchema.safeParse(addr({ phone: "abc" })).success).toBe(false);
  });
  it("maks. 50 jenis produk & qty 1–99 per baris", () => {
    const item = { variantId: "v", qty: 1 };
    expect(createOrderSchema.safeParse({ address: addr(), items: Array(51).fill(item) }).success).toBe(false);
    expect(createOrderSchema.safeParse({ address: addr(), items: [{ variantId: "v", qty: 100 }] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ address: addr(), items: [item] }).success).toBe(true);
  });
});

describe("rekening transfer (admin)", () => {
  const bca = { bank: "BCA", accountNumber: "2680 235-212", accountName: "Adhi Santoso" };
  it("nomor rekening dinormalkan jadi angka saja", () => {
    const r = bankAccountsSchema.safeParse([bca]);
    expect(r.success && r.data[0]!.accountNumber).toBe("2680235212");
  });
  it("rekening ganda (bank & nomor sama) ditolak", () => {
    expect(bankAccountsSchema.safeParse([bca, { ...bca, bank: "bca", accountNumber: "2680235212" }]).success).toBe(false);
  });
  it("minimal 1, maksimal 4 rekening", () => {
    expect(bankAccountsSchema.safeParse([]).success).toBe(false);
    const many = [1, 2, 3, 4, 5].map((i) => ({ ...bca, accountNumber: `1234567${i}` }));
    expect(bankAccountsSchema.safeParse(many).success).toBe(false);
  });
});

describe("URL produk", () => {
  it("format /produk/<judul>-<id>", () => {
    expect(productPath({ slug: "case-iphone-18", shortId: 1125 })).toBe("/produk/case-iphone-18-1125");
    expect(productSegment({ slug: "case-iphone-18", shortId: null })).toBe("case-iphone-18");
  });
  it("ID dibaca dari ujung segmen (judul boleh berisi angka)", () => {
    expect(parseProductSegment("case-iphone-18-pro-1125")).toEqual({ text: "case-iphone-18-pro", id: 1125 });
  });
  it("URL lama tanpa ID → id null", () => {
    expect(parseProductSegment("case-iphone")).toEqual({ text: "case-iphone", id: null });
  });
});
