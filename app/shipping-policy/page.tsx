import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy | Your Favorite DTF Plug",
  description: "Shipping Policy for production time and delivery expectations.",
};

const sectionStyle = {
  padding: "16px 18px",
  borderRadius: 16,
  background: "rgba(15,23,42,0.65)",
  border: "1px solid rgba(148,163,184,0.16)",
  marginBottom: 14,
};

export default function ShippingPolicyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg, #020617, #0f172a)", color: "#fff", padding: 24 }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>Shipping Policy</h1>
        <p style={{ color: "#cbd5e1", marginBottom: 18 }}>Effective date: April 15, 2026</p>

        <section style={sectionStyle}>
          <h2>Production timing</h2>
          <p>Most custom orders enter production within 1 to 3 business days after payment and artwork approval.</p>
        </section>

        <section style={sectionStyle}>
          <h2>Delivery estimates</h2>
          <p>Shipping times vary by location and carrier. Delivery estimates are not guaranteed once the package has been handed to the carrier.</p>
        </section>

        <section style={sectionStyle}>
          <h2>Delays</h2>
          <p>We are not responsible for carrier delays, weather disruptions, or incorrect shipping details submitted by the customer.</p>
        </section>
      </div>
    </main>
  );
}
