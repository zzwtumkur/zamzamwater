import { db, error, requireAdmin } from "@/lib/server";

function normalizeTime(value: unknown) {
  const match = String(value ?? "").trim().match(/^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  if (hour > 23) return null;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}
function minutes(time: string) { const [hour, minute] = time.split(":").map(Number); return hour * 60 + minute; }
function ranges(start: string, end: string) {
  const from = minutes(start), to = minutes(end);
  return from < to ? [[from, to]] : [[from, 1440], [0, to]];
}
function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return ranges(startA, endA).some(a => ranges(startB, endB).some(b => a[0] < b[1] && a[1] > b[0]));
}

export async function GET() {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const { data, error: e } = await db().from("product_daily_prices").select("*,products(litres,kind)").order("start_time");
  return e ? error(e.message, 500) : Response.json(data);
}
export async function POST(req: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const x = await req.json().catch(() => ({}));
  const price = Number(x.price), startTime = normalizeTime(x.start_time), endTime = normalizeTime(x.end_time);
  if (!String(x.product_id || "").trim()) return error("Please select a product");
  if (!Number.isFinite(price) || price < 0) return error("Enter a valid price");
  if (!startTime) return error("Select a valid from time");
  if (!endTime) return error("Select a valid to time");
  if (minutes(startTime) === minutes(endTime)) return error("From time and to time cannot be the same");
  const { data: existing, error: lookupError } = await db().from("product_daily_prices").select("id,start_time,end_time").eq("product_id", x.product_id).eq("active", true);
  if (lookupError) return error(lookupError.message, 500);
  if (existing?.some(s => overlaps(startTime, endTime, s.start_time.slice(0,5), s.end_time.slice(0,5)))) return error("This time overlaps another price for the product", 409);
  const { data, error: e } = await db().from("product_daily_prices").insert({ product_id:x.product_id, price, start_time:startTime, end_time:endTime, active:true }).select().single();
  return e ? error(e.message, 500) : Response.json(data, { status:201 });
}
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const x = await req.json().catch(() => ({}));
  const price = Number(x.price), startTime = normalizeTime(x.start_time), endTime = normalizeTime(x.end_time);
  if (typeof x.id !== "string" || !x.id.trim() || !Number.isFinite(price) || price < 0 || !startTime || !endTime || minutes(startTime) === minutes(endTime) || typeof x.active !== "boolean") return error("Invalid daily price details");
  const { data, error: e } = await db().from("product_daily_prices").update({ price, start_time:startTime, end_time:endTime, active:x.active }).eq("id", x.id).select("id").maybeSingle();
  if (e) return error(e.message, 500);
  return data ? Response.json({ ok:true }) : error("Price schedule not found; reload and try again", 404);
}
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  const id = body && typeof body === "object" ? body.id : null;
  if (typeof id !== "string" || !id.trim()) return error("Price schedule is required");
  const { data, error: e } = await db().from("product_daily_prices").delete().eq("id", id).select("id").maybeSingle();
  if (e) return error(e.message, 500);
  return data ? Response.json({ ok:true }) : error("Price schedule not found; reload and try again", 404);
}
