import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Your Favorite DTF Plug",
  description: "Privacy Policy for storefront, uploads, and order processing.",
};

const sectionStyle = {
  padding: "16px 18px",
  borderRadius: 16,
  background: "rgba(15,23,42,0.65)",
  border: "1px solid rgba(148,163,184,0.16)",
  marginBottom: 14,
};

export default function PrivacyPage() {
  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg, #020617, #0f172a)", color: "#fff", padding: 24 }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: "#cbd5e1", marginBottom: 18 }}>Effective date: April 15, 2026</p>

        <section style={sectionStyle}>
          <h2>Information we collect</h2>
          <p>We collect contact, order, design, and upload information needed to process custom orders and customer support requests.</p>
        </section>

        <section style={sectionStyle}>
          <h2>How we use it</h2>
          <p>Information is used for order fulfillment, print production, support, fraud prevention, and store operations.</p>
        </section>

        <section style={sectionStyle}>
          <h2>Sharing</h2>
          <p>We only share necessary data with trusted service providers such as Shopify, hosting, file storage, shipping, and print-production tools.</p>
        </section>

        <section style={sectionStyle}>
          <h2>Uploads and retention</h2>
          <p>Uploaded artwork may be retained to fulfill the order, support approved reorders, and resolve disputes.</p>
        </section>
      </div>
    </main>
  );
}
