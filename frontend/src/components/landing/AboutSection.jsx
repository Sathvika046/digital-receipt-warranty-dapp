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

const AUDIENCES = [
  {
    title: "Merchants",
    points: [
      "Issue a digital warranty in one step",
      "Every record gets a product ID and QR code",
      "No paper cards to print or reprint",
    ],
  },
  {
    title: "Customers",
    points: [
      "All your warranties in one wallet",
      "See the expiry date and days remaining",
      "Nothing to lose, fade or keep in a drawer",
    ],
  },
  {
    title: "Service centers",
    points: [
      "Check a product from its ID or QR code",
      "No wallet or account needed",
      "See instantly whether the warranty is active",
    ],
  },
];

export default function AboutSection() {
  return (
    <section className="lp-section about-page">
      <div className="about-intro">
        <span className="section-label">ABOUT WARRANTYCHAIN</span>
        <h2>Paper receipts get lost. Blockchain records don't.</h2>
        <p>
          Faded receipts, lost warranty cards and fake claims are everyday
          problems. WarrantyChain keeps every warranty on-chain, so it is
          tamper-proof, always available and easy to verify.
        </p>
      </div>

      <div className="about-steps">
        {STEPS.map((step, i) => (
          <article className="about-step" key={step.title}>
            <span className="about-step-num" aria-hidden="true">
              {i + 1}
            </span>
            <div className="about-step-icon" aria-hidden="true">
              {step.icon}
            </div>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>

      <div className="about-for">
        <h2>Who is it for?</h2>
        <p>One record, three people who rely on it.</p>

        <div className="lp-roles three">
          {AUDIENCES.map((a) => (
            <div className="lp-role" key={a.title}>
              <strong>{a.title}</strong>
              <ul>
                {a.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}