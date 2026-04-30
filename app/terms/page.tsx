import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Your Favorite DTF Plug",
  description: "Terms of Service for custom DTF transfers and apparel orders.",
};

const sectionStyle = {
  padding: "16px 18px",
  borderRadius: 16,
  background: "rgba(15,23,42,0.65)",
  border: "1px solid rgba(148,163,184,0.16)",
  marginBottom: 14,
};

export default function TermsPage() {
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg, #020617, #0f172a)", color: "#fff", padding: 24 }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: "#cbd5e1", marginBottom: 18 }}>Effective date: April 15, 2026</p>

        <section style={sectionStyle}>
          <h2>Artwork ownership</h2>
          <p>By placing an order, the customer confirms they own or have permission to use all uploaded artwork, logos, text, and graphics.</p>
          <p>We are not responsible for copyright, trademark, or intellectual-property violations caused by customer-submitted content.</p>
        </section>

        <section style={sectionStyle}>
          <h2>Custom production</h2>
          <p>All products are made to order using customer selections and uploaded files. Minor color and placement differences may occur between screen previews and final printed goods.</p>
        </section>

        <section style={sectionStyle}>
          <h2>Order approval and refusal</h2>
          <p>We reserve the right to reject or cancel orders containing unlawful, offensive, or clearly infringing content.</p>
        </section>

        <section style={sectionStyle}>
          <h2>Liability</h2>
          <p>Our liability is limited to the amount paid for the affected order. We are not liable for indirect, incidental, or consequential damages related to custom print use or resale.</p>
        </section>
      </div>
    </main>
  );
}
