import { db, error, requireAdmin } from "@/lib/server";

function productDatabaseError(code: string | undefined, message: string) {
  if (code === "42703" || code === "PGRST204")
    return error(
      "The products table is missing the quantity-limit columns. Run supabase/migration_product_quantity_limits.sql in Supabase, then reload this page.",
      409,
    );
  return error(message, 500);
}

export async function GET() {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const { data, error: e } = await db()
    .from("products")
    .select("id,litres,kind,price,stock,min_qty,max_qty,active")
    .order("litres");
  return e ? productDatabaseError(e.code, e.message) : Response.json(data);
}
export async function POST(req: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const x = await req.json().catch(() => null);
  if (!x || typeof x !== "object") return error("Invalid product details");
  const litres = Number(x.litres),
    price = Number(x.price),
    stock = Number(x.stock),
    minQty = Number(x.min_qty),
    maxQty = Number(x.max_qty);
  if (
    !Number.isInteger(litres) ||
    litres < 1 ||
    litres > 1000 ||
    !["new", "refill"].includes(x.kind) ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isInteger(stock) ||
    stock < 0 ||
    stock > 2147483647 ||
    !Number.isInteger(minQty) || minQty < 1 || minQty > 2147483647 ||
    !Number.isInteger(maxQty) || maxQty < minQty || maxQty > 2147483647
  )
    return error("Enter valid product details");
  const { data, error: e } = await db()
    .from("products")
    .insert({ litres, kind: x.kind, price, stock, min_qty: minQty, max_qty: maxQty, active: true })
    .select()
    .single();
  if (e?.code === "23505")
    return error("This bottle size and type already exists", 409);
  return e ? productDatabaseError(e.code, e.message) : Response.json(data, { status: 201 });
}
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const x = await req.json().catch(() => null);
  if (!x || typeof x !== "object") return error("Invalid product details");
  if (
    typeof x.id !== "string" ||
    !x.id.trim() ||
    !Number.isInteger(Number(x.litres)) ||
    Number(x.litres) < 1 ||
    Number(x.litres) > 1000 ||
    !["new", "refill"].includes(x.kind) ||
    !Number.isFinite(Number(x.price)) ||
    Number(x.price) < 0 ||
    !Number.isInteger(Number(x.stock)) ||
    Number(x.stock) < 0 || Number(x.stock) > 2147483647 ||
    !Number.isInteger(Number(x.min_qty)) || Number(x.min_qty) < 1 || Number(x.min_qty) > 2147483647 ||
    !Number.isInteger(Number(x.max_qty)) || Number(x.max_qty) < Number(x.min_qty) || Number(x.max_qty) > 2147483647 ||
    typeof x.active !== "boolean"
  )
    return error("Invalid product values");
  const { data, error: e } = await db()
    .from("products")
    .update({
      litres: Number(x.litres),
      kind: x.kind,
      price: Number(x.price),
      stock: Number(x.stock),
      min_qty: Number(x.min_qty),
      max_qty: Number(x.max_qty),
      active: !!x.active,
    })
    .eq("id", x.id)
    .select("id,litres,kind,price,stock,min_qty,max_qty,active")
    .maybeSingle();
  if (e?.code === "23505") return error("This bottle size and type already exists", 409);
  if (e) return productDatabaseError(e.code, e.message);
  return data ? Response.json(data) : error("Product not found; reload the product list and try again", 404);
}
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  const id = body && typeof body === "object" ? body.id : null;
  if (typeof id !== "string" || !id.trim()) return error("Product is required");
  const { data, error: e } = await db()
    .from("products")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (e?.code === "23503")
    return error("Run migration_product_delete.sql in Supabase once, then delete this bottle again", 409);
  if (e) return productDatabaseError(e.code, e.message);
  return data ? Response.json({ ok: true }) : error("Product not found; reload the product list and try again", 404);
}
