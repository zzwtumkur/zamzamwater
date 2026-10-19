import { db, error } from "@/lib/server";
import { z } from "zod";
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  pincode: z.string().regex(/^\d{6}$/),
  address: z.string().trim().min(8).max(500),
  landmark: z.string().max(150).optional().default(""),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        qty: z.number().int().min(1).max(2147483647),
      }),
    )
    .min(1)
    .max(6),
});
export async function GET() {
  const client = db();
  const [p, s, c, scheduled] = await Promise.all([
    client
      .from("products")
      .select("id,litres,kind,price,stock,min_qty,max_qty,active")
      .eq("active", true)
      .order("litres"),
    client.from("slots").select("*").eq("active", true).order("start_time"),
    client
      .from("settings")
      .select("business_phone,delivery_fee,min_order,service_area")
      .eq("id", 1)
      .single(),
    client
      .from("product_daily_prices")
      .select("product_id,price,start_time,end_time")
      .eq("active", true),
  ]);
  if (p.error || s.error || c.error)
    return error("Unable to load catalog", 500);
  const indiaTime = new Intl.DateTimeFormat("en-GB", { timeZone:"Asia/Kolkata", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).format(new Date());
  const prices = new Map<string, number>();
  if (!scheduled.error)
    for (const row of scheduled.data || [])
      if ((row.start_time < row.end_time && row.start_time.slice(0,5) <= indiaTime && row.end_time.slice(0,5) > indiaTime) || (row.start_time > row.end_time && (row.start_time.slice(0,5) <= indiaTime || row.end_time.slice(0,5) > indiaTime)))
        prices.set(row.product_id, Number(row.price));
  return Response.json({
    products: p.data.map((product) => ({
      ...product,
      price: prices.get(product.id) ?? Number(product.price),
      regular_price: Number(product.price),
      scheduled: prices.has(product.id),
    })),
    slots: s.data,
    settings: c.data,
  });
}
export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return error("Please check your order details");
  const x = parsed.data, client=db();
  const {data:area,error:areaError}=await client.from("service_pincodes").select("id").eq("pincode",x.pincode).eq("active",true).maybeSingle();
  if(areaError)return error("Delivery-area verification is unavailable",500);
  if(!area)return error("Sorry, delivery is not available for this pincode");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (x.date < today) return error("Select today or a future date");
  const ids = x.items.map((i) => i.product_id);
  if (new Set(ids).size !== ids.length) return error("Duplicate product lines");
  const { data, error: e } = await client.rpc("place_order", {
    p_name: x.name,
    p_phone: x.phone,
    p_address: x.address,
    p_landmark: x.landmark,
    p_lat: x.lat ?? null,
    p_lng: x.lng ?? null,
    p_date: x.date,
    p_slot_id: x.slot_id,
    p_items: x.items,
  });
  if (e) return error(e.message, 400);
  return Response.json(data, { status: 201 });
}
