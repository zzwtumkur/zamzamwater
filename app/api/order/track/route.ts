import { db, error } from "@/lib/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const phone = String(body?.phone || "").trim();
  if (!/^[6-9][0-9]{9}$/.test(phone)) return error("Enter a valid 10-digit mobile number");
  const client = db();
  const [{ data: orders, error: ordersError }, { data: paymentRequests, error: paymentsError }] = await Promise.all([
    client.from("orders")
    .select("order_number,name,delivery_date,total,status,payment_status,created_at,slots(label),order_items(litres,kind,qty,line_total),order_events(previous_status,new_status,created_at)")
    .eq("phone", phone).order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "order_events", ascending: true }),
    client.from("customer_payment_requests")
      .select("id,amount,upi_id,qr_data_url,transaction_reference,status,created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (ordersError) return error("Unable to load orders", 500);
  if (paymentsError) {
    if (["42P01", "PGRST205"].includes(paymentsError.code))
      return error("Payment setup is incomplete. Run supabase/migration_customer_payments.sql in Supabase, then refresh.", 503);
    return error("Unable to load payment details", 500);
  }
  return Response.json({ orders: orders || [], payment_requests: paymentRequests || [] });
}
