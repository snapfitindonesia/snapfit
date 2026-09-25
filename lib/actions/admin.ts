"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cleanupOrphanImages } from "@/lib/upload/cleanup";
import { sendEmail, orderShippedEmail, orderProcessingEmail } from "@/lib/email";
import {
  productSchema,
  bannerSchema,
  categorySchema,
  navLinkSchema,
  discountSchema,
  voucherSchema,
  reviewSchema,
  orderUpdateSchema,
  type ProductInput,
  type BannerInput,
  type CategoryInput,
  type NavLinkInput,
  type DiscountInput,
  type VoucherInput,
  type ReviewInput,
  type OrderUpdateInput,
} from "@/lib/validations/admin";

type Result = { ok: boolean; error?: string; id?: string };

function fail(e: unknown): Result {
  return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan." };
}

function revalidateStorefront() {
  revalidatePath("/");
  revalidatePath("/produk");
}

/* ============================ PRODUK ============================ */

export async function createProduct(input: ProductInput): Promise<Result> {
  try {
    await requireAdmin();
    const data = productSchema.parse(input);
    const product = await db.product.create({
      data: {
        slug: data.slug,
        name: data.name,
        brand: data.brand || null,
        description: data.description || null,
        coverImage: data.coverImage,
        images: data.images,
        variantGroups: data.variantGroups ?? undefined,
        categoryId: data.categoryId || null,
        extraCategories: {
          connect: data.extraCategoryIds
            .filter((cid) => cid && cid !== data.categoryId)
            .map((cid) => ({ id: cid })),
        },
        isGrosir: data.isGrosir,
        variants: {
          create: data.variants.map((v) => ({
            name: v.name,
            color: v.color,
            type: v.type,
            sku: v.sku || null,
            price: v.price,
            stock: v.stock,
            weight: v.weight,
            image: v.image,
          })),
        },
      },
    });
    revalidatePath("/admin/produk");
    revalidateStorefront();
    return { ok: true, id: product.id };
  } catch (e) {
    return fail(e);
  }
}

