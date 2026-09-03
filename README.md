# Softoi Admin

Central internal admin & operations platform for Softoi — inventory, products,
offline POS, orders, and stall/event management.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · Prisma ·
PostgreSQL · Auth.js v5 (credentials login)

## Status

**All phases built.** Every module from the spec is implemented: Categories,
Products (with initial-stock creation), Inventory (Stock In / Out /
Adjustment / History / Low Stock), Orders, Customers, offline POS (cart,
checkout, payment), and Stalls & Events — all wired to the same central
Prisma schema, with every inventory change going through a transaction that
also writes a `StockMovement` row.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up your database**
   Create a Postgres database (e.g. on [Neon](https://neon.tech) or
   [Supabase](https://supabase.com)), then copy the env template:
   ```bash
   cp .env.local.example .env
   ```
   Fill in `DATABASE_URL` with your connection string, and generate a value
   for `AUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

3. **Generate the Prisma client and run the first migration**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
   This was not run in the build sandbox (no network access to Prisma's
   engine CDN there) — run it locally or in CI before first use.

4. **Seed the first admin login**
   ```bash
   npm run db:seed
   ```
   Creates an admin user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in
   your `.env` (defaults to `admin@softoi.shop` / `062618' net—
   change the password after first login).

5. **Run the dev server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` — you'll be redirected to `/login`.

## Deploying

Designed for Vercel + a hosted Postgres instance (Neon/Supabase). Set the
same env vars (`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`) in the Vercel
project settings, and run `prisma migrate deploy` as part of your deploy
step (or manually against the production database).

## Build order

All phases below are implemented:

1. ✅ Database, authentication, app layout & sidebar
2. ✅ Categories, Products (add/edit/details, initial stock on creation)
3. ✅ Inventory: Stock In / Out / Adjustment, Stock History, Low Stock
4. ✅ Orders, Customers
5. ✅ Offline POS (cart, checkout, payment recording, inventory deduction)
6. ✅ Stalls & Events (+ stall selection in POS)
7. ✅ Dashboard (live Prisma queries: inventory/sales summary, recent
   activity, low stock, quick actions)

## Known limitations to revisit

- **Sequential ID generation** (`SOF-0001`, `ORD-000001`, `STL-0001`) uses a
  simple count-based approach. Under concurrent writes this could theoretically
  collide against the unique constraint — fine for a single-till POS in V1,
  but worth moving to a DB sequence if usage grows.
- **Manual order creation** isn't a separate screen — Orders are created via
  POS (which already supports any payment method/channel) or will come from
  a future website integration. The Orders page lists, filters, views, and
  cancels orders from any channel.
- **Roles** (`Inventory Manager`, `Staff`, `Stall Manager`) exist in the
  schema but aren't yet enforced anywhere — everyone with a login currently
  has full Admin-level access, per the spec's "don't overcomplicate V1"
  guidance.
- No image upload — product images are a pasted URL field.

## Architecture notes

- **One central product/inventory system** — products are never duplicated
  per sales channel; the schema is built so a future website integration
  reads from the same `Product`/`StockMovement` tables.
- **Stock movements are an append-only ledger.** Every inventory change
  (stock in/out, adjustment, POS sale, order cancellation) must create a
  `StockMovement` row inside a DB transaction — this is enforced in
  application code, not deletable from the UI.
- **Order items snapshot product name/SKU** at time of sale, so historical
  orders stay accurate even if a product is later renamed or repriced.
- **Negative inventory is disallowed by default** (`Settings.allowNegativeStock`).
- Nothing with inventory history is hard-deleted — products, categories,
  and stalls use a `status` field (`ACTIVE` / `ARCHIVED`) instead.
