"use client";
import { Fragment, useEffect, useRef, useState } from "react";
type Order = {
  id: string;
  order_number: string;
  name: string;
  phone: string;
  address: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
  delivery_date: string;
  slot_id: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  order_items: {
    litres: number;
    kind: string;
    qty: number;
    line_total: number;
  }[];
};
type Product = {
  id: string;
  litres: number;
  kind: string;
  price: number;
  stock: number;
  min_qty: number;
  max_qty: number;
  active: boolean;
};
type Slot = {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  capacity: number;
  active: boolean;
};
type PriceSchedule = {
  id: string;
  product_id: string;
  price: number;
  start_time: string;
  end_time: string;
  active: boolean;
  products: { litres: number; kind: string } | null;
};
type ServicePincode = { id:string; pincode:string; area_name:string; active:boolean };
type Customer = { phone:string;name:string;pincode:string;address:string;landmark:string;order_count:number;total_spent:number;last_order_at:string;original_phone?:string };
type PaymentCustomer = { phone: string; name: string };
type PaymentRequest = {
  id: string;
  phone: string;
  amount: number;
  upi_id: string;
  transaction_reference: string | null;
  status: "pending" | "customer_reported" | "paid" | "cancelled";
  created_at: string;
};
type Settings = {
  business_phone: string;
  delivery_fee: number;
  min_order: number;
  service_area: string;
};
type Report = {
  from: string;
  to: string;
  summary: {
    orders: number;
    sales: number;
    pending: number;
    delivered: number;
    cancelled: number;
  };
  orders: Order[];
};
const initialToday = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const initialMonthStart = `${initialToday.slice(0, 8)}01`;
const statusTransitions: Record<string, string[]> = {
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
export default function Admin() {
  const [logged, setLogged] = useState<boolean | null>(null),
    [username, setUsername] = useState("admin"),
    [password, setPassword] = useState(""),
    [tab, setTab] = useState("Dashboard"),
    [adminMenuOpen, setAdminMenuOpen] = useState(false),
    [orders, setOrders] = useState<Order[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [editingProductId, setEditingProductId] = useState<string | null>(null),
    [slots, setSlots] = useState<Slot[]>([]),
    [settings, setSettings] = useState<Settings | null>(null),
    [message, setMessage] = useState(""),
    [search, setSearch] = useState(""),
    [customers,setCustomers]=useState<Customer[]>([]),
    [customerSearch,setCustomerSearch]=useState(""),
    [editingCustomerPhone,setEditingCustomerPhone]=useState<string|null>(null),
    [busy, setBusy] = useState(false),
    [reportFrom, setReportFrom] = useState(initialMonthStart),
    [reportTo, setReportTo] = useState(initialToday),
    [report, setReport] = useState<Report | null>(null),
    [newProduct, setNewProduct] = useState({
      litres: 20,
      kind: "refill",
      price: 0,
      stock: 100,
      min_qty: 1,
      max_qty: 50,
    }),
    [newSlot, setNewSlot] = useState({
      label: "",
      start_time: "09:00",
      end_time: "10:00",
      capacity: 20,
    }),
    [pincodes,setPincodes]=useState<ServicePincode[]>([]),
    [newPincode,setNewPincode]=useState({pincode:"",area_name:""}),
    [paymentCustomers,setPaymentCustomers]=useState<PaymentCustomer[]>([]),
    [paymentRequests,setPaymentRequests]=useState<PaymentRequest[]>([]),
    [paymentPhone,setPaymentPhone]=useState(""),
    [paymentAmount,setPaymentAmount]=useState(""),
    [paymentUpiId,setPaymentUpiId]=useState(""),
    [paymentQr,setPaymentQr]=useState(""),
    [paymentBusy,setPaymentBusy]=useState(false),
    [paymentMessage,setPaymentMessage]=useState(""),
    [reportedPaymentCount,setReportedPaymentCount]=useState(0),
    reportedPaymentCountRef=useRef<number|null>(null),
    [priceSchedules, setPriceSchedules] = useState<PriceSchedule[]>([]),
    [priceMessage, setPriceMessage] = useState(""),
    [newPrice, setNewPrice] = useState({
      product_id: "",
      price: 0,
      start_time: "",
      end_time: "",
    });
  async function api(url: string, method = "GET", body?: unknown) {
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const x = await r.json().catch(() => null);
    if (!r.ok)
      throw Error(
        typeof x?.error === "string"
          ? x.error
          : `Request failed (${r.status})`,
      );
    if (x === null) throw Error("The server returned an invalid response");
    return x;
  }
  async function refresh() {
    setMessage("");
    try {
      const [o, p, s, c] = await Promise.all([
        api("/api/admin/orders"),
        api("/api/admin/products"),
        api("/api/admin/slots"),
        api("/api/admin/settings"),
      ]);
      setOrders(o);
      setProducts(p);
      setSlots(s);
      setSettings(c);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? `Dashboard data could not load: ${e.message}`
          : "Dashboard data could not load",
      );
    }
  }
  useEffect(() => {
    api("/api/admin/session")
      .then((x) => {
        setLogged(!!x.authenticated);
        if (x.authenticated) void refresh();
      })
      .catch(() => setLogged(false));
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      await api("/api/admin/login", "POST", { username, password });
      setPassword("");
      setLogged(true);
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }
  async function update(url: string, body: unknown) {
    setMessage("");
    try {
      await api(url, "PATCH", body);
      setMessage("Saved successfully");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    }
  }
  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      await api("/api/admin/products", "POST", newProduct);
      setMessage("Product added successfully");
      setNewProduct({ litres: 20, kind: "refill", price: 0, stock: 100, min_qty: 1, max_qty: 50 });
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Product could not be added");
    } finally {
      setBusy(false);
    }
  }
  async function saveProduct(product: Product) {
    setMessage("");
    try {
      await api("/api/admin/products", "PATCH", product);
      setEditingProductId(null);
      setMessage("Bottle details saved successfully");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Bottle could not be saved");
    }
  }
  async function loadReport(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      setReport(
        await api(`/api/admin/reports?from=${reportFrom}&to=${reportTo}`),
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Report could not load");
    } finally {
      setBusy(false);
    }
  }
  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api("/api/admin/slots", "POST", newSlot);
      setNewSlot({
        label: "",
        start_time: "09:00",
        end_time: "10:00",
        capacity: 20,
      });
      setMessage("Delivery slot added successfully");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Slot could not be added");
    } finally {
      setBusy(false);
    }
  }
  async function remove(url: string, id: string, label: string) {
    if (!window.confirm(`Delete ${label}?`)) return;
    setMessage("");
    try {
      await api(url, "DELETE", { id });
      setMessage("Deleted successfully");
      if (url.includes("pricing")) await loadPricing();
      else if (url.includes("pincodes")) await loadPincodes();
      else await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Delete failed");
    }
  }
  async function loadPincodes(){try{setPincodes(await api("/api/admin/pincodes"))}catch(e){setMessage(e instanceof Error?`Pincodes unavailable: ${e.message}`:"Pincodes unavailable")}}
  async function loadCustomers(){try{const data=await api("/api/admin/customers");setCustomers(data.map((customer:Customer)=>({...customer,original_phone:customer.phone})))}catch(e){setMessage(e instanceof Error?`Customers unavailable: ${e.message}`:"Customers unavailable")}}
  async function saveCustomer(customer:Customer){setMessage("");try{await api("/api/admin/customers","PATCH",{...customer,original_phone:customer.original_phone||customer.phone});setEditingCustomerPhone(null);setMessage("Customer details saved successfully");await Promise.all([loadCustomers(),refresh()])}catch(e){setMessage(e instanceof Error?e.message:"Customer could not be saved")}}
  async function deleteCustomer(customer:Customer){if(!window.confirm(`Permanently delete ${customer.name}, all ${customer.order_count} orders and payment records? This cannot be undone.`))return;setMessage("");try{await api("/api/admin/customers","DELETE",{phone:customer.original_phone||customer.phone});setMessage("Customer and related records deleted successfully");await Promise.all([loadCustomers(),refresh()])}catch(e){setMessage(e instanceof Error?e.message:"Customer could not be deleted")}}
  async function addPincode(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{await api("/api/admin/pincodes","POST",newPincode);setNewPincode({pincode:"",area_name:""});setMessage("Service pincode added successfully");await loadPincodes()}catch(e){setMessage(e instanceof Error?e.message:"Pincode could not be added")}finally{setBusy(false)}}
  async function savePincode(p:ServicePincode){setMessage("");try{await api("/api/admin/pincodes","PATCH",p);setMessage("Pincode saved successfully");await loadPincodes()}catch(e){setMessage(e instanceof Error?e.message:"Pincode could not be saved")}}
  async function loadPayments() {
    try {
      const data = await api("/api/admin/payments");
      setPaymentCustomers(data.customers);
      setPaymentRequests(data.requests);
    } catch (e) {
      setPaymentMessage(e instanceof Error ? e.message : "Payment requests could not load");
    }
  }
  useEffect(() => {
    if (!logged) return;
    let active = true;
    async function refreshReportedPayments() {
      try {
        const result = await api("/api/admin/payments?summary=1");
        if (!active) return;
        const count = Number(result.reported_count) || 0;
        if (reportedPaymentCountRef.current !== null && count > reportedPaymentCountRef.current)
          setPaymentMessage("New customer payment reported. Verify the UPI transaction reference before marking it paid.");
        reportedPaymentCountRef.current = count;
        setReportedPaymentCount(count);
      } catch (e) {
        if (active)
          setPaymentMessage(e instanceof Error ? e.message : "Payment notification status could not load");
      }
    }
    void refreshReportedPayments();
    const interval = window.setInterval(() => void refreshReportedPayments(), 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [logged]);
  useEffect(() => {
    if (!logged || tab !== "Payments") return;
    void loadPayments();
    const interval = window.setInterval(() => void loadPayments(), 15000);
    return () => window.clearInterval(interval);
  }, [logged, tab]);
  async function createPaymentRequest(e: React.FormEvent) {
    e.preventDefault();
    setPaymentBusy(true);
    setPaymentMessage("");
    try {
      await api("/api/admin/payments", "POST", {
        phone: paymentPhone,
        amount: Number(paymentAmount),
        upi_id: paymentUpiId,
        qr_data_url: paymentQr,
      });
      setPaymentAmount("");
      setPaymentUpiId("");
      setPaymentQr("");
      const input = document.getElementById("payment-qr-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setPaymentMessage("Payment request sent. The customer can now see it on the tracking page.");
      await loadPayments();
    } catch (e) {
      setPaymentMessage(e instanceof Error ? e.message : "Payment request could not be created");
    } finally {
      setPaymentBusy(false);
    }
  }
  async function updatePaymentStatus(request: PaymentRequest, status: PaymentRequest["status"]) {
    setPaymentMessage("");
    try {
      await api("/api/admin/payments", "PATCH", { id: request.id, status });
      setPaymentMessage(`Payment request marked ${status}.`);
      await loadPayments();
    } catch (e) {
      setPaymentMessage(e instanceof Error ? e.message : "Payment status could not be updated");
    }
  }
  async function readPaymentQr(file: File | undefined) {
    setPaymentMessage("");
    if (!file) {
      setPaymentQr("");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setPaymentMessage("Choose a PNG, JPEG, or WebP QR image.");
      return;
    }
    if (file.size > 256 * 1024) {
      setPaymentQr("");
      setPaymentMessage("QR image must be 256 KB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPaymentQr(reader.result);
      else setPaymentMessage("QR image could not be read.");
    };
    reader.onerror = () => setPaymentMessage("QR image could not be read.");
    reader.readAsDataURL(file);
  }
  async function loadPricing() {
    try {
      setPriceSchedules(await api("/api/admin/pricing"));
    } catch (e) {
      setPriceMessage(
        e instanceof Error
          ? `Timed pricing unavailable: ${e.message}`
          : "Timed pricing unavailable",
      );
    }
  }
  async function addPrice(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setPriceMessage("");
    try {
      await api("/api/admin/pricing", "POST", newPrice);
      setNewPrice({ product_id: "", price: 0, start_time: "", end_time: "" });
      setPriceMessage("✓ Daily price schedule saved successfully");
      await loadPricing();
    } catch (e) {
      setPriceMessage(
        e instanceof Error ? e.message : "Scheduled price could not be added",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await api("/api/admin/logout", "POST");
    setLogged(false);
  }
  if (logged === null)
    return (
      <div className="container narrow">
        <div className="panel">Loading admin dashboard...</div>
      </div>
    );
  if (!logged)
    return (
      <div className="container narrow" style={{ maxWidth: 460 }}>
        <div className="panel">
          <h1>Admin Login</h1>
          <p className="muted">Zam Zam Water · Secure Owner Dashboard</p>
          {message && <div className="error">{message}</div>}
          <form onSubmit={login}>
            <div className="field">
              <label>Username</label>
              <input
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button disabled={busy} style={{ width: "100%" }}>
              {busy ? "Signing in..." : "Login to Dashboard"}
            </button>
          </form>
        </div>
      </div>
    );
  const filtered = orders.filter((o) =>
    [o.order_number, o.name, o.phone, o.status]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const todays = orders.filter(
    (o) =>
      o.created_at &&
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(o.created_at)) === today,
  );
  return (
    <div className="container admin-layout">
      <div
        className="admin-hero"
        style={{ justifyContent: "space-between", flexWrap: "wrap" }}
      >
        <div>
          <div className="eyebrow">OWNER CONTROL CENTER</div>
          <h1>Admin Dashboard</h1>
        </div>
        <div className="inline">
          <button className="secondary" onClick={refresh}>
            ↻ Refresh
          </button>
          <button className="secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
      {message && (
        <div className={message.includes("success") ? "notice" : "error"}>
          {message}
        </div>
      )}
      {reportedPaymentCount > 0 && (
        <div className="notice" role="status">
          {reportedPaymentCount} customer-reported payment{reportedPaymentCount === 1 ? "" : "s"} awaiting verification.{" "}
          <button className="secondary" onClick={() => setTab("Payments")}>Review payments</button>
        </div>
      )}
      <button
        type="button"
        className="admin-menu-toggle"
        aria-expanded={adminMenuOpen}
        aria-controls="admin-section-navigation"
        onClick={() => setAdminMenuOpen((open) => !open)}
      >
        <span className="menu-toggle-lines" aria-hidden="true"><span /><span /><span /></span>
        {adminMenuOpen ? "Close dashboard menu" : `Dashboard menu · ${tab}`}
      </button>
      <div id="admin-section-navigation" className={`tabs${adminMenuOpen ? " tabs-open" : ""}`}>
        {[
          "Dashboard",
          "Orders",
          "Customers",
          "Products",
          "Delivery Slots",
          "Service Pincodes",
          "Payments",
          "Reports",
          "Settings",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => {
              setTab(t);
              setAdminMenuOpen(false);
              if (t === "Products") void loadPricing();
              if (t === "Customers") void loadCustomers();
              if (t === "Service Pincodes") void loadPincodes();
            }}
          >
            {t === "Payments" && reportedPaymentCount > 0 ? `Payments (${reportedPaymentCount})` : t}
          </button>
        ))}
      </div>
      {tab === "Dashboard" && (
        <>
          <div className="stats">
            <div className="stat">
              Today's Orders<strong>{todays.length}</strong>
            </div>
            <div className="stat">
              Pending Orders
              <strong>{orders.filter((o) => o.status === "new").length}</strong>
            </div>
            <div className="stat">
              Out for Delivery
              <strong>
                {orders.filter((o) => o.status === "out_for_delivery").length}
              </strong>
            </div>
            <div className="stat">
              Today's Sales
              <strong>
                ₹
                {todays
                  .filter((o) => !["rejected", "cancelled"].includes(o.status))
                  .reduce((n, o) => n + Number(o.total), 0)}
              </strong>
            </div>
          </div>
          <div className="panel" style={{ marginTop: 20 }}>
            <h2>Latest Orders</h2>
            <OrderTable
              orders={orders.slice(0, 15)}
              slots={slots}
              update={update}
            />
          </div>
        </>
      )}
      {tab === "Orders" && (
        <div className="panel">
          <h2>All Orders</h2>
          <div className="field">
            <input
              placeholder="Search by order ID, customer, phone or status"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <OrderTable orders={filtered} slots={slots} update={update} />
        </div>
      )}
      {tab === "Customers" && (
        <div className="panel">
          <div className="section-heading"><div><div className="eyebrow">CUSTOMER DIRECTORY</div><h2>Customers</h2></div><p className="muted">Edit saved delivery details or permanently remove a customer and all related records.</p></div>
          <div className="field"><input placeholder="Search by name, mobile number, pincode or address" value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/></div>
          <div className="table-wrap customer-table-wrap"><table><thead><tr><th>Customer</th><th>Delivery area</th><th>Orders</th><th>Last order</th><th>Actions</th></tr></thead><tbody>
            {customers.filter(customer=>`${customer.name} ${customer.phone} ${customer.pincode} ${customer.address}`.toLowerCase().includes(customerSearch.toLowerCase())).map(customer=><Fragment key={customer.original_phone}>
              <tr className={editingCustomerPhone===customer.original_phone?"customer-summary-row expanded":"customer-summary-row"}>
                <td><strong>{customer.name}</strong><small>{customer.phone}</small></td>
                <td><strong>{customer.pincode||"No pincode"}</strong><small className="customer-address-preview">{customer.address}</small></td>
                <td><strong>{customer.order_count}</strong><small>₹{customer.total_spent} total</small></td>
                <td>{new Date(customer.last_order_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}</td>
                <td><button className="secondary" onClick={()=>setEditingCustomerPhone(editingCustomerPhone===customer.original_phone?null:customer.original_phone||customer.phone)}>{editingCustomerPhone===customer.original_phone?"Close":"Edit"}</button> <button className="danger" onClick={()=>void deleteCustomer(customer)}>Delete</button></td>
              </tr>
              {editingCustomerPhone===customer.original_phone&&<tr className="customer-editor-row"><td colSpan={5}><div className="customer-editor-grid">
                <div className="field"><label>Name</label><input value={customer.name} onChange={e=>setCustomers(customers.map(item=>item.original_phone===customer.original_phone?{...item,name:e.target.value}:item))}/></div>
                <div className="field"><label>Mobile</label><input inputMode="numeric" maxLength={10} value={customer.phone} onChange={e=>setCustomers(customers.map(item=>item.original_phone===customer.original_phone?{...item,phone:e.target.value.replace(/\D/g,"").slice(0,10)}:item))}/></div>
                <div className="field"><label>Pincode</label><input inputMode="numeric" maxLength={6} value={customer.pincode} onChange={e=>setCustomers(customers.map(item=>item.original_phone===customer.original_phone?{...item,pincode:e.target.value.replace(/\D/g,"").slice(0,6)}:item))}/></div>
                <div className="field"><label>Landmark</label><input value={customer.landmark} onChange={e=>setCustomers(customers.map(item=>item.original_phone===customer.original_phone?{...item,landmark:e.target.value}:item))}/></div>
                <div className="field customer-address-field"><label>Address</label><textarea value={customer.address} onChange={e=>setCustomers(customers.map(item=>item.original_phone===customer.original_phone?{...item,address:e.target.value}:item))}/></div>
              </div><div className="customer-editor-actions"><button className="secondary" onClick={()=>{setEditingCustomerPhone(null);void loadCustomers()}}>Cancel</button><button onClick={()=>void saveCustomer(customer)}>Save changes</button></div></td></tr>}
            </Fragment>)}
            {!customers.length&&<tr><td colSpan={5}>No customers found.</td></tr>}
          </tbody></table></div>
        </div>
      )}
      {tab === "Products" && (
        <div className="panel">
          <h2>Product Pricing & Stock</h2>
          <p className="muted">
            Add bottle options or edit their price, inventory and public
            availability.
          </p>
          <form className="product-create" onSubmit={addProduct}>
            <div className="field">
              <label>Capacity (litres)</label>
              <input
                required
                type="number"
                min="1"
                max="1000"
                value={newProduct.litres}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    litres: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="field">
              <label>Bottle Type</label>
              <select
                value={newProduct.kind}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, kind: e.target.value })
                }
              >
                <option value="refill">Old Bottle / Refill</option>
                <option value="new">New Bottle</option>
              </select>
            </div>
            <div className="field">
              <label>Price (₹)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={newProduct.price}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    price: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="field">
              <label>Opening Stock</label>
              <input
                required
                type="number"
                min="0"
                max="2147483647"
                step="1"
                value={newProduct.stock}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    stock: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="field"><label>Minimum Order Qty</label><input required type="number" min="1" max="2147483647" step="1" value={newProduct.min_qty} onChange={e=>{const min_qty=Number(e.target.value);setNewProduct({...newProduct,min_qty,max_qty:Math.max(newProduct.max_qty,min_qty)})}}/></div>
            <div className="field"><label>Maximum Order Qty</label><input required type="number" min={newProduct.min_qty} max="2147483647" step="1" value={newProduct.max_qty} onChange={e=>setNewProduct({...newProduct,max_qty:Number(e.target.value)})}/></div>
            <button disabled={busy}>+ Add Product</button>
          </form>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Capacity</th>
                  <th>Bottle Type</th>
                  <th>Price (₹)</th>
                  <th>Stock</th>
                  <th>Min Qty</th>
                  <th>Max Qty</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {editingProductId === p.id ? <input type="number" min="1" max="1000" value={p.litres} onChange={e=>setProducts(products.map(x=>x.id===p.id?{...x,litres:Number(e.target.value)}:x))}/> : `${p.litres}L`}
                    </td>
                    <td>
                      {editingProductId === p.id ? <select value={p.kind} onChange={e=>setProducts(products.map(x=>x.id===p.id?{...x,kind:e.target.value}:x))}><option value="refill">Old Bottle / Refill</option><option value="new">New Bottle</option></select> : p.kind === "refill" ? "Old Bottle / Refill" : "New Bottle"}
                    </td>
                    <td>
                      {editingProductId === p.id ? <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={p.price}
                        onChange={(e) =>
                          setProducts(
                            products.map((x) =>
                              x.id === p.id
                                ? { ...x, price: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      /> : `₹${p.price}`}
                    </td>
                    <td>
                      {editingProductId === p.id ? <input
                        type="number"
                        min="0"
                        max="2147483647"
                        step="1"
                        value={p.stock}
                        onChange={(e) =>
                          setProducts(
                            products.map((x) =>
                              x.id === p.id
                                ? { ...x, stock: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      /> : p.stock}
                    </td>
                    <td>{editingProductId===p.id?<input type="number" min="1" max="2147483647" step="1" value={p.min_qty} onChange={e=>{const min_qty=Number(e.target.value);setProducts(products.map(x=>x.id===p.id?{...x,min_qty,max_qty:Math.max(x.max_qty,min_qty)}:x))}}/>:p.min_qty}</td>
                    <td>{editingProductId===p.id?<input type="number" min={p.min_qty} max="2147483647" step="1" value={p.max_qty} onChange={e=>setProducts(products.map(x=>x.id===p.id?{...x,max_qty:Number(e.target.value)}:x))}/>:p.max_qty}</td>
                    <td>
                      {editingProductId === p.id ? <input
                        type="checkbox"
                        checked={p.active}
                        onChange={(e) =>
                          setProducts(
                            products.map((x) =>
                              x.id === p.id
                                ? { ...x, active: e.target.checked }
                                : x,
                            ),
                          )
                        }
                      /> : p.active ? "Yes" : "No"}
                    </td>
                    <td>
                      {editingProductId === p.id ? <><button onClick={() => saveProduct(p)}>Save Changes</button>{" "}<button className="secondary" onClick={() => {setEditingProductId(null);void refresh()}}>Cancel</button>{" "}</> : <button onClick={() => setEditingProductId(p.id)}>Edit Bottle</button>} {" "}
                      <button
                        className="danger"
                        onClick={() =>
                          remove(
                            "/api/admin/products",
                            p.id,
                            `${p.litres}L ${p.kind}`,
                          )
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === "Delivery Slots" && (
        <div className="panel">
          <h2>Delivery Slots</h2>
          <p className="muted">
            Add, edit, disable or delete recurring delivery windows.
          </p>
          <form className="slot-create" onSubmit={addSlot}>
            <div className="field">
              <label>Slot label</label>
              <input
                required
                placeholder="9 AM - 10 AM"
                value={newSlot.label}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, label: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>From time</label>
              <input
                required
                type="time"
                value={newSlot.start_time}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, start_time: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Ends</label>
              <input
                required
                type="time"
                value={newSlot.end_time}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, end_time: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>Capacity</label>
              <input
                required
                type="number"
                min="0"
                value={newSlot.capacity}
                onChange={(e) =>
                  setNewSlot({ ...newSlot, capacity: Number(e.target.value) })
                }
              />
            </div>
            <button disabled={busy}>+ Add Slot</button>
          </form>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th>Daily Capacity</th>
                  <th>Enabled</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <input
                        value={s.label}
                        onChange={(e) =>
                          setSlots(
                            slots.map((x) =>
                              x.id === s.id
                                ? { ...x, label: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={s.start_time.slice(0, 5)}
                        onChange={(e) =>
                          setSlots(
                            slots.map((x) =>
                              x.id === s.id
                                ? { ...x, start_time: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={s.end_time.slice(0, 5)}
                        onChange={(e) =>
                          setSlots(
                            slots.map((x) =>
                              x.id === s.id
                                ? { ...x, end_time: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={s.capacity}
                        onChange={(e) =>
                          setSlots(
                            slots.map((x) =>
                              x.id === s.id
                                ? { ...x, capacity: Number(e.target.value) }
                                : x,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={s.active}
                        onChange={(e) =>
                          setSlots(
                            slots.map((x) =>
                              x.id === s.id
                                ? { ...x, active: e.target.checked }
                                : x,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <button onClick={() => update("/api/admin/slots", s)}>
                        Save
                      </button>{" "}
                      <button
                        className="danger"
                        onClick={() =>
                          remove("/api/admin/slots", s.id, s.label)
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === "Products" && (
        <div className="panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow">AUTOMATED PRICING</div>
              <h2>Schedule bottle prices</h2>
            </div>
            <p className="muted">
              Add as many daily time ranges as needed. The matching time range
              automatically overrides the product&apos;s regular price.
            </p>
          </div>
          <form className="price-create" onSubmit={addPrice}>
            <div className="field">
              <label>Product</label>
              <select
                required
                value={newPrice.product_id}
                onChange={(e) =>
                  setNewPrice({ ...newPrice, product_id: e.target.value })
                }
              >
                <option value="">Choose product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.litres}L {p.kind} · Regular ₹{p.price}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Scheduled price (₹)</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={newPrice.price}
                onChange={(e) =>
                  setNewPrice({ ...newPrice, price: Number(e.target.value) })
                }
              />
            </div>
            <div className="field">
              <label>From time</label>
              <input
                required
                type="time"
                value={newPrice.start_time}
                onChange={(e) =>
                  setNewPrice({ ...newPrice, start_time: e.target.value })
                }
              />
            </div>
            <div className="field">
              <label>To time</label>
              <input
                required
                type="time"
                value={newPrice.end_time}
                onChange={(e) =>
                  setNewPrice({ ...newPrice, end_time: e.target.value })
                }
              />
            </div>
            <button disabled={busy}>+ Schedule Price</button>
          </form>
          {priceMessage && <div className={priceMessage.startsWith("✓") ? "notice" : "error"}>{priceMessage}</div>}
          <p className="muted">Times repeat every day in India Standard Time. Overnight ranges are supported—for example, 10:00 PM to 2:00 AM. Ranges for the same bottle cannot overlap.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {priceSchedules.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.products?.litres}L {s.products?.kind}
                    </td>
                    <td>₹{s.price}</td>
                    <td>{s.start_time.slice(0,5)}</td>
                    <td>{s.end_time.slice(0,5)}</td>
                    <td>{s.active ? "Yes" : "No"}</td>
                    <td>
                      <button
                        className="danger"
                        onClick={() =>
                          remove(
                            "/api/admin/pricing",
                            s.id,
                            "this scheduled price",
                          )
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!priceSchedules.length && (
                  <tr>
                    <td colSpan={6}>No scheduled prices.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === "Service Pincodes" && <div className="panel">
        <div className="section-heading"><div><div className="eyebrow">DELIVERY COVERAGE</div><h2>Service Pincodes</h2></div><p className="muted">Customers can proceed only when their pincode is active here.</p></div>
        <form className="pincode-create" onSubmit={addPincode}><div className="field"><label>6-digit pincode</label><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={newPincode.pincode} onChange={e=>setNewPincode({...newPincode,pincode:e.target.value.replace(/\D/g,"").slice(0,6)})}/></div><div className="field"><label>Area name</label><input required value={newPincode.area_name} onChange={e=>setNewPincode({...newPincode,area_name:e.target.value})}/></div><button disabled={busy}>+ Add Pincode</button></form>
        <div className="table-wrap"><table><thead><tr><th>Pincode</th><th>Area</th><th>Active</th><th></th></tr></thead><tbody>{pincodes.map(p=><tr key={p.id}><td><input inputMode="numeric" maxLength={6} value={p.pincode} onChange={e=>setPincodes(pincodes.map(x=>x.id===p.id?{...x,pincode:e.target.value.replace(/\D/g,"").slice(0,6)}:x))}/></td><td><input value={p.area_name} onChange={e=>setPincodes(pincodes.map(x=>x.id===p.id?{...x,area_name:e.target.value}:x))}/></td><td><input type="checkbox" checked={p.active} onChange={e=>setPincodes(pincodes.map(x=>x.id===p.id?{...x,active:e.target.checked}:x))}/></td><td><button onClick={()=>savePincode(p)}>Save</button>{" "}<button className="danger" onClick={()=>remove("/api/admin/pincodes",p.id,p.pincode)}>Delete</button></td></tr>)}{!pincodes.length&&<tr><td colSpan={4}>No service pincodes configured.</td></tr>}</tbody></table></div>
      </div>}
      {tab === "Payments" && (
        <div className="panel">
          <div className="section-heading">
            <div><div className="eyebrow">MANUAL UPI COLLECTION</div><h2>Payment Requests</h2></div>
            <p className="muted">Create a request for a customer. Payments remain pending until you verify receipt and mark them paid.</p>
          </div>
          {paymentMessage && <div className={paymentMessage.includes("sent") || paymentMessage.includes("marked") || paymentMessage.includes("New customer payment reported") ? "notice" : "error"}>{paymentMessage}</div>}
          <form className="grid" onSubmit={createPaymentRequest}>
            <div className="field">
              <label>Customer mobile number</label>
              <select required value={paymentPhone} onChange={e=>setPaymentPhone(e.target.value)}>
                <option value="">Select customer</option>
                {paymentCustomers.map((customer, index)=><option key={`${customer.phone}-${index}`} value={customer.phone}>{customer.name} · {customer.phone}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Amount (₹)</label>
              <input required type="number" min="0.01" max="9999999999.99" step="0.01" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)}/>
            </div>
            <div className="field">
              <label>UPI ID</label>
              <input required placeholder="name@upi" value={paymentUpiId} onChange={e=>setPaymentUpiId(e.target.value.trim())}/>
            </div>
            <div className="field">
              <label>UPI QR image (PNG, JPEG or WebP; max 256 KB)</label>
              <input id="payment-qr-file" required type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void readPaymentQr(e.target.files?.[0])}/>
            </div>
            {paymentQr && <img src={paymentQr} alt="Selected UPI QR preview" style={{width:180,height:180,objectFit:"contain"}}/>}
            <button disabled={paymentBusy}>{paymentBusy ? "Sending request..." : "Send Payment Request"}</button>
          </form>
          <div className="inline" style={{justifyContent:"space-between"}}>
            <h3>Recent requests</h3>
            <button className="secondary" onClick={()=>void loadPayments()}>Refresh payment requests</button>
          </div>
          <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Amount</th><th>UPI ID</th><th>Status</th><th>Transaction reference</th><th>Requested</th><th>Action</th></tr></thead><tbody>
            {paymentRequests.map(request=><tr key={request.id}><td>{request.phone}</td><td>₹{Number(request.amount).toFixed(2)}</td><td>{request.upi_id}</td><td>{request.status==="customer_reported"?"Customer says paid":request.status}</td><td>{request.transaction_reference||"—"}</td><td>{new Date(request.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}</td><td>{request.status==="pending"&&<><button onClick={()=>void updatePaymentStatus(request,"paid")}>Mark paid</button>{" "}<button className="secondary" onClick={()=>void updatePaymentStatus(request,"cancelled")}>Cancel</button></>}{request.status==="customer_reported"&&<><button onClick={()=>void updatePaymentStatus(request,"paid")}>Verify & mark paid</button>{" "}<button className="secondary" onClick={()=>void updatePaymentStatus(request,"pending")}>Not received</button></>}</td></tr>)}
            {!paymentRequests.length&&<tr><td colSpan={7}>No payment requests yet.</td></tr>}
          </tbody></table></div>
        </div>
      )}
      {tab === "Reports" && (
        <div className="report-layout">
          <section className="panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow">BUSINESS REPORTS</div>
                <h2>Orders by delivery date</h2>
              </div>
              <p className="muted">
                Choose any date range to review sales and download a detailed
                report.
              </p>
            </div>
            <form className="report-filters" onSubmit={loadReport}>
              <div className="field">
                <label>From date</label>
                <input
                  required
                  type="date"
                  value={reportFrom}
                  onChange={(e) => setReportFrom(e.target.value)}
                />
              </div>
              <div className="field">
                <label>To date</label>
                <input
                  required
                  type="date"
                  min={reportFrom}
                  value={reportTo}
                  onChange={(e) => setReportTo(e.target.value)}
                />
              </div>
              <button disabled={busy}>
                {busy ? "Loading..." : "Generate Report"}
              </button>
            </form>
            {report && (
              <>
                <div className="stats report-stats">
                  <div className="stat">
                    Orders<strong>{report.summary.orders}</strong>
                  </div>
                  <div className="stat">
                    Sales<strong>₹{report.summary.sales}</strong>
                  </div>
                  <div className="stat">
                    Pending<strong>{report.summary.pending}</strong>
                  </div>
                  <div className="stat">
                    Delivered<strong>{report.summary.delivered}</strong>
                  </div>
                  <div className="stat">
                    Cancelled<strong>{report.summary.cancelled}</strong>
                  </div>
                </div>
                <div className="report-actions">
                  <a
                    className="btn"
                    href={`/api/admin/reports?from=${reportFrom}&to=${reportTo}&format=pdf`}
                  >
                    Download PDF
                  </a>
                  <a
                    className="btn secondary"
                    href={`/api/admin/reports?from=${reportFrom}&to=${reportTo}&format=xlsx`}
                  >
                    Download Excel
                  </a>
                </div>
                <OrderTable
                  orders={report.orders}
                  slots={slots}
                  update={update}
                />
              </>
            )}
          </section>
        </div>
      )}
      {tab === "Settings" && settings && (
        <div className="panel" style={{ maxWidth: 650 }}>
          <h2>Business Settings</h2>
          {(
            [
              ["business_phone", "Business Contact Number"],
              ["service_area", "Service Area"],
              ["delivery_fee", "Delivery Fee (₹)"],
              ["min_order", "Minimum Order (₹)"],
            ] as const
          ).map(([key, label]) => (
            <div className="field" key={key}>
              <label>{label}</label>
              <input
                type={
                  key === "delivery_fee" || key === "min_order"
                    ? "number"
                    : "text"
                }
                min="0"
                value={settings[key]}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    [key]:
                      key === "delivery_fee" || key === "min_order"
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
              />
            </div>
          ))}
          <button onClick={() => update("/api/admin/settings", settings)}>
            Save Settings
          </button>
        </div>
      )}
    </div>
  );
}
function OrderTable({
  orders,
  slots,
  update,
}: {
  orders: Order[];
  slots: Slot[];
  update: (url: string, body: unknown) => Promise<void>;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order / Date</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Delivery</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <strong>{o.order_number}</strong>
                <br />
                <small>
                  {new Date(o.created_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}
                </small>
              </td>
              <td>
                <strong>{o.name}</strong>
                <br />
                <a href={"tel:" + o.phone}>{o.phone}</a>
                <br />
                <small>
                  {o.address} {o.landmark}
                </small>
                {o.latitude != null && o.longitude != null && (
                  <>
                    <br />
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`}
                    >
                      📍 Open Map
                    </a>
                  </>
                )}
              </td>
              <td>
                {o.order_items.map((i) => (
                  <div key={i.kind + i.litres}>
                    {i.qty} × {i.litres}L {i.kind}
                  </div>
                ))}
              </td>
              <td>
                {o.delivery_date}
                <br />
                {slots.find((s) => s.id === o.slot_id)?.label || "Slot"}
              </td>
              <td>
                <strong>₹{o.total}</strong>
                <br />
                <small>{o.payment_status}</small>
              </td>
              <td>
                <select
                  value={o.status}
                  onChange={(e) =>
                    update("/api/admin/orders", {
                      id: o.id,
                      status: e.target.value,
                    })
                  }
                >
                  {[o.status, ...(statusTransitions[o.status] || [])]
                    .filter((s, index, list) => list.indexOf(s) === index)
                    .map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </option>
                    ))}
                </select>
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={6}>No orders found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
