const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

// =====================================================
// SMTP TRANSPORT (configured from backend/.env)
// =====================================================
let transporter = null;

function smtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

function getTransporter() {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT) || 587;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 = implicit TLS, 587 = STARTTLS (upgraded automatically)
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

// =====================================================
// SMALL HELPERS
// =====================================================
const TOPICS = [
  "Verification issue",
  "Merchant onboarding",
  "Bug report",
  "Other",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// remove line breaks so user input can never inject mail headers
const oneLine = (v) => String(v ?? "").replace(/[\r\n]+/g, " ").trim();

const escapeHtml = (v) =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// simple in-memory limit: 5 messages / 15 minutes per IP
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

// =====================================================
// POST /api/contact
// =====================================================
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    // honeypot: real visitors never fill this in. Pretend success to bots.
    if (body._gotcha) {
      return res.json({ success: true, message: "Message sent." });
    }

    const name = oneLine(body.name);
    const email = oneLine(body.email);
    const topic = oneLine(body.topic);
    const message = String(body.message ?? "").trim();

    if (!name || name.length > 100) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter your name." });
    }
    if (!EMAIL_RE.test(email) || email.length > 200) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter a valid email." });
    }
    if (!TOPICS.includes(topic)) {
      return res
        .status(400)
        .json({ success: false, message: "Please choose a topic." });
    }
    if (message.length < 10 || message.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message must be between 10 and 5000 characters.",
      });
    }

    if (rateLimited(req.ip)) {
      return res.status(429).json({
        success: false,
        message: "Too many messages. Please try again in a few minutes.",
      });
    }

    if (!smtpConfigured()) {
      console.error("Contact form: SMTP_HOST / SMTP_USER / SMTP_PASS missing in backend/.env");
      return res.status(503).json({
        success: false,
        message: "Email sending isn't set up on the server yet.",
      });
    }

    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: process.env.CONTACT_TO || process.env.SMTP_USER,
      replyTo: `"${name.replace(/"/g, "")}" <${email}>`,
      subject: `[WarrantyChain] ${topic} - ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`,
      html: `
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Topic:</strong> ${escapeHtml(topic)}</p>
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      `,
    });

    res.json({ success: true, message: "Message sent." });
  } catch (error) {
    console.error("Contact form error:", error.message);
    res.status(500).json({
      success: false,
      message: "We couldn't send your message. Please try again later.",
    });
  }
});

module.exports = router;