import { db, error, requireAdmin } from "@/lib/server";
function time(value: unknown) {
  const match = String(value ?? "").match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  return match ? `${match[1]}:${match[2]}` : null;
}
export async function GET() {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const { data, error: e } = await db()
    .from("slots")
    .select("*")
    .order("start_time");
  return e ? error(e.message, 500) : Response.json(data);
}
export async function POST(req: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const x = await req.json();
  const capacity = Number(x.capacity), startTime = time(x.start_time), endTime = time(x.end_time);
  if (
    !x.label?.trim() ||
    !startTime ||
    !endTime ||
    startTime >= endTime ||
    !Number.isInteger(capacity) ||
    capacity < 0
  )
    return error("Enter valid slot details");
  const { data, error: e } = await db()
    .from("slots")
    .insert({
      label: x.label.trim(),
      start_time: startTime,
      end_time: endTime,
      capacity,
      active: true,
    })
    .select()
    .single();
  if (e?.code === "23505")
    return error("A slot with this label already exists", 409);
  return e ? error(e.message, 500) : Response.json(data, { status: 201 });
}
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const x = await req.json().catch(() => null);
  if (!x || typeof x !== "object") return error("Invalid slot details");
  const capacity = Number(x.capacity), startTime = time(x.start_time), endTime = time(x.end_time);
  if (
    typeof x.id !== "string" ||
    !x.id.trim() ||
    !x.label?.trim() ||
    !startTime ||
    !endTime ||
    startTime >= endTime ||
    !Number.isInteger(capacity) ||
    capacity < 0 ||
    typeof x.active !== "boolean"
  )
    return error("Invalid slot details");
  const { data, error: e } = await db()
    .from("slots")
    .update({
      label: x.label.trim(),
      start_time: startTime,
      end_time: endTime,
      capacity,
      active: !!x.active,
    })
    .eq("id", x.id)
    .select("id")
    .maybeSingle();
  if (e) return error(e.message, 500);
  return data ? Response.json({ ok: true }) : error("Delivery slot not found; reload and try again", 404);
}
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const body = await req.json().catch(() => null);
  const id = body && typeof body === "object" ? body.id : null;
  if (typeof id !== "string" || !id.trim()) return error("Slot is required");
  const client = db();
  const { count, error: countError } = await client
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("slot_id", id);
  if (countError) return error(countError.message, 500);
  if (count)
    return error(
      "This slot has order history. Disable it instead of deleting it.",
      409,
    );
  const { data, error: e } = await client
    .from("slots")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (e) return error(e.message, 500);
  return data ? Response.json({ ok: true }) : error("Delivery slot not found; reload and try again", 404);
}
