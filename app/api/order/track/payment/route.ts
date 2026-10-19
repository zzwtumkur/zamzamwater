import { db, error } from "@/lib/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const phone = String(body?.phone || "").trim();
  const requestId = String(body?.payment_request_id || "").trim();
  const reference = String(body?.transaction_reference || "").trim();
  if (!/^[6-9]\d{9}$/.test(phone))
    return error("Enter a valid 10-digit mobile number");
  if (!uuidPattern.test(requestId))
    return error("Invalid payment request");
  if (reference.length < 6 || reference.length > 100)
    return error("Enter the UPI transaction reference shown by your payment app");

  const { data, error: updateError } = await db()
    .from("customer_payment_requests")
    .update({ status: "customer_reported", transaction_reference: reference })
    .eq("id", requestId)
    .eq("phone", phone)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (updateError) {
    if (["42P01", "PGRST205"].includes(updateError.code))
      return error("Payment setup is incomplete. Contact the business administrator.", 503);
    return error("Could not submit payment confirmation", 500);
  }
  return data
    ? Response.json({ ok: true })
    : error("Payment request not found or already submitted; refresh and try again", 404);
}
