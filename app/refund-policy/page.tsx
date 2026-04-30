import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | Your Favorite DTF Plug",
  description: "Refund Policy for custom printed items and DTF transfers.",
};

const sectionStyle = {
  padding: "16px 18px",
  borderRadius: 16,
  background: "rgba(15,23,42,0.65)",
  border: "1px solid rgba(148,163,184,0.16)",
  marginBottom: 14,
};

export default function RefundPolicyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg, #020617, #0f172a)", color: "#fff", padding: 24 }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>Refund Policy</h1>
        <p style={{ color: "#cbd5e1", marginBottom: 18 }}>Effective date: April 15, 2026</p>

        <section style={sectionStyle}>
          <h2>Custom orders</h2>
          <p>Because all products are custom made, orders are final sale and not eligible for refunds or returns unless the item arrives defective or we made a production error.</p>
        </section>

        <section style={sectionStyle}>
          <h2>Eligible issues</h2>
          <p>If your item is damaged, misprinted, or incorrect, contact support with photos and your order number within 7 days of delivery.</p>
        </section>

        <section style={sectionStyle}>
          <h2>Non-refundable cases</h2>
          <p>We do not refund approved artwork issues, customer spelling mistakes, low-resolution uploads, or change-of-mind requests on custom items.</p>
        </section>
      </div>
    </main>
  );
}
