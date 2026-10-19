import {
  db,
  error,
  requireAdmin,
  statuses,
  statusTransitions,
} from "@/lib/server";
export async function GET() {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const { data, error: e } = await db()
    .from("orders")
    .select("*,order_items(*)")
    .order("created_at", { ascending: false })
    .limit(500);
  return e ? error(e.message, 500) : Response.json(data);
}
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const { id, status } = await req.json();
  if (!id || !statuses.includes(status))
    return error("Invalid order or status");
  const client = db();
  const { data: before, error: be } = await client
    .from("orders")
    .select("status")
    .eq("id", id)
    .single();
  if (be) return error(be.message);
  if (before.status === status) return Response.json({ ok: true });
  if (!statusTransitions[before.status]?.includes(status))
    return error(
      `Cannot change an order from ${before.status.replaceAll("_", " ")} to ${status.replaceAll("_", " ")}`,
      409,
    );
  const changes: Record<string, string> = { status };
  if (status === "completed") changes.payment_status = "paid";
  const { data: updated, error: e } = await client
    .from("orders")
    .update(changes)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (e) return error(e.message);
  if (!updated) return error("Order not found; refresh the order list and try again", 404);
  const { error: eventError } = await client.from("order_events").insert({
    order_id: id,
    previous_status: before.status,
    new_status: status,
    actor: "admin",
  });
  if (eventError) return error(eventError.message, 500);
  return Response.json({ ok: true });
}
