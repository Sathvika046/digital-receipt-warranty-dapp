import { useEffect, useRef, useState } from "react";

export const NAV_LINKS = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "faq", label: "FAQ" },
];

export default function Navbar({ page, onConnect, connecting }) {
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);

  // Close the mobile menu on Escape, outside tap, route change or resize to desktop.
  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    const onKey = (e) => e.key === "Escape" && close();
    const onPointer = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) close();
    };
    const onResize = () => window.innerWidth > 850 && close();

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("hashchange", close);
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("hashchange", close);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const connectLabel = connecting ? "Connecting..." : "Connect Wallet";

  return (
    <nav className="landing-nav" ref={navRef} aria-label="Main">
      <a className="brand" href="#home" aria-label="WarrantyChain home">
        <span className="brand-shield">✓</span>
        <span>WarrantyChain</span>
      </a>

      <div className="landing-links">
        {NAV_LINKS.map((link) => (
          <a
            key={link.id}
            href={`#${link.id}`}
            aria-current={page === link.id ? "location" : undefined}
          >
            {link.label}
          </a>
        ))}
      </div>

      <div className="nav-actions">
        <button
          className="blue-btn nav-connect"
          onClick={onConnect}
          disabled={connecting}
        >
          {connectLabel}
        </button>

        <button
          type="button"
          className="nav-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open && (
        <div className="mobile-menu" id="mobile-menu">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              aria-current={page === link.id ? "location" : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}

          <button
            className="blue-btn"
            onClick={() => {
              setOpen(false);
              onConnect();
            }}
            disabled={connecting}
          >
            {connectLabel}
          </button>
        </div>
      )}
    </nav>
  );
}