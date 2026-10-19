"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
type Product = {
  id: string;
  litres: number;
  kind: string;
  price: number;
  stock: number;
  min_qty: number;
  max_qty: number;
};
type Slot = { id: string; label: string; start_time: string };
type PricingWindow = { product_id: string; price: number; start_time: string; end_time: string };
type Catalog = {
  products: Product[];
  slots: Slot[];
  pricing_windows: PricingWindow[];
  quarter_hour_schedule_ready: boolean;
  settings: { delivery_fee: number; min_order: number; business_phone: string };
};
const orderSteps = ["Mobile", "Pincode", "Details", "Delivery", "Bottle", "Quantity", "Review"];
function indiaDateParts(timestamp: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function slotIsUpcoming(date: string, startTime: string, now = Date.now()) {
  if (!date || !startTime) return false;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = startTime.slice(0, 5).split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return false;
  const slotTimestamp = Date.UTC(year, month - 1, day, hour, minute) - 330 * 60 * 1000;
  return slotTimestamp > now;
}

function timeIsInWindow(time: string, window: PricingWindow) {
  const selected = time.slice(0, 5);
  const start = window.start_time.slice(0, 5);
  const end = window.end_time.slice(0, 5);
  return start < end
    ? selected >= start && selected < end
    : selected >= start || selected < end;
}

export default function Order() {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [step, setStep] = useState(1),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState<{ order_number: string; total: number } | null>(
      null,
    ),
    [kind, setKind] = useState("refill"),
    [qty, setQty] = useState<Record<string, number>>({}),
    [gps, setGps] = useState<{ lat: number; lng: number } | null>(null),
    [locStatus, setLocStatus] = useState(""),
    [areaChecked, setAreaChecked] = useState(false),
    [areaMessage, setAreaMessage] = useState(""),
    [hasOrderHistory, setHasOrderHistory] = useState(false),
    [customerStatus, setCustomerStatus] = useState(""),
    [customerResolved, setCustomerResolved] = useState(false),
    [customerLookupBusy, setCustomerLookupBusy] = useState(false),
    [currentTime, setCurrentTime] = useState(() => Date.now());
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    landmark: "",
    pincode: "",
    date: "",
    slot_id: "",
  });
  useEffect(() => {
    fetch("/api/order")
      .then((r) => r.json())
      .then((x) => {
        if (x.error) throw Error(x.error);
        setCatalog(x);
      })
      .catch((e) => setErr(e.message));
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    const requestedStep = Number(url.searchParams.get("step"));
    if (requestedStep > 1 || requestedStep < 1 || requestedStep > 7) {
      url.searchParams.set("step", "1");
      window.history.replaceState({ orderStep: 1 }, "", url);
    } else if (!url.searchParams.has("step")) {
      url.searchParams.set("step", "1");
      window.history.replaceState({ orderStep: 1 }, "", url);
    }

    function syncStepFromHistory() {
      const historyStep = Number(new URLSearchParams(window.location.search).get("step"));
      setStep(Number.isInteger(historyStep) && historyStep >= 1 && historyStep <= 7 ? historyStep : 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    window.addEventListener("popstate", syncStepFromHistory);
    return () => window.removeEventListener("popstate", syncStepFromHistory);
  }, []);

  function goToStep(nextStep: number) {
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(nextStep));
    window.history.pushState({ orderStep: nextStep }, "", url);
    setStep(nextStep);
    setErr("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function continueToStep(nextStep: number) {
    const orderForm = document.getElementById("order-form") as HTMLFormElement | null;
    if (orderForm && !orderForm.reportValidity()) return;
    goToStep(nextStep);
  }
  const selectedSlot = catalog?.slots.find((slot) => slot.id === form.slot_id);
  const products = (catalog?.products.filter((p) => p.kind === kind) || []).map((product) => {
    const scheduledPrice = selectedSlot
      ? catalog?.pricing_windows.find((window) =>
          window.product_id === product.id && timeIsInWindow(selectedSlot.start_time, window),
        )
      : undefined;
    return {
      ...product,
      regular_price: product.price,
      price: scheduledPrice?.price ?? product.price,
      has_slot_price: scheduledPrice !== undefined,
    };
  });
  const selectedSlotPriceChanges = selectedSlot
    ? (catalog?.products || []).flatMap((product) => {
        const window = catalog?.pricing_windows.find((priceWindow) =>
          priceWindow.product_id === product.id && timeIsInWindow(selectedSlot.start_time, priceWindow),
        );
        return window && window.price !== product.price
          ? [{ ...product, slot_price: window.price }]
          : [];
      })
    : [];
  const items = products
    .filter((p) => (qty[p.id] || 0) > 0)
    .map((p) => ({ product_id: p.id, qty: qty[p.id] }));
  const subtotal = products.reduce((n, p) => n + (qty[p.id] || 0) * p.price, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.qty, 0);
  const total = subtotal + Number(catalog?.settings.delivery_fee || 0);
  const todayParts = indiaDateParts(currentTime);
  const minDate = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
  const maxDate = new Date(Date.UTC(
    Number(todayParts.year),
    Number(todayParts.month) - 1,
    Number(todayParts.day) + 30,
  )).toISOString().slice(0, 10);
  const eligibleSlots = catalog?.slots.filter((slot) =>
    slotIsUpcoming(form.date, slot.start_time, currentTime),
  ) || [];
  const selectedSlotIsUpcoming = eligibleSlots.some((slot) => slot.id === form.slot_id);
  async function checkPincode(pincode = form.pincode) {
    setAreaChecked(false); setAreaMessage("Checking delivery availability...");
    try {
      const r = await fetch("/api/service-area", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({pincode}) });
      const x = await r.json(); if (!r.ok) throw Error(x.error || "Could not check pincode");
      setAreaChecked(!!x.available); setAreaMessage(x.available ? `✓ Delivery available in ${x.area_name || pincode}` : "Sorry, we cannot deliver to this pincode yet.");
    } catch(e) { setAreaMessage(e instanceof Error ? e.message : "Could not check pincode"); }
  }
  function location() {
    if (!navigator.geolocation) {
      setLocStatus("Location unavailable. Enter address manually.");
      return;
    }
    setLocStatus("Finding location...");
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        setGps({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocStatus("Location captured. Detecting pincode...");
        try {
          const r=await fetch(`/api/location?lat=${p.coords.latitude}&lng=${p.coords.longitude}`); const x=await r.json();
          if(!r.ok||!x.pincode) throw Error("Pincode was not found from this location");
          setForm(f=>({...f,pincode:x.pincode,address:f.address||x.address||""})); setLocStatus(`Detected pincode ${x.pincode}`); await checkPincode(x.pincode);
        } catch(e){setLocStatus(e instanceof Error?`${e.message}. Enter it manually.`:"Enter pincode manually.")}
      },
      () => setLocStatus("Location not shared. Enter your address manually."),
      { timeout: 10000, enableHighAccuracy: true },
    );
  }
  async function findCustomer(){
    if (!/^[6-9]\d{9}$/.test(form.phone)) {
      setCustomerStatus("Enter a valid 10-digit mobile number to continue.");
      return;
    }
    setCustomerLookupBusy(true);
    setCustomerResolved(false);
    setCustomerStatus("Checking your mobile number...");
    setHasOrderHistory(false);
    try {
      const r = await fetch("/api/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone }),
      });
      const x = await r.json();
      if (!r.ok) throw Error(x.error || "Could not check this mobile number");

      setCustomerResolved(true);
      if (!x.existing || !x.customer) {
        setCustomerStatus("New customer. Continue and enter your delivery details.");
        goToStep(2);
        return;
      }

      setForm((current) => ({
        ...current,
        name: x.customer.name || "",
        address: x.customer.address || "",
        landmark: x.customer.landmark || "",
        pincode: x.customer.pincode || "",
      }));
      setGps(x.customer.latitude && x.customer.longitude
        ? { lat: x.customer.latitude, lng: x.customer.longitude }
        : null);
      setHasOrderHistory(!!x.has_orders);
      setCustomerStatus("Welcome back! Your saved details are ready to review.");
      goToStep(2);
    } catch (e) {
      setCustomerStatus(e instanceof Error ? e.message : "Could not check this mobile number");
    } finally {
      setCustomerLookupBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!items.length) return setErr("Select at least one bottle.");
    if (subtotal < Number(catalog?.settings.min_order || 0))
      return setErr("Minimum order not met.");
    setBusy(true);
    try {
      const r = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lat: gps?.lat ?? null,
          lng: gps?.lng ?? null,
          items,
        }),
      });
      const x = await r.json();
      if (!r.ok) throw Error(x.error || "Order failed");
      setDone(x);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not place order");
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="container narrow">
        <div className="panel" style={{ textAlign: "center", padding: 45 }}>
          <h1>✅ Order Received!</h1>
          <p>Thank you for choosing Zam Zam Water.</p>
          <h2>{done.order_number}</h2>
          <p>
            Your order total: <strong>₹{done.total}</strong>
          </p>
          <p>
            Your requested delivery: <strong>{form.date}</strong> ·{" "}
            {catalog?.slots.find((s) => s.id === form.slot_id)?.label}
          </p>
          <p className="muted">
            Track this and all past orders using only your mobile number.
          </p>
          <Link className="btn" href="/track">
            Track My Order
          </Link>{" "}
          <a
            className="btn secondary"
            href="https://wa.me/917019454218"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact Us
          </a>
        </div>
      </div>
    );
  return (
    <div className="container order-shell">
      {err && <div className="error">{err}</div>}
      {!catalog ? (
        <div className="panel">Loading products and delivery slots...</div>
      ) : (
        <>
        <nav className="order-progress" aria-label="Order progress">
          <div className="order-progress-heading">
            <span>Step {step} of 7</span>
            <strong>{orderSteps[step - 1]}</strong>
          </div>
          <div
            className="order-progress-track"
            role="progressbar"
            aria-label="Order completion"
            aria-valuemin={1}
            aria-valuemax={7}
            aria-valuenow={step}
          >
            <span style={{ width: `${(step / 7) * 100}%` }} />
          </div>
          <ol className="order-progress-labels" aria-hidden="true">
            {orderSteps.map((title, index) => (
              <li key={title} className={index + 1 === step ? "current" : index + 1 < step ? "complete" : ""}>
                {title}
              </li>
            ))}
          </ol>
        </nav>
        <form id="order-form" onSubmit={submit}>
          <div className="order-step-screen" key={step}>
          {step === 1 && <section id="mobile-check" className="panel service-check">
            <h2>1. Start with your mobile number</h2>
            <p className="muted">We’ll find your saved details, or help you enter them if you’re new.</p>
            <div className="phone-lookup">
              <div className="field">
                <label>10-digit Mobile Number</label>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  pattern="[6-9][0-9]{9}"
                  placeholder="Enter mobile number"
                  value={form.phone}
                  maxLength={10}
                  disabled={customerLookupBusy}
                  onChange={(e) => {
                    const phone = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setForm((current) => ({
                      ...current,
                      phone,
                      name: phone === current.phone ? current.name : "",
                      address: phone === current.phone ? current.address : "",
                      landmark: phone === current.phone ? current.landmark : "",
                    }));
                    if (phone !== form.phone) {
                      setCustomerResolved(false);
                      setHasOrderHistory(false);
                      setCustomerStatus("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void findCustomer();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => void findCustomer()}
                disabled={form.phone.length !== 10 || customerLookupBusy}
              >
                {customerLookupBusy ? "Checking..." : "Continue"}
              </button>
            </div>
            {customerStatus && (
              <p className={customerResolved ? "notice" : "muted"} role="status">
                {customerStatus}
              </p>
            )}
          </section>}
          {customerResolved && step === 2 && <section id="pincode-check" className="panel service-check">
            <h2>2. Check Delivery Pincode</h2>
            <p className="muted">Confirm service availability before entering your order.</p>
            {customerStatus && <p className={customerResolved ? "notice" : "muted"} role="status">{customerStatus}</p>}
            {hasOrderHistory && (
              <Link
                className="btn secondary recent-orders-link"
                href={`/track?phone=${encodeURIComponent(form.phone)}`}
              >
                View full order history →
              </Link>
            )}
            <div className="pincode-check"><div className="field"><label>6-digit Pincode</label><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={form.pincode} onChange={e=>{setForm({...form,pincode:e.target.value.replace(/\D/g,"").slice(0,6)});setAreaChecked(false);setAreaMessage("")}}/></div><button type="button" onClick={()=>checkPincode()} disabled={form.pincode.length!==6}>Check Availability</button></div>
            <button type="button" className="secondary" onClick={location}>
              📍 Detect Pincode From My Location
            </button>
            {locStatus && <p className="muted">{locStatus}</p>}
            {areaMessage&&<div className={areaChecked?"notice":"error"}>{areaMessage}</div>}
            <div className="wizard-actions">
              <button type="button" className="secondary" onClick={() => goToStep(1)}>Back</button>
              {areaChecked && <button type="button" onClick={() => goToStep(3)}>Continue to details</button>}
            </div>
          </section>}
          {customerResolved && areaChecked && step === 3 && <section className="panel">
            <h2>3. Your Details</h2>
            <div className="field">
              <label>Full Name *</label>
              <input
                required
                minLength={2}
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Full Delivery Address *</label>
              <textarea
                required
                minLength={8}
                maxLength={500}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Landmark (optional)</label>
              <input
                maxLength={150}
                value={form.landmark}
                onChange={(e) => setForm({ ...form, landmark: e.target.value })}
              />
            </div>
            <div className="wizard-actions">
              <button type="button" className="secondary" onClick={() => goToStep(2)}>Back</button>
              <button type="button" onClick={() => continueToStep(4)}>Continue to delivery</button>
            </div>
          </section>}
          {customerResolved && areaChecked && step === 4 && <section className="panel">
            <h2>4. Select Delivery Time</h2>
            {!catalog.quarter_hour_schedule_ready ? (
              <p className="error" role="status">
                The 15-minute delivery schedule is not set up yet. Please contact the business to complete your order.
              </p>
            ) : <>
            <div className="grid">
              <div className="field">
                <label>Delivery Date *</label>
                <input
                  required
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value, slot_id: "" })}
                />
              </div>
              <div className="field">
                <label>Preferred Time Slot *</label>
                <select
                  required
                  value={form.slot_id}
                  onChange={(e) =>
                    setForm({ ...form, slot_id: e.target.value })
                  }
                >
                  <option value="">{form.date ? "Choose available time" : "Choose a date first"}</option>
                  {eligibleSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="muted">
              Times are shown in IST. Every upcoming 15-minute slot is available across the full day and night.
            </p>
            {selectedSlot && selectedSlotPriceChanges.length > 0 && (
              <div className="notice" role="status">
                <strong>Prices for {selectedSlot.label}:</strong>{" "}
                {selectedSlotPriceChanges.map((product, index) => (
                  <span key={product.id}>
                    {index > 0 ? " · " : ""}
                    {product.litres}L {product.kind}: ₹{product.slot_price}
                    {" "}<small>(regular ₹{product.price})</small>
                  </span>
                ))}
              </div>
            )}
            {form.date && eligibleSlots.length === 0 && (
              <p className="error" role="status">No upcoming delivery slots remain on this date. Choose a later date.</p>
            )}
            </>}
            <div className="wizard-actions">
              <button type="button" className="secondary" onClick={() => goToStep(3)}>Back</button>
              <button type="button" disabled={!catalog.quarter_hour_schedule_ready || !selectedSlotIsUpcoming} onClick={() => continueToStep(5)}>Continue to bottle type</button>
            </div>
          </section>}
          {customerResolved && areaChecked && step === 5 && <section className="panel">
            <h2>5. Bottle Type</h2>
            <div className="grid">
              {[
                ["refill", "Old Bottle / Refill"],
                ["new", "New Bottle"],
              ].map(([k, title]) => (
                <label
                  key={k}
                  className={"choice " + (kind === k ? "selected" : "")}
                >
                  <span>{title}</span>
                  <input
                    type="radio"
                    name="kind"
                    checked={kind === k}
                    onChange={() => {
                      setKind(k);
                      setQty({});
                    }}
                  />
                </label>
              ))}
            </div>
            <div className="wizard-actions">
              <button type="button" className="secondary" onClick={() => goToStep(4)}>Back</button>
              <button type="button" onClick={() => goToStep(6)}>Continue to quantity</button>
            </div>
          </section>}
          {customerResolved && areaChecked && step === 6 && <section className="panel">
            <h2>6. Choose Size & Quantity</h2>
            {products.map((p) => (
              <div className="product product-card" key={p.id}>
                <img
                  src="/products/zamzam-bottle.png"
                  alt={`Zam Zam Water ${p.litres} litre bottle`}
                />
                <div>
                  <small>ZAM ZAM WATER</small>
                  <strong>{p.litres} Litres</strong>
                  <p className="muted">
                    {p.has_slot_price ? (
                      <><strong>₹{p.price}</strong> selected-slot price · <s>₹{p.regular_price}</s> regular</>
                    ) : (
                      <>₹{p.price} per bottle</>
                    )}
                  </p>
                  <small>Minimum {p.min_qty} · Maximum {p.max_qty}</small>
                </div>
                <div className="qty">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      setQty({
                        ...qty,
                        [p.id]: (qty[p.id] || 0) <= p.min_qty ? 0 : (qty[p.id] || 0) - 1,
                      })
                    }
                  >
                    −
                  </button>
                  <strong>{qty[p.id] || 0}</strong>
                  <button
                    type="button"
                    disabled={
                      p.stock < p.min_qty ||
                      (qty[p.id] || 0) >= p.max_qty ||
                      (qty[p.id] || 0) >= p.stock
                    }
                    onClick={() =>
                      setQty({ ...qty, [p.id]: (qty[p.id] || 0) === 0 ? p.min_qty : (qty[p.id] || 0) + 1 })
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <div className="wizard-actions">
              <button type="button" className="secondary" onClick={() => goToStep(5)}>Back</button>
              <button type="button" onClick={() => {
                if (!items.length) {
                  setErr("Select at least one bottle.");
                  return;
                }
                continueToStep(7);
              }}>Review order</button>
            </div>
          </section>}
          {customerResolved && areaChecked && step === 7 && <section className="panel">
            <h2>7. Review & Submit</h2>
            <p className="muted">Selected: {totalQuantity} bottles</p>
            <div className="summary">
              {products
                .filter((p) => qty[p.id])
                .map((p) => (
                  <div key={p.id}>
                    <span>
                      {p.litres}L {kind} × {qty[p.id]}
                    </span>
                    <strong>₹{p.price * qty[p.id]}</strong>
                  </div>
                ))}
              <div>
                <span>Subtotal</span>
                <strong>₹{subtotal}</strong>
              </div>
              <div>
                <span>Delivery Fee</span>
                <strong>₹{catalog.settings.delivery_fee}</strong>
              </div>
              <hr />
              <div className="total">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>
            <p className="muted">
              Payment on delivery · Online UPI coming later
            </p>
            <label className="inline" style={{ margin: "18px 0" }}>
              <input type="checkbox" required style={{ width: 18 }} /> I confirm
              my delivery details are correct.
            </label>
            <button
              disabled={busy || items.length === 0}
              style={{ width: "100%" }}
            >
              {busy ? "Placing Order..." : "Confirm Water Order →"}
            </button>
            <div className="wizard-actions">
              <button type="button" className="secondary" onClick={() => goToStep(6)}>Back</button>
            </div>
          </section>}
          </div>
        </form>
        </>
      )}
    </div>
  );
}
