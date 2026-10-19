"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type TrackedOrder = {
  order_number: string;
  name: string;
  delivery_date: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  slots: { label: string } | null;
  order_items: { litres: number; kind: string; qty: number; line_total: number }[];
  order_events: { previous_status: string | null; new_status: string; created_at: string }[];
};
type PaymentRequest = {
  id: string;
  amount: number;
  upi_id: string;
  qr_data_url: string;
  transaction_reference: string | null;
  status: "pending" | "customer_reported" | "paid" | "cancelled";
  created_at: string;
};
const upiApps = [
  { name: "PhonePe", packageName: "com.phonepe.app" },
  { name: "Google Pay", packageName: "com.google.android.apps.nbu.paisa.user" },
  { name: "Super.money", packageName: "money.super.payments" },
  { name: "Paytm", packageName: "net.one97.paytm" },
  { name: "WhatsApp Pay", packageName: "com.whatsapp" },
  { name: "CRED UPI", packageName: "com.dreamplug.androidapp" },
  { name: "Other UPI apps", packageName: null },
] as const;

function openUpiApp(request: PaymentRequest, packageName: string | null) {
  const params = new URLSearchParams({
    pa: request.upi_id,
    pn: "Zam Zam Water",
    am: Number(request.amount).toFixed(2),
    cu: "INR",
    tn: `Payment ${request.id}`,
  });
  const paymentUri = `upi://pay?${params.toString()}`;

  if (!packageName || !/android/i.test(navigator.userAgent)) {
    window.location.href = paymentUri;
    return;
  }

  window.location.href = `intent://pay?${params.toString()}#Intent;scheme=upi;package=${packageName};end`;
  window.setTimeout(() => {
    if (document.visibilityState === "visible") window.location.href = paymentUri;
  }, 900);
}

const labels: Record<string, string> = {
  new: "Order received",
  accepted: "Accepted",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  delivery_failed: "Delivery failed",
  rescheduled: "Rescheduled",
};

