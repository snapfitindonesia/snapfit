import { describe, expect, it } from "vitest";
import { cell, detectSep, parseCSV, SEP } from "@/lib/csv";

const row = (cells: (string | number)[]) => cells.map(cell).join(SEP);

describe("CSV Edit Massal — unduh", () => {
  it("pemisah titik koma (Excel Indonesia langsung jadi tabel)", () => {
    expect(SEP).toBe(";");
  });
  it("sel berisi pemisah, kutip, atau baris baru dibungkus kutip", () => {
    expect(cell("a;b")).toBe('"a;b"');
    expect(cell('kata "kutip"')).toBe('"kata ""kutip"""');
    expect(cell("baris 1\nbaris 2")).toBe('"baris 1\nbaris 2"');
    expect(cell("biasa")).toBe("biasa");
    expect(cell(89000)).toBe("89000");
  });
  it("teks diawali = + - @ diberi Tab agar Excel tak menganggapnya rumus", () => {
    for (const s of ["=1+1", "+62 812", "- Bahan TPU", "@snapfit"]) expect(cell(s)).toBe(`"\t${s}"`);
  });
  it("angka negatif (bukan teks) tidak diubah", () => {
    expect(cell(-5)).toBe("-5");
  });
});

describe("CSV Edit Massal — upload", () => {
  const H = ["variantId", "nama_produk", "harga"];
  const DATA = ["v1", 'Case "Pro"; MagSafe', "89000"];

  it("pemisah otomatis: titik koma, koma, atau Tab", () => {
    expect(detectSep("a;b;c\n1;2;3")).toBe(";");
    expect(detectSep("a,b,c\n1,2,3")).toBe(",");
    expect(detectSep("a\tb\tc")).toBe("\t");
  });

  it("bolak-balik unduh → upload menghasilkan data yang sama", () => {
    const text = `﻿${row(H)}\n${row(DATA)}\n`;
    expect(parseCSV(text)).toEqual([H, DATA]);
  });

  it("deskripsi multi-baris di dalam sel tetap utuh", () => {
    const text = `${row(H)}\r\n${row(["v1", "Baris 1\nBaris 2\n- poin", "1"])}\r\n`;
    expect(parseCSV(text)[1]![1]).toBe("Baris 1\nBaris 2\n- poin");
  });

  it("file disimpan ulang Excel/Google Sheets dengan koma tetap terbaca", () => {
    expect(parseCSV('variantId,nama_produk,harga\nv1,"Case, Pro",89000\n')).toEqual([H, ["v1", "Case, Pro", "89000"]]);
  });

  it("baris penanda Excel 'sep=;' diabaikan", () => {
    expect(parseCSV("sep=;\nvariantId;harga\nv1;1000\n")).toEqual([["variantId", "harga"], ["v1", "1000"]]);
  });

  it("Tab pengaman rumus terbuang saat nilai di-trim (server)", () => {
    const parsed = parseCSV(`${row(H)}\n${row(["v1", "- Bahan TPU", "1"])}\n`);
    expect(parsed[1]![1]!.trim()).toBe("- Bahan TPU");
  });

  it("baris kosong diabaikan", () => {
    expect(parseCSV("a;b\n\n1;2\n;\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});
