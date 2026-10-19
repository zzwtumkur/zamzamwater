import { db, error, requireAdmin } from "@/lib/server";
import { z } from "zod";

const customerSchema = z.object({
  original_phone: z.string().regex(/^[6-9]\d{9}$/),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  name: z.string().trim().min(2).max(100),
  pincode: z.string().regex(/^\d{6}$/).or(z.literal("")),
  address: z.string().trim().min(8).max(500),
  landmark: z.string().trim().max(150),
});

export async function GET() {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const { data, error: queryError } = await db()
    .from("orders")
    .select("phone,name,pincode,address,landmark,created_at,total")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (queryError) return error(queryError.message, 500);
  const customers = new Map<string, { phone:string;name:string;pincode:string;address:string;landmark:string;order_count:number;total_spent:number;last_order_at:string }>();
  for (const order of data || []) {
    const existing = customers.get(order.phone);
    if (existing) {
      existing.order_count += 1;
      existing.total_spent += Number(order.total);
    } else {
      customers.set(order.phone, {
        phone: order.phone,
        name: order.name,
        pincode: order.pincode || "",
        address: order.address,
        landmark: order.landmark || "",
        order_count: 1,
        total_spent: Number(order.total),
        last_order_at: order.created_at,
      });
    }
  }
  return Response.json([...customers.values()]);
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const parsed = customerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("Check the customer details");
  const customer = parsed.data;
  const client = db();
  if (customer.phone !== customer.original_phone) {
    const { data: duplicate, error: duplicateError } = await client.from("orders").select("id").eq("phone", customer.phone).limit(1);
    if (duplicateError) return error(duplicateError.message, 500);
    if (duplicate?.length) return error("Another customer already uses this mobile number", 409);
  }
  const { data: updated, error: updateError } = await client.from("orders").update({
    phone: customer.phone,
    name: customer.name,
    pincode: customer.pincode || null,
    address: customer.address,
    landmark: customer.landmark,
  }).eq("phone", customer.original_phone).select("id");
  if (updateError) return error(updateError.message, 500);
  if (!updated?.length) return error("Customer not found", 404);
  if (customer.phone !== customer.original_phone) {
    const { error: paymentError } = await client.from("customer_payment_requests").update({ phone: customer.phone }).eq("phone", customer.original_phone);
    if (paymentError) return error(`Customer orders updated, but payment records could not be updated: ${paymentError.message}`, 500);
  }
  return Response.json({ ok: true, updated_orders: updated.length });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const phone = String((await request.json().catch(() => null))?.phone || "").trim();
  if (!/^[6-9]\d{9}$/.test(phone)) return error("Invalid customer mobile number");
  const client = db();
  const { data: deleted, error: deleteError } = await client.from("orders").delete().eq("phone", phone).select("id");
  if (deleteError) return error(deleteError.message, 500);
  const { error: paymentError } = await client.from("customer_payment_requests").delete().eq("phone", phone);
  if (paymentError) return error(`Orders deleted, but payment records could not be deleted: ${paymentError.message}`, 500);
  if (!deleted?.length) return error("Customer not found", 404);
  return Response.json({ ok: true, deleted_orders: deleted.length });
}
