import { useState } from "react";

const FAQS = [
  {
    q: "What can I do with WarrantyChain?",
    a: "WarrantyChain helps you register products, keep digital purchase and warranty details together, track expiry dates, and check whether a product's warranty is active.",
  },
  {
    q: "How do I get a product warranty on WarrantyChain?",
    a: "Ask the seller to register the product for you. They enter the product and customer details, purchase information, warranty period, and attach a product photo and purchase invoice.",
  },
  {
    q: "Where can I find my receipts and warranties?",
    a: "Open Receipts to view your purchase records, or Warranties to check product coverage and expiry dates. Use the search box to find a record by product name, product ID, or receipt number.",
  },
  {
    q: "How do I check whether a warranty is still valid?",
    a: "Open Verify Product and enter the product ID, or scan the QR code on the receipt. WarrantyChain shows the product details, purchase and expiry dates, and whether the warranty is active or expired.",
  },
  {
    q: "Can I verify a product without signing in?",
    a: "Yes. Open the product's verification link or scan its QR code to see its warranty details. You don't need to sign in just to verify a product.",
  },
  {
    q: "What should I do if I can't find my warranty?",
    a: "Check that you're signed in to the account the seller used when registering the product. If it is still missing, contact the seller and ask them to confirm the product was registered with the correct customer details.",
  },
  {
    q: "Can I change the seller name shown on new warranties?",
    a: "Yes. Open Profile, select the pen icon beside your saved seller name, make your change, and save it. The updated name will be used for future registrations.",
  },
  {
    q: "Can I transfer a warranty to a new owner?",
    a: "Warranty transfers are not currently supported. The warranty remains associated with the customer details entered when it was registered. The new owner can still check its status using the product ID or QR code.",
  },
  {
    q: "How do I make a warranty claim?",
    a: "WarrantyChain helps you check and show the warranty details, but claims are handled by the seller or service center. Share the product ID or QR code with them to help them check the coverage.",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="lp-section narrow faq-page">
      <div className="lp-head">
        <h2 className="faq-title">Frequently asked questions</h2>
      </div>

      <div className="faq-list">
        {FAQS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div className={`faq-item${isOpen ? " open" : ""}`} key={item.q}>
              <h3>
                <button
                  type="button"
                  id={`faq-q-${i}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-a-${i}`}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                >
                  <span className="faq-q-text">{item.q}</span>
                  <span className="faq-icon" aria-hidden="true">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
              </h3>

              <div
                className="faq-answer"
                id={`faq-a-${i}`}
                role="region"
                aria-labelledby={`faq-q-${i}`}
              >
                <div inert={!isOpen}>
                  <p>{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}