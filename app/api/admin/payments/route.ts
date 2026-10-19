import { db, error, requireAdmin } from "@/lib/server";

const upiPattern = /^[A-Za-z0-9._-]{2,100}@[A-Za-z0-9.-]{2,64}$/;
const qrPattern = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const missingTableCodes = new Set(["42P01", "PGRST205"]);

function paymentTableError(code: string | undefined) {
  return code && missingTableCodes.has(code)
    ? error("Payment setup is incomplete. Run supabase/migration_customer_payments.sql in Supabase, then retry.", 503)
    : error("Unable to load payment requests", 500);
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const client = db();
  if (new URL(request.url).searchParams.get("summary") === "1") {
    const { count, error: countError } = await client
      .from("customer_payment_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "customer_reported");
    if (countError) return paymentTableError(countError.code);
    return Response.json({ reported_count: count || 0 });
  }
  const customerMap = new Map<string, { phone: string; name: string }>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error: customersError } = await client.from("orders")
      .select("phone,name")
      .order("created_at", { ascending: false })
      .range(offset, offset + 999);
    if (customersError) return error("Unable to load customer list", 500);
    for (const row of data || [])
      if (!customerMap.has(row.phone))
        customerMap.set(row.phone, { phone: row.phone, name: row.name });
    if (!data || data.length < 1000) break;
  }
  const { data: requests, error: requestsError } = await client.from("customer_payment_requests")
    .select("id,phone,amount,upi_id,transaction_reference,status,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (requestsError) return paymentTableError(requestsError.code);
  return Response.json({ customers: [...customerMap.values()], requests: requests || [] });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const body = await request.json().catch(() => null);
  const phone = String(body?.phone || "").trim();
  const amount = Number(body?.amount);
  const upiId = String(body?.upi_id || "").trim();
  const qrDataUrl = String(body?.qr_data_url || "");
  if (!/^[6-9]\d{9}$/.test(phone)) return error("Select a valid customer mobile number");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99)
    return error("Enter a valid payment amount");
  if (!upiPattern.test(upiId)) return error("Enter a valid UPI ID");
  if (!qrPattern.test(qrDataUrl) || qrDataUrl.length > 360_000)
    return error("Choose a valid PNG, JPEG, or WebP QR image no larger than 256 KB");

  const client = db();
  const { data: customer, error: customerError } = await client
    .from("orders")
    .select("phone")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();
  if (customerError) return error("Unable to verify this customer", 500);
  if (!customer) return error("No customer found for that mobile number", 404);

  const { data, error: insertError } = await client
    .from("customer_payment_requests")
    .insert({ phone, amount, upi_id: upiId, qr_data_url: qrDataUrl })
    .select("id,phone,amount,upi_id,status,created_at")
    .single();
  if (insertError) return paymentTableError(insertError.code);
  return Response.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return error("Unauthorized", 401);
  const body = await request.json().catch(() => null);
  if (
    typeof body?.id !== "string" ||
    !body.id.trim() ||
    !["paid", "pending", "cancelled"].includes(body.status)
  )
    return error("Invalid payment status update");
  const allowedCurrentStatuses = body.status === "paid"
    ? ["pending", "customer_reported"]
    : body.status === "pending"
      ? ["customer_reported"]
      : ["pending", "customer_reported"];
  const { data, error: updateError } = await db()
    .from("customer_payment_requests")
    .update({
      status: body.status,
      ...(body.status === "pending" ? { transaction_reference: null } : {}),
    })
    .eq("id", body.id)
    .in("status", allowedCurrentStatuses)
    .select("id")
    .maybeSingle();
  if (updateError) return paymentTableError(updateError.code);
  return data
    ? Response.json({ ok: true })
    : error("Payment request is no longer awaiting review; refresh and try again", 404);
}
