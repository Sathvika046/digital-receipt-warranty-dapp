import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ------------------------------ ABOUT ------------------------------ */

const STEPS = [
  {
    icon: "🏪",
    title: "Merchant issues",
    text: "The seller registers the product, serial number and warranty period.",
  },
  {
    icon: "⛓",
    title: "Blockchain stores",
    text: "The record is written to the smart contract, so it can't be edited or lost.",
  },
  {
    icon: "✅",
    title: "Customer verifies",
    text: "Anyone can verify the product from its ID or QR code, anytime.",
  },
];

export function AboutSection() {
  return (
    <section className="about-block" id="about">
      <div className="block-head">
        <span className="section-label">ABOUT WARRANTYCHAIN</span>
        <h2>Paper receipts get lost. Blockchain records don't.</h2>
        <p>
          Faded receipts, lost warranty cards and fake claims are everyday
          problems. WarrantyChain keeps every warranty on-chain, so it is
          tamper-proof, always available and easy to verify.
        </p>
      </div>

      <div className="steps-grid">
        {STEPS.map((step, i) => (
          <div className="step-card" key={step.title}>
            <span className="step-no">{i + 1}</span>
            <div className="step-icon">{step.icon}</div>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- CONTACT ----------------------------- */

export function ContactSection() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
    website: "", // honeypot – real users never fill this
  });
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [feedback, setFeedback] = useState("");

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setState("sending");
    setFeedback("");

    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Could not send your message.");
      }

      setState("sent");
      setFeedback("Thanks! Your message has been sent. We'll reply soon.");
      setForm({ name: "", email: "", message: "", website: "" });
    } catch (err) {
      setState("error");
      setFeedback(
        err.message === "Failed to fetch"
          ? "Cannot reach the server. Please try again later."
          : err.message
      );
    }
  };

  return (
    <section className="contact-block" id="contact">
      <div className="contact-info">
        <span className="section-label">CONTACT</span>
        <h2>Questions? Let's talk.</h2>
        <p>
          Send us a message about your warranty, a verification issue or
          anything else. It goes straight to our inbox.
        </p>
      </div>

      <form className="contact-form" onSubmit={onSubmit}>
        <div className="field-row">
          <label>
            Name
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="Your name"
              maxLength={80}
              required
            />
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="you@example.com"
              maxLength={120}
              required
            />
          </label>
        </div>

        <label>
          Message
          <textarea
            name="message"
            rows={5}
            value={form.message}
            onChange={onChange}
            placeholder="How can we help?"
            maxLength={2000}
            required
          />
        </label>

        {/* honeypot */}
        <input
          className="hp-field"
          name="website"
          value={form.website}
          onChange={onChange}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        <button
          className="blue-btn"
          type="submit"
          disabled={state === "sending"}
        >
          {state === "sending" ? "Sending..." : "Send Message"}
        </button>

        {feedback && (
          <div className={`form-feedback ${state}`}>{feedback}</div>
        )}
      </form>
    </section>
  );
}

/* ------------------------------- FAQ ------------------------------- */

const FAQS = [
  {
    q: "What is WarrantyChain?",
    a: "A platform to issue, track and verify digital receipts and product warranties. Each warranty is recorded through a smart contract so it can't be tampered with.",
  },
  {
    q: "Do I need MetaMask to use it?",
    a: "Yes. MetaMask is your login: connect your wallet to issue warranties or view the ones linked to your address.",
  },
  {
    q: "How do I verify a product?",
    a: "Open Verify Product and enter the product ID, or scan the QR code on the receipt. The warranty details and status appear instantly.",
  },
  {
    q: "What happens if I lose my wallet?",
    a: "Warranties are linked to your wallet address, so keep your MetaMask recovery phrase safe. With it you can restore the same wallet and your records on any device.",
  },
  {
    q: "Where is my warranty data stored?",
    a: "The core warranty record lives on the blockchain, with supporting details like invoices and product photos stored in the database for fast loading.",
  },
  {
    q: "Can a warranty record be changed or faked?",
    a: "No. Once a warranty is written on-chain it can't be silently edited, and anyone can verify it against the contract.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState(0);

  return (
    <section className="faq-block" id="faq">
      <div className="block-head center">
        <span className="section-label">FAQ</span>
        <h2>Frequently asked questions</h2>
      </div>

      <div className="faq-list">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div className={`faq-item ${isOpen ? "open" : ""}`} key={item.q}>
              <button
                type="button"
                className="faq-q"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                <span>{item.q}</span>
                <span className="faq-chevron">+</span>
              </button>
              {isOpen && <p className="faq-a">{item.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------ FOOTER ----------------------------- */

export function Footer() {
  return (
    <footer className="landing-footer">
      <div className="footer-inner">
        <span className="powered-badge">⛓ Powered by Ethereum &amp; Solidity</span>
        <span className="footer-copy">
          © {new Date().getFullYear()} WarrantyChain. All rights reserved.
        </span>
      </div>
    </footer>
  );
}