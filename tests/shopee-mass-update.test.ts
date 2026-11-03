import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { readXlsx } from "@/lib/xlsx-read";
import { parseShopeeMassUpdate, shopeeImageUrl, weightGrams } from "@/lib/shopee/mass-update";

/** xlsx sintetis: shared strings + sel angka, satu sheet. */
function xlsx(sheetName: string, rows: (string | number)[][]): Uint8Array {
  const shared: string[] = [];
  const col = (i: number) => String.fromCharCode(65 + i);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = rows
    .map((r, ri) => `<row r="${ri + 1}">${r
      .map((v, ci) => {
        const ref = `${col(ci)}${ri + 1}`;
        if (typeof v === "number") return `<c r="${ref}"><v>${v}</v></c>`;
        shared.push(v);
        return `<c r="${ref}" t="s"><v>${shared.length - 1}</v></c>`;
      })
      .join("")}</row>`)
    .join("");
  return zipSync({
    "xl/workbook.xml": strToU8(`<workbook><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`),
    "xl/sharedStrings.xml": strToU8(`<sst>${shared.map((s) => `<si><t>${esc(s)}</t></si>`).join("")}</sst>`),
    "xl/worksheets/sheet1.xml": strToU8(`<worksheet><sheetData>${body}</sheetData></worksheet>`),
  });
}

const NOTE = ["Wajib", "Wajib", "Opsional", "Opsional"];

describe("readXlsx", () => {
  it("membaca shared string, angka & entitas XML", () => {
    const [s] = readXlsx(xlsx("Template", [["Nama & Kode", 12], ["<b>", "x"]]));
    expect(s.name).toBe("Template");
    expect(s.rows).toEqual([["Nama & Kode", "12"], ["<b>", "x"]]);
  });
});

describe("parseShopeeMassUpdate", () => {
  const basic = xlsx("Template", [
    ["et_title_product_id", "et_title_product_name", "et_title_product_description", "et_title_parent_sku"],
    ["Kode Produk", "Nama Produk", "Deskripsi Produk", "SKU Induk"],
    NOTE,
    ["51518418611", "[BUY 1 GET 1] Case Samsung Z Fold 4 GKK Armored", "Beli 1 gratis 1", ""],
    ["40000000001", "Case Biasa", "Bukan promo", ""],
  ]);
  const sales = xlsx("Template", [
    ["et_title_product_id", "et_title_product_name", "et_title_variation_id", "et_title_variation_name", "et_title_parent_sku", "et_title_variation_sku", "et_title_variation_price", "et_title_variation_stock"],
    ["Kode Produk", "Nama Produk", "Kode Variasi", "Nama Variasi", "SKU Induk", "SKU", "Harga", "Stok"],
    ["Wajib", "", "", "", "", "", "", ""],
    ["51518418611", "[BUY 1 GET 1] Case Samsung Z Fold 4 GKK Armored", "391548001665", "Dark Green,Free Case", "", "GKK-FD435203", "69.000", 16],
    ["51518418611", "[BUY 1 GET 1] Case Samsung Z Fold 4 GKK Armored", "391548001666", "Maroon,Free Case", "", "GKK-FD435210", 69000, 14],
    ["40000000001", "Case Biasa", "", "", "SKU-1", "", 50000, 3],
  ]);
  const media = xlsx("Template", [
    ["et_title_product_id", "et_title_product_name", "et_title_cover_image", "et_title_item_image_1", "et_title_variation_name", "et_title_variation_image"],
    ["Kode Produk", "Nama Produk", "Foto Sampul", "Foto Produk 1", "Nama Variasi", "Foto Variasi"],
    NOTE,
    ["51518418611", "", "https://down-id.img.susercontent.com/file/cover1", "id-11134207-7ra0g-abcdefghijklmnopqrstuv", "Dark Green", "https://down-id.img.susercontent.com/file/green"],
  ]);
  const ship = xlsx("Template", [
    ["et_title_product_id", "et_title_weight"],
    ["Kode Produk", "Berat Produk/g"],
    NOTE,
    ["51518418611", "250"],
  ]);

  it("menggabungkan 4 template per Kode Produk", () => {
    const res = parseShopeeMassUpdate([
      { file: "media.xlsx", sheets: readXlsx(media) }, // urutan file bebas
      { file: "basic.xlsx", sheets: readXlsx(basic) },
      { file: "sales.xlsx", sheets: readXlsx(sales) },
      { file: "ship.xlsx", sheets: readXlsx(ship) },
    ]);
    expect(res.warnings).toEqual([]);
    const p = res.products.find((x) => x.id === "51518418611")!;
    expect(p.name).toBe("[BUY 1 GET 1] Case Samsung Z Fold 4 GKK Armored");
    expect(p.description).toBe("Beli 1 gratis 1");
    expect(p.images).toEqual([
      "https://down-id.img.susercontent.com/file/cover1",
      "https://down-id.img.susercontent.com/file/id-11134207-7ra0g-abcdefghijklmnopqrstuv",
    ]);
    expect(weightGrams(p.weight)).toBe(250);
    expect(p.variants).toEqual([
      { id: "391548001665", name: "Dark Green,Free Case", options: ["Dark Green", "Free Case"], sku: "GKK-FD435203", price: 69000, stock: 16, image: "https://down-id.img.susercontent.com/file/green" },
      { id: "391548001666", name: "Maroon,Free Case", options: ["Maroon", "Free Case"], sku: "GKK-FD435210", price: 69000, stock: 14, image: undefined },
    ]);
    // Produk tanpa variasi: SKU induk dipakai sebagai SKU satu-satunya.
    const plain = res.products.find((x) => x.id === "40000000001")!;
    expect(plain.variants).toEqual([{ id: "", name: "", options: [], sku: "SKU-1", price: 50000, stock: 3, image: undefined }]);
  });

  it("file lain → peringatan", () => {
    const res = parseShopeeMassUpdate([{ file: "pesanan.xlsx", sheets: readXlsx(xlsx("Sheet1", [["No. Pesanan", "Status"], ["ABC", "Selesai"]])) }]);
    expect(res.products).toEqual([]);
    expect(res.warnings[0]).toContain("pesanan.xlsx");
  });

  it("kode foto tanpa URL → URL CDN Shopee", () => {
    expect(shopeeImageUrl("id-11134207-7ra0g-abcdefghijklmnopqrstuv")).toBe("https://down-id.img.susercontent.com/file/id-11134207-7ra0g-abcdefghijklmnopqrstuv");
    expect(shopeeImageUrl("Wajib")).toBe("");
  });
});
