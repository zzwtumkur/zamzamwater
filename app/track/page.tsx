"use client";
import { useState } from "react";

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

export default function TrackOrder() {
  const [phone, setPhone] = useState("");
  const [searchedPhone, setSearchedPhone] = useState("");
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportingPaymentId, setReportingPaymentId] = useState<string | null>(null);
  const [transactionReferences, setTransactionReferences] = useState<Record<string, string>>({});
  const [reportingBusy, setReportingBusy] = useState(false);

  async function loadTracking(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/order/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Unable to track orders");
      setOrders(result.orders || []);
      setPaymentRequests(result.payment_requests || []);
      setSearchedPhone(phone);
      if (!result.orders?.length && !result.payment_requests?.length)
        setMessage("No orders or payment requests found for this mobile number.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to track orders");
    } finally {
      setBusy(false);
    }
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
      <h1>Track all your orders</h1>
      <p className="muted">Enter only the mobile number used while ordering.</p>
      <form className="panel" onSubmit={loadTracking}>
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
        {message && <div className={message.startsWith("Payment reported.") ? "notice" : "error"}>{message}</div>}
        <button disabled={busy} style={{ width: "100%" }}>
          {busy ? "Checking..." : searchedPhone && searchedPhone === phone ? "Refresh Order Status" : "View My Orders"}
        </button>
      </form>

      {searchedPhone === phone && orders.length > 0 && (
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

      {searchedPhone === phone && paymentRequests.length > 0 && (
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
                  <a
                    className="btn"
                    href={`upi://pay?pa=${encodeURIComponent(request.upi_id)}&pn=Zam%20Zam%20Water&am=${encodeURIComponent(Number(request.amount).toFixed(2))}&cu=INR&tn=${encodeURIComponent(`Payment ${request.id}`)}`}
                  >
                    Pay ₹{Number(request.amount).toFixed(2)} with UPI
                  </a>
                  <p className="muted">If the button does not open your UPI app, scan the QR code above. Payment is not automatically confirmed.</p>
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
    </div>
  );
}
