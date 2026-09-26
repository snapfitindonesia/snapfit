# 03 — Database (Prisma)

DB: SQLite di dev lokal → Postgres/Supabase di produksi. Ganti cukup di `datasource`.
Gambar TIDAK disimpan di DB — hanya URL-nya (file fisik di CDN, lihat `07-deployment-dns.md`).

## Entitas inti

- **Product** — foto cover di level produk; punya banyak Variant.
- **Variant** — tiap varian punya **1 foto sendiri**, harga, stok, SKU.
- **Category / DeviceType** — untuk filter "tipe HP" (UX kritis).
- **Banner** — dikelola admin: tipe `MAIN` / `ETALASE` / `PROMO`, target link.
- **Discount** — diskon massal: pilih beberapa produk, set persen berbeda.
- **Voucher** — potongan / gratis ongkir, dengan min. pembelian & max benefit.
- **Order** + **OrderItem** — pesanan & itemnya, status, snapshot harga.
- **User** — dikelola Supabase Auth (jangan simpan password sendiri).

## Sketsa schema (acuan, sesuaikan saat ngoding)

```prisma
model Product {
  id          String     @id @default(cuid())
  slug        String     @unique
  name        String
  description String?
  coverImage  String              // URL cover (level produk)
  categoryId  String?
  category    Category?  @relation(fields: [categoryId], references: [id])
  variants    Variant[]
  createdAt   DateTime   @default(now())
}

model Variant {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id])
  name      String              // mis. "Hitam / iPhone 16 Pro"
  sku       String  @unique
  price     Int                 // rupiah, integer
  stock     Int     @default(0)
  image     String              // 1 foto per varian
}

model Category {
  id       String    @id @default(cuid())
  name     String
  slug     String    @unique
  products Product[]
}

model Banner {
  id        String   @id @default(cuid())
  type      String            // MAIN | ETALASE | PROMO
  image     String
  targetUrl String?
  order     Int      @default(0)
  active    Boolean  @default(true)
}

model Discount {
  id         String   @id @default(cuid())
  name       String
  percent    Int               // persen diskon
  productIds String[]          // produk yang kena (Postgres array)
  active     Boolean  @default(true)
  startAt    DateTime?
  endAt      DateTime?
}

model Voucher {
  id           String   @id @default(cuid())
  code         String   @unique
  type         String            // POTONGAN | GRATIS_ONGKIR
  amount       Int      @default(0)
  minPurchase  Int      @default(0)
  maxBenefit   Int      @default(0)
  active       Boolean  @default(true)
}

model Order {
  id           String      @id @default(cuid())
  userId       String?
  status       String      @default("PENDING") // PENDING|PAID|SHIPPED|DONE|CANCELLED
  items        OrderItem[]
  subtotal     Int
  shippingCost Int
  discount     Int         @default(0)
  total        Int
  // pembayaran
  midtransOrderId String?  @unique
  paymentStatus   String?
  // pengiriman
  courier      String?
  trackingNo   String?
  address      Json
  createdAt    DateTime    @default(now())
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id])
  variantId String
  name      String            // snapshot nama saat beli
  price     Int               // snapshot harga saat beli
  qty       Int
}
```

## Catatan penting

- **Harga selalu integer (rupiah)** — jangan float, hindari error pembulatan.
- **Snapshot harga/nama di OrderItem** — biar riwayat order tidak berubah kalau produk diedit.
- **Stok di level varian**, bukan produk.
- Migrasi SQLite→Postgres: `String[]` (array) hanya jalan di Postgres — di SQLite pakai
  tabel relasi atau JSON. Rencanakan sejak awal kalau mau pakai array.
