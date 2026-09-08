"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sendEmail, orderShippedEmail } from "@/lib/email";
import {
  productSchema,
  bannerSchema,
  discountSchema,
  voucherSchema,
  orderUpdateSchema,
  type ProductInput,
  type BannerInput,
  type DiscountInput,
  type VoucherInput,
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
        description: data.description || null,
        coverImage: data.coverImage,
        categoryId: data.categoryId || null,
        isGrosir: data.isGrosir,
        variants: {
          create: data.variants.map((v) => ({
            name: v.name,
            color: v.color,
            type: v.type,
            sku: v.sku,
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

    await db.$transaction([
      db.product.update({
        where: { id },
        data: {
          slug: data.slug,
          name: data.name,
          description: data.description || null,
          coverImage: data.coverImage,
          categoryId: data.categoryId || null,
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
              data: { name: v.name, color: v.color, type: v.type, sku: v.sku, price: v.price, stock: v.stock, weight: v.weight, image: v.image },
            })
          : db.variant.create({
              data: { productId: id, name: v.name, color: v.color, type: v.type, sku: v.sku, price: v.price, stock: v.stock, weight: v.weight, image: v.image },
            }),
      ),
    ]);
    revalidatePath("/admin/produk");
    revalidatePath(`/produk/${data.slug}`);
    revalidateStorefront();
    return { ok: true, id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProduct(id: string): Promise<Result> {
  try {
    await requireAdmin();
    await db.product.delete({ where: { id } });
    revalidatePath("/admin/produk");
    revalidateStorefront();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
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
    const banner = id
      ? await db.banner.update({ where: { id }, data: payload })
      : await db.banner.create({ data: payload });
    revalidatePath("/admin/banner");
    revalidatePath("/");
    return { ok: true, id: banner.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBanner(id: string): Promise<Result> {
  try {
    await requireAdmin();
    await db.banner.delete({ where: { id } });
    revalidatePath("/admin/banner");
    revalidatePath("/");
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
    const refs = data.productIds.map((pid) => ({ id: pid }));
    const discount = id
      ? await db.discount.update({
          where: { id },
          data: { ...base, products: { set: refs } },
        })
      : await db.discount.create({
          data: { ...base, products: { connect: refs } },
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
    const updated = await db.order.update({
      where: { id: data.id },
      data: { status: data.status, trackingNo: data.trackingNo || null },
    });
    revalidatePath("/admin/pesanan");

    // Email resi saat baru berubah ke SHIPPED (docs/08)
    if (data.status === "SHIPPED" && existing && existing.status !== "SHIPPED") {
      const email = (updated.address as { email?: string } | null)?.email;
      if (email) {
        try {
          const tpl = orderShippedEmail(updated, existing.items);
          await sendEmail({ to: email, ...tpl });
        } catch (e) {
          console.error("Email resi gagal:", e);
        }
      }
    }
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
