import Link from "next/link";

const highlights = [
  { label: "Same-day delivery", value: "24/7" },
  { label: "Bottles ready", value: "1,200+" },
  { label: "Customer rating", value: "4.9/5" },
];

export default function Home() {
  return (
    <div className="public-home">
      <section className="public-hero">
        <div className="public-copy">
          <div className="micro-label">FRESH WATER · TUMKUR</div>
          <h1>
            Pure Water,
            <br />
            <strong>for every sip.</strong>
          </h1>
          <p>
            Fresh, mineral-rich drinking water from Zam Zam Water, delivered to your
            home, office, or event with a cleaner, faster, more reliable experience.
          </p>

          <div className="public-actions">
            <Link className="dark-cta" href="/order">
              <span>Order Now</span>
              <b>›››</b>
            </Link>
            <Link className="text-link" href="/track">
              Track an order →
            </Link>
          </div>

          <div className="trust-row">
            <span>✓ Easy ordering</span>
            <span>✓ Flexible delivery</span>
            <span>✓ Pay on delivery</span>
          </div>
        </div>

        <div className="bottle-stage" aria-label="Zam Zam Water hero showcase">
          <div className="stage-chip">ZAM ZAM WATER</div>
          <img
            src="/products/zamzam-bottle.png"
            alt="Zam Zam Water delivery bottle"
          />
          <div className="fresh-card">
            <small>AVAILABLE DAILY</small>
            <strong>Fresh. Clean. Trusted.</strong>
          </div>
        </div>
      </section>

      <section className="public-stats">
        {highlights.map((item) => (
          <div className="stat-card" key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="public-benefits">
        <article>
          <span>01</span>
          <h2>Choose your water</h2>
          <p>Select refills or new bottles in the size that fits your home and routine.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Pick a delivery slot</h2>
          <p>Reserve a convenient time window that matches your schedule and location.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Track every step</h2>
          <p>Follow your order in real time and stay informed from dispatch to delivery.</p>
        </article>
      </section>
    </div>
  );
}

