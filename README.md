# Zam Zam Water — Tumkur (Phase 1)

Responsive Next.js 15 + Supabase water ordering application, with customer ordering, location permission/manual address, delivery slots, new/refill bottles, server-calculated pricing, order confirmation, and protected owner dashboard.

## 1. Requirements
- Node.js 20.9+ (Node 22 or 24 recommended)
- A Supabase project

## 2. Database
In Supabase → SQL Editor → New query, paste and run `supabase/schema.sql` **once on a fresh project**. It creates tables, sample products and slots, RLS, and a transactional `place_order` function. The SQL is not an idempotent migration; do not rerun it after collecting orders.

For an existing project, do not rerun `schema.sql`. Apply only the migrations needed to bring that database up to date, in this order:
1. `supabase/migration_product_quantity_limits.sql`
2. `supabase/migration_time_pricing.sql`
3. `supabase/migration_service_pincodes.sql`
4. `supabase/migration_product_delete.sql`
5. `supabase/migration_unbounded_product_quantities.sql`
6. `supabase/migration_customer_payments.sql`

Run each required SQL file once in the Supabase SQL Editor. The final migration removes the old 50-bottle product/order limits for databases that already applied earlier migrations. Stock and order quantities are positive integers up to the PostgreSQL `int` limit (2,147,483,647).

## 3. Environment
Copy `.env.example` to `.env.local`. Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — service-role key from Supabase API settings; server only, **never** prefix `NEXT_PUBLIC_`
- `ADMIN_USERNAME` — owner username (default example `admin`)
- `ADMIN_PASSWORD` — choose a long, unique password
- `SESSION_SECRET` — random string at least 32 characters, e.g. `openssl rand -hex 32`

## 4. Run locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000` for customer website, `/order` to order and `/admin` to log in.

## 5. Deploy on Vercel
Push the project to a private GitHub repository, import it in Vercel, add the same environment variables in Project Settings, and deploy. Map your custom domain. Browser geolocation requires HTTPS (localhost is also supported).

## 6. Branding
The Zam Zam Water/Tumkur brand logo is in `public/logo.png`, with its matching browser icon in `public/favicon.png`. Footer links to https://cubixtop.com. WhatsApp floating button on all pages links to +91 70194 54218.

## Important launch notes
- Sample prices are illustrative. Confirm and edit in Admin → Products.
- Admin credentials live in server environment variables, **not client code**. Session uses a signed HttpOnly cookie.
- Public API has no direct access to the Supabase database; server-side RPC creates orders atomically and checks stock/slot capacity.
- Delivery status updates and order history are stored. This first phase does **not** send automatic SMS/WhatsApp, provide online UPI payments, or include a customer tracking lookup.
- The public order endpoint should have a WAF/rate-limit or CAPTCHA added before advertising QR codes widely, to reduce spam. Current starter does not implement provider-backed rate limiting.
- Current sample stock is decremented when orders are placed; rejection/cancellation does not automatically restock. Admin can adjust stock manually. For production use, add a stock-restoration transaction and inventory reconciliation policy.
- Owner login has no persistent brute-force lockout. Apply deployment-level rate limiting and preferably MFA before exposing it broadly.
- Delivery-slot capacity is checked at submission. Customer-facing dropdown does not pre-hide full slots; submission returns a clear error if full.
- Admin payment requests are manual UPI instructions, not payment processing. Run `migration_customer_payments.sql` (including again if it was already applied before customer payment reporting was added) on existing databases. Customers can report that they paid and provide a UPI transaction reference; the Payments tab polls for reports every 15 seconds while open. Admins must verify receipt in their UPI/bank account before marking a request paid. Customers see the 20 most recent requests on `/track` after entering their order mobile number. No automatic SMS, email, or WhatsApp notification is configured.
- Customer name, phone, and address are sensitive personal data. Publish a privacy notice, establish retention policy, and ensure backups.
- Dashboard sales card displays order value, not necessarily cash collected. No financial reconciliation is included in Phase 1.

## File map
- `app/page.tsx` — landing page
- `app/order/page.tsx` — customer ordering
- `app/admin/page.tsx` — admin login and dashboard
- `app/api/order/route.ts` — public catalog and transactional order creation
- `app/api/admin/*` — protected management endpoints
- `supabase/schema.sql` — PostgreSQL schema and order transaction
