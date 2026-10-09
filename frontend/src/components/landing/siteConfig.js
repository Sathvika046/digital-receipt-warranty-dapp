// =====================================================
// Landing-page settings - edit the values below.
// =====================================================

// 1) Contact form -> your backend (POST /api/contact), which sends the email
//    through SMTP. SMTP login details live in backend/.env, never here.
//    Defaults to the same machine that served the website, port 5000, so it
//    also works from a phone on your Wi-Fi. Override with VITE_API_URL.
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

// 2) Contact page note
export const RESPONSE_TIME = "We reply within 24 hours.";