export function TrackOrder({ initialView = null }: { initialView?: "history" | "payments" | null }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [searchedPhone, setSearchedPhone] = useState("");
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportingPaymentId, setReportingPaymentId] = useState<string | null>(null);
  const [transactionReferences, setTransactionReferences] = useState<Record<string, string>>({});
  const [reportingBusy, setReportingBusy] = useState(false);
  const [view, setView] = useState<"history" | "payments" | null>(initialView);
  const initialLookupStarted = useRef(false);

  async function loadTracking(e?: React.FormEvent, lookupPhone = phone) {
    e?.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/order/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: lookupPhone }),
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Unable to track orders");
      setOrders([...(result.orders || [])].sort(
        (a: TrackedOrder, b: TrackedOrder) => Date.parse(b.created_at) - Date.parse(a.created_at),
      ));
      setPaymentRequests([...(result.payment_requests || [])].sort(
        (a: PaymentRequest, b: PaymentRequest) => Date.parse(b.created_at) - Date.parse(a.created_at),
      ));
      setPhone(lookupPhone);
      setSearchedPhone(lookupPhone);
      if (!result.orders?.length && !result.payment_requests?.length)
        setMessage("No orders or payment requests found for this mobile number.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to track orders");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initialLookupStarted.current) return;
    initialLookupStarted.current = true;
    const requestedPhone = new URLSearchParams(window.location.search).get("phone") || "";
    const requestedView = window.location.pathname.endsWith("/history") ? "history"
      : window.location.pathname.endsWith("/payments") ? "payments"
      : new URLSearchParams(window.location.search).get("view");
    if (requestedView === "history" || requestedView === "payments") setView(requestedView);
    if (/^[6-9]\d{9}$/.test(requestedPhone)) {
      void loadTracking(undefined, requestedPhone);
    }
  }, []);

  useEffect(() => {
    const syncView = () => {
      const requestedView = window.location.pathname.endsWith("/history") ? "history"
        : window.location.pathname.endsWith("/payments") ? "payments"
        : new URLSearchParams(window.location.search).get("view");
      setView(requestedView === "history" || requestedView === "payments" ? requestedView : null);
    };
    window.addEventListener("popstate", syncView);
    return () => window.removeEventListener("popstate", syncView);
  }, []);

  function selectView(nextView: "history" | "payments" | null) {
    const params = new URLSearchParams();
    if (searchedPhone) params.set("phone", searchedPhone);
    const path = nextView ? `/track/${nextView}` : "/track";
    router.push(`${path}${params.size ? `?${params.toString()}` : ""}`);
    setView(nextView);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeMobileNumber() {
    router.push("/track");
    setSearchedPhone("");
    setView(null);
    setMessage("");
    setOrders([]);
    setPaymentRequests([]);
  }

  async function reportPayment(e: React.FormEvent, request: PaymentRequest) {
    e.preventDefault();
    setReportingBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/order/track/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: searchedPhone,
          payment_request_id: request.id,
          transaction_reference: transactionReferences[request.id],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Could not report payment");
      await loadTracking();
      setReportingPaymentId(null);
      setMessage("Payment reported. The business will verify it and update the status.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not report payment");
    } finally {
      setReportingBusy(false);
    }
  }

  return (
    <div className="container narrow">
      <div className="eyebrow">ORDER UPDATES</div>
      <h1>{view === "history" ? "Order History" : view === "payments" ? "Payments" : "Track orders and payments"}</h1>
      <p className="muted">{searchedPhone === phone ? `Mobile number: ${phone}` : "Enter only the mobile number used while ordering."}</p>
      {searchedPhone !== phone && <form className="panel" onSubmit={loadTracking}>
        <div className="field">
          <label>Mobile Number</label>
          <input
            required
            inputMode="numeric"
            pattern="[6-9][0-9]{9}"
            maxLength={10}
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
              setSearchedPhone("");
            }}
          />
        </div>
        <button disabled={busy} style={{ width: "100%" }}>
          {busy ? "Checking..." : "Continue"}
        </button>
      </form>}

      {searchedPhone === phone && message && <div className={message.startsWith("Payment reported.") ? "notice" : "error"}>{message}</div>}

      {searchedPhone === phone && !view && (
        <section className="panel tracking-choice-panel">
          <h2>What would you like to open?</h2>
          <p className="muted">Payments and order history are shown on separate pages.</p>
          <div className="tracking-choice-grid">
            <button type="button" onClick={() => selectView("payments")}>
              <span className="tracking-choice-icon">₹</span>
              <span><strong>Payments</strong><small>{paymentRequests.length} payment request{paymentRequests.length === 1 ? "" : "s"}</small></span>
            </button>
            <button type="button" className="secondary" onClick={() => selectView("history")}>
              <span className="tracking-choice-icon">↺</span>
              <span><strong>Orders</strong><small>{orders.length} order{orders.length === 1 ? "" : "s"}</small></span>
            </button>
          </div>
          <button type="button" className="secondary tracking-change-number" onClick={changeMobileNumber}>Use another mobile number</button>
        </section>
      )}

      {searchedPhone === phone && view && (
        <div className="tracking-view-actions">
          <button type="button" className="secondary" onClick={() => selectView(null)}>← Back to Payments or Order History</button>
          <div className="tracking-view-switcher">
            {view !== "payments" && <button type="button" className="secondary" onClick={() => selectView("payments")}>Payments</button>}
            {view !== "history" && <button type="button" className="secondary" onClick={() => selectView("history")}>Order History</button>}
            <button type="button" className="secondary" disabled={busy} onClick={() => void loadTracking()}>{busy ? "Refreshing..." : "Refresh"}</button>
          </div>
        </div>
      )}

      {searchedPhone === phone && view === "history" && orders.length > 0 && (
        <>
          <div className="order-history-head">
            <h2>{orders[0].name}&apos;s order history</h2>
            <span>{orders.length} order{orders.length === 1 ? "" : "s"}</span>
          </div>
          {orders.map((order) => (
            <section className="panel tracking-result" key={order.order_number}>
              <div className="tracking-head">
                <div><div className="eyebrow">{order.order_number}</div><h2>{labels[order.status] || order.status}</h2></div>
                <strong className="tracking-total">₹{order.total}</strong>
              </div>
              <p className="muted">Delivery: <strong>{order.delivery_date}</strong> · {order.slots?.label || "Scheduled slot"}</p>
              <div className={order.payment_status === "paid" ? "payment-badge paid" : "payment-badge"}>
                {order.payment_status === "paid" ? "✓ Payment done" : "Payment pending"}
              </div>
              <div className="summary">
                {order.order_items.map((item, index) => (
                  <div key={`${item.kind}-${item.litres}-${index}`}><span>{item.qty} × {item.litres}L {item.kind}</span><strong>₹{item.line_total}</strong></div>
                ))}
              </div>
              <h3>Order progress</h3>
              <div className="timeline">
                {order.order_events.map((event, index) => (
                  <div className="timeline-item" key={event.created_at + index}>
                    <span /><div><strong>{labels[event.new_status] || event.new_status}</strong><small>{new Date(event.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</small></div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
      {searchedPhone === phone && view === "history" && orders.length === 0 && (
        <section className="panel"><h2>No orders found</h2><p className="muted">New orders will appear here at the top.</p></section>
      )}

      {searchedPhone === phone && view === "payments" && paymentRequests.length > 0 && (
        <section className="panel">
          <h2>Payment requests</h2>
          <p className="muted">After paying, allow the business to verify the payment. Your request status will update after confirmation.</p>
          {paymentRequests.map((request) => (
            <div key={request.id} style={{ borderTop: "1px solid #dbe7ee", padding: "18px 0" }}>
              <div className="tracking-head">
                <div><h3>Requested amount</h3><strong className="tracking-total">₹{Number(request.amount).toFixed(2)}</strong></div>
                <span className={request.status === "paid" ? "payment-badge paid" : "payment-badge"}>
                  {request.status === "paid" ? "✓ Payment confirmed" : request.status === "cancelled" ? "Request cancelled" : request.status === "customer_reported" ? "Payment reported · awaiting verification" : "Payment pending"}
                </span>
              </div>
              <p>UPI ID: <strong>{request.upi_id}</strong></p>
              {request.status === "customer_reported" && request.transaction_reference && (
                <p>Transaction reference submitted: <strong>{request.transaction_reference}</strong></p>
              )}
              {request.status === "pending" && (
                <>
                  <img src={request.qr_data_url} alt="UPI payment QR code" style={{ display: "block", width: 220, height: 220, objectFit: "contain", margin: "12px auto" }} />
                  <div className="upi-app-picker">
                    <h3>Choose a UPI app</h3>
                    <p className="muted">Pay ₹{Number(request.amount).toFixed(2)} to {request.upi_id}</p>
                    <div className="upi-app-options">
                      {upiApps.map((app) => (
                        <button
                          key={app.name}
                          type="button"
                          className={app.name === "Other UPI apps" ? "secondary" : "upi-app-option"}
                          onClick={() => openUpiApp(request, app.packageName)}
                        >
                          {app.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="muted">If an app is unavailable, choose Other UPI apps or scan the QR code. Payment is not automatically confirmed.</p>
                  {reportingPaymentId === request.id ? (
                    <form onSubmit={e=>void reportPayment(e, request)}>
                      <div className="field">
                        <label htmlFor={`payment-reference-${request.id}`}>UPI transaction reference / UTR</label>
                        <input
                          id={`payment-reference-${request.id}`}
                          required
                          minLength={6}
                          maxLength={100}
                          value={transactionReferences[request.id] || ""}
                          onChange={e=>setTransactionReferences({...transactionReferences,[request.id]:e.target.value})}
                          placeholder="Enter the reference from your UPI app"
                        />
                      </div>
                      <button disabled={reportingBusy}>{reportingBusy ? "Submitting..." : "Submit payment for verification"}</button>
                    </form>
                  ) : (
                    <button className="secondary" onClick={()=>setReportingPaymentId(request.id)}>I’ve paid</button>
                  )}
                </>
              )}
            </div>
          ))}
        </section>
      )}
      {searchedPhone === phone && view === "payments" && paymentRequests.length === 0 && (
        <section className="panel"><h2>No payment requests</h2><p className="muted">New payment requests will appear here at the top.</p></section>
      )}
    </div>
  );
}

export default TrackOrder;
