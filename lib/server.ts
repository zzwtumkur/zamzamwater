import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw Error("Configure Supabase environment variables");
  if (key.split(".").length === 3) {
    try {
      const role = JSON.parse(
        Buffer.from(key.split(".")[1], "base64url").toString(),
      ).role;
      if (role !== "service_role")
        throw Error(
          "SUPABASE_SERVICE_ROLE_KEY contains an anon key; add the service_role or secret key",
        );
    } catch (e) {
      if (e instanceof Error && e.message.includes("anon key")) throw e;
    }
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32)
    throw Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(s);
}
export async function createSession() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}
export async function isAdmin() {
  try {
    const token = (await cookies()).get("zamzam_session")?.value;
    if (!token) return false;
    const { payload } = await jwtVerify(token, secret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}
export function error(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
export async function requireAdmin() {
  return await isAdmin();
}
export const statuses = [
  "new",
  "accepted",
  "preparing",
  "out_for_delivery",
  "delivered",
  "completed",
  "rejected",
  "cancelled",
  "delivery_failed",
  "rescheduled",
];
export const statusTransitions: Record<string, string[]> = {
  new: ["accepted", "rejected", "cancelled"],
  accepted: ["preparing", "rejected", "cancelled", "rescheduled"],
  preparing: ["out_for_delivery", "cancelled", "rescheduled"],
  out_for_delivery: ["delivered", "delivery_failed", "rescheduled"],
  delivered: ["completed"],
  delivery_failed: ["rescheduled", "cancelled"],
  rescheduled: ["accepted", "preparing", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
};