export async function updateProduct(id: string, input: ProductInput): Promise<Result> {
  try {
    await requireAdmin();
    const data = productSchema.parse(input);
    const keepIds = data.variants.filter((v) => v.id).map((v) => v.id as string);

    // Snapshot URL gambar LAMA untuk deteksi orphan setelah update.
    const old = await db.product.findUnique({
      where: { id },
      select: { coverImage: true, images: true, variants: { select: { image: true } } },
    });

    await db.$transaction([
      db.product.update({
        where: { id },
        data: {
          slug: data.slug,
          name: data.name,
          brand: data.brand || null,
          description: data.description || null,
          coverImage: data.coverImage,
          images: data.images,
          variantGroups: data.variantGroups ?? undefined,
          categoryId: data.categoryId || null,
          extraCategories: {
            set: data.extraCategoryIds
              .filter((cid) => cid && cid !== data.categoryId)
              .map((cid) => ({ id: cid })),
          },
          isGrosir: data.isGrosir,
        },
      }),
      // hapus varian yang dibuang di form
      db.variant.deleteMany({
        where: { productId: id, id: { notIn: keepIds.length ? keepIds : ["__none__"] } },
      }),
      // upsert varian
      ...data.variants.map((v) =>
        v.id
          ? db.variant.update({
              where: { id: v.id },
              data: { name: v.name, color: v.color, type: v.type, sku: v.sku || null, price: v.price, stock: v.stock, weight: v.weight, image: v.image },
            })
          : db.variant.create({
              data: { productId: id, name: v.name, color: v.color, type: v.type, sku: v.sku || null, price: v.price, stock: v.stock, weight: v.weight, image: v.image },
            }),
      ),
    ]);
    revalidatePath("/admin/produk");
    revalidatePath(`/produk/${data.slug}`);
    revalidateStorefront();
    // Hapus gambar lama yang kini tak terpakai (cover diganti, foto galeri/varian dibuang).
    if (old) {
      const oldGallery = Array.isArray(old.images) ? (old.images as string[]) : [];
      await cleanupOrphanImages([old.coverImage, ...oldGallery, ...old.variants.map((v) => v.image)]);
    }
    return { ok: true, id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProduct(id: string): Promise<Result> {
  try {
    await requireAdmin();
    // Kumpulkan URL gambar sebelum hapus (cover + galeri + foto varian).
    const before = await db.product.findUnique({
      where: { id },
      select: { coverImage: true, images: true, variants: { select: { image: true } } },
    });
    await db.product.delete({ where: { id } });
    revalidatePath("/admin/produk");
    revalidateStorefront();
    if (before) {
      const gallery = Array.isArray(before.images) ? (before.images as string[]) : [];
      await cleanupOrphanImages([before.coverImage, ...gallery, ...before.variants.map((v) => v.image)]);
    }
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProducts(ids: string[]): Promise<Result> {
  try {
    await requireAdmin();
    if (!ids.length) return { ok: true };
    const before = await db.product.findMany({
      where: { id: { in: ids } },
      select: { coverImage: true, images: true, variants: { select: { image: true } } },
    });
    await db.product.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/admin/produk");
    revalidateStorefront();
    const urls = before.flatMap((p) => [
      p.coverImage,
      ...(Array.isArray(p.images) ? (p.images as string[]) : []),
      ...p.variants.map((v) => v.image),
    ]);
    await cleanupOrphanImages(urls);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---------- Impor massal (CSV) ---------- */

export type BulkRow = {
  slug: string; name: string; category?: string; description?: string;
  coverImage?: string; images?: string; isGrosir?: string; weight?: string;
  variasi1?: string; opsi1?: string; foto_opsi1?: string;
  variasi2?: string; opsi2?: string;
  harga?: string; stok?: string; sku?: string;
};
type BulkResult = { ok: boolean; created: number; skipped: number; errors: string[] };

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const skuify = (parts: (string | undefined)[]) =>
  parts.filter(Boolean).join("-").toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export async function bulkImportProducts(rows: BulkRow[]): Promise<BulkResult> {
  const errors: string[] = [];
  try {
    await requireAdmin();
  } catch {
    return { ok: false, created: 0, skipped: 0, errors: ["Tidak diizinkan."] };
  }
  if (!rows.length) return { ok: false, created: 0, skipped: 0, errors: ["Tidak ada baris."] };

  // Kategori: cocokkan by nama daun (case-insensitive) atau slug.
  const cats = await db.category.findMany({ where: { parentId: { not: null } }, select: { id: true, name: true, slug: true } });
  const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]));
  const catBySlug = new Map(cats.map((c) => [c.slug.toLowerCase(), c.id]));

  // Kelompokkan baris per slug (produk).
  const groups = new Map<string, BulkRow[]>();
  for (const r of rows) {
    const slug = slugify(r.slug || r.name || "");
    if (!slug) { errors.push("Baris tanpa slug/nama dilewati."); continue; }
    (groups.get(slug) ?? groups.set(slug, []).get(slug)!).push(r);
  }

  const existing = await db.product.findMany({ where: { slug: { in: [...groups.keys()] } }, select: { slug: true } });
  const existingSlugs = new Set(existing.map((p) => p.slug));

  let created = 0, skipped = 0;
  for (const [slug, grp] of groups) {
    if (existingSlugs.has(slug)) { skipped++; errors.push(`Slug "${slug}" sudah ada — dilewati.`); continue; }
    try {
      const head = grp[0];
      const has2 = grp.some((r) => (r.opsi2 ?? "").trim() !== "");
      const weight = Math.max(1, Number(head.weight) || 200);
      const galleryFromCol = (head.images ?? "").split("|").map((s) => s.trim()).filter(Boolean);
      const firstOptImg = grp.find((r) => (r.foto_opsi1 ?? "").trim())?.foto_opsi1?.trim();
      const cover = (head.coverImage ?? "").trim() || firstOptImg || galleryFromCol[0];
      if (!cover) { skipped++; errors.push(`"${slug}": tak ada foto (coverImage/foto_opsi1) — dilewati.`); continue; }

      const categoryId = head.category
        ? (catByName.get(head.category.toLowerCase()) ?? catBySlug.get(head.category.toLowerCase()) ?? null)
        : null;

      // Varian dari tiap baris (lewati tanpa harga).
      const variants = grp
        .filter((r) => (r.harga ?? "").trim() !== "")
        .map((r) => {
          const o1 = (r.opsi1 ?? "").trim();
          const o2 = (r.opsi2 ?? "").trim();
          const color = has2 ? o1 : "";
          const type = has2 ? o2 : o1;
          return {
            name: [has2 ? color : type, has2 ? type : ""].filter(Boolean).join(" / ") || type || "Default",
            color, type,
            sku: (r.sku ?? "").trim() || skuify([slug, has2 ? color : "", type]),
            price: Math.max(0, Math.round(Number(r.harga) || 0)),
            stock: Math.max(0, Math.round(Number(r.stok) || 0)),
            weight,
            image: (r.foto_opsi1 ?? "").trim() || cover,
          };
        });
      if (!variants.length) { skipped++; errors.push(`"${slug}": tak ada varian berharga — dilewati.`); continue; }

      // SKU unik
      const skus = variants.map((v) => v.sku);
      if (new Set(skus).size !== skus.length)
        variants.forEach((v, i) => (v.sku = `${v.sku}-${i + 1}`));

      // variantGroups (nama variasi custom + opsi)
      const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];
      const g1vals = has2 ? uniq(grp.map((r) => (r.opsi1 ?? "").trim())) : uniq(grp.map((r) => (r.opsi1 ?? "").trim()));
      const groupsMeta = [
        { name: (head.variasi1 ?? "").trim() || (has2 ? "Warna" : "Tipe"), options: g1vals.map((v) => ({ value: v, desc: "" })) },
      ];
      if (has2) {
        const g2vals = uniq(grp.map((r) => (r.opsi2 ?? "").trim()));
        groupsMeta.push({ name: (head.variasi2 ?? "").trim() || "Tipe", options: g2vals.map((v) => ({ value: v, desc: "" })) });
      }

      const grosir = /^(1|true|ya|yes)$/i.test((head.isGrosir ?? "").trim());

      await db.product.create({
        data: {
          slug,
          name: (head.name ?? slug).trim(),
          description: (head.description ?? "").trim() || null,
          coverImage: cover,
          images: galleryFromCol,
          variantGroups: { groups: groupsMeta },
          categoryId,
          isGrosir: grosir,
          variants: { create: variants },
        },
      });
      created++;
    } catch (e) {
      skipped++;
      errors.push(`"${slug}": ${e instanceof Error ? e.message : "gagal"}`);
    }
  }

  revalidatePath("/admin/produk");
  revalidateStorefront();
  return { ok: created > 0, created, skipped, errors: errors.slice(0, 30) };
}

/* ============================ BANNER ============================ */

export async function saveBanner(input: BannerInput, id?: string): Promise<Result> {
  try {
    await requireAdmin();
    const data = bannerSchema.parse(input);
    const payload = {
      type: data.type,
      image: data.image,
      targetUrl: data.targetUrl || null,
      order: data.order,
      active: data.active,
    };
    // Snapshot gambar lama saat update (untuk hapus bila diganti).
    const oldImage = id ? (await db.banner.findUnique({ where: { id }, select: { image: true } }))?.image : null;
    const banner = id
      ? await db.banner.update({ where: { id }, data: payload })
      : await db.banner.create({ data: payload });
    revalidatePath("/admin/banner");
    revalidatePath("/");
    if (oldImage && oldImage !== data.image) await cleanupOrphanImages([oldImage]);
    return { ok: true, id: banner.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBanner(id: string): Promise<Result> {
  try {
    await requireAdmin();
    const before = await db.banner.findUnique({ where: { id }, select: { image: true } });
    await db.banner.delete({ where: { id } });
    revalidatePath("/admin/banner");
    revalidatePath("/");
    if (before?.image) await cleanupOrphanImages([before.image]);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ============================ DISKON ============================ */

export async function saveDiscount(input: DiscountInput, id?: string): Promise<Result> {
  try {
    await requireAdmin();
    const data = discountSchema.parse(input);
    const base = {
      name: data.name,
      percent: data.percent,
      active: data.active,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
    };
    const refs = data.variantIds.map((vid) => ({ id: vid }));
    const discount = id
      ? await db.discount.update({
          where: { id },
          data: { ...base, variants: { set: refs } },
        })
      : await db.discount.create({
          data: { ...base, variants: { connect: refs } },
        });
    revalidatePath("/admin/diskon");
    revalidateStorefront();
    return { ok: true, id: discount.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteDiscount(id: string): Promise<Result> {
  try {
    await requireAdmin();
    await db.discount.delete({ where: { id } });
    revalidatePath("/admin/diskon");
    revalidateStorefront();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ============================ VOUCHER ============================ */

export async function saveVoucher(input: VoucherInput, id?: string): Promise<Result> {
  try {
    await requireAdmin();
    const data = voucherSchema.parse(input);
    const payload = {
      code: data.code,
      type: data.type,
      amount: data.amount,
      minPurchase: data.minPurchase,
      maxBenefit: data.maxBenefit,
      active: data.active,
    };
    const voucher = id
      ? await db.voucher.update({ where: { id }, data: payload })
      : await db.voucher.create({ data: payload });
    revalidatePath("/admin/voucher");
    return { ok: true, id: voucher.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteVoucher(id: string): Promise<Result> {
  try {
    await requireAdmin();
    await db.voucher.delete({ where: { id } });
    revalidatePath("/admin/voucher");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ============================ PESANAN ============================ */

export async function updateOrder(input: OrderUpdateInput): Promise<Result> {
  try {
    await requireAdmin();
    const data = orderUpdateSchema.parse(input);
    const existing = await db.order.findUnique({
      where: { id: data.id },
      include: { items: true },
    });
    // Set shippedAt sekali saat pertama kali → SHIPPED (basis timer ajakan ulas)
    const toShipped = data.status === "SHIPPED" && existing?.status !== "SHIPPED";
    const updated = await db.order.update({
      where: { id: data.id },
      data: {
        status: data.status,
        trackingNo: data.trackingNo || null,
        ...(toShipped && !existing?.shippedAt ? { shippedAt: new Date() } : {}),
      },
    });
    revalidatePath("/admin/pesanan");
    revalidatePath("/akun/pesanan");

    const email = (updated.address as { email?: string } | null)?.email;

    // Email "sedang diproses" saat baru berubah ke PROCESSING
    if (data.status === "PROCESSING" && existing && existing.status !== "PROCESSING" && email) {
      try {
        await sendEmail({ to: email, ...orderProcessingEmail(updated, existing.items) });
      } catch (e) {
        console.error("Email diproses gagal:", e);
      }
    }

    // Email resi saat baru berubah ke SHIPPED (docs/08)
    if (toShipped && existing && email) {
      try {
        await sendEmail({ to: email, ...orderShippedEmail(updated, existing.items) });
      } catch (e) {
        console.error("Email resi gagal:", e);
      }
    }
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ===== Kategori (CRUD manual) =====
export async function saveCategory(input: CategoryInput, id?: string): Promise<Result> {
  try {
    await requireAdmin();
    const data = categorySchema.parse(input);
    const slug = slugify(data.slug || data.name);
    if (!slug) return { ok: false, error: "Nama/slug tidak valid." };

    // Slug harus unik (kecuali dirinya sendiri saat edit).
    const dup = await db.category.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
    if (dup) return { ok: false, error: `Slug "${slug}" sudah dipakai.` };

    const parentId = data.parentId || null;
    // Cegah kategori jadi anak dari dirinya sendiri.
    if (id && parentId === id) return { ok: false, error: "Kategori tak bisa jadi induk dirinya." };
    // Pohon maksimal 3 tingkat: induk boleh brand (L1) atau seri (L2), tak boleh L3.
    if (parentId) {
      const parent = await db.category.findUnique({
        where: { id: parentId },
        select: { parentId: true, parent: { select: { parentId: true } } },
      });
      if (!parent) return { ok: false, error: "Induk tidak ditemukan." };
      // parent sudah level-3 bila parent.parent.parentId ada → tak boleh nested lagi.
      if (parent.parentId && parent.parent?.parentId) {
        return { ok: false, error: "Maksimal 3 tingkat (Brand → Seri → Model)." };
      }
    }

    const payload = { name: data.name, slug, parentId, image: data.image || null, order: data.order };
    const oldImage = id ? (await db.category.findUnique({ where: { id }, select: { image: true } }))?.image : null;
    const cat = id
      ? await db.category.update({ where: { id }, data: payload })
      : await db.category.create({ data: payload });
    revalidatePath("/admin/kategori");
    revalidateStorefront();
    if (oldImage && oldImage !== (data.image || null)) await cleanupOrphanImages([oldImage]);
    return { ok: true, id: cat.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCategory(id: string): Promise<Result> {
  try {
    await requireAdmin();
    const cat = await db.category.findUnique({
      where: { id },
      select: { image: true, _count: { select: { children: true, products: true } } },
    });
    if (!cat) return { ok: false, error: "Kategori tidak ditemukan." };
    if (cat._count.children > 0) return { ok: false, error: "Masih punya sub-kategori. Hapus/pindahkan dulu." };
    if (cat._count.products > 0) return { ok: false, error: "Masih ada produk di kategori ini. Pindahkan dulu." };
    await db.category.delete({ where: { id } });
    revalidatePath("/admin/kategori");
    revalidateStorefront();
    if (cat.image) await cleanupOrphanImages([cat.image]);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ===== Menu / Link custom (CRUD) =====
export async function saveNavLink(input: NavLinkInput, id?: string): Promise<Result> {
  try {
    await requireAdmin();
    const data = navLinkSchema.parse(input);
    const payload = {
      label: data.label,
      url: data.kind === "MEGA" ? "#" : data.url,
      location: data.location,
      kind: data.kind,
      order: data.order,
      newTab: data.newTab,
      active: data.active,
    };
    const link = id
      ? await db.navLink.update({ where: { id }, data: payload })
      : await db.navLink.create({ data: payload });
    revalidatePath("/admin/menu");
    revalidateStorefront();
    return { ok: true, id: link.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteNavLink(id: string): Promise<Result> {
  try {
    await requireAdmin();
    await db.navLink.delete({ where: { id } });
    revalidatePath("/admin/menu");
    revalidateStorefront();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ===== Reorder (drag) =====
export async function reorderCategories(ids: string[]): Promise<Result> {
  try {
    await requireAdmin();
    await db.$transaction(ids.map((id, i) => db.category.update({ where: { id }, data: { order: i } })));
    revalidatePath("/admin/kategori");
    revalidateStorefront();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function reorderNavLinks(ids: string[]): Promise<Result> {
  try {
    await requireAdmin();
    await db.$transaction(ids.map((id, i) => db.navLink.update({ where: { id }, data: { order: i } })));
    revalidatePath("/admin/menu");
    revalidateStorefront();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ============================ ULASAN ============================ */

async function revalidateReview(productId: string) {
  const p = await db.product.findUnique({ where: { id: productId }, select: { slug: true } });
  if (p) revalidatePath(`/produk/${p.slug}`);
  revalidatePath("/admin/ulasan");
}

export async function saveReview(input: ReviewInput, id?: string): Promise<Result> {
  try {
    await requireAdmin();
    const data = reviewSchema.parse(input);
    const payload = {
      productId: data.productId,
      author: data.author,
      image: data.image || null,
      rating: data.rating,
      comment: data.comment,
      ...(data.createdAt ? { createdAt: new Date(data.createdAt) } : {}),
    };
    const oldImage = id ? (await db.review.findUnique({ where: { id }, select: { image: true } }))?.image : null;
    const review = id
      ? await db.review.update({ where: { id }, data: payload })
      : await db.review.create({ data: payload });
    await revalidateReview(data.productId);
    if (oldImage && oldImage !== (data.image || null)) await cleanupOrphanImages([oldImage]);
    return { ok: true, id: review.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteReview(id: string): Promise<Result> {
  try {
    await requireAdmin();
    const review = await db.review.delete({ where: { id } });
    await revalidateReview(review.productId);
    if (review.image) await cleanupOrphanImages([review.image]);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
