import { useState } from "react";
import {
  API_BASE,
  RESPONSE_TIME,
} from "./siteConfig";

const TOPICS = [
  "Verification issue",
  "Merchant onboarding",
  "Bug report",
  "Other",
];

const EMPTY = { name: "", email: "", topic: "", message: "", _gotcha: "" };

function validate(v) {
  const errors = {};
  if (!v.name.trim()) errors.name = "Please enter your name.";
  if (!v.email.trim()) errors.email = "Please enter your email.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()))
    errors.email = "That email doesn't look right.";
  if (!v.topic) errors.topic = "Please choose a topic.";
  if (v.message.trim().length < 10)
    errors.message = "Please write at least 10 characters.";
  return errors;
}

export default function ContactSection() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "idle", text: "" });

  const sending = status.type === "sending";

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setStatus({ type: "sending", text: "" });

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          topic: values.topic,
          message: values.message.trim(),
          _gotcha: values._gotcha,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setValues(EMPTY);
        setStatus({
          type: "success",
          text: "Thanks! Your message has been sent. We'll reply by email soon.",
        });
        return;
      }

      setStatus({
        type: "error",
        text:
          data?.message ||
          `Sorry, we couldn't send your message. Please try again.`,
      });
    } catch {
      setStatus({
        type: "error",
        text: `We couldn't reach the server. Please try again later.`,
      });
    }
  };

  const fieldProps = (name) => ({
    id: `contact-${name}`,
    name,
    value: values[name],
    onChange,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `contact-${name}-err` : undefined,
  });

  const fieldError = (name) =>
    errors[name] ? (
      <small className="field-error" id={`contact-${name}-err`}>
        {errors[name]}
      </small>
    ) : null;

  return (
    <section className="lp-section contact-page">
      <div className="contact-panel">
        <div className="contact-info">
          <span className="section-label">CONTACT</span>
          <h2>Questions? Let's talk.</h2>
          <p>
            Send us a message about your warranty, a verification issue or
            anything else. It goes straight to our inbox.
          </p>

          <dl className="contact-details">
            <div>
              <dt>Response time</dt>
              <dd>{RESPONSE_TIME}</dd>
            </div>
          </dl>
        </div>

        <form className="contact-form" onSubmit={onSubmit} noValidate>
          <div className="contact-row">
            <label>
              <span>Name</span>
              <input
                type="text"
                placeholder="Your name"
                autoComplete="name"
                {...fieldProps("name")}
              />
              {fieldError("name")}
            </label>

            <label>
              <span>Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...fieldProps("email")}
              />
              {fieldError("email")}
            </label>
          </div>

          <label>
            <span>Topic</span>
            <select {...fieldProps("topic")}>
              <option value="">Select a topic</option>
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {fieldError("topic")}
          </label>

          <label>
            <span>Message</span>
            <textarea
              rows={6}
              placeholder="How can we help?"
              {...fieldProps("message")}
            />
            {fieldError("message")}
          </label>

          {/* Honeypot: hidden from people, bots fill it in. */}
          <input
            type="text"
            name="_gotcha"
            value={values._gotcha}
            onChange={onChange}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hp-field"
          />

          {status.type === "success" && (
            <div className="form-msg success" role="status">
              {status.text}
            </div>
          )}
          {status.type === "error" && (
            <div className="form-msg error" role="alert">
              {status.text}
            </div>
          )}

          <button className="blue-btn" type="submit" disabled={sending}>
            {sending ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </section>
  );
}