// =====================================================
// INVOICE HELPERS
//  - SHA-256 hash of the uploaded file
//  - small thumbnail (shown instead of the first letter)
//  - OCR (tesseract.js) + check against the form data
//  - tiny localStorage store (keyed by receipt number)
// =====================================================

import { CONTRACT_ADDRESS } from "./App";

// The store is scoped to the deployed contract address, so redeploying a
// new contract automatically starts with a clean invoice list (old
// invoices saved for a previous deployment no longer block new ones).
const storeKey = () =>
  `warranty-invoices-v1:${String(CONTRACT_ADDRESS || "").toLowerCase()}`;

// ---------- storage ----------

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(storeKey()) || "{}");
  } catch {
    return {};
  }
}

function writeStore(data) {
  try {
    localStorage.setItem(storeKey(), JSON.stringify(data));
  } catch (error) {
    console.error("Could not save invoice image:", error);
  }
}

const keyOf = (receiptNumber) =>
  String(receiptNumber || "").trim().toLowerCase();

export function saveInvoice(receiptNumber, data) {
  const store = readStore();
  store[keyOf(receiptNumber)] = data;
  writeStore(store);
}

export function getInvoice(receiptNumber) {
  return readStore()[keyOf(receiptNumber)] || null;
}

export function isInvoiceHashUsed(hash) {
  return Object.values(readStore()).some((i) => i.hash === hash);
}

// ---------- file helpers ----------

export async function sha256File(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function makeThumbnail(file, size = 160) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      canvas
        .getContext("2d")
        .drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image."));
    };

    img.src = url;
  });
}

// ---------- OCR ----------

export async function readInvoiceText(file) {
  const { default: Tesseract } = await import("tesseract.js");
  const result = await Tesseract.recognize(file, "eng");
  return result.data.text || "";
}

// ---------- matching ----------

// lower-case, drop everything except letters/digits, and treat
// look-alike characters the same way (OCR often confuses them)
function squash(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/o/g, "0")
    .replace(/[il]/g, "1");
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june", "july",
  "august", "september", "october", "november", "december",
];

function dateCandidates(isoDate) {
  // isoDate = "YYYY-MM-DD" (value of <input type="date">)
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return [];

  const pad = (n) => String(n).padStart(2, "0");
  const yy = String(y).slice(-2);
  const full = MONTHS[m - 1];
  const short = full.slice(0, 3);

  return [
    `${y}${pad(m)}${pad(d)}`,
    `${pad(d)}${pad(m)}${y}`,
    `${pad(m)}${pad(d)}${y}`,
    `${d}${m}${y}`,
    `${m}${d}${y}`,
    `${pad(d)}${pad(m)}${yy}`,
    `${pad(m)}${pad(d)}${yy}`,
    `${pad(d)}${short}${y}`,
    `${d}${short}${y}`,
    `${pad(d)}${full}${y}`,
    `${d}${full}${y}`,
    `${short}${pad(d)}${y}`,
    `${short}${d}${y}`,
    `${full}${pad(d)}${y}`,
    `${full}${d}${y}`,
    `${pad(d)}${short}${yy}`,
  ].map(squash);
}

export function checkInvoiceText(text, { receiptNumber, purchaseDate, productName }) {
  const haystack = squash(text);

  const receiptOk =
    squash(receiptNumber).length > 0 &&
    haystack.includes(squash(receiptNumber));

  const dateOk = dateCandidates(purchaseDate).some(
    (c) => c && haystack.includes(c)
  );

  // advisory only: at least one meaningful word of the product name
  const words = String(productName || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);

  const productOk =
    words.length === 0 || words.some((w) => haystack.includes(squash(w)));

  return { receiptOk, dateOk, productOk };
}


// ---------- purchase date (read from the invoice) ----------

const FULL_MONTHS = MONTHS; // january ... december

function monthNumber(word) {
  const w = String(word || "").toLowerCase().replace(/\./g, "");
  if (w.length < 3) return 0;
  if (w === "sept") return 9;
  const i = FULL_MONTHS.findIndex((m) => m.startsWith(w));
  return i === -1 ? 0 : i + 1;
}

// Finds the purchase date in the OCR text of an invoice.
// Returns "YYYY-MM-DD" or "" when no believable date is found.
// Dates more than a year ahead (OCR noise) are ignored.
// Lines that mention "date / invoice / bill / purchase" are preferred.
export function extractPurchaseDate(text) {
  const now = new Date();
  const earliestYear = now.getFullYear() - 15;
  const latestYear = now.getFullYear() + 1;

  const found = [];

  const valid = (y, m, d) => {
    if (!y || !m || !d || m > 12 || d > 31 || y < earliestYear || y > latestYear) return null;
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    const pad = (n) => String(n).padStart(2, "0");
    return `${y}-${pad(m)}-${pad(d)}`;
  };

  String(text || "")
    .split(/\r?\n/)
    .forEach((line) => {
      const labelled = /date|dated|invoice|bill|purchase|receipt/i.test(line);
      const add = (y, m, d) => {
        const iso = valid(y, m, d);
        if (iso) found.push({ iso, labelled });
      };

      // 2026-10-14, 2026/10/14
      for (const m of line.matchAll(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
        add(+m[1], +m[2], +m[3]);
      }

      // 14/10/2026, 14-10-26, 10/14/2026  (day first unless the 2nd number is > 12)
      for (const m of line.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/g)) {
        let a = +m[1];
        let b = +m[2];
        const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
        if (b > 12 && a <= 12) [a, b] = [b, a];
        add(y, b, a);
      }

      // 14 Oct 2026, 14th October, 2026
      for (const m of line.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?[\s.,-]*([A-Za-z]{3,9})\.?[\s.,-]*(\d{4})\b/g)) {
        add(+m[3], monthNumber(m[2]), +m[1]);
      }

      // Oct 14, 2026
      for (const m of line.matchAll(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/g)) {
        add(+m[3], monthNumber(m[1]), +m[2]);
      }
    });

  if (!found.length) return "";
  return (found.find((f) => f.labelled) || found[0]).iso;
}

// Receipt number is no longer typed in. It is derived from the invoice file,
// so the same invoice always gives the same number (and can't be reused).
export function receiptNumberFromHash(hash) {
  return `INV-${String(hash || "").slice(0, 10).toUpperCase()}`;
}